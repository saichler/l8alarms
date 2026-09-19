# l8alarms

Root cause analysis, alarm management, and event correlation for the [Layer 8 Ecosystem](https://github.com/saichler).

When a network device fails, it typically generates dozens of downstream alarms across connected devices. L8Alarms automates the process of ingesting raw events, generating normalized alarms, traversing topology relationships to correlate related alarms, identifying the root cause, and notifying the right people.

## Key Capabilities

- **Alarm lifecycle management** - acknowledge, clear, suppress, with state-transition history
- **Event-driven alarm creation** - events arrive as shared `l8events.EventRecord`s; the `Alarm` service matches
  them against `AlarmDefinition`s and decides DROP / CLEAR / MERGE / CREATE
- **Threshold & correlation windows** - per-alarm threshold, correlation, and auto-clear timers
  (`AlmCorrelationThresholdState`: PENDING_THRESHOLD → OPEN_FOR_CORRELATION → STABLE)
- **Topology-aware root cause analysis (RCA)** - integrates with [l8topology](https://github.com/saichler/l8topology) to correlate alarms using network topology relationships
- **Correlation engine** - four strategies: topological, temporal, pattern-based, and composite
- **Notification policies** - match alarms to `l8notify.NotifyTarget`s, with throttling; delivery goes through the
  shared l8notify `Notify` service (`Resources().Notify().Send`)
- **Escalation policies** - time-based `l8notify.EscalationStep` progression for unacknowledged alarms
- **Alarm archiving** - archive resolved alarms (and their symptoms) for historical analysis
- **Desktop UI** - alarm dashboard with correlation tree view and topology overlay
- **Mock data generation** - phased generators for realistic test data across all services

## Architecture

l8alarms does **not** own events or notification delivery — both are shared, required system services:

- **Events** come from `l8events` (`Events` service, area 76). The event source pushes each `EventRecord` to the
  `Alarm` service via vnic (`POST` with an `EventRecord` body — there is no HTTP "create alarm" endpoint). After
  deciding, l8alarms PATCHes the source `EventRecord` to `PROCESSED` with `GeneratedAlarmId` set.
- **Notifications** go to `l8notify` (`Notify` service, area 78) through `Resources().Notify().Send(...)`.

Both are required system services activated by `l8common` — l8alarms does not activate them itself.

Alarm `POST` (an incoming `EventRecord`):

1. **Match** - find the active `AlarmDefinition` whose pattern matches the event; no match → DROP
2. **Decide** - CLEAR (clear pattern matched), MERGE (same dedup key → bump occurrence count, reset auto-clear),
   or CREATE (new alarm, starts threshold/correlation/auto-clear timers)
3. **Persist** - stores to PostgreSQL via l8orm
4. **Correlation** - runs the correlation engine to identify root cause vs. symptom relationships
5. **Notification** - evaluates notification policies, sends via the l8notify `Notify` service
6. **Escalation** - schedules time-based escalation timers for unacknowledged alarms

`PUT`/`PATCH` (acknowledge, clear, notes) run steps 4-6 as well.

## Services

All services share **ServiceArea 10** with prefix `/alm/`.

| Service | ServiceName | Primary Key | Description |
|---------|-------------|-------------|-------------|
| AlarmDefinition | `AlmDef` | `definitionId` | Alarm templates, event patterns, thresholds |
| Alarm | `Alarm` | `alarmId` | Active alarm lifecycle. HTTP: GET/PATCH/DELETE only; POST (an `EventRecord`) is vnic-only |
| CorrelationRule | `CorrRule` | `ruleId` | RCA rule definitions |
| NotificationPolicy | `NotifPol` | `policyId` | Notification dispatch rules |
| EscalationPolicy | `EscPolicy` | `policyId` | Time-based escalation chains |
| AlarmFilter | `AlmFilter` | `filterId` | Saved alarm filter configurations |
| ArchivedAlarm | `ArcAlarm` | `alarmId` | Historical alarms (immutable) |
| TopologyOverlay | `AlmOverlay` | — | Read-only topology enrichment (no DB) |

Events (`EventRecord`) and notification records (`NotifyRecord`) are **not** l8alarms services — they are owned by
`l8events` and `l8notify`.

## Child Types (embedded, not services)

| Type | Parent | Description |
|------|--------|-------------|
| AlarmNote | Alarm | Operator notes on alarms |
| AlarmStateChange | Alarm | State transition history |
| CorrelationCondition | CorrelationRule | Rule matching conditions |
| `l8notify.NotifyTarget` | NotificationPolicy | Dispatch targets per policy (shared l8notify type) |
| `l8notify.EscalationStep` | EscalationPolicy | Escalation chain steps (shared l8notify type) |

## Engine Components

| Component | Directory | Description |
|-----------|-----------|-------------|
| Correlation | `correlation/` | RCA engine with topological, temporal, pattern, and composite strategies |
| Enrichment | `enrichment/` | Topology overlay - projects alarm severity onto topology nodes |
| Notification | `notification/` | Policy matching, throttling, template rendering; sends via `Resources().Notify().Send` |
| Escalation | `escalation/` | Time-based scheduler with per-alarm timers and step progression (sends via l8notify) |
| Archiving | `archiving/` | Archives an alarm and its symptom alarms to `ArchivedAlarm`, then removes the active records |

## UI

The desktop UI is built with the l8ui shared component library (a git submodule at `go/alm/ui/web/l8ui`) and
organized into submodules:

| Submodule | Services |
|-----------|----------|
| Alarms | Active Alarms, Alarm Definitions, Saved Filters |
| Correlation | Correlation Rules |
| Policies | Notification Policies, Escalation Policies |
| Archive | Archived Alarms |

Alarm views reuse the shared `L8Events*` components from `l8ui/events/`; notification targets use `l8ui/notify/`.
Features include a correlation tree view (using `Layer8DTreeGrid` with alarm hierarchy showing ROOT/SYMPTOM badges),
severity/state color rendering, and section-based navigation.

## Project Structure

```
proto/                          Protobuf definitions (7 files)
  alm-alarms.proto              Alarm, AlarmNote, AlarmStateChange, AlarmState
  alm-definitions.proto         AlarmDefinition
  alm-correlation.proto         CorrelationRule, CorrelationCondition
  alm-policies.proto            NotificationPolicy, EscalationPolicy (use l8notify types)
  alm-filters.proto             AlarmFilter
  alm-archive.proto             ArchivedAlarm
  alm-common.proto              Shared enums
go/
  alm/
    common/                     Alarm state-transition helpers, defaults
    services/                   Service activation orchestrator (ActivateAlmServices)
    alarms/                     Alarm service, event matching/lifecycle, timers, post-action runners
    alarmdefinitions/           Alarm definition service
    alarmfilters/               Saved filter service
    correlationrules/           Correlation rule service
    notificationpolicies/       Notification policy service
    escalationpolicies/         Escalation policy service
    archivedalarms/             Archived alarm service (immutable)
    correlation/                RCA engine (topological, temporal, pattern, composite)
    enrichment/                 Topology overlay service
    notification/               Notification policy engine; sends via l8notify
    escalation/                 Escalation scheduler
    archiving/                  Archive engine
    ui/
      shared_alm.go             UI type registration
      web/                      Desktop UI
        alm/                    Module JS (config, enums, columns, forms, init)
          alarms/               Alarm views + correlation tree
          correlation/          Correlation rule views
          policies/             Policy views
          archive/              Archived alarm views
        sections/               Section HTML (dashboard, alarms, system)
        js/                     App bootstrap, reference registry, sections
        l8ui/                   Shared UI library (git submodule)
      main/                     UI server entry point
    main/                       Backend server entry point
    vnet/                       Standalone vnet process
  types/alm/                    Generated protobuf Go types
  tests/
    mocks/                      Mock data generators (phased)
      gen_foundation.go         Alarm definitions, correlation rules
      gen_config.go             Policies, escalation rules, filters
      gen_alarms.go             Alarms with state distribution
      gen_archive.go            Archived alarms
    TestCRUD_test.go            Full CRUD for all services
    TestValidation_test.go      Field validation
    TestCorrelation_test.go     Correlation engine
    TestAlarmFlow_test.go       Event → alarm decision flow
    TestServiceHandlers_test.go Handler accessibility
    TestServiceGetters_test.go  Service getter coverage
    TestAllService_test.go      All-services orchestrator
plans/                          PRD and implementation plans
```

## Dependencies

Built on the Layer 8 service framework:

| Package | Role |
|---------|------|
| [l8common](https://github.com/saichler/l8common) | Service activation, CRUD helpers, bootstrapping |
| [l8bus](https://github.com/saichler/l8bus) | Virtual network overlay (VNet, vNic) |
| [l8orm](https://github.com/saichler/l8orm) | ORM + PostgreSQL persistence |
| [l8topology](https://github.com/saichler/l8topology) | Topology types for enrichment + RCA |
| [l8web](https://github.com/saichler/l8web) | REST web server |
| [l8types](https://github.com/saichler/l8types) | Core interfaces + shared `l8events`/`l8notify` types |
| [l8utils](https://github.com/saichler/l8utils) | Logging, timers, registry, default `Events()`/`Notify()` impls |
| [l8srlz](https://github.com/saichler/l8srlz) | Serialization |
| [l8test](https://github.com/saichler/l8test) | Test topology |

## Running Tests

```bash
cd go && go test ./tests/ -v -run TestAllServices
```

Tests exercise full CRUD, validation, correlation, the event → alarm flow, and service handler accessibility through the HTTP API.

## Running Locally

```bash
cd go && ./run-local.sh
```

The script builds all binaries, starts PostgreSQL in Docker, launches the vnet/backend/UI processes, and uploads mock data. Open `http://localhost:2780/alm/` in a browser.

## License

See [LICENSE](LICENSE).
