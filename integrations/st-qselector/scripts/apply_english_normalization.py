#!/usr/bin/env python3
"""Apply the reviewed English normalization pack to the derived question bank."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
FORMED = ROOT / "Data" / "Formed"
PACK_PATH = ROOT / "Data" / "Audit" / "english-normalization-v1.json"


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, value: dict[str, Any]) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    pack = load(PACK_PATH)
    records = pack.get("records", [])
    if len(records) != 37:
        raise ValueError(f"expected 37 normalization records, found {len(records)}")

    by_chapter: dict[str, list[dict[str, Any]]] = {}
    for record in records:
        by_chapter.setdefault(record["chapter"], []).append(record)

    updated = 0
    for chapter, chapter_records in sorted(by_chapter.items()):
        chapter_dir = FORMED / chapter
        question_path = chapter_dir / "questions.json"
        answer_path = chapter_dir / "answers.json"
        questions = load(question_path)
        answers = load(answer_path)
        question_map = {item["id"]: item for item in questions["questions"]}
        answer_map = {item["id"]: item for item in answers["answers"]}

        for record in chapter_records:
            qid = record["id"]
            if qid not in question_map or qid not in answer_map:
                raise KeyError(f"{qid} is not a complete question/answer pair in {chapter}")
            question_map[qid].update(
                {
                    "content": record["clean_question"],
                    "keywords": record["keywords"],
                    "review_status": record["review_status"],
                    "audit_pack": pack["pack_id"],
                }
            )
            answer_map[qid].update(
                {
                    "answer": record["clean_answer"],
                    "review_status": record["review_status"],
                    "audit_pack": pack["pack_id"],
                }
            )
            updated += 1

        write(question_path, questions)
        write(answer_path, answers)

    print(f"Normalized {updated} question/answer pairs to English.")


if __name__ == "__main__":
    main()
