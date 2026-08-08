#!/usr/bin/env python3
"""Apply a chapter review pack to the derived question bank.

Usage: python3 scripts/apply_review_pack.py Data/Audit/<pack>.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
FORMED = ROOT / "Data" / "Formed"


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, value: dict[str, Any]) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pack")
    args = parser.parse_args()
    pack_path = Path(args.pack)
    if not pack_path.is_absolute():
        pack_path = ROOT / pack_path
    pack = load(pack_path)
    records = pack.get("records", [])
    if not records:
        raise ValueError("review pack contains no records")

    by_chapter: dict[str, list[dict[str, Any]]] = {}
    for record in records:
        by_chapter.setdefault(record["chapter"], []).append(record)

    reviewed = 0
    deleted = 0
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
            decision = record["decision"]
            if qid not in question_map:
                if decision == "delete":
                    continue
                raise KeyError(f"{qid} not found in {question_path}")
            if decision == "delete":
                questions["questions"] = [item for item in questions["questions"] if item["id"] != qid]
                answers["answers"] = [item for item in answers["answers"] if item["id"] != qid]
                question_map.pop(qid, None)
                answer_map.pop(qid, None)
                deleted += 1
                continue

            question = question_map[qid]
            answer = answer_map.get(qid)
            if answer is None:
                raise KeyError(f"{qid} has no answer record")
            for source_key, target_key in (
                ("clean_question", "content"),
                ("question_type", "type"),
                ("difficulty", "difficulty"),
                ("keywords", "keywords"),
                ("formula_refs", "formula_refs"),
                ("data_refs", "data_refs"),
            ):
                if source_key in record:
                    question[target_key] = record[source_key]
            if "clean_answer" in record:
                answer["answer"] = record["clean_answer"]
            review_status = record.get("review_status", "independently solved and reviewed")
            question["review_status"] = review_status
            question["audit_pack"] = pack["pack_id"]
            answer["review_status"] = review_status
            answer["audit_pack"] = pack["pack_id"]
            reviewed += 1

        write(question_path, questions)
        write(answer_path, answers)

    print(f"Reviewed {reviewed} records and deleted {deleted} records using {pack['pack_id']}.")


if __name__ == "__main__":
    main()
