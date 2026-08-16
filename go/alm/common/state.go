package common

import (
	"fmt"
	"github.com/saichler/l8alarms/go/types/alm"
	"time"
)

// validTransitions operates on alm.AlarmState — Alarm.State's actual proto
// type (a locally-declared enum, not l8events.AlarmState, even though the
// two are numerically identical). This file has exactly one consumer
// (alarms/state_validator.go), which works with *alm.Alarm throughout.
var validTransitions = map[alm.AlarmState][]alm.AlarmState{
	alm.AlarmState_ALARM_STATE_ACTIVE: {
		alm.AlarmState_ALARM_STATE_ACKNOWLEDGED,
		alm.AlarmState_ALARM_STATE_CLEARED,
		alm.AlarmState_ALARM_STATE_SUPPRESSED,
	},
	alm.AlarmState_ALARM_STATE_ACKNOWLEDGED: {
		alm.AlarmState_ALARM_STATE_ACTIVE,
		alm.AlarmState_ALARM_STATE_CLEARED,
		alm.AlarmState_ALARM_STATE_SUPPRESSED,
	},
	alm.AlarmState_ALARM_STATE_SUPPRESSED: {
		alm.AlarmState_ALARM_STATE_ACTIVE,
		alm.AlarmState_ALARM_STATE_ACKNOWLEDGED,
		alm.AlarmState_ALARM_STATE_CLEARED,
	},
}

func ValidTransition(from, to alm.AlarmState) bool {
	allowed, ok := validTransitions[from]
	if !ok {
		return false
	}
	for _, s := range allowed {
		if s == to {
			return true
		}
	}
	return false
}

func Transition(alarm *alm.Alarm, newState alm.AlarmState, changedBy, reason string) error {
	if alarm == nil {
		return fmt.Errorf("alarm is nil")
	}

	if !ValidTransition(alarm.State, newState) {
		return fmt.Errorf("invalid transition from %s to %s",
			alarm.State.String(), newState.String())
	}

	now := time.Now().Unix()
	oldState := alarm.State

	alarm.StateHistory = append(alarm.StateHistory, &alm.AlarmStateChange{
		FromState: oldState,
		ToState:   newState,
		ChangedBy: changedBy,
		Reason:    reason,
		ChangedAt: now,
	})

	alarm.State = newState

	switch newState {
	case alm.AlarmState_ALARM_STATE_ACKNOWLEDGED:
		alarm.AcknowledgedBy = changedBy
		alarm.AcknowledgedAt = now
	case alm.AlarmState_ALARM_STATE_CLEARED:
		alarm.ClearedBy = changedBy
		alarm.ClearedAt = now
	case alm.AlarmState_ALARM_STATE_SUPPRESSED:
		alarm.IsSuppressed = true
		alarm.SuppressedBy = changedBy
	case alm.AlarmState_ALARM_STATE_ACTIVE:
		alarm.IsSuppressed = false
		alarm.SuppressedBy = ""
	}

	return nil
}

func Acknowledge(alarm *alm.Alarm, acknowledgedBy string) error {
	return Transition(alarm, alm.AlarmState_ALARM_STATE_ACKNOWLEDGED, acknowledgedBy, "")
}

func Clear(alarm *alm.Alarm, clearedBy string) error {
	return Transition(alarm, alm.AlarmState_ALARM_STATE_CLEARED, clearedBy, "")
}

func Suppress(alarm *alm.Alarm, suppressedBy string) error {
	return Transition(alarm, alm.AlarmState_ALARM_STATE_SUPPRESSED, suppressedBy, "")
}
