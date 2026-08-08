# Question Bank Audit Workspace

This directory contains generated audit artifacts for the 336-question bank.
The source documents in `Data/Origin` and the extracted records in
`Data/Formed` remain the traceable inputs.

- `question-audit-manifest.json`: one workflow record per question.
- `AUDIT_BASELINE.md`: human-readable baseline and priority queues.

Regenerate both files with:

```bash
python3 scripts/build_audit_manifest.py
```

Do not mark a question eligible for paper assembly until every workflow gate
has passed and the independently derived English answer has been verified.
