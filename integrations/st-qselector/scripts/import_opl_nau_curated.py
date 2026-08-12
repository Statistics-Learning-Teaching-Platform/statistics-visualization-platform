#!/usr/bin/env python3
"""Import the reviewed OPL/NAU statistics pack into the chapter JSON files.

The source WeBWorK problems are randomized PG programs.  This importer writes
only the fixed, independently verified static instances in the curated pack.
It is idempotent: matching IDs are replaced and unrelated questions remain.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FORMED = ROOT / "Data" / "Formed"
PACK = ROOT / "Data" / "External" / "opl-nau-curated-v1.json"
QUESTION_TYPES = {"选择题", "判断题", "填空题", "计算题", "简答题", "综合题"}
REVIEW_STATUS = "independently solved and reviewed"
FORBIDDEN_MARKERS = (
    "�",
    "答案待复核",
    "待逐题复核",
    "[IMG:",
    "{.underline}",
    "{=html}",
    "$$$",
)
CJK_RE = re.compile(r"[\u3400-\u9fff]")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def validate(pack: dict) -> list[dict]:
    items = pack.get("questions", [])
    ids = [item.get("id") for item in items]
    duplicates = [qid for qid, count in Counter(ids).items() if count > 1]
    if duplicates:
        raise ValueError(f"duplicate IDs in pack: {duplicates}")

    errors: list[str] = []
    required = {
        "id",
        "chapter",
        "content",
        "answer",
        "source_path",
        "source_url",
        "source_problem",
        "attribution",
        "type",
        "difficulty",
        "keywords",
    }
    for index, item in enumerate(items, 1):
        label = item.get("id") or f"item {index}"
        missing = sorted(required - item.keys())
        if missing:
            errors.append(f"{label}: missing {missing}")
        if item.get("type") not in QUESTION_TYPES:
            errors.append(f"{label}: invalid type {item.get('type')!r}")
        difficulty = item.get("difficulty")
        if not isinstance(difficulty, int) or not 1 <= difficulty <= 5:
            errors.append(f"{label}: difficulty must be an integer from 1 to 5")
        chapter = str(item.get("chapter", ""))
        if not re.fullmatch(r"Ch\d{2}", chapter):
            errors.append(f"{label}: invalid chapter {chapter!r}")
        source_path = str(item.get("source_path", ""))
        if not source_path.startswith("OpenProblemLibrary/") or not source_path.endswith(".pg"):
            errors.append(f"{label}: invalid OPL PG source path")
        if pack.get("source_commit") not in str(item.get("source_url", "")):
            errors.append(f"{label}: source URL is not pinned to the pack commit")

        for field in ("content", "answer"):
            value = str(item.get(field, "")).strip()
            if not value:
                errors.append(f"{label}: empty {field}")
            if CJK_RE.search(value):
                errors.append(f"{label}: {field} must be English-only")
            for marker in FORBIDDEN_MARKERS:
                if marker in value:
                    errors.append(f"{label}: forbidden marker {marker!r} in {field}")

        keywords = item.get("keywords", [])
        if not isinstance(keywords, list) or not keywords:
            errors.append(f"{label}: keywords must be a non-empty list")
        elif any(CJK_RE.search(str(keyword)) for keyword in keywords):
            errors.append(f"{label}: keywords must be English-only")

        for data_ref in item.get("data_refs", []):
            if not (FORMED / chapter / data_ref).is_file():
                errors.append(f"{label}: missing local asset {data_ref!r}")

    if len(items) != 20:
        errors.append(f"expected 20 curated questions, found {len(items)}")
    if errors:
        raise ValueError("invalid OPL/NAU pack:\n- " + "\n- ".join(errors))
    return items


def question_record(item: dict, pack: dict) -> dict:
    return {
        "id": item["id"],
        "content": item["content"].strip(),
        "source": (
            "WeBWorK Open Problem Library — NAU Statistics — "
            f"{item['source_problem']} — {item['source_url']}"
        ),
        "source_url": item["source_url"],
        "source_problem": item["source_problem"],
        "source_path": item["source_path"],
        "source_commit": pack["source_commit"],
        "license": pack["license"],
        "license_url": pack["license_url"],
        "attribution": item["attribution"],
        "changes": "Randomized PG problem converted to a fixed, self-contained English instance; answer independently recomputed and Markdown/LaTeX normalized.",
        "review_status": REVIEW_STATUS,
        "type": item["type"],
        "difficulty": item["difficulty"],
        "keywords": item["keywords"],
        "formula_refs": [],
        "data_refs": item.get("data_refs", []),
    }


def import_pack(*, check_only: bool) -> None:
    pack = load_json(PACK)
    items = validate(pack)
    by_chapter: dict[str, list[dict]] = defaultdict(list)
    for item in items:
        by_chapter[item["chapter"]].append(item)

    imported_total = 0
    for chapter, chapter_items in sorted(by_chapter.items()):
        chapter_num = int(chapter.removeprefix("Ch"))
        chapter_dir = FORMED / chapter
        question_path = chapter_dir / "questions.json"
        answer_path = chapter_dir / "answers.json"
        if not question_path.exists() or not answer_path.exists():
            raise FileNotFoundError(f"missing chapter files for {chapter}")

        question_data = load_json(question_path)
        answer_data = load_json(answer_path)
        incoming_ids = {item["id"] for item in chapter_items}
        kept_questions = [
            question
            for question in question_data.get("questions", [])
            if question.get("id") not in incoming_ids
        ]
        kept_answers = [
            answer
            for answer in answer_data.get("answers", [])
            if answer.get("id") not in incoming_ids
        ]
        new_questions = kept_questions + [
            question_record(item, pack) for item in chapter_items
        ]
        new_answers = kept_answers + [
            {
                "id": item["id"],
                "answer": item["answer"].strip(),
                "review_status": REVIEW_STATUS,
                "source_commit": pack["source_commit"],
            }
            for item in chapter_items
        ]

        print(
            f"{chapter}: {len(question_data.get('questions', []))} -> "
            f"{len(new_questions)} questions (+{len(chapter_items)} OPL curated)"
        )
        imported_total += len(chapter_items)

        if not check_only:
            question_path.write_text(
                json.dumps(
                    {"chapter": chapter_num, "questions": new_questions},
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            answer_path.write_text(
                json.dumps(
                    {"chapter": chapter_num, "answers": new_answers},
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )

    action = "Validated" if check_only else "Imported"
    print(f"{action} {imported_total} reviewed OPL/NAU statistics questions.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="validate and report without writing chapter files",
    )
    args = parser.parse_args()
    import_pack(check_only=args.check)


if __name__ == "__main__":
    main()
