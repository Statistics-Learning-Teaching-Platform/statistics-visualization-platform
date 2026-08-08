#!/usr/bin/env python3
"""Import the reviewed ROTEL question pack into the chapter JSON files.

The importer is intentionally idempotent: records with the same IDs are
replaced, while unrelated local questions are preserved.  Run with --check to
validate and preview the operation without writing chapter files.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FORMED = ROOT / "Data" / "Formed"
PACK = ROOT / "Data" / "External" / "rotel-curated-v1.json"
QUESTION_TYPES = {"选择题", "判断题", "填空题", "计算题", "简答题", "综合题"}


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def validate(items: list[dict]) -> None:
    ids = [item.get("id") for item in items]
    duplicates = [qid for qid, count in Counter(ids).items() if count > 1]
    if duplicates:
        raise ValueError(f"duplicate IDs in pack: {duplicates}")

    errors: list[str] = []
    for index, item in enumerate(items, 1):
        label = item.get("id") or f"item {index}"
        required = {
            "id",
            "chapter",
            "content",
            "answer",
            "source_url",
            "source_problem",
            "type",
            "difficulty",
            "keywords",
        }
        missing = sorted(required - item.keys())
        if missing:
            errors.append(f"{label}: missing {missing}")
        if item.get("type") not in QUESTION_TYPES:
            errors.append(f"{label}: invalid type {item.get('type')!r}")
        difficulty = item.get("difficulty")
        if not isinstance(difficulty, int) or not 1 <= difficulty <= 5:
            errors.append(f"{label}: difficulty must be an integer from 1 to 5")
        if not str(item.get("chapter", "")).startswith("Ch"):
            errors.append(f"{label}: invalid chapter {item.get('chapter')!r}")
        if not str(item.get("content", "")).strip():
            errors.append(f"{label}: empty content")
        if not str(item.get("answer", "")).strip():
            errors.append(f"{label}: empty answer")
        for data_ref in item.get("data_refs", []):
            asset = FORMED / item.get("chapter", "") / data_ref
            if not asset.is_file():
                errors.append(f"{label}: missing local asset {data_ref!r}")

    if errors:
        raise ValueError("invalid ROTEL pack:\n- " + "\n- ".join(errors))


def question_record(item: dict) -> dict:
    return {
        "id": item["id"],
        "content": item["content"].strip(),
        "source": (
            f"ROTEL Statistical Problem Sets in WeBWorK — "
            f"{item['source_problem']} — {item['source_url']}"
        ),
        "source_url": item["source_url"],
        "source_problem": item["source_problem"],
        "license": "CC BY-NC-SA 4.0",
        "attribution": "Rachael Norton and Peter Staab, 2023",
        "review_status": "答案已独立推导并审核",
        "type": item["type"],
        "difficulty": item["difficulty"],
        "keywords": item["keywords"],
        "formula_refs": [],
        "data_refs": item.get("data_refs", []),
    }


def import_pack(*, check_only: bool) -> None:
    pack = load_json(PACK)
    items = pack.get("questions", [])
    validate(items)

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
            q for q in question_data.get("questions", []) if q.get("id") not in incoming_ids
        ]
        kept_answers = [
            a for a in answer_data.get("answers", []) if a.get("id") not in incoming_ids
        ]
        new_questions = kept_questions + [question_record(item) for item in chapter_items]
        new_answers = kept_answers + [
            {
                "id": item["id"],
                "answer": item["answer"].strip(),
                "review_status": "答案已独立推导并审核",
            }
            for item in chapter_items
        ]

        print(
            f"{chapter}: {len(question_data.get('questions', []))} -> "
            f"{len(new_questions)} questions (+{len(chapter_items)} curated)"
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
    print(f"{action} {imported_total} reviewed ROTEL questions.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check", action="store_true", help="validate and report without writing chapter files"
    )
    args = parser.parse_args()
    import_pack(check_only=args.check)


if __name__ == "__main__":
    main()
