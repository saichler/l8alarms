package alarms

import (
	"fmt"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
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
