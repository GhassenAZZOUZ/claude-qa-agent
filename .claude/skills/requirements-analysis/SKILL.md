---
name: requirements-analysis
description: Reference only — the single definition of how requirements are analyzed before tests or stories are written — intake (text, issue, enhanced story, spec, exploration session, approved test plan) into one requirements model, the readiness gate (Missing Information, vague wording), requirement IDs (AC-NN from stories, R-NN derived from plain text), the scenario categories and tag mapping, and the per-element test checklists. Applied inline by e2e-session, write-tests, integration-tests and traceability; read by test-writer, user-story-enhancer and user-story-format. Not a workflow on its own.
---

# requirements-analysis

One set of rules for turning requirements into something testable. Skills
apply it inline; agents `Read` `${CLAUDE_PLUGIN_ROOT}/.claude/skills/requirements-analysis/SKILL.md`.
When a rule changes, change it here only.

## 1. Intake → requirements model

| Source | Requirement IDs | Scenario hints | Open questions |
|---|---|---|---|
| **Enhanced story**: a `user-story-format` body with an `## Acceptance Criteria` table | `AC-NN`, as written | its Gherkin ACs (and a legacy Test Scenarios table, if the story predates WAY 19) | its `## Missing Information` section |
| **Approved test plan** (`test-plan` skill format) | its `## Requirements` table, as written | its Planned tests rows: these **are** the scenarios, nothing is added | none: the plan passed the gate when it was designed |
| **Issue without an AC table** | `R-NN`, derived (§3) | — | derived (§2) |
| **Plain text** | `R-NN`, derived (§3) | — | derived (§2) |
| **OpenAPI spec only** | none: operations are the units, tests are `**Covers:** untraced` | the spec's operations; each request property and parameter is an element whose schema keywords are its stated limits (§5, OpenAPI schema constraints) | — |
| **Exploration session** (WAY 18 `session.yaml`) | `R-NN`, derived: one per completed flow not already covered, one per field's group of `validations`. They describe the app's **current** behavior, so the user confirms each is intended (§3) | the flow's steps and checkpoints, the validation inputs | none beyond that confirmation; anomalies are handled like bug reports |
| **Bug report** (WAY 3 regression test) | none: the one requirement is the bug's expected result, tests are `**Covers:** untraced` | the reproduction steps | `bug-report`'s own checks (it asks when Observe or the expected result is missing) |

A spec given **with** a story or text adds API context. The IDs still come from the story or text.

Extract, whatever the source:
- **Actors / roles** (guest, user, admin, another user…)
- **Data elements**: input fields, ID-based resources, file uploads, numeric fields, auth/session. From a spec: every request-body property, path, query and header parameter, with its schema keywords (`minLength`, `maximum`, `enum`, `pattern`, `required`…) as `limits`
- **Non-functional statements** with numbers (latency, size limits, browsers). Without a number, a statement goes to §2
- **Constraints** (business rules, limits, formats)

The model the caller passes to `test-writer`:

```yaml
source: "#148"          # or: text
ids: AC                 # AC | R | none
requirements:
  - id: AC-01
    text: A valid discount code reduces the order total
    priority: must      # AC: as written. R: must, unless the text marks it optional
actors: [shopper, guest]
elements:
  - { kind: input, name: discount code, limits: "1–20 chars" }
  - { kind: id, name: orderId }
nfr: [ "apply responds in < 1 s" ]
open_questions: []      # must be empty before tests are written (§2)
```

## 2. Readiness gate

Tests are not written on guesses. The gate applies to stories, issues and plain text; specs and bug reports skip it (§1). The requirements are **not ready** while any of these hold:

- The story's `## Missing Information` has an item other than `- none`
- An expected outcome can't be asserted ("works correctly", "is handled")
- A **vague word** decides an outcome without a measurable value: fast, quick, slow, easy, simple, intuitive, user-friendly, some, various, several, appropriate, reasonable, good, nice, normally, as needed, etc.
- Two statements contradict each other
- A permission rule names no actor ("only allowed users")

Each item becomes one question in `open_questions`. Missing non-functional requirements are **noted, not blocking**.

Who asks:
- **The WAY skill** (`e2e-session`, `write-tests`, `integration-tests` with `Issue:`) builds the model inline and asks the user **before** starting `test-writer`. One message holds the questions and, for `R-NN`, the requirements table (§3). Wait for answers, update the model, then start `test-writer`
- **`test-writer`** checks again. If it receives requirements that aren't ready (or plain text / an issue with no confirmed model), it doesn't write tests. It returns the questions and its proposed `R-NN` table to the caller
- **`user-story-enhancer`** (WAY 6) writes the questions into the story's `## Missing Information`. That's where they belong for a tracker story

## 3. Requirement IDs

**`AC-NN`**: owned by the story (`user-story-format`). Use them as written. Never renumber or invent one. A test that matches no AC is `**Covers:** untraced`.

**`R-NN`**: derived from plain text, or from an issue without ACs:
- One `R-NN` per **independently testable statement**: one actor, one action or condition, one observable outcome. Split "and" when the parts have different outcomes ("the link is emailed **and** expires after 1 hour" → two)
- Number from `R-01` in text order. Keep the user's wording. Don't add requirements the text doesn't state: those are open questions (§2) or `untraced` tests
- **Confirmed before use**: show the table with the gate questions, and apply the user's corrections
- **Persisted** in the test plan's `## Requirements` table and the test folder's index `.md`, right under the `**Source:**` line:

  ```markdown
  ## Requirements
  | ID | Requirement | Priority |
  |---|---|---|
  | R-01 | A user can request a reset link from the login page | must |
  | R-02 | The reset link is sent by email | must |
  | R-03 | The reset link expires after 1 hour | must |
  ```
- **Scoped to that folder**: `R-03` means R-03 of that folder's index
- **Stable**: when tests are added to a folder that already has a Requirements table, keep its IDs and append new ones
- **Never mixed with ACs**: a folder uses one scheme. If the source story later gets ACs (WAY 6), the ACs win. `traceability` then reports the R-NN tests as untraced against the story, and offers `write it <ref>` to re-trace them

Tests cite IDs the same way in both schemes: `**Covers:** R-01, R-03` in `Test#<nn>.md`, and `# Test#<nn> | R-03: <short title>` above the Gherkin scenario.

## 4. Scenario categories

One list, used by test-writer's scenarios **and** the test plan's Category column (`test-plan` skill):

| Category | Meaning | Gherkin tags | When it's required |
|---|---|---|---|
| `happy_path` | the primary success flow | `@positive` | every requirement |
| `negative` | invalid input or a forbidden action, with the rejection asserted | `@negative` | every requirement that takes input or an action |
| `edge_case` | valid but extreme input or state | `@edge-case` | when §5 lists one for an element involved |
| `boundary` | at and just beyond a stated limit, on **both** sides (min and max) | `@boundary` (often an Outline) | every stated limit, including each spec schema keyword in §5 |
| `security` | injection, XSS, IDOR, auth bypass, data exposure | `@security @negative` | any input field, ID-based resource, or authenticated action |
| `permissions` | each actor/role gets exactly its access | `@auth` (`@negative` for the denials) | more than one actor, or a resource with an owner |
| `performance` | a stated latency or load target | `@performance` | only when a non-functional statement gives a number |

Each scenario becomes one `Test#<nn>`, or one `Examples` row when ≥ 2 variants share a flow.

## 5. Checklists by element

For every element in the model, cover each applicable line. Each is a scenario (or an `Examples` row) in `test-writer`, and a gap to report in `user-story-enhancer` when the story's ACs leave it unspecified.

| Element | Cover |
|---|---|
| **Input field** | empty · whitespace only · min length - 1 · min length (when a minimum is stated) · max length · max length + 1 · special characters / unicode · unexpected format · SQL injection · XSS payload |
| **ID-based resource** | valid · invalid format · non-existent · another user's (IDOR) · deleted |
| **File upload** | valid · empty file · oversized · wrong MIME type · malicious filename |
| **Numeric field** | min - 1 · min (0 and -1 when no minimum is stated) · max · max + 1 · decimal where an integer is expected · non-numeric |
| **Auth / session** | guest · expired session or token mid-flow · insufficient role |
| **Concurrency**: only when two actors or tabs can change the same resource | double submit · simultaneous edit (last write, or a conflict error, as specified) |
| **Failure of a backend call**: only for actions that call one (submit, pay, save) | a failed or slow response shows an error and doesn't hang · retrying creates no duplicate |

### OpenAPI schema constraints

For a spec, each request property and parameter is an element, and each keyword it carries is a stated limit. One `@boundary` Scenario Outline per property, with an `expected status` column: values inside the limit → the documented 2xx, values outside → 4xx (400 or 422, as documented), **never 5xx**.

| Keyword | Rows |
|---|---|
| `minLength` / `maxLength` | min - 1 · min · max · max + 1 characters (no min - 1 when min is 0) |
| `minimum` / `maximum` | min - 1 step · min · max · max + 1 step (step = 1 for `integer`, `multipleOf` or 0.01 for `number`) |
| `exclusiveMinimum` / `exclusiveMaximum` | the bound itself (rejected) · one step inside (accepted). OAS 3.0 sets it as a boolean on `minimum`/`maximum`, 3.1 as the bound's value |
| `minItems` / `maxItems` | min - 1 · min · max · max + 1 items |
| `pattern` | one matching value · one value that is valid in every way except the pattern |
| `enum` | every allowed value (one row each) · one value outside the set · a case variant of an allowed value |
| `format` (`email`, `date`, `date-time`, `uuid`, `uri`) | one valid value · one malformed value |
| `required` | absent · `null` · empty (`""`, `[]` or `{}`, by type): three separate rows, because APIs often treat them differently |
| not `nullable` (no `null` in `type`) | `null` → 4xx |
| `type` | one value of the wrong type |
| `default` | property absent → the default applies (assert it on the response or a read) |
| `additionalProperties: false` | one unknown property → 4xx |

Put JSON literals in the Examples column (`"AB"`, `91`, `null`) and the placeholder unquoted in the body (`{ "code": <code> }`), so `null` and numbers keep their type. The `required` "absent" row is its own Scenario, since an Outline row can't drop a key. Change only the property under test per row: every other property stays at a valid value.
