---
type: llm
weight: 2
---

The review flags Test#01 because "no error returned within 10 seconds" doesn't prove the export was processed, and proposes a MODIFY (or equivalent) that waits for evidence tied to this export: polling `GET /v1/exports/{id}` until `status` is `done` and checking `fileUrl` (or downloading the file).
