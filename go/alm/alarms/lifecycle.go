package alarms

import (
	"fmt"
	"github.com/saichler/l8alarms/go/alm/alarmdefinitions"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
	l8events "github.com/saichler/l8types/go/types/l8events"
	"time"
)

// decideAlarmForEvent implements the Target Flow: match the event against
// active AlarmDefinitions, then DROP / CLEAR / MERGE / CREATE.
//
// Interpretation note: "matches a definition whose clear_event_pattern this
// event satisfies, AND an ACTIVE alarm exists for that definition's
// DedupKey" is resolved as: the definition consulted for clear_event_pattern
// is the SAME definition matchDefinition already selected via
// event_pattern/event_category_filter/node_type_filter (the plan's "matched"
// definition) — not a second, independently-searched definition. This keeps
// the dedup-key computation and the clear-pattern check anchored to one
// definition per event, which is the only self-consistent reading given
// AlarmDefinition.dedup_key_expression is defined per-definition.
//
// CLEAR is checked before the dedup_enabled gate: dedup_enabled=false only
// disables the MERGE branch ("no merge lookup performed" per the plan) — it
// does not prevent an explicit clear_event_pattern match from clearing an
// existing alarm.
func decideAlarmForEvent(event *l8events.EventRecord, vnic ifs.IVNic) (*alm.Alarm, bool, error) {
	defs, err := fetchActiveDefinitions(vnic)
	if err != nil {
		return nil, false, fmt.Errorf("failed to query alarm definitions: %w", err)
	}

	def := matchDefinition(event, defs)
	if def == nil {
		return nil, false, nil // DROP — no definition matches
	}

	dedupKey := computeDedupKey(def, event)
	existing, err := findActiveAlarmByDedupKey(dedupKey, vnic)
	if err != nil {
		return nil, false, fmt.Errorf("failed to query existing alarm: %w", err)
	}

	if existing != nil && matchesClearPattern(event, def) {
		if err := clearAlarm(existing, "system:event", vnic); err != nil {
			return nil, false, fmt.Errorf("failed to clear alarm: %w", err)
		}
		if err := markEventProcessed(event.EventId, existing.AlarmId, vnic); err != nil {
			fmt.Printf("[alarms] mark event processed failed for %s: %v\n", event.EventId, err)
		}
		return nil, false, nil
	}

	if existing != nil && def.DedupEnabled {
		if err := mergeAlarmWithEvent(existing, def, event, vnic); err != nil {
			return nil, false, fmt.Errorf("failed to merge alarm: %w", err)
		}
		return nil, false, nil
	}

	newAlarm := createAlarmFromEvent(def, event)
	return newAlarm, true, nil
}

// createAlarmFromEvent builds a new *alm.Alarm from a matched definition and
// the triggering event. Persisted immediately regardless of
// threshold_count — provisional status is tracked via
// CorrelationThresholdState, not by withholding creation.
func createAlarmFromEvent(def *alm.AlarmDefinition, event *l8events.EventRecord) *alm.Alarm {
	now := time.Now().Unix()
	a := &alm.Alarm{
		DefinitionId:     def.DefinitionId,
		Name:             def.Name,
		Description:      def.Description,
		Severity:         def.DefaultSeverity,
		OriginalSeverity: def.DefaultSeverity,
		NodeId:           event.SourceId,
		NodeName:         event.SourceName,
		SourceIdentifier: event.SourceId,
		EventId:          event.EventId,
		DedupKey:         computeDedupKey(def, event),
		State:            alm.AlarmState_ALARM_STATE_ACTIVE,
		FirstOccurrence:  now,
		LastOccurrence:   now,
		OccurrenceCount:  1,
	}
	common.GenerateID(&a.AlarmId)
	if def.ThresholdCount > 1 {
		a.CorrelationThresholdState = alm.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_PENDING_THRESHOLD
	} else {
		a.CorrelationThresholdState = alm.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_OPEN_FOR_CORRELATION
	}
	return a
}

// afterAlarmCreated runs once a new alarm has been persisted (After(POST)):
// starts whichever timers apply, adds it to the correlation-eligible cache
// if it's immediately OPEN_FOR_CORRELATION, and marks the source event
// processed. Re-fetches the AlarmDefinition since the framework's
// After(POST) hook only passes the persisted *alm.Alarm.
func afterAlarmCreated(alarm *alm.Alarm, vnic ifs.IVNic) {
	def, err := alarmdefinitions.AlarmDefinition(alarm.DefinitionId, vnic)
	if err != nil || def == nil {
		fmt.Printf("[alarms] afterAlarmCreated: could not load definition %s for alarm %s: %v\n",
			alarm.DefinitionId, alarm.AlarmId, err)
		return
	}
	switch alarm.CorrelationThresholdState {
	case alm.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_PENDING_THRESHOLD:
		startThresholdTimer(alarm.AlarmId, def.ThresholdWindowSeconds, vnic)
	case alm.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_OPEN_FOR_CORRELATION:
		startCorrelationTimer(alarm.AlarmId, def.CorrelationWindowSeconds, vnic)
		addCorrelationEligible(alarm)
	}
	if def.AutoClearEnabled {
		startAutoClearTimer(alarm.AlarmId, def.AutoClearSeconds, vnic)
	}
	if err := markEventProcessed(alarm.EventId, alarm.AlarmId, vnic); err != nil {
		fmt.Printf("[alarms] mark event processed failed for %s: %v\n", alarm.EventId, err)
	}
}

// mergeAlarmWithEvent updates an existing alarm in place for a new
// occurrence of the same dedup key. Does not auto-escalate Severity.
// Reactivates ACKNOWLEDGED alarms to ACTIVE.
func mergeAlarmWithEvent(existing *alm.Alarm, def *alm.AlarmDefinition, event *l8events.EventRecord, vnic ifs.IVNic) error {
	existing.OccurrenceCount++
	existing.LastOccurrence = time.Now().Unix()
	if existing.State == alm.AlarmState_ALARM_STATE_ACKNOWLEDGED {
		existing.State = alm.AlarmState_ALARM_STATE_ACTIVE
	}

	crossedThreshold := existing.CorrelationThresholdState == alm.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_PENDING_THRESHOLD &&
		existing.OccurrenceCount >= def.ThresholdCount
	if crossedThreshold {
		transitionToOpenForCorrelation(existing, def, vnic)
	}

	if err := common.PutEntity(ServiceName, ServiceArea, existing, vnic); err != nil {
		return err
	}
	if def.AutoClearEnabled {
		resetAutoClearTimer(existing.AlarmId, def.AutoClearSeconds)
	}
	if err := markEventProcessed(event.EventId, existing.AlarmId, vnic); err != nil {
		fmt.Printf("[alarms] mark event processed failed for %s: %v\n", event.EventId, err)
	}
	return nil
}

// transitionToOpenForCorrelation moves alarm from PENDING_THRESHOLD (or an
// immediate create with no meaningful threshold) into OPEN_FOR_CORRELATION:
// cancels the threshold-window timer, starts the correlation-window timer,
// and adds the alarm to the correlation-eligible cache. Does not persist —
// the caller is responsible for PutEntity/POST.
func transitionToOpenForCorrelation(alarm *alm.Alarm, def *alm.AlarmDefinition, vnic ifs.IVNic) {
	alarm.CorrelationThresholdState = alm.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_OPEN_FOR_CORRELATION
	cancelThresholdTimer(alarm.AlarmId)
	startCorrelationTimer(alarm.AlarmId, def.CorrelationWindowSeconds, vnic)
	addCorrelationEligible(alarm)
}

// clearAlarm transitions an alarm to CLEARED, cancels all its timers, evicts
// it from the correlation-eligible cache, and persists the change. Shared by
// the clear_event_pattern match path and the auto-clear timer.
func clearAlarm(existing *alm.Alarm, clearedBy string, vnic ifs.IVNic) error {
	now := time.Now().Unix()
	existing.State = alm.AlarmState_ALARM_STATE_CLEARED
	existing.ClearedAt = now
	existing.ClearedBy = clearedBy
	existing.CorrelationThresholdState = alm.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_STABLE

	cancelAllTimers(existing.AlarmId)
	evictCorrelationEligible(existing.AlarmId)

	return common.PutEntity(ServiceName, ServiceArea, existing, vnic)
}
