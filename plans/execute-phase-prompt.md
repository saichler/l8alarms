# Prompt: Execute a Single Phase of the Event-Ingestion Plan

Copy the text below into a fresh session (a new Claude Code session, in this same repo,
`/home/saichler/proj/src/github.com/saichler/l8alarms`), replacing `<PHASE>` with the phase you
want executed (e.g. `Phase 1`, `Phase 2`, `Phase 3.1`, `Phase 3` for all of Phase 3's sub-phases,
`Phase 6`, etc.).

---

## Prompt

I need you to implement **<PHASE>** of the plan at
`/home/saichler/proj/src/github.com/saichler/l8alarms/plans/remove-local-event-duplication-and-gate-alarm-creation.md`.
This plan has already been reviewed and approved — you are executing it, not re-designing it.

**Before writing any code:**

1. Read the entire plan file, not just <PHASE>. It went through many rounds of revision and later
   sections (Correlation & Threshold State, Proto Changes, Traceability Matrix, Rule Compliance
   Notes) contain design decisions and rationale that earlier phase descriptions assume you already
   know. Reading only the phase's own section will leave you missing context you need to do it
   correctly.
2. Check whether this phase's prerequisites are actually done in the codebase — don't assume the
   plan's phase ordering was followed by some earlier session unless you verify it. Concretely:
   grep/read for the specific files, types, and symbols the *earlier* phases say they
   create/remove/rename. If a prerequisite phase isn't actually done, stop and report that instead
   of either (a) silently implementing it as a side effect or (b) implementing <PHASE> in a way
   that's inconsistent with the prerequisite still being unfinished.
3. Re-read the "Rule Compliance Notes" section specifically for anything relevant to <PHASE> —
   several items there are explicitly flagged as unresolved or as needing verification during
   implementation (e.g. correlation engine strategy-file signatures, the in-memory correlation
   cache's replication-topology assumption). If <PHASE> touches one of those, resolve it by reading
   the actual current code first — don't guess or silently pick an interpretation the plan didn't
   commit to.

**Scope discipline:**

- Implement *only* <PHASE>. If you notice something in a different phase that looks wrong, outdated,
  or worth improving, do not fix it — note it in your final report instead.
- If <PHASE> says a change happens in a different repository (e.g. Phase 3.1's `TimerManager`
  extraction lives in `../l8utils`, not `l8alarms`), follow that instruction exactly: make the
  change in the real sibling repo's source, never in `l8alarms`'s vendored copy, and do not run
  `go mod`/vendor commands yourself — stop after the source change and report what needs
  re-vendoring.
- If executing this phase requires a design decision the plan doesn't actually pin down (check
  Traceability Matrix and Rule Compliance Notes first — several things are deliberately left as
  "confirm before implementing"), stop and ask rather than guessing.

**Constraints already established for this project** (apply throughout, not just when the plan
text repeats them):
- Tests live only under `go/tests/`, and exercise the system through its actual API
  (`common.PostEntity`/HTTP calls), never by calling internal functions directly
  (`test-location-and-approach.md`).
- Any `.proto` file change requires running `cd proto && ./make-bindings.sh` — never hand-edit
  generated `.pb.go` files, never compile individual proto files manually
  (`protobuf-rules.md`).
- Never edit anything under a `vendor/` directory, and never run `go mod tidy`/`go mod vendor`/
  `go mod init` — this project's `go.mod` intentionally has no `require` entries yet; that's
  expected, not something to fix (`vendor-and-git.md`).
- `ServiceName` values must stay ≤10 characters; every `POST` `ServiceCallback` must
  auto-generate its primary key via `common.GenerateID` (`maintainability.md`).
- Never run destructive git commands, never commit unless explicitly asked.

**Verification before reporting done:**
- `gofmt -l` on every file you touched or created.
- If you changed any `.proto` file, confirm `make-bindings.sh` ran cleanly and the expected types
  appear in the regenerated `.pb.go` output.
- A full `go build ./...` is not expected to succeed in this repo right now (no vendored deps) —
  don't treat that as a failure; note what a full build would still need once dependencies are
  vendored.
- Run whatever this phase's own text specifies as its verification steps (several phases list
  concrete test cases or manual checks).

**When you're done, report:**
- Exactly which files you created/modified/deleted, and why each change maps to something the
  phase's text asked for.
- Anything the phase's text left ambiguous that you had to interpret, and what you chose (even if
  you're confident — make it easy for a reviewer to check your interpretation against intent).
- Anything you deliberately did *not* do because it belonged to a different phase or a different
  repository, so it doesn't silently fall through the cracks.
- Any new gap or risk you discovered while implementing that the plan didn't anticipate.
