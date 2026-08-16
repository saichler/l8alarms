package alarms

import (
	"fmt"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
	l8events "github.com/saichler/l8types/go/types/l8events"
)

// protectSystemFields rejects PUT requests that attempt to modify identity/origin fields.
// These fields define *what* the alarm is and *where* it came from — they are immutable after creation.
// Fields updated by internal engines (correlation, maintenance, dedup) are NOT protected here,
// because the engines use the same PUT path and cannot be distinguished from user requests.
func protectSystemFields(incoming *alm.Alarm, action ifs.Action, vnic ifs.IVNic) error {
	if action != ifs.PUT {
		return nil
	}

	existing, err := GetAlarm(incoming.AlarmId, vnic)
	if err != nil {
		return fmt.Errorf("cannot verify alarm fields: %w", err)
	}
	if existing == nil {
		return nil // new alarm, nothing to protect
	}

	// Identity / origin fields — immutable after creation
	if incoming.DefinitionId != existing.DefinitionId {
		return fieldProtectionError("definitionId")
	}
	if incoming.Name != existing.Name {
		return fieldProtectionError("name")
	}
	if incoming.Description != existing.Description {
		return fieldProtectionError("description")
	}
	if incoming.OriginalSeverity != existing.OriginalSeverity {
		return fieldProtectionError("originalSeverity")
	}
	if incoming.NodeId != existing.NodeId {
		return fieldProtectionError("nodeId")
	}
	if incoming.NodeName != existing.NodeName {
		return fieldProtectionError("nodeName")
	}
	if incoming.LinkId != existing.LinkId {
		return fieldProtectionError("linkId")
	}
	if incoming.Location != existing.Location {
		return fieldProtectionError("location")
	}
	if incoming.SourceIdentifier != existing.SourceIdentifier {
		return fieldProtectionError("sourceIdentifier")
	}
	if incoming.EventId != existing.EventId {
		return fieldProtectionError("eventId")
	}
	if incoming.DedupKey != existing.DedupKey {
		return fieldProtectionError("dedupKey")
	}

	return nil
}

func fieldProtectionError(field string) error {
	return fmt.Errorf("%s is a system-managed field and cannot be modified", field)
}

// protectPatchFields enforces PATCH's restricted scope now that Alarm has no
// PUT endpoint at all: a caller may only transition State to ACKNOWLEDGED or
// CLEARED (never SUPPRESSED, never ACTIVE — no "Reactivate" via PATCH), set
// AcknowledgedBy/AcknowledgedAt or ClearedBy/ClearedAt accordingly, and add
// Notes. Everything else is rejected, the same way protectSystemFields
// already rejects identity-field changes on PUT.
//
// Unlike protectSystemFields (PUT — a full-replace body), the incoming value
// here is a PARTIAL PATCH body: fields the caller didn't intend to touch
// arrive as their Go zero value. l8reflect/updating's Patch merge (confirmed
// by reading Comparators.go) already treats a zero string/int/enum as "not
// sent" and skips it — every string/int/enum check below mirrors that
// exact convention (only flag a field that is BOTH non-zero AND different
// from the stored value), or a same-value PATCH, or a PATCH that only sets
// Notes/State, would be rejected outright.
//
// IsRootCause/IsSuppressed are deliberately NOT protected here: proto3 bools
// have no "unset" zero value (l8reflect's boolUpdate applies any bool
// present, even false), so a diff-based guard on a partial body would false-
// positive on every ordinary Acknowledge/Clear PATCH that simply omits them.
// The correlation engine already owns these fields exclusively via PUT, not
// PATCH — no UI-driven PATCH flow has a reason to send them at all.
func protectPatchFields(incoming *alm.Alarm, action ifs.Action, vnic ifs.IVNic) error {
	if action != ifs.PATCH {
		return nil
	}

	existing, err := GetAlarm(incoming.AlarmId, vnic)
	if err != nil {
		return fmt.Errorf("cannot verify alarm fields: %w", err)
	}
	if existing == nil {
		return nil
	}

	if incoming.State != alm.AlarmState_ALARM_STATE_UNSPECIFIED && incoming.State != existing.State {
		if incoming.State != alm.AlarmState_ALARM_STATE_ACKNOWLEDGED &&
			incoming.State != alm.AlarmState_ALARM_STATE_CLEARED {
			return fmt.Errorf("state can only be transitioned to Acknowledged or Cleared via PATCH")
		}
	}

	if incoming.DefinitionId != "" && incoming.DefinitionId != existing.DefinitionId {
		return fieldProtectionError("definitionId")
	}
	if incoming.Name != "" && incoming.Name != existing.Name {
		return fieldProtectionError("name")
	}
	if incoming.Description != "" && incoming.Description != existing.Description {
		return fieldProtectionError("description")
	}
	if incoming.Severity != l8events.Severity_SEVERITY_UNSPECIFIED && incoming.Severity != existing.Severity {
		return fieldProtectionError("severity")
	}
	if incoming.OriginalSeverity != l8events.Severity_SEVERITY_UNSPECIFIED && incoming.OriginalSeverity != existing.OriginalSeverity {
		return fieldProtectionError("originalSeverity")
	}
	if incoming.NodeId != "" && incoming.NodeId != existing.NodeId {
		return fieldProtectionError("nodeId")
	}
	if incoming.NodeName != "" && incoming.NodeName != existing.NodeName {
		return fieldProtectionError("nodeName")
	}
	if incoming.LinkId != "" && incoming.LinkId != existing.LinkId {
		return fieldProtectionError("linkId")
	}
	if incoming.Location != "" && incoming.Location != existing.Location {
		return fieldProtectionError("location")
	}
	if incoming.SourceIdentifier != "" && incoming.SourceIdentifier != existing.SourceIdentifier {
		return fieldProtectionError("sourceIdentifier")
	}
	if incoming.EventId != "" && incoming.EventId != existing.EventId {
		return fieldProtectionError("eventId")
	}
	if incoming.DedupKey != "" && incoming.DedupKey != existing.DedupKey {
		return fieldProtectionError("dedupKey")
	}
	if incoming.RootCauseAlarmId != "" && incoming.RootCauseAlarmId != existing.RootCauseAlarmId {
		return fieldProtectionError("rootCauseAlarmId")
	}
	if incoming.CorrelationRuleId != "" && incoming.CorrelationRuleId != existing.CorrelationRuleId {
		return fieldProtectionError("correlationRuleId")
	}
	if incoming.SymptomCount != 0 && incoming.SymptomCount != existing.SymptomCount {
		return fieldProtectionError("symptomCount")
	}
	if incoming.CorrelationThresholdState != alm.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_UNSPECIFIED &&
		incoming.CorrelationThresholdState != existing.CorrelationThresholdState {
		return fieldProtectionError("correlationThresholdState")
	}
	if incoming.OccurrenceCount != 0 && incoming.OccurrenceCount != existing.OccurrenceCount {
		return fieldProtectionError("occurrenceCount")
	}
	if incoming.FirstOccurrence != 0 && incoming.FirstOccurrence != existing.FirstOccurrence {
		return fieldProtectionError("firstOccurrence")
	}
	if incoming.LastOccurrence != 0 && incoming.LastOccurrence != existing.LastOccurrence {
		return fieldProtectionError("lastOccurrence")
	}
	if incoming.SuppressedBy != "" && incoming.SuppressedBy != existing.SuppressedBy {
		return fieldProtectionError("suppressedBy")
	}

	return nil
}
