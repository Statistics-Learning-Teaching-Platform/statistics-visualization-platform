# Question Grouping Findings

This checkpoint records structural findings before answer-by-answer rewriting.
It does not certify mathematical correctness.

## Atomic-selection rule

- Every question record is one paper-selection atom.
- A record containing `a.`, `b.`, and later top-level parts is selected, paginated,
  previewed, and exported as one question.
- The API exposes `groupId`, `partCount`, and `selectionUnit: "atomic"`.
- Similar subject matter alone is never sufficient reason to merge two records.
- A genuinely unrelated exercise accidentally appended to a record must be split
  or removed before that record becomes paper-eligible.

## Confirmed structural blockers

| Record | Finding | Required action |
|---|---|---|
| `ch01_q10` | Its answer appends the multistage-cluster answer for `ch01_q11`. | Remove the appended answer fragment. |
| `ch01_q16` | The stem asks several parts, but the answer covers only a later part. | Recover or rewrite all parts. |
| `ch03_q11` | Two unrelated exercises are bundled into one record. | Split into separate self-contained questions. |
| `ch03_q16` | The answer is a stem-and-leaf data list unrelated to the percentile stem. | Re-solve or delete. |
| `ch03_q17` | The answer is only an instruction fragment. | Re-solve or delete. |
| `ch04_q20`–`ch04_q22` | Several answers are shifted or contaminated by adjacent exercises. | Rebuild the ID-to-answer mapping. |
| `ch04_q27`, `ch04_q30` | Duplicate probability-distribution exercise. | Keep one verified copy. |
| `ch04_q32`, `ch04_q34`, `ch04_q35` | Multi-part answers are incomplete. | Re-solve every part or delete. |
| `ch05_q21`, `ch05_q26` | Duplicate elevator-uniform exercise with partial answers. | Keep one complete verified copy. |
| `ch05_q29`–`ch05_q35` | Multiple answers omit requested subparts. | Re-solve every part or delete. |
| `ch06_q22`, `ch06_q24`, `ch06_q27`, `ch06_q34`, `ch06_q35` | Multi-part answers are incomplete or truncated. | Re-solve every part or delete. |
| `ch06_q26`, `ch06_q30` | Different stems have an identical copied answer. | Independently solve both and replace the wrong mapping. |
| `ch07_q25`, `ch07_q28` | Answers are incomplete or opaque. | Recover source context and verify. |
| `ch08_q30` | Regression stem is paired with an unrelated coffee-consumption answer. | Independently solve the regression item. |
| `ch10_q04` | Several separate worked examples are bundled under one ID. | Split into coherent atomic questions. |
| `ch11_q02` | Its answer appends a separate advertising/sales regression exercise. | Keep the correlation answer and split the appended exercise. |

## Duplicate review queue

- `ch01_q06` and `ch01_q07` contain the same variable-classification exercise.
- `ch06_q21` and `ch07_q01` are duplicates.
- `ch06_q31`–`ch06_q33` repeat `ch07_q19`, `ch07_q20`, and `ch07_q23`.
- Cross-chapter duplicates will be resolved only after the retained copy has a
  complete English stem and independently verified answer.

## Image-answer queue

Several Ch08 and Ch09 answers are image-only. They are not rejected merely for
using images, but each image must be readable, mapped to the correct stem, and
checked for coverage of every subpart before the question becomes eligible.
