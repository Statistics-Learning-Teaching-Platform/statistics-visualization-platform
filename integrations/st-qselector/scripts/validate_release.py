#!/usr/bin/env python3
"""Fail-fast consistency check for Formed data, audit manifest and release index."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

from review_schema import validate_review_pair


ROOT = Path(__file__).resolve().parents[1]
FORMED = ROOT / "Data" / "Formed"
MANIFEST = ROOT / "Data" / "Audit" / "question-audit-manifest.json"
GENERATED_INDEX = ROOT / "Program" / "src" / "generated" / "reviewed-questions.ts"
PRIVATE_ASSET_MANIFEST = ROOT / "Program" / "database" / "private-assets-manifest.json"
PUBLIC_INDEX = ROOT / "Program" / "public" / "data" / "reviewed-questions.json"
PUBLIC_ASSETS = ROOT / "Program" / "public" / "assets"
IMAGE_PATH_RE = re.compile(r"^[\w./\- ]+\.(?:png|jpe?g|gif|webp)$", re.I)
TOKEN_RE = re.compile(r"\[(?:IMG|FORMULA|DATA):([^|\]]+)")


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_release_index() -> dict[str, Any]:
    source = GENERATED_INDEX.read_text(encoding="utf-8")
    marker = "export const reviewedQuestionIndex: QuestionsResponse = "
    if marker not in source or not source.rstrip().endswith(";"):
        raise ValueError("generated server-side release index has an invalid wrapper")
    return json.loads(source.split(marker, 1)[1].rstrip()[:-1])


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def resolve_asset(chapter_dir: Path, reference: str) -> Path | None:
    for candidate in (
        chapter_dir / reference,
        chapter_dir / "Assests" / reference,
        chapter_dir / "Answers" / reference,
        chapter_dir / "Answer" / reference,
    ):
        try:
            resolved = candidate.resolve()
            resolved.relative_to(chapter_dir.resolve())
        except ValueError:
            continue
        if resolved.is_file():
            return resolved
    return None


def validate() -> dict[str, int]:
    errors: list[str] = []
    all_ids: set[str] = set()
    approved_ids: set[str] = set()
    asset_count = 0
    asset_manifest = load(PRIVATE_ASSET_MANIFEST)
    private_assets = {str(item.get("key")): item for item in asset_manifest.get("assets", [])}

    if PUBLIC_INDEX.exists() or PUBLIC_ASSETS.exists():
        errors.append("complete question data or private attachments exist under public/")

    for question_path in sorted(FORMED.glob("Ch??/questions.json")):
        chapter = question_path.parent.name
        question_data = load(question_path)
        answer_data = load(question_path.with_name("answers.json"))
        answer_items = answer_data.get("answers", [])
        answer_ids = [str(item.get("id") or "") for item in answer_items]
        if not all(answer_ids) or len(answer_ids) != len(set(answer_ids)):
            errors.append(f"{chapter}: missing or duplicate answer IDs")
        answers = {str(item.get("id")): item for item in answer_items if item.get("id")}
        question_ids = [str(item.get("id") or "") for item in question_data.get("questions", [])]
        if set(question_ids) != set(answers):
            errors.append(f"{chapter}: question/answer IDs differ")
        for question in question_data.get("questions", []):
            qid = str(question.get("id") or "")
            if not qid or qid in all_ids:
                errors.append(f"{chapter}: missing or duplicate question ID {qid!r}")
                continue
            all_ids.add(qid)
            answer = answers.get(qid)
            valid, review_errors = validate_review_pair(question, answer)
            if valid:
                approved_ids.add(qid)
            elif question.get("review", {}).get("status") == "approved":
                errors.append(f"{qid}: invalid approved review: {', '.join(review_errors)}")

            answer_text = str((answer or {}).get("answer") or "")
            references = {
                *map(str, question.get("data_refs") or []),
                *map(str, question.get("formula_refs") or []),
                *TOKEN_RE.findall(f"{question.get('content') or ''}\n{answer_text}"),
            }
            if IMAGE_PATH_RE.fullmatch(answer_text.strip()):
                references.add(answer_text.strip())
            for reference in references:
                source = resolve_asset(question_path.parent, reference)
                if source is None:
                    errors.append(f"{qid}: missing source asset {reference}")
                    continue
                relative = source.relative_to(question_path.parent.resolve())
                key = f"{chapter}/{relative.as_posix()}"
                published = private_assets.get(key)
                if (
                    not published
                    or published.get("size") != source.stat().st_size
                    or published.get("sha256") != file_sha256(source)
                ):
                    errors.append(f"{qid}: private asset manifest is absent or stale: {relative.as_posix()}")
                asset_count += 1

    manifest = load(MANIFEST)
    manifest_by_id = {str(item["id"]): item for item in manifest.get("questions", [])}
    if set(manifest_by_id) != all_ids:
        errors.append("audit manifest IDs do not exactly match Formed IDs")
    manifest_eligible = {
        qid for qid, record in manifest_by_id.items() if record.get("workflow", {}).get("eligible_for_paper") is True
    }
    if manifest_eligible != approved_ids:
        errors.append("manifest eligibility does not exactly match valid structured reviews")

    public = load_release_index()
    public_ids = [str(item.get("id") or "") for item in public.get("questions", [])]
    if len(public_ids) != len(set(public_ids)):
        errors.append("public index contains missing or duplicate IDs")
    if set(public_ids) != approved_ids:
        errors.append("public index IDs do not exactly match approved reviews")
    if public.get("totalCount") != len(public_ids):
        errors.append("public totalCount does not match publishable record count")
    for question in public.get("questions", []):
        origin = question.get("origin")
        if origin not in {"bank", "variant", "generated"}:
            errors.append(f"{question.get('id')}: public provenance origin is missing")
        if origin in {"variant", "generated"} and not question.get("verification"):
            errors.append(f"{question.get('id')}: AI-authored question lacks verification provenance")
        if origin == "variant" and not question.get("parentQuestionId"):
            errors.append(f"{question.get('id')}: variant lacks parentQuestionId")

    if errors:
        raise ValueError("release validation failed:\n- " + "\n- ".join(errors))
    return {
        "formed": len(all_ids),
        "approved": len(approved_ids),
        "manifest": len(manifest_by_id),
        "published": len(public_ids),
        "asset_references": asset_count,
        "ch11_reviewed": next((item["count"] for item in public.get("chapters", []) if item["id"] == "Ch11"), -1),
        "ch12_reviewed": next((item["count"] for item in public.get("chapters", []) if item["id"] == "Ch12"), -1),
    }


def main() -> None:
    summary = validate()
    print("Release validation passed: " + ", ".join(f"{key}={value}" for key, value in summary.items()))


if __name__ == "__main__":
    main()
