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

## Architecture

The alarm service callback is the system's nerve center. Every alarm POST triggers:

1. **Maintenance check** - suppresses the alarm if within an active maintenance window
2. **Persist** - stores to PostgreSQL via l8orm
3. **Correlation** - queries active rules and alarms, runs the correlation engine to identify root cause vs. symptom relationships
4. **Notification** - evaluates notification policies, dispatches to configured targets
5. **Escalation** - schedules time-based escalation timers for unacknowledged alarms

## Services

All services share **ServiceArea 10** with prefix `/alm/`.

| Service | ServiceName | Description |
|---------|-------------|-------------|
| Alarm | `Alarm` | Active alarm lifecycle |
| AlarmDefinition | `AlmDef` | Alarm templates and thresholds |
| AlarmFilter | `AlmFilter` | Saved alarm filter configurations |
| Event | `Event` | Raw event ingestion (immutable) |
| CorrelationRule | `CorrRule` | RCA rule definitions |
| NotificationPolicy | `NotifPol` | Notification dispatch rules |
| EscalationPolicy | `EscPolicy` | Time-based escalation chains |
| MaintenanceWindow | `MaintWin` | Scheduled suppression windows |
| ArchivedAlarm | `ArcAlarm` | Historical alarms (immutable) |
| ArchivedEvent | `ArcEvent` | Historical events (immutable) |

## Engine Components

| Component | Description |
|-----------|-------------|
| `correlation/` | RCA engine with topological, temporal, pattern, and composite strategies |
| `enrichment/` | Topology overlay - projects alarm severity onto topology nodes |
| `notification/` | Policy matching, throttling, and channel-specific dispatch |
| `escalation/` | Time-based scheduler with per-alarm timers and step progression |
| `archiving/` | Recursively archives alarm + events + symptoms, then removes active records |

## Project Structure

```
proto/                      Protobuf definitions (9 files)
go/
  alm/
    common/                 Shared validation, service factory, defaults
    services/               Service activation orchestrator
    alarms/                 Alarm service + post-action runners
    alarmdefinitions/       Alarm definition service
    alarmfilters/           Saved filter service
    events/                 Event service (immutable)
    correlationrules/       Correlation rule service
    notificationpolicies/   Notification policy service
    escalationpolicies/     Escalation policy service
    maintenancewindows/     Maintenance window service
    archivedalarms/         Archived alarm service (immutable)
    archivedevents/         Archived event service (immutable)
    correlation/            RCA engine (4 strategies)
    enrichment/             Topology overlay service
    notification/           Notification engine + senders
    escalation/             Escalation scheduler
    archiving/              Archive engine
    ui/                     Web UI (desktop)
    vnet/                   Standalone vnet process
  types/alm/               Generated protobuf Go types
  tests/                   Integration tests + mock data
  demo/                    Pre-built demo binaries
plans/                     Product requirements document
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

## Running the Demo

Pre-built binaries are in `go/demo/`. Start the three processes:

```bash
cd go/demo
./vnet_demo &     # VNet relay
./alm_demo &      # Alarm services
./ui_demo &       # Web UI (port 2780)
```

Then open `http://localhost:2780/alm/` in a browser.

## License

See [LICENSE](LICENSE).
