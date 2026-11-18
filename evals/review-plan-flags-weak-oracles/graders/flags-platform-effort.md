---
type: llm
weight: 2
---

The review points out that Test#07 (401 without a token) and Test#08 (429, 413, 406) check the shared API gateway, a platform guarantee rather than the exports service's own logic, and proposes lowering their priority (at most P2), tagging them `@platform` and/or reducing them to a sample. It does not propose adding more gateway rows.
