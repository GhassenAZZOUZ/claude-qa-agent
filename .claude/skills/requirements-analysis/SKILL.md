---
name: requirements-analysis
description: Reference only — the single definition of how requirements are analyzed before tests or stories are written — intake (text, issue, enhanced story, spec, exploration session, approved test plan) into one requirements model, the readiness gate (Missing Information, vague wording), requirement IDs (AC-NN from stories, R-NN derived from plain text), the scenario categories and tag mapping, the per-element test checklists, and what each row must prove (product vs platform, contract vs current code, known gaps, async evidence, fixture feasibility, execution risks). Applied inline by e2e-session, write-tests, integration-tests and traceability; read by test-writer, user-story-enhancer and user-story-format. Not a workflow on its own.
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
| **Asynchronous processing**: only when the outcome appears after the response (job, queue consumer, webhook, controller) | success observed for the current input (§6 "Proof it happened") · each failure reason distinct and readable · a stale result never shown as current · a retry or restart creates no duplicate effect |

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

## 6. What a row proves

§4 and §5 say what to cover. Before a scenario becomes a row, check that it proves something about the **product**, and that it can run. Ask two questions per row: *could it pass while the product is broken?* *could it fail while the product is fine?* A yes to either is fixed here, or the row is dropped.

| Check | Rule |
|---|---|
| **Who can break it** | Name the component that implements the behavior. When the API is served by a platform (an API gateway, a framework's generated CRUD, the Kubernetes API server for a custom resource), the platform's own semantics (error shape, pagination, streaming, patch types, optimistic concurrency, its authorizer, rate limits) are **platform guarantees**: one sample row per behavior, tagged `@platform`, priority at most P2, unless the product configures that behavior (its schema, its roles, its rules). The product's own logic gets the remaining rows and the P0/P1s. The §5 OpenAPI checklist then applies to what the product's schema states, not to every platform option |
| **Contract, not current code** | Sources often describe today's implementation ("the worker currently names files `export-{id}.csv`", "retries after 30 s in this version"). Assert the contract's properties (present, stable, unique per key), not the current format. A row that pins current behavior on purpose is tagged `@probe`: it documents, it doesn't gate a release |
| **Known gap** | When the source records a defect, the row asserts the **required** outcome, is tagged `@known-gap @retries:0`, and its title names the tracker ticket (file one first when the source only gives a gap ID: a gap in a document isn't a ticket). Write the known-gap step (`the known gap "<ticket>" is expected from here`) right before the defect assertion: it calls `test.info().fail()`, so a failing precondition (fixture, 500, timeout in a `Given`) stays a real failure. Assert the defect's exact signature, not just "something fails". When the defect shows as a timeout, add a liveness witness in the same window (a control that must succeed), and replay a canary at the end of the run: a crashed product would otherwise make every known gap "fail as expected". When the defect needs an event to happen (a reconcile, a retry), make that event a precondition, or a missing event looks like a fix. Never assert the defective behavior as if it were correct, and never use the `@fail` tag: it turns any failure into an expected one |
| **Precondition proof** | When an outcome only means something if an earlier state existed (a reservation, a lock, a pending job), observe that state through the API first, for example with a probe request that collides with it, instead of assuming it. Don't destroy the evidence before reading it: keep a rejected object alive while checking it left nothing behind |
| **Proof it happened** | For asynchronous processing, wait for evidence tied to the current input: a version or generation counter reaching the new value, an event about this resource, a timestamp after the change. "No error within N seconds" proves nothing. A change the product may ignore (a no-op update) doesn't prove a reprocess happened |
| **"Never happens"** | A row asserting that something must not happen states its observation window and has a positive control: the same setup without the fault does produce it. It reads an event stream opened before the action (a watch from the creation version, a webhook log), not polling, which can miss a transient state |
| **Fixture feasibility** | Every precondition is created through an interface the test can use, and checked against that interface's own schema and rules. A state the dependency's validation forbids, or a server-owned field the client can't write, can't be a fixture at this level: that requirement goes to a lower level (unit, component), and its Coverage Status is `not-observable` |
| **Execution** | How can the row fail for a reason that isn't the product? A window too short to hit (races: tag `@race @retries:0`; a green run means "not reproduced in N attempts", never acceptance evidence; a red run is a defect, never a flaky) · a retry meeting its own leftovers (unique keys per attempt) · backoff after an injected fault longer than the nominal wait (a separate recovery budget, or a change that forces reprocessing) · shared global state (unique keys per test, not per run) · a cascade (deleting a type, tenant or namespace deletes every instance: `@destructive`, isolated, last) · a streaming response (a client that reads streams, or a server-side timeout) · a transient state that passes in milliseconds (read it from the write's response or an event, not a later GET) |
| **Split, don't block** | When part of a requirement depends on a contract or capability that doesn't exist yet, plan the testable part now and mark only the dependent part `@blocked`. A whole requirement goes `@blocked` only when nothing of it is observable |
| **Assumed platform behavior** | A row relying on platform behavior nobody has observed on the target environment (the exact status code for an invalid query option, whether a schema format is enforced) lists it in the plan's Entry criteria as "verify on <env>". When a source describes the platform at length by hand, check that description in one run (`@calibration`: never gating, a mismatch corrects the source or the row) and keep as `@platform` only what consumers depend on |
| **Personas, not fixtures** | Permission rows use the roles the product ships, or the platform's standard roles users are really bound to. A role invented for the test only exercises the platform's authorizer: it belongs to `@calibration`, not to the P0s |
