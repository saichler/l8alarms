# l8alarms

Root cause analysis, alarm management, and event correlation for the [Layer 8 Ecosystem](https://github.com/saichler).

When a network device fails, it typically generates dozens of downstream alarms across connected devices. L8Alarms automates the process of ingesting raw events, generating normalized alarms, traversing topology relationships to correlate related alarms, identifying the root cause, and notifying the right people.

## Key Capabilities

- **Alarm lifecycle management** - raise, acknowledge, clear, suppress
- **Event ingestion** - raw event normalization and processing
- **Topology-aware root cause analysis (RCA)** - integrates with [l8topology](https://github.com/saichler/l8topology) to correlate alarms using network topology relationships
- **Correlation engine** - four strategies: topological, temporal, pattern-based, and composite
- **Notification policies** - dispatch to email, webhook, Slack, PagerDuty, or custom channels with throttling
- **Escalation policies** - time-based step progression for unacknowledged alarms
- **Maintenance windows** - scheduled suppression of alarms within scope
- **Alarm archiving** - archive resolved alarms and their events for historical analysis
- **Desktop UI** - real-time alarm dashboard with correlation tree view and topology overlay
- **Mock data generation** - phased generators for realistic test data across all services

## Architecture

The alarm service callback is the system's nerve center. Every alarm POST triggers:

1. **Maintenance check** - suppresses the alarm if within an active maintenance window
2. **Persist** - stores to PostgreSQL via l8orm
3. **Correlation** - queries active rules and alarms, runs the correlation engine to identify root cause vs. symptom relationships
4. **Notification** - evaluates notification policies, dispatches to configured targets
5. **Escalation** - schedules time-based escalation timers for unacknowledged alarms

## Services

All services share **ServiceArea 10** with prefix `/alm/`.

| Service | ServiceName | Primary Key | Description |
|---------|-------------|-------------|-------------|
| AlarmDefinition | `AlmDef` | `definitionId` | Alarm templates and thresholds |
| Alarm | `Alarm` | `alarmId` | Active alarm lifecycle |
| Event | `Event` | `eventId` | Raw event ingestion (immutable) |
| CorrelationRule | `CorrRule` | `ruleId` | RCA rule definitions |
| NotificationPolicy | `NotifPol` | `policyId` | Notification dispatch rules |
| EscalationPolicy | `EscPolicy` | `policyId` | Time-based escalation chains |
| MaintenanceWindow | `MaintWin` | `windowId` | Scheduled suppression windows |
| AlarmFilter | `AlmFilter` | `filterId` | Saved alarm filter configurations |
| ArchivedAlarm | `ArcAlarm` | `alarmId` | Historical alarms (immutable) |
| ArchivedEvent | `ArcEvent` | `eventId` | Historical events (immutable) |

## Child Types (embedded, not services)

| Type | Parent | Description |
|------|--------|-------------|
| AlarmNote | Alarm | Operator notes on alarms |
| AlarmStateChange | Alarm | State transition history |
| CorrelationCondition | CorrelationRule | Rule matching conditions |
| NotificationTarget | NotificationPolicy | Dispatch targets per policy |
| EscalationStep | EscalationPolicy | Escalation chain steps |
| EventAttribute | Event | Key-value event metadata |

## Engine Components

| Component | Directory | Description |
|-----------|-----------|-------------|
| Correlation | `correlation/` | RCA engine with topological, temporal, pattern, and composite strategies |
| Enrichment | `enrichment/` | Topology overlay - projects alarm severity onto topology nodes |
| Notification | `notification/` | Policy matching, throttling, and channel-specific dispatch |
| Escalation | `escalation/` | Time-based scheduler with per-alarm timers and step progression |
| Archiving | `archiving/` | Recursively archives alarm + events + symptoms, then removes active records |

## UI

The desktop UI is built with the l8ui shared component library and organized into five submodules:

| Submodule | Services |
|-----------|----------|
| Alarms | Alarms, Alarm Definitions, Alarm Filters |
| Events | Events |
| Correlation | Correlation Rules |
| Policies | Notification Policies, Escalation Policies |
| Maintenance | Maintenance Windows |

Features include a correlation tree view (using `Layer8DTreeGrid` with alarm hierarchy showing ROOT/SYMPTOM badges), severity/state color rendering, and section-based navigation.

## Project Structure

```
proto/                          Protobuf definitions (9 files)
  alm-alarms.proto              Alarm, AlarmNote, AlarmStateChange
  alm-definitions.proto         AlarmDefinition
  alm-events.proto              Event, EventAttribute
  alm-correlation.proto         CorrelationRule, CorrelationCondition
  alm-policies.proto            NotificationPolicy, EscalationPolicy
  alm-maintenance.proto         MaintenanceWindow
  alm-filters.proto             AlarmFilter
  alm-archive.proto             ArchivedAlarm, ArchivedEvent
  alm-common.proto              Shared enums (severity, state, etc.)
go/
  alm/
    common/                     Shared validation, service factory, type registry
    services/                   Service activation orchestrator
    alarms/                     Alarm service + post-action runners
    alarmdefinitions/           Alarm definition service
    alarmfilters/               Saved filter service
    events/                     Event service (immutable)
    correlationrules/           Correlation rule service
    notificationpolicies/       Notification policy service
    escalationpolicies/         Escalation policy service
    maintenancewindows/         Maintenance window service + checker
    archivedalarms/             Archived alarm service (immutable)
    archivedevents/             Archived event service (immutable)
    correlation/                RCA engine (topological, temporal, pattern, composite)
    enrichment/                 Topology overlay service
    notification/               Notification engine + senders
    escalation/                 Escalation scheduler
    archiving/                  Archive engine
    ui/
      web/                      Desktop UI
        alm/                    Module JS (config, enums, columns, forms, init)
          alarms/               Alarm views + correlation tree
          events/               Event views
          correlation/          Correlation rule views
          policies/             Policy views
          maintenance/          Maintenance window views
          archive/              Archived alarm/event views
        sections/               Section HTML (dashboard, alarms, system)
        js/                     App bootstrap, reference registry, sections
        css/                    Base styles, modals, responsive
        l8ui/                   Shared UI library
      main/                     UI server entry point
    main/                       Backend server entry point
    vnet/                       Standalone vnet process
  types/alm/                    Generated protobuf Go types
  tests/
    mocks/                      Mock data generators (6 phases)
      gen_foundation.go         Alarm definitions, correlation rules
      gen_config.go             Policies, escalation rules, maintenance windows, filters
      gen_events.go             Events
      gen_alarms.go             Alarms with state distribution
      gen_archive.go            Archived alarms and events
    TestCRUD_test.go            Full CRUD for all services
    TestValidation_test.go      Field validation
    TestCorrelation_test.go     Correlation engine
    TestServiceHandlers_test.go Handler accessibility
    TestServiceGetters_test.go  Service getter coverage
    TestAllService_test.go      All-services orchestrator
plans/                          Product requirements document
```

## Dependencies

Built on the Layer 8 service framework:

| Package | Role |
|---------|------|
| [l8bus](https://github.com/saichler/l8bus) | Virtual network overlay (VNet, vNic) |
| [l8orm](https://github.com/saichler/l8orm) | ORM + PostgreSQL persistence |
| [l8services](https://github.com/saichler/l8services) | Service manager framework |
| [l8topology](https://github.com/saichler/l8topology) | Topology types for enrichment + RCA |
| [l8web](https://github.com/saichler/l8web) | REST web server |
| [l8reflect](https://github.com/saichler/l8reflect) | Runtime type introspection |
| [l8types](https://github.com/saichler/l8types) | Core interfaces |
| [l8utils](https://github.com/saichler/l8utils) | Logging, web, registry utilities |
| [l8srlz](https://github.com/saichler/l8srlz) | Serialization |

## Running Tests

```bash
cd go && go test ./tests/ -v -run TestAllServices
```

Tests exercise full CRUD, validation, correlation, maintenance window suppression, and service handler accessibility through the HTTP API.

## Running Locally

```bash
cd go && ./run-local.sh
```

The script builds all binaries, starts PostgreSQL in Docker, launches the vnet/backend/UI processes, and uploads mock data. Open `http://localhost:2780/alm/` in a browser.

## License

See [LICENSE](LICENSE).
