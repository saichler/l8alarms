# PRD: Layer 8 Root Cause Analysis, Alarms & Events

**Project:** l8alarms
**Date:** 2026-02-24
**Status:** Draft - Pending Approval

---

## Table of Contents

1. [Overview](#1-overview)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Non-Goals](#3-goals--non-goals)
4. [Architecture Overview](#4-architecture-overview)
5. [Data Model](#5-data-model)
6. [Topology Integration](#6-topology-integration)
7. [Root Cause Analysis Engine](#7-root-cause-analysis-engine)
8. [Services](#8-services)
9. [UI Design](#9-ui-design)
10. [Project Structure](#10-project-structure)
11. [Implementation Phases](#11-implementation-phases)
12. [Compliance with Global Rules](#12-compliance-with-global-rules)

---

## 1. Overview

L8Alarms is a root cause analysis, alarm management, and event correlation system for the Layer 8 Ecosystem. It integrates with the **l8topology** project to correlate network alarms with topology relationships, enabling operators to quickly identify the underlying cause of cascading failures.

**Key Capabilities:**
- Alarm lifecycle management (raise, acknowledge, clear, suppress)
- Raw event ingestion and normalization
- Topology-aware root cause analysis (RCA)
- Correlation rules engine (topological, temporal, pattern-based)
- Notification and escalation policies
- Maintenance window scheduling
- Real-time alarm dashboard with topology overlay

---

## 2. Problem Statement

When a network device fails, it typically generates dozens of downstream alarms across connected devices. Without correlation, operators see a flood of alarms and must manually trace topology to find the root cause. This project automates that process by:

1. Ingesting raw events from managed elements
2. Generating normalized alarms from event patterns
3. Traversing topology relationships to correlate related alarms
4. Identifying root cause and suppressing symptom alarms
5. Notifying the right people at the right time

---

## 3. Goals & Non-Goals

### Goals
- Model alarms, events, and correlation rules as Layer 8 services
- Integrate with l8topology to leverage node/link relationships for RCA
- Provide a configuration-driven UI using l8ui components (desktop + mobile parity)
- Support multiple correlation strategies (topological, temporal, pattern-based)
- Follow all Layer 8 global rules (prime objects, protobuf conventions, UI patterns)

### Non-Goals
- Real-time streaming ingestion (phase 1 uses REST/polling; streaming is a future enhancement)
- ML-based anomaly detection (future enhancement)
- SNMP trap receiver implementation (external collectors feed events via API)
- Syslog receiver implementation (external collectors feed events via API)

---

## 4. Architecture Overview

### Event Processing Pipeline

```
External Collectors (SNMP, Syslog, Probes, etc.)
        |
        v
   [Event API] ---- POST /alm/10/Event ----> Event Service
        |                                        |
        v                                        v
   Event stored                          Alarm Definition matching
        |                                        |
        v                                        v
   [Alarm Generation]                    AlarmDef.eventPattern matched?
        |                                        |
        v                                 Yes    v
   [Alarm Service] <---- POST /alm/10/Alarm ----+
        |
        v
   [Correlation Engine]
        |
        +---> Query l8topology for node relationships
        +---> Apply CorrelationRules
        +---> Identify root cause alarm
        +---> Mark symptom alarms as suppressed
        |
        v
   [Notification Engine]
        |
        +---> Apply NotificationPolicy
        +---> Check MaintenanceWindow
        +---> Check EscalationPolicy
        +---> Send notifications
```

### System Dependencies

```
l8alarms
  ├── l8topology    (topology node/link data for RCA traversal)
  ├── l8services    (service framework)
  ├── l8types       (type system, interfaces)
  ├── l8utils       (cache, web, logging)
  ├── l8web         (web service framework)
  ├── l8orm         (database persistence)
  ├── l8ql          (query language)
  ├── l8srlz        (serialization)
  └── l8bus         (message bus)
```

---

## 5. Data Model

### 5.1 Prime Object Analysis

Each entity below has been evaluated against the four Prime Object criteria:
1. **Independence** - Can exist on its own
2. **Own lifecycle** - Independent state transitions
3. **Direct query need** - Users query it across all parents
4. **No parent ID dependency** - Identity stands alone

| Entity | Independent | Own Lifecycle | Direct Query | Standalone ID | Prime? |
|--------|:-----------:|:------------:|:------------:|:-------------:|:------:|
| AlarmDefinition | Yes | Yes (draft/active/disabled) | Yes ("show all alarm defs") | Yes | **Yes** |
| Alarm | Yes | Yes (active/ack/cleared) | Yes ("show all critical alarms") | Yes | **Yes** |
| Event | Yes | Yes (new/processed/archived) | Yes ("show all events from node X") | Yes | **Yes** |
| CorrelationRule | Yes | Yes (draft/active/disabled) | Yes ("show all rules") | Yes | **Yes** |
| NotificationPolicy | Yes | Yes (active/disabled) | Yes ("show all policies") | Yes | **Yes** |
| EscalationPolicy | Yes | Yes (active/disabled) | Yes ("show all escalations") | Yes | **Yes** |
| MaintenanceWindow | Yes | Yes (scheduled/active/expired) | Yes ("show all windows") | Yes | **Yes** |
| AlarmFilter | Yes | Yes (user manages saved filters) | Yes ("show my saved filters") | Yes | **Yes** |
| AlarmNote | No | No (part of alarm) | No | No | **No** (child) |
| AlarmStateChange | No | No (part of alarm) | No | No | **No** (child) |
| CorrelationCondition | No | No (part of rule) | No | No | **No** (child) |
| NotificationTarget | No | No (part of policy) | No | No | **No** (child) |
| EscalationStep | No | No (part of policy) | No | No | **No** (child) |
| EventAttribute | No | No (part of event) | No | No | **No** (child) |

### 5.2 Protobuf Definitions

#### File: `proto/alm-common.proto`

```protobuf
syntax = "proto3";
package alm;
option go_package = "./types/alm";

// ─── Alarm Severity ───

enum AlarmSeverity {
  ALARM_SEVERITY_UNSPECIFIED = 0;
  ALARM_SEVERITY_INFO = 1;
  ALARM_SEVERITY_WARNING = 2;
  ALARM_SEVERITY_MINOR = 3;
  ALARM_SEVERITY_MAJOR = 4;
  ALARM_SEVERITY_CRITICAL = 5;
}

// ─── Alarm State ───

enum AlarmState {
  ALARM_STATE_UNSPECIFIED = 0;
  ALARM_STATE_ACTIVE = 1;
  ALARM_STATE_ACKNOWLEDGED = 2;
  ALARM_STATE_CLEARED = 3;
  ALARM_STATE_SUPPRESSED = 4;
}

// ─── Event Type ───

enum EventType {
  EVENT_TYPE_UNSPECIFIED = 0;
  EVENT_TYPE_TRAP = 1;
  EVENT_TYPE_SYSLOG = 2;
  EVENT_TYPE_THRESHOLD = 3;
  EVENT_TYPE_STATE_CHANGE = 4;
  EVENT_TYPE_HEARTBEAT = 5;
  EVENT_TYPE_CONFIGURATION = 6;
  EVENT_TYPE_CUSTOM = 7;
}

// ─── Event Processing State ───

enum EventProcessingState {
  EVENT_PROCESSING_STATE_UNSPECIFIED = 0;
  EVENT_PROCESSING_STATE_NEW = 1;
  EVENT_PROCESSING_STATE_PROCESSED = 2;
  EVENT_PROCESSING_STATE_DISCARDED = 3;
  EVENT_PROCESSING_STATE_ARCHIVED = 4;
}

// ─── Alarm Definition Status ───

enum AlarmDefinitionStatus {
  ALARM_DEFINITION_STATUS_UNSPECIFIED = 0;
  ALARM_DEFINITION_STATUS_DRAFT = 1;
  ALARM_DEFINITION_STATUS_ACTIVE = 2;
  ALARM_DEFINITION_STATUS_DISABLED = 3;
}

// ─── Correlation Rule Type ───

enum CorrelationRuleType {
  CORRELATION_RULE_TYPE_UNSPECIFIED = 0;
  CORRELATION_RULE_TYPE_TOPOLOGICAL = 1;
  CORRELATION_RULE_TYPE_TEMPORAL = 2;
  CORRELATION_RULE_TYPE_PATTERN = 3;
  CORRELATION_RULE_TYPE_COMPOSITE = 4;
}

// ─── Correlation Rule Status ───

enum CorrelationRuleStatus {
  CORRELATION_RULE_STATUS_UNSPECIFIED = 0;
  CORRELATION_RULE_STATUS_DRAFT = 1;
  CORRELATION_RULE_STATUS_ACTIVE = 2;
  CORRELATION_RULE_STATUS_DISABLED = 3;
}

// ─── Notification Channel ───

enum NotificationChannel {
  NOTIFICATION_CHANNEL_UNSPECIFIED = 0;
  NOTIFICATION_CHANNEL_EMAIL = 1;
  NOTIFICATION_CHANNEL_WEBHOOK = 2;
  NOTIFICATION_CHANNEL_SLACK = 3;
  NOTIFICATION_CHANNEL_PAGERDUTY = 4;
  NOTIFICATION_CHANNEL_CUSTOM = 5;
}

// ─── Policy Status ───

enum PolicyStatus {
  POLICY_STATUS_UNSPECIFIED = 0;
  POLICY_STATUS_ACTIVE = 1;
  POLICY_STATUS_DISABLED = 2;
}

// ─── Maintenance Window Status ───

enum MaintenanceWindowStatus {
  MAINTENANCE_WINDOW_STATUS_UNSPECIFIED = 0;
  MAINTENANCE_WINDOW_STATUS_SCHEDULED = 1;
  MAINTENANCE_WINDOW_STATUS_ACTIVE = 2;
  MAINTENANCE_WINDOW_STATUS_COMPLETED = 3;
  MAINTENANCE_WINDOW_STATUS_CANCELLED = 4;
}

// ─── Maintenance Window Recurrence ───

enum RecurrenceType {
  RECURRENCE_TYPE_UNSPECIFIED = 0;
  RECURRENCE_TYPE_NONE = 1;
  RECURRENCE_TYPE_DAILY = 2;
  RECURRENCE_TYPE_WEEKLY = 3;
  RECURRENCE_TYPE_MONTHLY = 4;
}

// ─── Topology Traversal Direction (for RCA) ───

enum TraversalDirection {
  TRAVERSAL_DIRECTION_UNSPECIFIED = 0;
  TRAVERSAL_DIRECTION_UPSTREAM = 1;
  TRAVERSAL_DIRECTION_DOWNSTREAM = 2;
  TRAVERSAL_DIRECTION_BOTH = 3;
}

// ─── Condition Operator ───

enum ConditionOperator {
  CONDITION_OPERATOR_UNSPECIFIED = 0;
  CONDITION_OPERATOR_EQUALS = 1;
  CONDITION_OPERATOR_NOT_EQUALS = 2;
  CONDITION_OPERATOR_CONTAINS = 3;
  CONDITION_OPERATOR_REGEX = 4;
  CONDITION_OPERATOR_GREATER_THAN = 5;
  CONDITION_OPERATOR_LESS_THAN = 6;
  CONDITION_OPERATOR_IN = 7;
}
```

#### File: `proto/alm-definitions.proto`

```protobuf
syntax = "proto3";
package alm;
option go_package = "./types/alm";

import "alm-common.proto";
import "api.proto";

// ─── Alarm Definition ───
// Prime Object: Template defining what conditions generate an alarm.
// Operators create/manage these independently. Queried directly.

message AlarmDefinition {
  string definition_id = 1;
  string name = 2;
  string description = 3;
  AlarmDefinitionStatus status = 4;
  AlarmSeverity default_severity = 5;

  // Event matching criteria
  string event_pattern = 6;          // Regex or expression to match event message
  EventType event_type_filter = 7;   // Only match events of this type (0 = any)
  string node_type_filter = 8;       // Only match events from this node type (empty = any)

  // Threshold-based alarm generation
  int32 threshold_count = 9;         // Number of matching events before alarm
  int32 threshold_window_seconds = 10; // Time window for threshold counting

  // Auto-clear configuration
  bool auto_clear_enabled = 11;
  int32 auto_clear_seconds = 12;     // Auto-clear after N seconds of no new events
  string clear_event_pattern = 13;   // Event pattern that clears this alarm

  // Deduplication
  bool dedup_enabled = 14;
  string dedup_key_expression = 15;  // Expression to compute dedup key from event

  // Topology scope
  repeated string node_type_scope = 16;  // Limit to these topology node types

  int64 created_at = 20;
  int64 updated_at = 21;
}

message AlarmDefinitionList {
  repeated AlarmDefinition list = 1;
  l8api.L8MetaData metadata = 2;
}
```

#### File: `proto/alm-alarms.proto`

```protobuf
syntax = "proto3";
package alm;
option go_package = "./types/alm";

import "alm-common.proto";
import "api.proto";

// ─── Alarm ───
// Prime Object: Active or historical alarm instance.
// Independent lifecycle (active -> ack -> cleared). Queried directly.

message Alarm {
  string alarm_id = 1;
  string definition_id = 2;          // Reference to AlarmDefinition
  string name = 3;                   // Copied from definition at creation
  string description = 4;

  // State and severity
  AlarmState state = 5;
  AlarmSeverity severity = 6;
  AlarmSeverity original_severity = 7; // Before any operator override

  // Source (topology references by ID per Prime Object rules)
  string node_id = 8;                // L8TopologyNode.node_id
  string node_name = 9;              // Denormalized for display
  string link_id = 10;               // L8TopologyLink.link_id (optional)
  string location = 11;              // L8TopologyLocation.location (optional)
  string source_identifier = 12;     // Sub-element (e.g., interface name, process)

  // Correlation / RCA
  string root_cause_alarm_id = 13;   // If this is a symptom, points to root cause
  string correlation_rule_id = 14;   // Which rule correlated this alarm
  bool is_root_cause = 15;           // True if this alarm was identified as root cause
  int32 symptom_count = 16;          // Number of symptoms correlated to this alarm

  // Timing
  int64 first_occurrence = 17;       // Unix timestamp of first event
  int64 last_occurrence = 18;        // Unix timestamp of most recent event
  int64 acknowledged_at = 19;        // When operator acknowledged
  string acknowledged_by = 20;       // Who acknowledged
  int64 cleared_at = 21;             // When alarm was cleared
  string cleared_by = 22;            // Who/what cleared (operator or auto-clear)

  // Occurrence tracking
  int32 occurrence_count = 23;       // Number of times this alarm fired (dedup)
  string dedup_key = 24;             // Deduplication key

  // Suppression
  bool is_suppressed = 25;           // Suppressed by maintenance window or RCA
  string suppressed_by = 26;         // maintenance_window_id or root_cause_alarm_id

  // Additional context
  string event_id = 27;              // Reference to triggering Event
  map<string, string> attributes = 28; // Key-value context from the event

  // Embedded child: Notes
  repeated AlarmNote notes = 29;

  // Embedded child: State change history
  repeated AlarmStateChange state_history = 30;
}

// Child type: Note/comment on an alarm
message AlarmNote {
  string note_id = 1;
  string author = 2;
  string text = 3;
  int64 created_at = 4;
}

// Child type: State transition record
message AlarmStateChange {
  string change_id = 1;
  AlarmState from_state = 2;
  AlarmState to_state = 3;
  string changed_by = 4;
  string reason = 5;
  int64 changed_at = 6;
}

message AlarmList {
  repeated Alarm list = 1;
  l8api.L8MetaData metadata = 2;
}
```

#### File: `proto/alm-events.proto`

```protobuf
syntax = "proto3";
package alm;
option go_package = "./types/alm";

import "alm-common.proto";
import "api.proto";

// ─── Event ───
// Prime Object: Raw event occurrence from a managed element.
// Independent entity, queried directly ("show events from node X in last hour").

message Event {
  string event_id = 1;
  EventType event_type = 2;
  EventProcessingState processing_state = 3;

  // Source (topology references by ID)
  string node_id = 4;                // L8TopologyNode.node_id
  string node_name = 5;              // Denormalized for display
  string source_identifier = 6;      // Sub-element (interface, process, etc.)

  // Event content
  AlarmSeverity severity = 7;
  string message = 8;                // Human-readable event message
  string raw_data = 9;               // Original event payload (JSON/text)

  // Classification
  string category = 10;              // e.g., "interface", "cpu", "memory", "link"
  string subcategory = 11;           // e.g., "down", "threshold", "flap"

  // Processing results
  string alarm_id = 12;              // Reference to generated Alarm (if any)
  string definition_id = 13;         // Reference to matched AlarmDefinition (if any)

  // Timing
  int64 occurred_at = 14;            // When the event happened on the source
  int64 received_at = 15;            // When the system received it
  int64 processed_at = 16;           // When processing completed

  // Extensible attributes
  repeated EventAttribute attributes = 17;
}

// Child type: Key-value attribute from the event
message EventAttribute {
  string key = 1;
  string value = 2;
}

message EventList {
  repeated Event list = 1;
  l8api.L8MetaData metadata = 2;
}
```

#### File: `proto/alm-correlation.proto`

```protobuf
syntax = "proto3";
package alm;
option go_package = "./types/alm";

import "alm-common.proto";
import "api.proto";

// ─── Correlation Rule ───
// Prime Object: Defines how alarms are correlated for root cause analysis.
// Independent entity, managed by operators, queried directly.

message CorrelationRule {
  string rule_id = 1;
  string name = 2;
  string description = 3;
  CorrelationRuleType rule_type = 4;
  CorrelationRuleStatus status = 5;
  int32 priority = 6;                // Lower = higher priority (rules evaluated in order)

  // ─── Topological Correlation ───
  // "If alarm A on node X, check topology neighbors for related alarms"
  TraversalDirection traversal_direction = 7;
  int32 traversal_depth = 8;         // Max hops in topology traversal (0 = unlimited)
  repeated string root_node_types = 9;   // Node types that can be root cause
  repeated string symptom_node_types = 10; // Node types that are symptoms

  // ─── Temporal Correlation ───
  // "Group alarms that occur within N seconds of each other"
  int32 time_window_seconds = 11;

  // ─── Pattern Matching ───
  // "Match specific alarm definition patterns"
  string root_alarm_pattern = 12;        // Regex to match root cause alarm name
  string symptom_alarm_pattern = 13;     // Regex to match symptom alarm name

  // ─── Common Settings ───
  int32 min_symptom_count = 14;      // Minimum symptoms before correlation activates
  bool auto_suppress_symptoms = 15;  // Automatically suppress correlated symptom alarms
  bool auto_acknowledge_symptoms = 16; // Auto-ack symptoms when root cause is ack'd

  // Conditions for when this rule applies
  repeated CorrelationCondition conditions = 17;

  int64 created_at = 20;
  int64 updated_at = 21;
}

// Child type: Individual condition in a correlation rule
message CorrelationCondition {
  string condition_id = 1;
  string field = 2;                  // Alarm field to evaluate (e.g., "severity", "category")
  ConditionOperator operator = 3;
  string value = 4;                  // Value to compare against
}

message CorrelationRuleList {
  repeated CorrelationRule list = 1;
  l8api.L8MetaData metadata = 2;
}
```

#### File: `proto/alm-policies.proto`

```protobuf
syntax = "proto3";
package alm;
option go_package = "./types/alm";

import "alm-common.proto";
import "api.proto";

// ─── Notification Policy ───
// Prime Object: Defines when and how to send notifications for alarms.

message NotificationPolicy {
  string policy_id = 1;
  string name = 2;
  string description = 3;
  PolicyStatus status = 4;

  // Trigger conditions
  AlarmSeverity min_severity = 5;    // Only notify for this severity and above
  repeated string alarm_definition_ids = 6; // Limit to specific alarm types
  repeated string node_type_filter = 7;     // Limit to specific node types
  bool notify_on_state_change = 8;   // Notify on ack/clear too?

  // Throttling
  int32 cooldown_seconds = 9;        // Min time between notifications for same alarm
  int32 max_notifications_per_hour = 10;

  // Targets (child)
  repeated NotificationTarget targets = 11;

  int64 created_at = 15;
  int64 updated_at = 16;
}

// Child type: Notification target
message NotificationTarget {
  string target_id = 1;
  NotificationChannel channel = 2;
  string endpoint = 3;               // Email address, webhook URL, Slack channel, etc.
  string template = 4;               // Message template (with {{alarm.field}} placeholders)
}

message NotificationPolicyList {
  repeated NotificationPolicy list = 1;
  l8api.L8MetaData metadata = 2;
}

// ─── Escalation Policy ───
// Prime Object: Defines time-based escalation for unacknowledged alarms.

message EscalationPolicy {
  string policy_id = 1;
  string name = 2;
  string description = 3;
  PolicyStatus status = 4;

  // Scope
  AlarmSeverity min_severity = 5;
  repeated string alarm_definition_ids = 6;

  // Escalation steps (child)
  repeated EscalationStep steps = 7;

  int64 created_at = 10;
  int64 updated_at = 11;
}

// Child type: Single escalation step
message EscalationStep {
  string step_id = 1;
  int32 step_order = 2;             // 1, 2, 3... (evaluated in order)
  int32 delay_minutes = 3;          // Minutes after alarm before this step fires
  NotificationChannel channel = 4;
  string endpoint = 5;              // Who to notify at this escalation level
  string message_template = 6;
}

message EscalationPolicyList {
  repeated EscalationPolicy list = 1;
  l8api.L8MetaData metadata = 2;
}
```

#### File: `proto/alm-maintenance.proto`

```protobuf
syntax = "proto3";
package alm;
option go_package = "./types/alm";

import "alm-common.proto";
import "api.proto";

// ─── Maintenance Window ───
// Prime Object: Scheduled period during which alarms are suppressed.

message MaintenanceWindow {
  string window_id = 1;
  string name = 2;
  string description = 3;
  MaintenanceWindowStatus status = 4;

  // Time window
  int64 start_time = 5;
  int64 end_time = 6;

  // Recurrence
  RecurrenceType recurrence = 7;
  int32 recurrence_interval = 8;     // Every N days/weeks/months

  // Scope - which topology elements are covered
  repeated string node_ids = 9;      // Specific nodes
  repeated string node_types = 10;   // All nodes of these types
  repeated string locations = 11;    // All nodes at these locations

  // Behavior
  bool suppress_alarms = 12;        // Suppress alarms during window?
  bool suppress_notifications = 13; // Suppress notifications only (alarms still raised)?

  string created_by = 14;
  int64 created_at = 15;
  int64 updated_at = 16;
}

message MaintenanceWindowList {
  repeated MaintenanceWindow list = 1;
  l8api.L8MetaData metadata = 2;
}
```

#### File: `proto/alm-filters.proto`

```protobuf
syntax = "proto3";
package alm;
option go_package = "./types/alm";

import "alm-common.proto";
import "api.proto";

// ─── Alarm Filter ───
// Prime Object: Saved filter/view for alarm queries.
// Users create and manage their own saved filters independently.

message AlarmFilter {
  string filter_id = 1;
  string name = 2;
  string description = 3;
  string owner = 4;                  // User who created this filter
  bool is_shared = 5;               // Visible to all users?
  bool is_default = 6;              // Default filter for this user?

  // Filter criteria
  repeated AlarmSeverity severities = 7;
  repeated AlarmState states = 8;
  repeated string node_ids = 9;
  repeated string node_types = 10;
  repeated string locations = 11;
  repeated string definition_ids = 12;
  bool root_cause_only = 13;        // Only show root cause alarms
  bool exclude_suppressed = 14;
  int32 max_age_hours = 15;         // Only show alarms younger than N hours

  int64 created_at = 16;
  int64 updated_at = 17;
}

message AlarmFilterList {
  repeated AlarmFilter list = 1;
  l8api.L8MetaData metadata = 2;
}
```

### 5.3 Enum Summary

| Enum | Zero Value | Count | File |
|------|-----------|-------|------|
| AlarmSeverity | ALARM_SEVERITY_UNSPECIFIED | 6 | alm-common.proto |
| AlarmState | ALARM_STATE_UNSPECIFIED | 5 | alm-common.proto |
| EventType | EVENT_TYPE_UNSPECIFIED | 8 | alm-common.proto |
| EventProcessingState | EVENT_PROCESSING_STATE_UNSPECIFIED | 5 | alm-common.proto |
| AlarmDefinitionStatus | ALARM_DEFINITION_STATUS_UNSPECIFIED | 4 | alm-common.proto |
| CorrelationRuleType | CORRELATION_RULE_TYPE_UNSPECIFIED | 5 | alm-common.proto |
| CorrelationRuleStatus | CORRELATION_RULE_STATUS_UNSPECIFIED | 4 | alm-common.proto |
| NotificationChannel | NOTIFICATION_CHANNEL_UNSPECIFIED | 6 | alm-common.proto |
| PolicyStatus | POLICY_STATUS_UNSPECIFIED | 3 | alm-common.proto |
| MaintenanceWindowStatus | MAINTENANCE_WINDOW_STATUS_UNSPECIFIED | 5 | alm-common.proto |
| RecurrenceType | RECURRENCE_TYPE_UNSPECIFIED | 5 | alm-common.proto |
| TraversalDirection | TRAVERSAL_DIRECTION_UNSPECIFIED | 4 | alm-common.proto |
| ConditionOperator | CONDITION_OPERATOR_UNSPECIFIED | 8 | alm-common.proto |

All 13 enums follow the zero-value UNSPECIFIED convention.

---

## 6. Topology Integration

### 6.1 How l8alarms Uses l8topology

l8alarms references topology entities **by ID only** (per Prime Object rules):
- `Alarm.node_id` -> `L8TopologyNode.node_id`
- `Alarm.link_id` -> `L8TopologyLink.link_id`
- `Alarm.location` -> `L8TopologyLocation.location`

The RCA correlation engine queries l8topology's service API to:
1. Retrieve neighbors of a node (for topological correlation)
2. Traverse upstream/downstream paths through the topology graph
3. Determine if two alarming nodes are topologically related

### 6.2 Proposed l8topology Edits

The following additions to `l8topology/proto/topology.proto` are proposed to support alarm overlay on topology maps:

#### Add to `L8TopologyNode`:

```protobuf
message L8TopologyNode {
  // ... existing fields ...

  // NEW: Alarm overlay fields (populated by l8alarms, not persisted in topology)
  L8TopologyNodeStatus node_status = 6;   // Operational status
  int32 alarm_count = 7;                  // Active alarm count
  AlarmSeverityOverlay highest_severity = 8; // Highest active alarm severity
}
```

#### Add new enum `L8TopologyNodeStatus`:

```protobuf
enum L8TopologyNodeStatus {
  L8_TOPOLOGY_NODE_STATUS_UNKNOWN = 0;
  L8_TOPOLOGY_NODE_STATUS_UP = 1;
  L8_TOPOLOGY_NODE_STATUS_DOWN = 2;
  L8_TOPOLOGY_NODE_STATUS_DEGRADED = 3;
  L8_TOPOLOGY_NODE_STATUS_MAINTENANCE = 4;
}
```

#### Add new enum `AlarmSeverityOverlay`:

```protobuf
// Alarm severity for topology overlay (separate from l8alarms enums
// to avoid cross-project proto dependency)
enum AlarmSeverityOverlay {
  ALARM_SEVERITY_OVERLAY_NONE = 0;
  ALARM_SEVERITY_OVERLAY_INFO = 1;
  ALARM_SEVERITY_OVERLAY_WARNING = 2;
  ALARM_SEVERITY_OVERLAY_MINOR = 3;
  ALARM_SEVERITY_OVERLAY_MAJOR = 4;
  ALARM_SEVERITY_OVERLAY_CRITICAL = 5;
}
```

#### Add to `L8TopologyLink`:

```protobuf
message L8TopologyLink {
  // ... existing fields ...

  // NEW: Alarm overlay fields
  int32 alarm_count = 6;
  AlarmSeverityOverlay highest_severity = 7;
}
```

### 6.3 Integration Pattern

l8alarms implements a **topology enrichment service** that:

1. Receives topology data from l8topology (via the `ITopoDiscovery` interface or direct API call)
2. Enriches each node/link with alarm overlay data (severity counts)
3. Returns the enriched topology for map rendering

This keeps l8topology independent of l8alarms while allowing the alarm system to augment topology views. The overlay fields are populated at query time, not persisted in topology storage.

### 6.4 Topology Traversal for RCA

The correlation engine uses l8topology's link data to build an adjacency graph:

```
Given: Alarm on Node A (Router)
1. Query topology: GET /topo/{service} → L8Topology with nodes and links
2. Build adjacency: For each link, map aside <-> zside
3. BFS from Node A up to traversal_depth hops
4. At each hop, check if the neighbor has active alarms
5. Apply correlation rule logic to determine root cause
```

**Example - Upstream Root Cause:**
```
[Switch-01: DOWN] ── link ── [Router-01: ALARM] ── link ── [AP-01: ALARM]
                                                  ── link ── [AP-02: ALARM]
                                                  ── link ── [AP-03: ALARM]

Correlation Rule: "Topological Upstream"
- traversal_direction: UPSTREAM
- root_node_types: [SWITCH, ROUTER]
- symptom_node_types: [ACCESS_POINT]

Result: Switch-01 DOWN is root cause; AP-01, AP-02, AP-03 alarms are symptoms
```

---

## 7. Root Cause Analysis Engine

### 7.1 Correlation Strategies

#### Strategy 1: Topological Correlation
Uses l8topology relationships to correlate alarms on connected devices.

**Algorithm:**
1. When a new alarm fires, query active alarms on topology neighbors
2. Traverse in the configured direction (upstream/downstream/both)
3. If a higher-priority node has an alarm, it may be root cause
4. Apply node type filters (e.g., "only routers/switches can be root cause")

#### Strategy 2: Temporal Correlation
Groups alarms that occur within a time window.

**Algorithm:**
1. When a new alarm fires, query alarms that started within `time_window_seconds`
2. Apply pattern matching on alarm names/definitions
3. The alarm matching `root_alarm_pattern` is the root cause
4. All others matching `symptom_alarm_pattern` are symptoms

#### Strategy 3: Pattern-Based Correlation
Matches specific alarm definition patterns regardless of topology.

**Algorithm:**
1. Maintain a pattern registry from active correlation rules
2. When a new alarm fires, check if it matches any symptom pattern
3. If yes, look for an active alarm matching the corresponding root pattern
4. Link them via root_cause_alarm_id

#### Strategy 4: Composite Correlation
Combines multiple strategies (e.g., topological AND temporal).

**Algorithm:**
1. Apply topological check first (are the nodes connected?)
2. Then apply temporal check (did alarms occur within window?)
3. Both must pass for correlation to activate

### 7.2 Correlation Lifecycle

```
New Alarm Created
      |
      v
 For each active CorrelationRule (ordered by priority):
      |
      +---> Does the alarm match rule conditions?
      |     |
      |     No → next rule
      |     |
      |     Yes ↓
      |
      +---> Execute correlation strategy
      |     |
      |     +---> Find candidate root cause alarm
      |     |
      |     +---> Verify minimum symptom count
      |     |
      |     No match → next rule
      |     |
      |     Match ↓
      |
      +---> Link: alarm.root_cause_alarm_id = root.alarm_id
      +---> Update: root.is_root_cause = true
      +---> Update: root.symptom_count++
      +---> If auto_suppress_symptoms: alarm.state = SUPPRESSED
      +---> If auto_acknowledge_symptoms and root is ACK'd: alarm.state = ACK'd
      +---> STOP (first matching rule wins)
```

---

## 8. Services

### 8.1 Service Definitions

| # | Entity | ServiceName | ServiceArea | Primary Key | Description |
|---|--------|-------------|:-----------:|-------------|-------------|
| 1 | AlarmDefinition | AlmDef | 10 | DefinitionId | Alarm definition templates |
| 2 | Alarm | Alarm | 10 | AlarmId | Alarm instances |
| 3 | Event | Event | 10 | EventId | Raw events |
| 4 | CorrelationRule | CorrRule | 10 | RuleId | RCA correlation rules |
| 5 | NotificationPolicy | NotifPol | 10 | PolicyId | Notification policies |
| 6 | EscalationPolicy | EscPolicy | 10 | PolicyId | Escalation policies |
| 7 | MaintenanceWindow | MaintWin | 10 | WindowId | Maintenance windows |
| 8 | AlarmFilter | AlmFilter | 10 | FilterId | Saved alarm filters |

All ServiceNames are 10 characters or fewer.

### 8.2 Service Callback Validations

| Service | Required Fields | Enum Validations | Special Logic |
|---------|----------------|-----------------|---------------|
| AlmDef | name | status, default_severity, event_type_filter | Auto-generate definition_id on POST |
| Alarm | definition_id, node_id | state, severity, original_severity | Auto-generate alarm_id on POST; trigger correlation engine on POST |
| Event | event_type, node_id, message | event_type, processing_state, severity | Auto-generate event_id on POST; match against AlarmDefinitions |
| CorrRule | name, rule_type | rule_type, status, traversal_direction | Auto-generate rule_id on POST |
| NotifPol | name | status, min_severity | Auto-generate policy_id on POST |
| EscPolicy | name | status, min_severity | Auto-generate policy_id on POST |
| MaintWin | name, start_time, end_time | status, recurrence | Auto-generate window_id on POST |
| AlmFilter | name, owner | - | Auto-generate filter_id on POST |

---

## 9. UI Design

### 9.1 Module Structure

Following the l8erp configuration-driven UI pattern using l8ui components.

**Namespace:** `Alm`
**ServiceArea:** `10`
**Section:** `alarms`

#### Submodules:

| # | Submodule Key | Label | Services |
|---|--------------|-------|----------|
| 1 | alarms | Alarms | alarms (default), alarm-definitions, alarm-filters |
| 2 | events | Events | events |
| 3 | correlation | Correlation | correlation-rules |
| 4 | policies | Policies | notification-policies, escalation-policies |
| 5 | maintenance | Maintenance | maintenance-windows |

### 9.2 Supported Views

| Service | Views | Notes |
|---------|-------|-------|
| Alarms | table, kanban, chart | Kanban by severity; chart for alarm trends |
| AlarmDefinitions | table | Standard CRUD |
| AlarmFilters | table | Standard CRUD |
| Events | table | High-volume, time-sorted |
| CorrelationRules | table | Standard CRUD |
| NotificationPolicies | table | Standard CRUD |
| EscalationPolicies | table | Standard CRUD |
| MaintenanceWindows | table, calendar | Calendar for schedule visualization |

### 9.3 Kanban Configuration (Alarms)

```javascript
viewConfig: {
    kanban: {
        laneField: 'severity',
        laneOrder: ['CRITICAL', 'MAJOR', 'MINOR', 'WARNING', 'INFO'],
        cardTitle: 'name',
        cardSubtitle: 'nodeName',
        cardFields: ['state', 'firstOccurrence', 'occurrenceCount']
    }
}
```

### 9.4 Chart Configuration (Alarms)

```javascript
viewConfig: {
    chart: {
        type: 'bar',
        groupBy: 'severity',
        countField: 'alarmId'
    }
}
```

### 9.5 UI File Structure

```
go/alm/ui/web/
├── app.html
├── css/                          # Global styles
├── l8ui/                         # Shared components (copied from l8erp)
├── js/
│   ├── sections.js
│   └── reference-registry-alm.js
├── sections/
│   └── alarms.html
├── alm/
│   ├── alm.css                   # Module accent color
│   ├── alm-config.js             # Service endpoint config
│   ├── alm-section-config.js     # Navigation structure
│   ├── alm-init.js               # Module initializer
│   ├── alarms/
│   │   ├── alarms-enums.js
│   │   ├── alarms-columns.js
│   │   └── alarms-forms.js
│   ├── events/
│   │   ├── events-enums.js
│   │   ├── events-columns.js
│   │   └── events-forms.js
│   ├── correlation/
│   │   ├── correlation-enums.js
│   │   ├── correlation-columns.js
│   │   └── correlation-forms.js
│   ├── policies/
│   │   ├── policies-enums.js
│   │   ├── policies-columns.js
│   │   └── policies-forms.js
│   └── maintenance/
│       ├── maintenance-enums.js
│       ├── maintenance-columns.js
│       └── maintenance-forms.js
└── m/                            # Mobile (parity with desktop)
    ├── app.html
    └── ...
```

### 9.6 Module Config Example

```javascript
Layer8ModuleConfigFactory.create({
    namespace: 'Alm',
    modules: {
        'alarms': {
            label: 'Alarms', icon: '...',
            services: [
                {
                    key: 'alarms',
                    label: 'Active Alarms',
                    icon: '...',
                    endpoint: '/10/Alarm',
                    model: 'Alarm',
                    supportedViews: ['table', 'kanban', 'chart']
                },
                {
                    key: 'alarm-definitions',
                    label: 'Alarm Definitions',
                    icon: '...',
                    endpoint: '/10/AlmDef',
                    model: 'AlarmDefinition'
                },
                {
                    key: 'alarm-filters',
                    label: 'Saved Filters',
                    icon: '...',
                    endpoint: '/10/AlmFilter',
                    model: 'AlarmFilter'
                }
            ]
        },
        'events': {
            label: 'Events', icon: '...',
            services: [
                {
                    key: 'events',
                    label: 'Events',
                    icon: '...',
                    endpoint: '/10/Event',
                    model: 'Event'
                }
            ]
        },
        'correlation': {
            label: 'Correlation', icon: '...',
            services: [
                {
                    key: 'correlation-rules',
                    label: 'Correlation Rules',
                    icon: '...',
                    endpoint: '/10/CorrRule',
                    model: 'CorrelationRule'
                }
            ]
        },
        'policies': {
            label: 'Policies', icon: '...',
            services: [
                {
                    key: 'notification-policies',
                    label: 'Notification Policies',
                    icon: '...',
                    endpoint: '/10/NotifPol',
                    model: 'NotificationPolicy'
                },
                {
                    key: 'escalation-policies',
                    label: 'Escalation Policies',
                    icon: '...',
                    endpoint: '/10/EscPolicy',
                    model: 'EscalationPolicy'
                }
            ]
        },
        'maintenance': {
            label: 'Maintenance', icon: '...',
            services: [
                {
                    key: 'maintenance-windows',
                    label: 'Maintenance Windows',
                    icon: '...',
                    endpoint: '/10/MaintWin',
                    model: 'MaintenanceWindow',
                    supportedViews: ['table', 'calendar']
                }
            ]
        }
    },
    submodules: ['AlmAlarms', 'AlmEvents', 'AlmCorrelation', 'AlmPolicies', 'AlmMaintenance']
});
```

### 9.7 Module Init

```javascript
Layer8DModuleFactory.create({
    namespace: 'Alm',
    defaultModule: 'alarms',
    defaultService: 'alarms',
    sectionSelector: 'alarms',      // matches defaultModule
    initializerName: 'initializeAlm',
    requiredNamespaces: [
        'AlmAlarms', 'AlmEvents', 'AlmCorrelation',
        'AlmPolicies', 'AlmMaintenance'
    ]
});
```

---

## 10. Project Structure

```
/home/saichler/proj/src/github.com/saichler/l8alarms/
├── proto/
│   ├── alm-common.proto
│   ├── alm-definitions.proto
│   ├── alm-alarms.proto
│   ├── alm-events.proto
│   ├── alm-correlation.proto
│   ├── alm-policies.proto
│   ├── alm-maintenance.proto
│   ├── alm-filters.proto
│   └── make-bindings.sh
├── go/
│   ├── go.mod
│   ├── types/alm/                   # Generated .pb.go files
│   ├── alm/
│   │   ├── common/                  # Shared service abstractions
│   │   ├── alarmdefinitions/
│   │   │   ├── AlarmDefinitionService.go
│   │   │   └── AlarmDefinitionServiceCallback.go
│   │   ├── alarms/
│   │   │   ├── AlarmService.go
│   │   │   └── AlarmServiceCallback.go
│   │   ├── events/
│   │   │   ├── EventService.go
│   │   │   └── EventServiceCallback.go
│   │   ├── correlationrules/
│   │   │   ├── CorrelationRuleService.go
│   │   │   └── CorrelationRuleServiceCallback.go
│   │   ├── notificationpolicies/
│   │   │   ├── NotificationPolicyService.go
│   │   │   └── NotificationPolicyServiceCallback.go
│   │   ├── escalationpolicies/
│   │   │   ├── EscalationPolicyService.go
│   │   │   └── EscalationPolicyServiceCallback.go
│   │   ├── maintenancewindows/
│   │   │   ├── MaintenanceWindowService.go
│   │   │   └── MaintenanceWindowServiceCallback.go
│   │   ├── alarmfilters/
│   │   │   ├── AlarmFilterService.go
│   │   │   └── AlarmFilterServiceCallback.go
│   │   ├── correlation/             # RCA engine (NOT a service)
│   │   │   ├── engine.go            # Correlation orchestrator
│   │   │   ├── topological.go       # Topological strategy
│   │   │   ├── temporal.go          # Temporal strategy
│   │   │   ├── pattern.go           # Pattern strategy
│   │   │   └── composite.go         # Composite strategy
│   │   ├── enrichment/              # Topology enrichment (NOT a service)
│   │   │   └── topology_overlay.go  # Populates alarm overlay on topology
│   │   ├── services/
│   │   │   └── activate_all.go      # Service activation
│   │   ├── ui/
│   │   │   ├── shared_alm.go        # Type registration
│   │   │   └── main/
│   │   │       └── main.go          # Entry point
│   │   └── main/
│   │       └── alm_main.go          # Application entry
│   └── tests/
│       └── mocks/                   # Mock data generation
│           ├── main.go
│           ├── store.go
│           ├── data.go
│           ├── gen_alm_definitions.go
│           ├── gen_alm_alarms.go
│           ├── gen_alm_events.go
│           ├── gen_alm_correlation.go
│           ├── gen_alm_policies.go
│           ├── gen_alm_maintenance.go
│           ├── gen_alm_filters.go
│           └── alm_phases.go
└── go/alm/ui/web/                   # Frontend (see 9.5)
```

---

## 11. Implementation Phases

### Phase 1: Foundation (Proto + Types + Basic Services)
1. Create all proto files
2. Create `make-bindings.sh` and generate Go types
3. Set up `go.mod` with dependencies
4. Implement `common/` service abstractions (reuse from l8erp pattern)
5. Implement all 8 services with CRUD + validation callbacks
6. Implement type registration for UI
7. Implement service activation

### Phase 2: UI Foundation
1. Set up l8ui component library (shared from l8erp)
2. Create section HTML, section config, module config
3. Implement all 5 submodule data files (enums, columns, forms)
4. Create module init file
5. Create app.html with script loading
6. Create reference registry
7. Create module CSS
8. Implement mobile parity

### Phase 3: Correlation Engine
1. Implement correlation engine orchestrator
2. Implement topological correlation strategy
3. Implement temporal correlation strategy
4. Implement pattern-based correlation strategy
5. Implement composite correlation strategy
6. Wire correlation engine into Alarm service callback (POST trigger)
7. Implement alarm state cascade (auto-suppress, auto-acknowledge)

### Phase 4: Topology Integration
1. Propose and implement l8topology proto edits (node status, alarm overlay)
2. Implement topology enrichment service
3. Implement topology query integration for RCA traversal
4. Test end-to-end: event -> alarm -> correlation -> topology overlay

### Phase 5: Notification & Escalation
1. Implement notification engine
2. Implement escalation timer/scheduler
3. Wire into alarm lifecycle (new alarm, state change triggers)
4. Implement maintenance window checking

### Phase 6: Mock Data & Testing
1. Implement mock data generators for all 8 services
2. Implement phase orchestration (dependency-ordered)
3. Generate realistic alarm/event scenarios with correlations
4. End-to-end integration testing

---

## 12. Compliance with Global Rules

| Rule | Compliance | Notes |
|------|-----------|-------|
| Plan Approval Workflow | Yes | This PRD is in `./plans/` |
| File Size < 500 lines | Yes | Correlation engine split into 5 files |
| Prime Object Rules | Yes | 8 prime objects, 6 child types embedded |
| Cross-ref by ID only | Yes | Topology refs are string IDs (node_id, link_id) |
| Proto List Convention | Yes | All lists use `repeated X list = 1; metadata = 2` |
| Enum Zero Value | Yes | All 13 enums have UNSPECIFIED = 0 |
| ServiceName <= 10 chars | Yes | Longest: "EscPolicy" (9 chars) |
| Same ServiceArea per module | Yes | All services use ServiceArea = 10 |
| ServiceCallback auto-gen ID | Yes | All callbacks generate ID on POST |
| UI Module Integration | Yes | Checklist in Phase 2 |
| sectionSelector = defaultModule | Yes | Both set to "alarms" |
| Mobile Parity | Yes | Phase 2 includes mobile |
| No Duplicate Code | Yes | Shared `common/` abstractions |
| Config-Driven UI | Yes | Modules are config + data only |
| L8UI Theme Compliance | Yes | Uses `--layer8d-*` CSS variables |
| Proto Generation Method | Yes | Uses `cd proto && ./make-bindings.sh` |
