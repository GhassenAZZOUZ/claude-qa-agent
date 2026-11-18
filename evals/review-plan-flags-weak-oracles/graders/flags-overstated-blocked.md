---
type: llm
weight: 2
---

The review says R-03 is wrongly blocked as a whole: removing the file on delete is testable now, and only the audit-log part waits on #212. It proposes splitting it (a runnable row for "deleted export's file is gone", with the audit part kept `@blocked`) and says R-03's Coverage Status `full` overstates what runs (it should be `blocked` or `partial` until then).
