from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

from review_schema import approved_review, validate_review_pair  # noqa: E402


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class StructuredReviewTests(unittest.TestCase):
    def pair(self):
        question = {"id": "q1", "content": "A complete statistics question."}
        answer = {"id": "q1", "answer": "A complete independently checked answer."}
        review = approved_review(content=question["content"], answer=answer["answer"], pack_id="test-pack")
        question["review"] = copy.deepcopy(review)
        answer["review"] = copy.deepcopy(review)
        return question, answer

    def test_approved_pair_requires_matching_hashes_and_gates(self):
        question, answer = self.pair()
        self.assertEqual(validate_review_pair(question, answer), (True, []))
        question["content"] += " Changed."
        valid, errors = validate_review_pair(question, answer)
        self.assertFalse(valid)
        self.assertIn("question_review_question_hash_mismatch", errors)

    def test_legacy_review_status_is_not_an_approval_signal(self):
        question = {"id": "q1", "content": "Question", "review_status": "independently reviewed"}
        answer = {"id": "q1", "answer": "Answer", "review_status": "independently reviewed"}
        valid, errors = validate_review_pair(question, answer)
        self.assertFalse(valid)
        self.assertIn("question_review_missing", errors)


class ReviewMigrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.migration = load_module("structured_review_migration_test", SCRIPTS / "migrate_structured_reviews.py")

    def test_chapter_pack_name_alone_cannot_approve_a_record(self):
        content = "A changed question that was never reviewed."
        answer_text = "A changed answer that was never reviewed."
        question = {"id": "q1", "content": content, "audit_pack": "chapter-pack"}
        answer = {"id": "q1", "answer": answer_text, "audit_pack": "chapter-pack"}
        chapter_packs = {
            "chapter-pack": {
                "q1": {
                    "id": "q1",
                    "decision": "retain",
                    "reviewed_question_hash": hashlib.sha256(b"reviewed question").hexdigest(),
                    "reviewed_answer_hash": hashlib.sha256(b"reviewed answer").hexdigest(),
                }
            }
        }
        pack_id = self.migration.determine_pack_id(
            question,
            answer,
            chapter_packs=chapter_packs,
            opl_pack={},
            opl_records={},
        )
        self.assertIsNone(pack_id)

    def test_opl_commit_label_alone_cannot_approve_changed_content(self):
        question = {"id": "opl_q1", "content": "Tampered question", "source_commit": "abc"}
        answer = {"id": "opl_q1", "answer": "Reviewed answer", "source_commit": "abc"}
        pack_id = self.migration.determine_pack_id(
            question,
            answer,
            chapter_packs={},
            opl_pack={"pack": "opl-nau-curated-v1", "source_commit": "abc"},
            opl_records={"opl_q1": {"content": "Reviewed question", "answer": "Reviewed answer"}},
        )
        self.assertIsNone(pack_id)


class ReleaseClosureTests(unittest.TestCase):
    def test_current_release_closes_data_manifest_and_public_index(self):
        validator = load_module("validate_release_test", SCRIPTS / "validate_release.py")
        summary = validator.validate()
        self.assertEqual(summary["formed"], 293)
        self.assertEqual(summary["formed"], summary["approved"])
        self.assertEqual(summary["approved"], summary["manifest"])
        self.assertEqual(summary["manifest"], summary["published"])

    def test_problem_ai_records_are_quarantined(self):
        validator = load_module("validate_release_ai_quarantine_test", SCRIPTS / "validate_release.py")
        public = validator.load_release_index()
        ids = {item["id"] for item in public["questions"]}
        self.assertFalse(any(qid.startswith("ai_") for qid in ids))
        self.assertTrue(all(item.get("origin") == "bank" for item in public["questions"]))
        self.assertFalse((ROOT / "Program/public/data/reviewed-questions.json").exists())
        self.assertFalse((ROOT / "Program/public/assets").exists())
        for chapter in ("Ch01", "Ch08"):
            data = json.loads((ROOT / f"Data/Formed/{chapter}/questions.json").read_text(encoding="utf-8"))
            self.assertFalse(any(str(item.get("id", "")).startswith("ai_") for item in data["questions"]))

    def test_manifest_builder_derives_eligibility_from_structured_review(self):
        builder = load_module("audit_builder_test", SCRIPTS / "build_audit_manifest.py")
        manifest = builder.build_manifest()
        self.assertEqual(manifest["summary"]["total_questions"], 293)
        self.assertEqual(manifest["summary"]["eligible_for_paper"], 293)
        self.assertTrue(all(item["diagnostics"]["structured_review_valid"] for item in manifest["questions"]))

    def test_asset_integrity_uses_content_hash_not_only_file_size(self):
        validator = load_module("validate_release_asset_hash_test", SCRIPTS / "validate_release.py")
        with tempfile.TemporaryDirectory() as temporary:
            first = Path(temporary) / "first.bin"
            second = Path(temporary) / "second.bin"
            first.write_bytes(b"same-size-a")
            second.write_bytes(b"same-size-b")
            self.assertEqual(first.stat().st_size, second.stat().st_size)
            self.assertNotEqual(validator.file_sha256(first), validator.file_sha256(second))

    def test_public_total_count_excludes_pending_records(self):
        source = (ROOT / "Program/scripts/generate-reviewed-index.mjs").read_text(encoding="utf-8")
        self.assertIn("totalCount: questions.length", source)

    def test_manifest_builder_rejects_duplicate_answer_ids(self):
        builder = load_module("audit_builder_duplicate_answer_test", SCRIPTS / "build_audit_manifest.py")
        with tempfile.TemporaryDirectory() as temporary:
            formed = Path(temporary)
            chapter = formed / "Ch01"
            chapter.mkdir()
            (chapter / "questions.json").write_text(
                json.dumps({"questions": [{"id": "q1", "content": "Question", "source": "https://example.com"}]}),
                encoding="utf-8",
            )
            duplicate = {"id": "q1", "answer": "Answer"}
            (chapter / "answers.json").write_text(
                json.dumps({"answers": [duplicate, duplicate]}),
                encoding="utf-8",
            )
            original_formed = builder.FORMED
            builder.FORMED = formed
            try:
                with self.assertRaisesRegex(ValueError, "duplicate answer id"):
                    builder.build_manifest()
            finally:
                builder.FORMED = original_formed


class ReviewPackTests(unittest.TestCase):
    def test_all_pack_records_have_hash_preconditions(self):
        for path in sorted((ROOT / "Data/Audit").glob("ch??-review-v1.json")):
            pack = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(pack.get("hash_algorithm"), "sha256", path.name)
            self.assertRegex(str(pack.get("baseline_commit")), r"^[0-9a-f]{40}$", path.name)
            for record in pack["records"]:
                self.assertRegex(str(record.get("expected_question_hash")), r"^[0-9a-f]{64}$")
                self.assertRegex(str(record.get("expected_answer_hash")), r"^[0-9a-f]{64}$")
                if record["decision"] != "delete":
                    self.assertRegex(str(record.get("reviewed_question_hash")), r"^[0-9a-f]{64}$")
                    self.assertRegex(str(record.get("reviewed_answer_hash")), r"^[0-9a-f]{64}$")

    def test_apply_helper_rejects_stale_content(self):
        apply_pack = load_module("apply_review_pack_test", SCRIPTS / "apply_review_pack.py")
        record = {
            "expected_question_hash": hashlib.sha256(b"original").hexdigest(),
            "reviewed_question_hash": hashlib.sha256(b"reviewed").hexdigest(),
        }
        apply_pack.require_current_hash(record, "question", hashlib.sha256(b"original").hexdigest(), "q1")
        apply_pack.require_current_hash(record, "question", hashlib.sha256(b"reviewed").hexdigest(), "q1")
        with self.assertRaisesRegex(ValueError, "changed since review"):
            apply_pack.require_current_hash(record, "question", hashlib.sha256(b"tampered").hexdigest(), "q1")

    def test_hash_stamp_check_rejects_a_stale_saved_value(self):
        stamper = load_module("stamp_review_pack_test", SCRIPTS / "stamp_review_pack_hashes.py")
        with self.assertRaisesRegex(ValueError, "stale reviewed_question_hash"):
            stamper.set_or_check(
                {"reviewed_question_hash": "tampered"},
                "reviewed_question_hash",
                "expected",
                context="pack:q1",
                check_only=True,
            )


class BuildSafetyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.builder = load_module("dataset_builder_test", ROOT / "build_dataset.py")

    def test_staging_validator_requires_separate_aligned_answers(self):
        with tempfile.TemporaryDirectory() as temporary:
            staging = Path(temporary)
            (staging / "config.yaml").write_text("dataRoot: .\nchapters: []\n", encoding="utf-8")
            for number in range(1, 14):
                chapter = staging / f"Ch{number:02d}"
                chapter.mkdir()
                (chapter / "questions.json").write_text(
                    json.dumps({"chapter": number, "questions": [{"id": f"q{number}", "content": "Question"}]}),
                    encoding="utf-8",
                )
                (chapter / "answers.json").write_text(
                    json.dumps({"chapter": number, "answers": [{"id": f"q{number}", "answer": "Answer"}]}),
                    encoding="utf-8",
                )
            self.builder.validate_staging(staging)
            broken = staging / "Ch01/questions.json"
            broken.write_text(json.dumps({"questions": [{"id": "q1", "content": "Question", "answer": "embedded"}]}), encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "embeds answers"):
                self.builder.validate_staging(staging)

    def test_failed_build_does_not_touch_existing_formed(self):
        config = ROOT / "Data/Formed/config.yaml"
        before = hashlib.sha256(config.read_bytes()).hexdigest()
        staging_before = set((ROOT / "Data").glob(".formed-build-*"))
        with mock.patch.object(self.builder, "build_dataset", side_effect=RuntimeError("simulated conversion failure")):
            with self.assertRaisesRegex(RuntimeError, "simulated conversion failure"):
                self.builder.main()
        self.assertTrue(config.is_file())
        self.assertEqual(hashlib.sha256(config.read_bytes()).hexdigest(), before)
        self.assertEqual(set((ROOT / "Data").glob(".formed-build-*")), staging_before)


class CourseMappingTests(unittest.TestCase):
    def test_unknown_concepts_no_longer_fall_back_to_chapter_one(self):
        source = (ROOT / "Program/src/app/api/ai/paper/route.ts").read_text(encoding="utf-8")
        mapping = source[source.index("function mapConceptToChapter"):source.index("function sanitizeDraft")]
        self.assertIn("return null;", mapping)
        self.assertIn("requireMappedChapter", mapping)
        self.assertNotIn('return "Ch01";\n}', mapping)


if __name__ == "__main__":
    unittest.main()
