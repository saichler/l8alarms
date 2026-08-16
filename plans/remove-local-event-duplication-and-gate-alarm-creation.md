# Remove Local Event Duplication; Gate Alarm Creation Behind Definition Matching

## Purpose

1. Remove `l8alarms`'s local `Event` Prime Object (`alm.Event`, `go/alm/events/`) — it duplicates
   `l8events`'s shared `EventRecord` type.
2. Make the `Alarm` service itself the receiver of incoming events (push, from an unknown source —
   no polling), typed against the shared `l8events.EventRecord`. **Revised again, simplified per
   direct instruction: no separate `PendingAlarmService`.** An `Alarm` is created immediately on
   first match — even if below `AlarmDefinition.threshold_count` or still correlation-eligible —
   and is changed or deleted afterward as more information arrives, tracked via a new
   `correlation_threshold_state` field (see "Correlation & Threshold State" below) rather than by
   withholding creation in a separate cache/service. There is still no externally-invokable "Create
   Alarm" interface — `Alarm`'s `POST` accepts only an `EventRecord`, never a caller-supplied
   `Alarm`, and is vnic-reachable only, no HTTP path.
3. Switch `l8alarms`'s hand-rolled Alarm UI (`alarms-columns.js`/`alarms-forms.js`) onto the
   shared, reusable `L8Events*` components already published in `l8ui/events/` (`l8ui` is now a
   proper git submodule of this project) instead of duplicating them locally.

## Note on scope (corrected twice already in this conversation — stated explicitly to avoid a third miss)

- **No polling.** Earlier drafts of this plan proposed a ticker-driven poller pulling from
  `l8events`. That's wrong — the source pushes the event to `l8alarms`.
  - Earlier still, this conversation surfaced two stale cross-repo planning documents
  (`../l8notify/plans/PLAN-L8ALARMS.md`, `../l8events/plans/PLAN-L8EVENTS-SHARED-LIBRARY.md`)
  describing `l8notify`/`l8events` as compile-time Go library dependencies. That model predates the
  services-over-vnic architecture already in place (`l8notify` was migrated to
  `vnic.Resources().Notify()` earlier this session) and is **not used as a basis for this plan**.
- **No archiving, no maintenance windows** are part of this event-ingestion feature's design.
  `archivedevents`/`ArchivedEvent` has nothing left to archive once local `Event` is removed, so
  that piece is deleted as a forced consequence, not a design choice. `archivedalarms`/
  `ArchivedAlarm` (archiving `Alarm` records) and `notificationpolicies`/`escalationpolicies` are
  **confirmed out of scope for this plan** — any changes to those are deferred to a separate plan.
- Everything else already true in the project (Alarm state machine, correlation engine,
  notification/escalation via `l8notify`) is unaffected — this plan only changes how an `Alarm`
  comes into existence.

## How This Was Verified (not guessed)

Two mechanisms make this design possible, both confirmed against real, existing code — not
invented for this plan:

1. **Events arrive over vnic, not REST/`WebService`.** `WebService`/`AddEndpoint`
   (`l8utils/go/utils/web/WebService.go`) governs HTTP↔action translation only —
   `WebService.Protos()` deserializes an HTTP request body into a registered Go type. A direct
   `vnic.Request(...)` call (the mechanism `common.PostEntity`/`common.GetEntitiesByQuery` already
   use everywhere in this codebase, and the same mechanism `vnic.Resources().Notify().Send()` uses
   under the hood — see `l8utils/go/utils/notify/notify_api.go` from earlier this session) reaches
   a service's `Before()`/`After()` hooks directly, with an already-typed Go object, and never
   touches `WebService`/HTTP at all. So: `Alarm`'s `WebService` registration must omit `POST` from
   its HTTP-facing config — no HTTP path can reach `Before(POST)` for any body shape. Whoever
   submits an event (the "unknown source") does so via a plain internal vnic call —
   `common.PostEntity("Alarm", 10, eventRecord, vnic)` or raw `vnic.Request(...)` — the same
   pattern already used throughout this codebase for service-to-service calls, not a web hook.
   Confirmed the UI never had a `PUT`-based edit flow for `Alarm` in the first place — the only
   UI-facing actions are `GET` (browse) and `PATCH` (Acknowledge + notes only). So `Alarm`'s
   `WebService` registration drops both `POST` and `PUT` from its HTTP-facing config, keeping only
   `GET` (`L8Query`→`AlarmList`), `PATCH` (`alm.Alarm`, scope-restricted — see Phase 3), and
   `DELETE` (`L8Query`) reachable over HTTP.
   `l8pollaris`'s `TargetService`/`TargetAction` (`go/pollaris/targets/TargetService.go:72-75`,
   `TargetCallback.go:54-63`) was cited in an earlier draft of this plan as precedent — that's
   wrong to follow here, since `TargetAction` **is** registered via `WebService.AddEndpoint` and
   **is** HTTP-reachable, which is exactly the shape being avoided. The only thing still worth
   taking from that example is item 2 below, which is unrelated to transport.
2. **`Before()` can skip persistence entirely, or substitute what gets persisted.**
   `l8pollaris`'s `TargetCallback.Before()` (`go/pollaris/targets/TargetCallback.go:54-63`)
   type-switches the incoming body; for its command type it performs a side effect and returns
   `(nil, false, nil)` — confirmed (`BaseServiceNotifications.go:44-54`) that `cont=false` skips
   the cache write entirely and returns a normal, empty-body success response; nothing is
   persisted. Separately, when `cont=true`, whatever `interface{}` `Before()` returns (even a
   different value than what was passed in) is what actually gets persisted. Both are exactly what
   "create / merge / drop" needs — no new framework capability required.

## Target Flow (revised — single service, create-then-adjust via `correlation_threshold_state`)

Single service again — no `PendingAlarmService`. An `Alarm` is created on first match regardless of
whether `threshold_count`/correlation would normally justify it yet; `correlation_threshold_state`
(new field, see "Correlation & Threshold State" below) tracks whether it's still provisional, and a
per-alarm timer deletes it later if the threshold window closes without enough occurrences.

```
(unknown source, another service on the mesh)
        │  direct vnic call — common.PostEntity("Alarm", 10, eventRecord, vnic)
        │  NOT HTTP, NOT WebService — Alarm's POST has no HTTP-facing route at all
        ▼
Alarm.Before(POST) — query active AlarmDefinition records (common.GetEntitiesByQuery, existing pattern)
        │
        ├─ no definition matches (event_category_filter / event_pattern / node_type_filter)
        │  → DROP: return (nil, false, nil)
        │
        ├─ matches a definition whose clear_event_pattern this event satisfies, AND an
        │  ACTIVE alarm exists for that definition's DedupKey
        │  → CLEAR: common.PutEntity the existing Alarm (State=CLEARED, ClearedAt=now,
        │    ClearedBy="system:event"), cancel its threshold-window/auto-clear timers,
        │    then return (nil, false, nil)
        │
        ├─ matches, and an ALARM already exists for the DedupKey (regardless of
        │  correlation_threshold_state — PENDING_THRESHOLD or OPEN_FOR_CORRELATION both merge
        │  the same way)
        │  → MERGE: update the existing Alarm in place (common.PutEntity) — see Phase 3 for exact
        │    field semantics — if correlation_threshold_state was PENDING_THRESHOLD and
        │    OccurrenceCount now >= threshold_count, transition it to OPEN_FOR_CORRELATION and
        │    cancel its threshold-window timer, PATCH the source EventRecord in l8events
        │    (state=PROCESSED, generated_alarm_id=<existing alarm's id>), then
        │    return (nil, false, nil)
        │
        └─ matches, no existing Alarm → CREATE immediately, regardless of threshold_count:
             build *alm.Alarm{} (common.GenerateID for AlarmId, DefinitionId, NodeId/NodeName
             from SourceId/SourceName, Severity from the definition's DefaultSeverity, EventId,
             DedupKey, State=ACTIVE, FirstOccurrence=LastOccurrence=now, OccurrenceCount=1,
             correlation_threshold_state = PENDING_THRESHOLD if threshold_count>1, else
             OPEN_FOR_CORRELATION), return (newAlarm, true, nil) — framework persists this as the
             POST's result. Existing After(POST) chain fires unchanged (runCorrelation →
             runNotification → runEscalation — see "Correlation & Threshold State" for
             runCorrelation's new guard condition), plus a new runner that PATCHes the source
             EventRecord; start the threshold-window timer if PENDING_THRESHOLD, the auto-clear
             timer if auto_clear_enabled.
```

`Alarm` already has every field create/merge needs — `DedupKey` (24), `OccurrenceCount` (23),
`FirstOccurrence`/`LastOccurrence` (17/18), `EventId` (27), `RootCauseAlarmId`/`CorrelationRuleId`/
`IsRootCause`/`SymptomCount` (13-16). One new field is needed — see "Correlation & Threshold State."

**Accepted risk, explicitly not engineered around**: two events for the same `DedupKey` arriving
concurrently can both read "no existing alarm" before either write lands, producing two `Alarm`s
instead of one merge. Confirmed acceptable — "handled by the cache, worst case they open two
alarms." No locking/transaction is added for this in Phase 3.

## Correlation & Threshold State (new — replaces the `PendingAlarmService` design)

Per direct instruction: create the `Alarm` immediately, track provisional status on the alarm
itself, and change/delete it later rather than withholding creation in a separate service. This
also resolves two concerns from the previous (`PendingAlarmService`) draft for free: correlation
runs on already-persisted data again (no pre-persistence engine-signature risk), and there's no
dangling-reference sequencing question for correlation writing to *other* alarms, since everything
already has a real, persisted ID by the time correlation runs — same as the original, unmodified
design.

- **New field on `alm.Alarm`**: `AlmCorrelationThresholdState correlation_threshold_state = 31;`
  (next available field number after `state_history=30`). New enum in `alm-common.proto`:
  ```protobuf
  enum AlmCorrelationThresholdState {
    ALM_CORRELATION_THRESHOLD_STATE_UNSPECIFIED = 0;
    ALM_CORRELATION_THRESHOLD_STATE_PENDING_THRESHOLD = 1;      // still accumulating toward threshold_count; may be deleted if the window closes first
    ALM_CORRELATION_THRESHOLD_STATE_OPEN_FOR_CORRELATION = 2;   // threshold satisfied; eligible to gain NEW symptoms AND be linked as a symptom itself
    ALM_CORRELATION_THRESHOLD_STATE_STABLE = 3;                 // correlation window closed; can still be linked as a symptom of another alarm, but can no longer gain new symptoms of its own
  }
  ```
- **Threshold-window timer**: same per-alarm `time.NewTimer` pattern as `escalation/scheduler.go`
  (not a poller). Started on CREATE when `correlation_threshold_state=PENDING_THRESHOLD`, for
  `threshold_window_seconds`. Cancelled early if a MERGE pushes `OccurrenceCount` to
  `threshold_count` first (transitions to `OPEN_FOR_CORRELATION` instead). On fire: if still
  `PENDING_THRESHOLD` (threshold never reached in time), `common.DeleteEntity` the alarm — it
  should never have existed as a real alarm. This is the "create then delete it afterward" case per
  direct instruction.
- **Correlation-window timer** (new, distinct from the threshold-window timer above): started when
  an alarm becomes `OPEN_FOR_CORRELATION`, for a new duration field — **`correlation_window_seconds`
  on `AlarmDefinition`** (proto change; confirmed via investigation that neither
  `CorrelationRule.time_window_seconds` — a *different*, already-used concept for temporal-proximity
  matching between two alarms — nor `AlarmDefinition.threshold_window_seconds` — currently unused in
  Go code anywhere — is this. This is a genuinely new field, not a rename). On fire:
  `correlation_threshold_state` transitions `OPEN_FOR_CORRELATION` → `STABLE`.
- **Directional correlation eligibility** (per direct clarification): once `STABLE`, an alarm can no
  longer *gain* new symptoms (stop being offered as a root-cause candidate for newly arriving
  alarms/events), but it can still *become* a symptom of some other alarm — including retroactively,
  if a later alarm turns out to be its true root cause. `PENDING_THRESHOLD` alarms are excluded from
  correlation entirely, in both directions (unchanged from before — no point linking something that
  might still be deleted).
- **New in-memory correlation-eligible cache — confirmed as new work, not existing behavior.**
  Investigated `go/alm/correlation/engine.go` and `correlation_runner.go` directly: today, the
  engine is fully stateless (`Engine.Correlate(alarm, rules, ctx)` holds no data between calls) and
  `runCorrelation` re-queries `Alarm` fresh on every invocation, filtered only by `State=ACTIVE` —
  no cache, no eviction, no correlation-eligibility concept exists anywhere in this codebase today.
  Per direct instruction, this plan now builds one: a package-level, mutex-guarded
  `map[string]*alm.Alarm` (matching the project's existing style — `l8utils/go/utils/cache` and
  `l8services/go/services/dcache` exist as heavier distributed-cache primitives elsewhere in the
  framework, but neither `correlation` nor `alarms` currently uses them, so a simple local map is
  the better fit here, not a new dependency). Alarms are added on the `PENDING_THRESHOLD`→
  `OPEN_FOR_CORRELATION` transition, evicted on `OPEN_FOR_CORRELATION`→`STABLE`. `runCorrelation`
  reads from this cache for the "does the new alarm gain a symptom" direction (only
  `OPEN_FOR_CORRELATION` entries are valid root-cause targets); the "does the new alarm turn out to
  be someone else's root cause" direction still needs to reach `STABLE` alarms too, so that pass
  queries `Alarm` directly for `correlation_threshold_state IN (OPEN_FOR_CORRELATION, STABLE)`
  rather than relying on the cache (which by design excludes `STABLE`).
  **Caveat worth flagging plainly**: this is a process-local, in-memory cache. If `l8alarms` ever
  runs with more than one replica, each replica's cache would diverge independently — a state
  transition handled on replica A wouldn't be visible to replica B's cache. This plan doesn't verify
  `l8alarms`'s replication topology; if it runs single-instance today this is a non-issue, but it's
  worth confirming before treating the cache as authoritative rather than the DB.
  **Not yet verified**: the exact mechanics of wiring this two-directional distinction into
  `Engine.Correlate`'s existing signature and the four strategy files (topological/temporal/pattern/
  composite) — confirmed those files are stateless and read only from `ctx.ActiveAlarms`, but I have
  not traced each strategy's internal matching logic closely enough to say whether splitting
  "root-cause candidates" from "symptom candidates" into two different `ctx.ActiveAlarms` sets (one
  per pass) is a clean drop-in change or requires touching the strategies themselves. Needs a closer
  read of `topological.go`/`temporal.go`/`pattern.go`/`composite.go` before implementation.

## Proto Changes

### `proto/alm-events.proto` — delete entirely
`alm.Event`/`alm.EventList` removed. The `import "l8events.proto"` already present in
`alm-alarms.proto`/`alm-definitions.proto` for `Severity`/`EventState`/`AlarmState` stays.

### `proto/alm-archive.proto` — remove `ArchivedEvent` only
Forced consequence of removing `Event` — nothing left to archive. `ArchivedAlarm` is untouched.

### `proto/alm-definitions.proto` — `AlarmDefinition.event_type_filter`
Currently `AlmEventType event_type_filter = 7` (l8alarms' own enum, populated only by the
now-removed local `Event.event_type`). Change to `l8events.EventCategory event_category_filter = 7`
to match `EventRecord.category` directly; add `import "l8events.proto"` if not already present.
Keep `event_pattern` (string, field 6) for finer-grained matching against `EventRecord.event_type`/
`message` — **confirmed: regex.**

### `proto/alm-definitions.proto` — new `AlarmDefinition.correlation_window_seconds` (int32)
Confirmed new field — neither `CorrelationRule.time_window_seconds` (temporal-proximity matching
between two alarms, a different concept) nor `AlarmDefinition.threshold_window_seconds` (currently
unused in Go code anywhere) covers this. Next available field number on `AlarmDefinition` — check
current max (`threshold_window_seconds=10` was the last one confirmed; verify nothing else was
added since).

### `proto/alm-common.proto` — `AlmEventType` enum
Delete once Phase 1+2 leave zero references (verify with grep before deleting).

### `proto/alm-common.proto` — new `AlmCorrelationThresholdState` enum
See "Correlation & Threshold State" above — `UNSPECIFIED=0`, `PENDING_THRESHOLD=1`,
`OPEN_FOR_CORRELATION=2`, `STABLE=3`.

### `proto/alm-alarms.proto` — `Alarm.correlation_threshold_state` (new field, 31)
See "Correlation & Threshold State" above. No other `Alarm` fields change.

## Traceability Matrix

| # | Item | Platform | Phase |
|---|---|---|---|
| 1 | `alm.Event`/`EventList` proto duplicates `l8events.EventRecord` | Backend | Phase 1 |
| 2 | `Event` service (`go/alm/events/`) is bare CRUD with no matching logic | Backend | Phase 1 |
| 3 | `activate_all.go` activates the local `Event` service | Backend | Phase 1 |
| 4 | `ArchivedEvent`/`archivedevents` has nothing left to archive once `Event` is gone | Backend | Phase 1 |
| 5 | Event-related code in `archiving/engine.go` archives data l8alarms no longer owns | Backend | Phase 1 |
| 6 | "Events" tab/columns/forms/reference-registry entry for the local type | Desktop | Phase 1 |
| 7 | Same removal, mobile side — `go/alm/ui/web/m/` registry-driven equivalent, if any | Mobile | Phase 1 |
| 8 | Mock generators produce local `alm.Event` records | Backend | Phase 1 |
| 9 | Tests exercise `/alm/10/Event` CRUD/validation that will no longer exist | Backend | Phase 1 |
| 10 | `AlarmDefinition.event_type_filter` typed against a dead local enum | Backend | Phase 2 |
| 11 | `AlmEventType` enum becomes dead code | Backend | Phase 2 |
| 12 | `Alarm` service's POST accepts a fully-formed `Alarm` with no gatekeeping | Backend | Phase 3 |
| 13 | No code matches an incoming event against `AlarmDefinition` | Backend | Phase 3 |
| 14 | No code decides create vs. merge vs. drop | Backend | Phase 3 |
| 15 | Matched/created events must write back to the source `EventRecord` in `l8events` | Backend | Phase 3 |
| 16 | No threshold-window tracking — `Alarm` has no field distinguishing "still provisional" from "confirmed," and nothing deletes an alarm whose threshold window closes without enough occurrences | Backend | Phase 3 |
| 17 | `clear_event_pattern`/`auto_clear_enabled`/`auto_clear_seconds` on `AlarmDefinition` are never read anywhere | Backend | Phase 3 |
| 18 | Merge-path field semantics unspecified (reactivate on merge? dedup_enabled=false handling?) | Backend | Phase 3 |
| 19 | `Alarm`'s only mutation path (`PATCH`) has no field-level protection — currently only `PUT` is guarded by `protectSystemFields`, and `PUT` is being removed entirely | Backend | Phase 3 |
| 19a | `runCorrelation` has no guard against correlating an alarm that's still `PENDING_THRESHOLD` and might be deleted shortly | Backend | Phase 3 |
| 19b | This plan's threshold-window and auto-clear timers would be a *third* independent per-alarm timer implementation alongside `escalation/scheduler.go`'s existing one — duplication, per `maintainability.md`'s Second Instance Rule | Backend | Phase 3.1 |
| 19c | "PATCH source `EventRecord` back to `l8events`" is repeated inline across three branches (CLEAR/MERGE/CREATE) instead of one shared helper | Backend | Phase 3.1 |
| 19d | No correlation-eligible alarm cache exists — confirmed by direct investigation that `correlation_runner.go` queries all `State=ACTIVE` alarms with no eligibility filter at all today | Backend | Phase 3.4 |
| 19e | No mechanism transitions `OPEN_FOR_CORRELATION`→`STABLE`, and no field represents the correlation-window duration this depends on (`AlarmDefinition.correlation_window_seconds`, new) | Backend | Phase 3.4 |
| 20 | `AlarmDefinition`'s own UI still renders `event_type_filter` via the old `ALM_EVENT_TYPE` enum after Phase 2's proto change — desktop `alarmdefinitions` module | Desktop | Phase 2 |
| 20a | Same fix, mobile equivalent of the `alarmdefinitions` module, if one exists | Mobile | Phase 2 |
| 21 | Mock data must seed via the new `EventRecord` POST path instead of local `Event` | Backend | Phase 4 |
| 22 | No test coverage for create/merge/drop/clear, threshold-window deletion, or for the fact that Alarm POST no longer accepts `Alarm` shape | Backend | Phase 5 |
| 23 | `alarms-columns.js` duplicates `L8EventsAlarmTable.getColumns()` (name/severity/state/firstOccurrence/occurrenceCount) | Desktop | Phase 6 |
| 24 | `alarms-forms.js` duplicates `L8EventsAlarmTable.getFormDefinition()`'s base fields | Desktop | Phase 6 |
| 25 | No UI exists for `AlarmState` transitions (Acknowledge/Clear) — `L8EventsStateActions` provides this, filtered to exclude Reactivate/Suppress which the backend doesn't support | Desktop + Mobile | Phase 6 |
| 26 | `l8events-alarm-table.js`/`l8events-alarm-detail.js` expect `sourceName`/`sourceId` — l8alarms's `Alarm` has no such fields (`nodeName`/`nodeId` instead) — silent-blank-column risk if adopted naively | Desktop + Mobile | Phase 6 |
| 27 | No mobile alarm UI exists at all today — `L8Events*` components are unforked, so Phase 6 is where mobile parity is established for the first time, not just preserved | Mobile | Phase 6 |
| 28 | No end-to-end verification | Backend + Desktop + Mobile | Phase 7 |

Rows 25/26 are marked "Desktop + Mobile" rather than split into two rows because the fix is one
shared-component change (`l8ui/events/*.js`, confirmed unforked per `l8events-ui.md`), not two
separate per-platform implementations — splitting them would misrepresent the actual work as
larger than it is.

## Rule Compliance Notes

Systematic pass over the rule set, not a cherry-picked subset. Grouped by verdict.

**Applied, and load-bearing to the design (not just mentioned in passing):**
- `plan-requirements.md` Duplication Audit — caught late (after a direct question, not during the
  initial draft — worth naming honestly) that the threshold-window and auto-clear timers would
  have been a third independent per-alarm timer implementation alongside `escalation/scheduler.go`.
  Further confirmed the same pattern already exists independently in `l8notify`'s own
  `escalation/scheduler.go` too — real, demonstrated cross-project duplication, not a hypothetical.
  Phase 3.1 extracts a shared `TimerManager` **into `l8utils`** (not `l8alarms`) and refactors the
  original (`l8alarms`'s own `escalation/scheduler.go`) to use it, per the rule's explicit
  requirement that the extraction phase prove itself against the existing pattern. `l8notify`'s copy
  is flagged as a follow-up migration target, not executed by this plan (different repo).
- `vendor-and-git.md` — the `TimerManager` extraction is explicit about *where* the change happens:
  the real `../l8utils` source, never `l8alarms`'s vendored copy, with re-vendoring left to the
  project owner rather than done by whoever implements this plan.
- `single-owner-database-table.md` — the entire plan's premise. `l8events` owns `EventRecord`;
  `l8alarms` never activates its own copy, only reaches it via `common.PostEntity`/`PATCH` vnic
  calls (Phase 1, Phase 3).
- `framework-interface-boundaries.md` — `Alarm`'s custom `WebService` construction (Phase 3.2) is
  built locally in `AlarmService.go`, not by modifying `l8common`'s `ActivateService` helper or any
  `l8types/go/ifs` interface. Rejected the earlier `PendingAlarmService` design's implicit path
  toward a second such customization once that service was removed.
- `js-protobuf-field-names.md` — Phase 6 caught and resolved the `sourceName`/`sourceId` vs.
  `nodeName`/`nodeId` mismatch between `l8ui`'s components and `Alarm`'s actual proto fields before
  it became a silent-blank-column bug, per the rule's own stated failure mode.
- `reuse-existing-module-forms.md` — Phase 6 reuses `L8EventsAlarmTable`/`L8EventsAlarmDetail`/
  `L8EventsStateActions` rather than redefining columns/forms/enums l8ui already provides.
- `test-location-and-approach.md` — Phase 5 exercises the flow via `common.PostEntity`/HTTP calls
  through the system API, never by calling `Before(POST)`/matcher functions directly as unit tests
  of internals.
- `vendor-and-git.md` — no `go mod`/vendor commands proposed anywhere in this plan; Phase 1
  explicitly notes the unpinned `go.mod` is expected framework-project behavior, not something this
  plan fixes.
- `mobile-rules.md` / Platform Completeness (`plan-requirements.md`) — traceability matrix now has
  a Platform column (added this pass); Phase 1 and Phase 6 both have explicit mobile audit/parity
  steps, not just desktop.

**Checked, found compliant, no action needed:**
- `protobuf-rules.md` enum zero-value convention — the new `AlmCorrelationThresholdState` enum's
  `UNSPECIFIED=0` follows this exactly (Correlation & Threshold State section).
- `protobuf-rules.md` list-type convention — no new list type introduced; `Alarm`/`AlarmList`
  already comply and are reused as-is.
- `maintainability.md` ServiceName ≤10 chars — `Alarm` (5 chars) is the only `ServiceName` this
  plan touches, well within limit. (The `PendAlarm`/10-char question from the removed
  `PendingAlarmService` design no longer applies.)
- `maintainability.md` ServiceCallback auto-generate ID — `Alarm`'s existing `common.GenerateID`
  call on `POST` is unchanged by this plan; no new service needing its own ID generation.
- `prime-object-references.md` — `Alarm` continues to reference `AlarmDefinition`/`CorrelationRule`
  by string ID only; the new `correlation_threshold_state` field is a scalar enum, not a struct
  reference. No change to this compliance status.
- `no-go-generics.md` — nothing in this plan uses generics.

**Checked, requires action not yet in the plan, or genuinely unresolved — flagged, not silently
dropped:**
- `protobuf-rules.md` protobuf generation — Phase 1 and Phase 2 both call `make-bindings.sh` after
  their proto edits; Phase 3.0 (added this pass) closes the same gap for the new
  `AlmCorrelationThresholdState` enum, `Alarm.correlation_threshold_state`, and
  `AlarmDefinition.correlation_window_seconds` fields (the last one added this pass too).
- Correlation engine signature compatibility (flagged two turns ago as unresolved) — **now
  partially resolved by direct investigation**: confirmed `correlation/engine.go` and all four
  strategy files are stateless and read only from `ctx.ActiveAlarms`/`ctx.Adjacency` passed in per
  call, so the `PENDING_THRESHOLD` exclusion guard is a straightforward filter on the query that
  builds `ctx.ActiveAlarms` — no engine-signature change needed for that part. **Still open**: the
  newly added two-directional `STABLE` handling (can't gain new symptoms, can still become one)
  requires the caller to pass *different* alarm sets for the two correlation passes, and I have not
  traced the four strategy files' internal matching logic closely enough to confirm this is a clean
  change at the call site alone versus requiring changes inside the strategies themselves. Needs a
  closer read before implementation.
- New: the in-memory correlation-eligible cache (built this pass, since it doesn't exist today) is
  process-local — if `l8alarms` runs with multiple replicas, this needs a different design
  (distributed cache, or drop the cache and always query with a `correlation_threshold_state`
  filter instead). This plan does not verify `l8alarms`'s replication topology.

**Considered, not applicable to this plan (named so they're not silently absent):**
- `security-config-structure.md` / `security-provisioning-channels.md` — no user/role/credential
  provisioning in this plan.
- `k8s-rules.md` / `deployment-artifacts.md` — no new deployable binary/service introduced; `Alarm`
  runs in the same existing process as everything else in `activate_all.go`.
- `l8query-rules.md` — no new L8Query-constructing UI code beyond what Phase 6 already inherits
  from `L8EventsAlarmTable`/`L8EventsAlarmDetail`.
- `data-completeness-pipeline.md` — `correlation_threshold_state` is system-managed (never
  user-set, rejected on `PATCH` per 3.2), so it doesn't need a form/column/mock-data slot the way a
  user-editable field would; the rule's failure mode (silently empty UI columns) doesn't apply to a
  field the UI never displays as editable.

## Phase 1 — Remove the local `Event` Prime Object and its archival mirror

- Delete `proto/alm-events.proto`; remove it from `proto/make-bindings.sh`'s `PROTOS` array.
- Remove `ArchivedEvent` from `proto/alm-archive.proto`.
- Delete `go/alm/events/` (`EventService.go`, `EventServiceCallback.go`).
- Delete `go/alm/archivedevents/`.
- Remove the `Event`-related portions of `go/alm/archiving/engine.go`, keeping the `Alarm` →
  `ArchivedAlarm` cascade intact.
- Remove `events.Activate(...)` and `archivedevents.Activate(...)` from
  `go/alm/services/activate_all.go`.
- Remove `alm.Event`/`alm.EventList` type registration from `go/alm/ui/shared_alm.go`.
- Desktop UI: remove the `'events'` module entry from `alm-config.js`, the Events tab from
  `alm-section-config.js`, the three `go/alm/ui/web/alm/events/*.js` files, the `Event` entry from
  `reference-registry-alm.js`, and the corresponding `<script>`/`<link>` tags from `app.html`.
- Mobile UI: audit `go/alm/ui/web/m/` for any registry-driven equivalent and remove in parallel
  (`mobile-rules.md`).
- Mocks: delete `gen_events.go`; remove `store.EventIDs` and its use in `gen_alarms.go:36`
  (replaced by Phase 4's new seeding approach); remove Phase 3's Event posting from `phases.go`;
  remove the Event count from `summary.go`.
- Tests: remove the Event CRUD block from `TestCRUD_test.go`, the Event validation blocks from
  `TestValidation_test.go`, and the Event getter/handler checks from `TestServiceGetters_test.go`/
  `TestServiceHandlers_test.go`.
- Run `cd proto && ./make-bindings.sh`; `gofmt -l` the touched Go files. Full `go build` isn't
  possible in this repo right now because `go.mod` has no `require` entries yet — confirmed this is
  expected: framework-layer projects like this one intentionally leave dependency versions unpinned
  in `go.mod`; the consuming/deploying project sets them. Not a gap this plan needs to address.

## Phase 2 — Redesign `AlarmDefinition` matching fields

- Change `event_type_filter` (field 7) to `l8events.EventCategory event_category_filter`.
- Add `correlation_window_seconds` (int32, new field — see Proto Changes above).
- `event_pattern`'s matching semantics: **confirmed regex**, matched against `EventRecord`'s
  `event_type`/`message` — this drives Phase 3's matcher.
- Grep for remaining `AlmEventType` references after Phase 1 + this change; delete the enum from
  `alm-common.proto` if none remain.
- Update `AlarmDefinition`'s own UI (desktop `alarmdefinitions` module's forms/columns, plus mobile
  equivalent if any) — wherever `eventTypeFilter` is rendered as a select against the old
  `ALM_EVENT_TYPE`/`AlmEventType` enum, switch it to `L8EventsCategoryEnums`/`EVENT_CATEGORY`
  matching the new proto field. Missed in the first draft of this plan, which only covered the
  proto+backend side of this change.
- Regenerate bindings.

## Phase 3 — Make `Alarm` the event receiver

**3.0 Proto regeneration.** This phase's `correlation_threshold_state` field and
`AlmCorrelationThresholdState` enum (see "Correlation & Threshold State") are proto changes like
Phase 1/2's — add them to `alm-alarms.proto`/`alm-common.proto` and run
`cd proto && ./make-bindings.sh` before writing any Go code that references them.

**3.1 Extract a shared per-alarm timer manager into `l8utils`, not `l8alarms` (duplication audit —
do this before 3.5; cross-project decision, confirmed).**
Per `plan-requirements.md`'s Duplication Audit and `maintainability.md`'s Second Instance Rule:
`l8alarms`'s own `escalation/scheduler.go` already implements a per-alarm `time.NewTimer`-based
mechanism (map of `AlarmId` → timer/cancel-channel, start/cancel/reset). Phase 3.5 below needs two
more timers of the identical shape (threshold-window, auto-clear). **Verified this pattern already
exists independently in a second project too**: `l8notify`'s own `escalation/scheduler.go` has the
same shape for its own escalation steps. Given the pattern is demonstrated in two separate repos
already (not hypothetical cross-project reuse), the extraction target is `l8utils` — the framework's
existing home for this kind of generic utility (it already hosts `l8utils/go/utils/cache/Cache.go`,
similarly generic; confirmed nothing existing there covers this — `tasks`/`queues`/`workers`
packages are task-queue/worker-pool concerns, not per-key delayed/cancelable timers).

This makes Phase 3.1 a **cross-project prerequisite**, not something this plan implements end to
end on its own:
- New `l8utils/go/utils/timer/TimerManager.go` (naming TBD, mirroring the `cache` package's
  layout): `Start(key string, duration time.Duration, onFire func())`, `Cancel(key string)`,
  `Reset(key string, duration time.Duration)`. Internally: the same map-of-timers-plus-mutex shape
  `escalation/scheduler.go`'s `Scheduler` struct already has in both projects, made generic over the
  fire-callback instead of hardcoding "fire the next escalation step."
- This change happens in the **actual `../l8utils` repo**, not `l8alarms`'s vendored copy — per
  `vendor-and-git.md`, never edit vendored code. Whoever implements this stops after changing
  `../l8utils`'s real source and lets the project owner handle pushing/versioning; `l8alarms`'s
  `go.mod` then needs `l8utils` re-vendored at the new version before Phase 3.5 can build against
  `TimerManager`.
- **Refactor `l8alarms`'s own `escalation/scheduler.go` to use it**, in `l8alarms`, as part of this
  plan — per `plan-requirements.md`: "Phase 0 refactors the original pattern to use the shared
  component... to prove the abstraction works before it's used by new instances, and prevent
  drift." Do not leave it as a still-separate implementation alongside the new shared one.
- **`l8notify`'s `escalation/scheduler.go` is a natural second migration target**, but it's a
  different project with its own repo — out of scope for `l8alarms`'s plan to directly execute.
  Flagging it here so it isn't silently dropped: whoever owns the `l8utils` extraction should also
  raise a follow-up for `l8notify` to migrate, rather than leaving its copy as the one duplicate
  that never got cleaned up.
- Also extract the "PATCH the source `EventRecord` back to `l8events`" call (`state=PROCESSED`,
  `generated_alarm_id=<id>`) into one small helper function within `l8alarms` — it's currently
  repeated inline across the CLEAR, MERGE, and CREATE branches in 3.4 below, differing only in which
  `alarmId` is passed. This one stays local to `l8alarms` — it's specific to `l8alarms`'s own
  `l8events`-PATCH-back concern, not a generic cross-project pattern.

**3.2 `WebService` registration.**
`go/alm/alarms/AlarmService.go`'s `Activate()`: build its `WebService` manually instead of calling
`common.ActivateService` (which unconditionally registers `POST`/`PUT` over HTTP) — register `GET`
(`L8Query`→`AlarmList`), `PATCH` (`alm.Alarm`), and `DELETE` (`L8Query`) with the HTTP-facing
config; `POST` (`l8events.EventRecord`) is handled by the service but never added to the
`WebService`'s HTTP routes, so it's reachable only via a direct vnic call
(`common.PostEntity("Alarm", 10, eventRecord, vnic)`). No `PUT` at all — confirmed the UI never had
a `PUT`-based edit flow, only `GET` (browse) and `PATCH` (Acknowledge, Clear, and notes — see 3.3).
`l8events.EventRecord` needs no `WebService` registration of its own — it's never deserialized from
an HTTP body.

**3.3 `PATCH` field-level protection** (new — this codebase currently has none for `PATCH`).
`protectSystemFields` (`go/alm/alarms/protect_fields.go`) only guards `PUT` today
(`if action != ifs.PUT { return nil }`). With `PUT` removed and `PATCH` becoming `Alarm`'s only
externally-reachable mutation path, and confirmed the scope: **`PATCH` may transition `State` to
`ACKNOWLEDGED` or `CLEARED` only** (both valid per `validateStateTransition`; no `SUPPRESSED`, no
`ACTIVE`/"Reactivate" via `PATCH` — see Phase 6 for the matching UI-side restriction), plus
`AcknowledgedBy`/`AcknowledgedAt` (set when transitioning to `ACKNOWLEDGED`),
`ClearedBy`/`ClearedAt` (now also settable via user-initiated `PATCH` when transitioning to
`CLEARED`, in addition to the existing system-set clear-pattern/auto-clear paths), and `Notes`.
Everything else (`Severity`, `DefinitionId`, `NodeId`, `DedupKey`, `correlation_threshold_state`,
etc.) must be rejected on `PATCH` the same way `protectSystemFields` already rejects identity-field
changes on `PUT`. `Alarm`'s own `POST` (an `EventRecord`, handled internally) is unaffected by this
guard — `PATCH` protection only applies to `PATCH`.

**3.4 Matcher, decision logic, and correlation guard.** New file(s) under `go/alm/alarms/`:
- A pure matcher function: given one `*l8events.EventRecord` and the active `AlarmDefinition` list
  (fetched via the existing `common.GetEntitiesByQuery` pattern), return the matched definition (or
  nil), applying `event_category_filter`, `event_pattern` (compiled as a Go `regexp` against
  `EventRecord.EventType`/`Message` — confirmed), `node_type_filter`. Separately, check whether the
  event satisfies any matched-or-referenced definition's `clear_event_pattern` for an existing
  active alarm — reuse the *same* regex-matching function for both `event_pattern` and
  `clear_event_pattern` rather than writing it twice; they're the same operation against different
  pattern strings.
- `AlarmServiceCallback.Before(POST)`: type-assert the incoming body as `*l8events.EventRecord`
  (the only way anything reaches this action now), then branch per the revised Target Flow above:
  - **No match** → `return nil, false, nil` (drop; precedented by `TargetCallback`).
  - **Clear-pattern match against an existing active alarm** → `common.PutEntity` the alarm
    (`State=CLEARED`, `ClearedAt=now`, `ClearedBy="system:event"`), cancel its threshold-window,
    correlation-window, and auto-clear timers via the shared `TimerManager` (3.1/3.5), **evict it
    from the correlation-eligible cache if present** (a cleared alarm shouldn't keep gaining
    symptoms), transition `correlation_threshold_state` to `STABLE` if it wasn't already, PATCH the
    source `EventRecord` via the shared helper (3.1), `return nil, false, nil`.
  - **Match, `Alarm` already exists for `DedupKey`** → MERGE. Concrete semantics (per earlier
    direct feedback resolving the "implementer decides" ambiguity):
    - `dedup_enabled=false` on the matched definition → skip this branch entirely, always CREATE
      instead (no merge lookup performed).
    - Otherwise: increment `OccurrenceCount`, set `LastOccurrence=now`. If the existing alarm's
      `State=ACKNOWLEDGED`, reactivate it to `State=ACTIVE`. Do **not** auto-escalate `Severity`.
      If `correlation_threshold_state=PENDING_THRESHOLD` and `OccurrenceCount` now `>=
      threshold_count`, transition to `OPEN_FOR_CORRELATION`: cancel the threshold-window timer,
      start the correlation-window timer (`correlation_window_seconds`), **add the alarm to the
      correlation-eligible cache** (all via `TimerManager`/cache helpers, 3.1/3.5).
    - `common.PutEntity` the update, reset the alarm's auto-clear timer (via `TimerManager`,
      3.1/3.5), PATCH the source `EventRecord` via the shared helper (3.1), then
      `return nil, false, nil`.
  - **Match, no existing `Alarm`** → CREATE, immediately, regardless of `threshold_count`: build
    `*alm.Alarm{}` (`common.GenerateID` for `AlarmId`, `DefinitionId`, `NodeId`/`NodeName` from
    `SourceId`/`SourceName`, `Severity` from the definition's `DefaultSeverity`, `EventId`,
    `DedupKey`, `State=ACTIVE`, `FirstOccurrence=LastOccurrence=now`, `OccurrenceCount=1`,
    `correlation_threshold_state = PENDING_THRESHOLD if threshold_count>1 else
    OPEN_FOR_CORRELATION`). If `OPEN_FOR_CORRELATION` immediately (no meaningful threshold), start
    its correlation-window timer and add it to the correlation-eligible cache right away (in the
    `After(POST)` runner below, once the real `AlarmId` is confirmed persisted).
    `return newAlarm, true, nil` — persisted as the POST's result.
- New `After(POST)` runner (same convention as `correlation_runner.go`/`notification_runner.go`):
  calls the shared PATCH-the-source-`EventRecord` helper (3.1); if the new alarm's
  `correlation_threshold_state=OPEN_FOR_CORRELATION`, starts its correlation-window timer and adds
  it to the correlation-eligible cache. Wire it into the existing chain.
- `runCorrelation` (existing `After(POST)` hook, and — per the MERGE branch above now also calling
  `common.PutEntity` — wire it onto `After(PUT)` too, since a `PutEntity` call goes through the same
  `Before`/`After` pipeline regardless of caller) changes its alarm-sourcing, not just adds a guard:
  - For "does the new/updated alarm gain a symptom" (i.e., is IT a root cause for something else) —
    source root-cause **candidates** from the correlation-eligible cache only (`OPEN_FOR_CORRELATION`
    entries — excludes both `PENDING_THRESHOLD` and `STABLE`, since only `OPEN_FOR_CORRELATION`
    alarms can "consume more events/alarms to be correlated to it," per direct clarification).
  - For "does the new/updated alarm turn out to be a symptom of an existing alarm" (the reverse
    direction) — query `Alarm` directly (not the cache) with `correlation_threshold_state IN
    (OPEN_FOR_CORRELATION, STABLE)`, since `STABLE` alarms can still be linked as someone else's
    symptom even though they can't gain new symptoms of their own.
  - `PENDING_THRESHOLD` alarms are excluded from both directions, unchanged from before.

**3.5 Threshold-window, correlation-window, and auto-clear timers, plus the correlation-eligible
cache.** All three timers built on the shared `TimerManager` from 3.1 — not three more hand-rolled
copies:
- **Threshold-window timer**: `TimerManager.Start(alarmId, threshold_window_seconds, onFire)` on
  CREATE when `correlation_threshold_state=PENDING_THRESHOLD`. Cancelled early
  (`TimerManager.Cancel(alarmId)`) if a MERGE pushes `OccurrenceCount` to `threshold_count` first.
  `onFire`: if still `PENDING_THRESHOLD`, `common.DeleteEntity` the alarm — it never reached
  threshold, so per direct instruction it's deleted rather than having been withheld from creation
  in the first place.
- **Correlation-window timer** (new this pass): `TimerManager.Start(alarmId,
  correlation_window_seconds, onFire)` whenever an alarm becomes `OPEN_FOR_CORRELATION` (immediate
  CREATE, or MERGE pushing past threshold). `onFire`: transition `correlation_threshold_state` to
  `STABLE`, evict the alarm from the correlation-eligible cache. Cancelled early if the alarm is
  cleared first (see CLEAR branch above).
- **Auto-clear timer**: per `AlarmDefinition.auto_clear_enabled`/`auto_clear_seconds`, same
  `TimerManager`. Started on create, `TimerManager.Reset(alarmId, ...)` on merge, cancelled on
  manual/clear-pattern clear. `onFire` (no matching event within `auto_clear_seconds`):
  `common.PutEntity` to `State=CLEARED`, `ClearedBy="system:auto-clear"` (which per the CLEAR
  branch's logic above also evicts from the correlation cache and cancels the correlation-window
  timer).
- All three timers for the same alarm are tracked under distinct keys in `TimerManager` (e.g.
  `alarmId+":threshold"`, `alarmId+":correlation"`, `alarmId+":autoclear"`) since one alarm can have
  more than one running at once.
- **Correlation-eligible cache**: new package-level `sync.RWMutex`-guarded `map[string]*alm.Alarm`
  (see "Correlation & Threshold State" above for the reasoning on why a simple local map, not
  `l8utils/cache`/`dcache`). Add on `PENDING_THRESHOLD`→`OPEN_FOR_CORRELATION` (or immediate
  `OPEN_FOR_CORRELATION` on create), evict on `OPEN_FOR_CORRELATION`→`STABLE` (correlation-window
  timer fires) or on CLEAR.

**3.6 Wiring.** No change beyond the existing `alarms.Activate(...)` call in
`go/alm/services/activate_all.go` — no second service to wire in. Confirm `escalation/scheduler.go`
still wires in correctly after 3.1's refactor (it doesn't call `Activate()` itself, but verify its
construction site, wherever the `Scheduler` is instantiated, still compiles against the shared
`TimerManager`).

## Phase 4 — Update mock data

- Mocks run as Go code holding their own `vnic` (the mock CLI/generator), so seeding demo data
  means calling `common.PostEntity("Alarm", 10, eventRecord, vnic)` directly (a vnic call, exactly
  like every other mock-data POST already in this codebase) — not an HTTP request — letting the new
  `Before(POST)` logic decide create/merge/drop, instead of directly constructing `alm.Alarm{}`
  records against a (now-removed) direct-create path.
- Fix `gen_alarms.go:36`'s use of the now-deleted `store.EventIDs`.

## Phase 5 — Tests for the new flow

- Per `test-location-and-approach.md`, exercise this through the system API using
  `common.PostEntity("Alarm", 10, eventRecord, vnic)` (the actual, sole entry point): POST an
  `l8events.EventRecord` that matches an existing `AlarmDefinition` and assert an `Alarm` is
  created with the expected `DedupKey`/`OccurrenceCount`/`FirstOccurrence`/
  `correlation_threshold_state`.
- POST a second, matching `EventRecord` with the same dedup key and assert it merges into the
  existing `Alarm` (`OccurrenceCount` increments, no second `Alarm` row created) instead of
  creating a duplicate.
- POST an `EventRecord` that matches no `AlarmDefinition` and assert no `Alarm` is created.
- Using a definition with `threshold_count>1`: POST one matching event and assert an `Alarm` is
  created immediately with `correlation_threshold_state=PENDING_THRESHOLD`; POST enough further
  matching events to cross `threshold_count` and assert it transitions to `OPEN_FOR_CORRELATION`
  (same `AlarmId` throughout — never re-created).
- Using a definition with `threshold_count>1` and a short `threshold_window_seconds`: create an
  alarm, don't send enough events to cross threshold, wait past the window, and assert the alarm is
  deleted (`GetEntitiesByQuery` returns nothing for that `AlarmId`).
- Using two `AlarmDefinition`s with a correlation rule relating them (e.g. topological): create the
  root-cause alarm first, then POST an event matching the symptom definition, and assert the
  resulting `Alarm`'s `RootCauseAlarmId`/`IsRootCause`/`SymptomCount` are set — proves
  `runCorrelation` still fires correctly post-persistence.
- Using a definition with `threshold_count>1`: assert an alarm still `PENDING_THRESHOLD` is *not*
  linked as root-cause/symptom by `runCorrelation` even if it would otherwise match — proves the
  new guard (Phase 3.4) works.
- Using a short `correlation_window_seconds`: create an alarm (goes `OPEN_FOR_CORRELATION`), wait
  past the window, assert it transitions to `STABLE` and is evicted from the correlation-eligible
  cache (indirect check: it no longer gains a `SymptomCount` when a new, otherwise-matching alarm is
  created afterward — assert `SymptomCount` stays 0 on the `STABLE` one).
- Same setup, but instead POST an event that would make the *new* alarm the root cause of the
  now-`STABLE` alarm (reverse direction): assert the `STABLE` alarm's `RootCauseAlarmId` *does* get
  set — proves `STABLE` alarms can still be linked as someone else's symptom, per direct
  clarification, even though they can't gain new symptoms of their own.
- Using a definition with `clear_event_pattern` set: create an alarm, then POST an event matching
  the clear pattern and assert the alarm transitions to `CLEARED`.
- Using a definition with `dedup_enabled=false`: POST two matching events and assert **two**
  separate `Alarm`s are created (no merge).
- Merging into an `ACKNOWLEDGED` alarm: assert it reactivates to `ACTIVE` per Phase 3.4's decided
  semantics; assert `Severity` does *not* change.
- Assert a `PATCH` attempting to change a field outside the allowed scope (e.g. `Severity`,
  `DefinitionId`, `correlation_threshold_state`) is rejected, per Phase 3.3; assert a `PATCH` that
  only changes `State` to `ACKNOWLEDGED`, only to `CLEARED`, or only adds a note, succeeds; assert a
  `PATCH` attempting `State=SUPPRESSED` or `State=ACTIVE` ("Reactivate") is rejected — confirmed
  scope is Acknowledge + Clear + notes only, nothing else.
- Using the test topology's real HTTP web server (`go/tests/StartWebserver.go` already stands one
  up on `webServiceVnic`), issue an actual HTTP POST to `/alm/10/Alarm` (any body) and assert it
  fails to route (no HTTP endpoint registered for that action) — this is the test that proves "no
  externally-invokable Create Alarm interface" actually holds, as distinct from merely "the
  business logic rejects it." Also assert an HTTP `PUT` to the same path fails to route, per
  Phase 3.2's decision to drop `PUT` too.
- Assert `escalation/scheduler.go`'s existing tests (if any) still pass unchanged after 3.1's
  refactor to the shared `TimerManager` — behavior, not just compilation, must be identical.
- Requires activating `l8events`'s `ActivateEvents` service in the test topology
  (`TestAllService_test.go`'s `TestMain`) so the `EventRecord`→PATCH-back round trip is real, not
  mocked.

## Phase 6 — Consolidate Alarm UI onto shared `l8ui/events/` components

Verified against the actual files (`go/alm/ui/web/alm/alarms/{alarms-columns,alarms-forms,
alarms-enums}.js` vs. `l8ui/events/{l8events-enums,l8events-alarm-table,l8events-alarm-detail,
l8events-state-actions}.js`):

- **`alarms-enums.js`** already delegates `ALARM_SEVERITY`/`ALARM_STATE` to
  `L8EventsEnums.SEVERITY`/`ALARM_STATE` — no change needed here. `ALARM_DEFINITION_STATUS` and
  the (now-unused, post-Phase-2) `EVENT_TYPE` entry are alarm-specific and stay.
- **Field-name mismatch to resolve first** — `L8EventsAlarmTable.getColumns()` and
  `L8EventsAlarmDetail`'s field rendering expect `sourceName`/`sourceId`/`sourceType`.
  `l8alarms`'s `Alarm` proto has no such fields — it has `nodeId`/`nodeName`/`linkId`/`location`/
  `sourceIdentifier` instead (`go/types/alm/alm-alarms.pb.go:97-101`). Per
  `js-protobuf-field-names.md`, adopting the l8ui columns/form as-is would silently render a blank
  "Source" column/field for every alarm. Resolve by **dropping** the l8ui `sourceName`/`sourceId`/
  `sourceType` entries from the merged column/form set and keeping l8alarms's own `nodeName`/
  `nodeId`/`location`/`linkId`/`sourceIdentifier` fields — do not attempt a `transformData` alias
  as a substitute; the simpler fix is to just not use those particular l8ui fields.
- **`alarms-columns.js`** — replace with `L8EventsAlarmTable.getColumns()` (provides `name`,
  `severity`, `state`, `firstOccurrence`, `occurrenceCount`, `lastOccurrence`, `acknowledgedBy` —
  gains coverage l8alarms's own hand-rolled version didn't have, minus the `sourceName`/`sourceId`
  entries per above) `.concat([...])` with the alarm-specific columns that have no l8ui
  equivalent: `nodeName`, `isRootCause`, `symptomCount`.
- **`alarms-forms.js`** — `L8EventsAlarmTable.getFormDefinition()` covers the base fields
  (`alarmId`, `name`, `description`, `severity`, `state`, timing, acknowledgement) but does **not**
  cover, and this plan must keep: the `definitionId` **reference picker** (`f.reference(...,
  'AlarmDefinition')` — l8ui's version is plain text, swapping to it would be a real capability
  regression), `nodeId`/`nodeName`/`linkId`/`location`/`sourceIdentifier`, `rootCauseAlarmId`,
  `correlationRuleId`, `isRootCause`, `symptomCount`, and the `notes` inline table. Build the new
  form as the l8ui base sections plus an l8alarms-specific "Topology & Correlation" section and the
  existing "Notes" section — do not do a wholesale replace.
- **New capability — wire up `L8EventsStateActions`, resolved scope.** l8alarms currently has no UI
  for state transitions at all. Use `L8EventsAlarmDetail.render(container, alarm, {showStateHistory:
  true, showNotes: true, onStateChange: (alarmId, newState, reason) => { /* PATCH to Alarm service —
  NOT PUT, per Phase 3.2: Alarm has no PUT endpoint at all */ }})` in the Alarm detail popup, which
  auto-mounts `L8EventsStateActions` for the transition buttons — replacing whatever ad-hoc detail
  rendering exists today, alongside the existing correlation-tree tab injection
  (`alarms-correlation-tree.js`, fully alarm/topology-specific, no l8ui equivalent, stays as-is).
  **Confirmed resolution** to the backend/UI scope mismatch: the backend now accepts Acknowledge
  *and* Clear via `PATCH` (Phase 3.3), matching two of `L8EventsStateActions`'s default actions —
  but "Reactivate" (`ACKNOWLEDGED`→`ACTIVE` and `SUPPRESSED`→`ACTIVE`) must NOT be offered, since
  the backend doesn't support it and `Suppress` was never in scope either. Since
  `L8EventsStateActions` is a shared, unforked `l8ui` component (`l8ui-no-project-specific-code.md`
  — must stay generic, not be modified for l8alarms specifically), the fix lives on l8alarms's side:
  filter `L8EventsStateActions.getAvailableActions(currentState)`'s result to drop any action whose
  label is "Reactivate" (and "Suppress", already out of scope) before rendering buttons — don't fork
  or modify the shared component itself.
- **`alarms-correlation-tree.js`/`.css`** — no l8ui equivalent exists (RCA/topology is entirely
  alarm-specific); left untouched.
- Script loading order: per `l8ui/rules/l8events-ui.md`, `l8events-enums.js` →
  `l8events-category-enums.js` → `l8events-state-actions.js` → `l8events-alarm-table.js` →
  `l8events-alarm-detail.js`, before `alm`'s own module init file. These files are **not** forked
  per platform (`l8events-ui.md`: "used unforked on both desktop and mobile") — since l8alarms
  currently has no mobile alarm UI at all (confirmed: no files under `go/alm/ui/web/m` matching
  `*alarm*`), this phase is also the point where mobile alarm UI parity gets addressed for free —
  the same `L8EventsAlarmTable`/`L8EventsAlarmDetail` calls work in `m/app.html` unchanged
  (`mobile-rules.md`).

## Phase 7 — End-to-end verification

- `cd proto && ./make-bindings.sh` — zero errors, `alm-events.proto` no longer in the output.
- `gofmt -l` on all touched files; `go build ./...` once the consuming/deploying project has pinned
  and vendored `l8events`/`l8notify` in `go.mod` (see Phase 1 — not something this repo's own
  `go.mod` is expected to carry).
- Desktop: System/Alarms section no longer shows an "Events" tab; Alarm detail still opens.
- Mobile: same checks, parity with desktop.
- `grep -rn "alm\.Event\b\|AlmEventType" go/ --include="*.go" | grep -v vendor/` returns zero
  results.
- Manually POST a matching, then a duplicate, then a non-matching `EventRecord` and confirm the
  create/merge/drop behavior described in Phase 5 end to end against a running system.
- Desktop: Alarm table shows severity/state badges via `L8EventsAlarmTable` columns, plus
  `nodeName`/`isRootCause`/`symptomCount`; alarm detail popup shows state history, notes, and
  working Acknowledge/Clear buttons (`L8EventsStateActions`, filtered — no Reactivate/Suppress
  button present); the "Source" column/field is absent (not blank — confirm it was dropped, not
  silently unpopulated); correlation tree tab still works.
- Mobile: same checks — this is new coverage, not just parity, since no mobile alarm UI existed
  before this plan.
- `node -c` on every touched/added JS file (per `template-literal-ternary-edits.md` and general JS
  syntax-safety practice for this codebase).
