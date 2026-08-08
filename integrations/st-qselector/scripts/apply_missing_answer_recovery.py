#!/usr/bin/env python3
"""Apply the audited recovery pack for questions that originally lacked answers.

The immutable source documents under Data/Origin are never changed. This
script updates the derived Data/Formed JSON files and is intentionally
idempotent so the recovery can be reproduced and reviewed in Git.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
FORMED = ROOT / "Data" / "Formed"
PACK = ROOT / "Data" / "Audit" / "missing-answer-recovery-v1.json"


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, value: dict[str, Any]) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    pack = load(PACK)
    records = pack.get("records", [])
    if len(records) != 26:
        raise ValueError(f"expected 26 recovery records, found {len(records)}")

    by_chapter: dict[str, list[dict[str, Any]]] = {}
    for record in records:
        by_chapter.setdefault(record["chapter"], []).append(record)

    changed = 0
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
            if qid not in question_map:
                if record["decision"] == "delete":
                    continue
                raise KeyError(f"{qid} not found in {question_path}")

            if record["decision"] == "delete":
                questions["questions"] = [q for q in questions["questions"] if q["id"] != qid]
                answers["answers"] = [a for a in answers["answers"] if a["id"] != qid]
                question_map.pop(qid, None)
                answer_map.pop(qid, None)
                deleted += 1
                continue

            question = question_map[qid]
            question.update(
                {
                    "content": record["clean_question"],
                    "type": record["question_type"],
                    "difficulty": record["difficulty"],
                    "keywords": record["keywords"],
                    "formula_refs": record.get("formula_refs", []),
                    "data_refs": record.get("data_refs", []),
                    "review_status": record["review_status"],
                    "audit_pack": pack["pack_id"],
                }
            )
            answer = answer_map.get(qid)
            if answer is None:
                answer = {"id": qid}
                answers["answers"].append(answer)
                answer_map[qid] = answer
            answer.update(
                {
                    "answer": record["clean_answer"],
                    "review_status": record["review_status"],
                    "audit_pack": pack["pack_id"],
                }
            )
            changed += 1

        write(question_path, questions)
        write(answer_path, answers)

    print(f"Recovered {changed} questions and deleted {deleted} irrecoverable questions.")


if __name__ == "__main__":
    main()
