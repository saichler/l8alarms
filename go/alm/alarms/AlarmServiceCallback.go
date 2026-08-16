package alarms

import (
	"errors"
	"fmt"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
	l8events "github.com/saichler/l8types/go/types/l8events"
)

// alarmCallback implements ifs.IServiceCallback directly rather than via
// common.NewValidation's VB builder. The VB builder hardcodes a single
// concrete type for every action (its typeCheck rejects anything else,
// including on POST) — but Alarm's POST body is now a *l8events.EventRecord
// while every other action (GET/PUT/PATCH/DELETE) operates on *alm.Alarm.
// No existing shared-callback helper can express "POST accepts type A,
// everything else accepts type B", so this is a small, local implementation
// of the two-method ifs.IServiceCallback interface — not a framework change
// (framework-interface-boundaries.md).
func newAlarmServiceCallback(vnic ifs.IVNic) ifs.IServiceCallback {
	return &alarmCallback{}
}

type alarmCallback struct{}

// Before dispatches per action. POST is the sole entry point for events —
// see decideAlarmForEvent for the DROP/CLEAR/MERGE/CREATE decision. PUT and
// PATCH still operate on *alm.Alarm: PUT is used internally (by the
// correlation engine and by MERGE/CLEAR's own common.PutEntity calls, never
// exposed over HTTP — see AlarmService.go); PATCH is the only
// externally-reachable mutation, restricted to Acknowledge/Clear/notes.
func (c *alarmCallback) Before(any interface{}, action ifs.Action, cont bool, vnic ifs.IVNic) (interface{}, bool, error) {
	switch action {
	case ifs.POST:
		event, ok := any.(*l8events.EventRecord)
		if !ok {
			return nil, false, errors.New("invalid EventRecord type")
		}
		return decideAlarmForEvent(event, vnic)
	case ifs.PUT:
		alarm, ok := any.(*alm.Alarm)
		if !ok {
			return nil, false, errors.New("invalid Alarm type")
		}
		if err := protectSystemFields(alarm, action, vnic); err != nil {
			return nil, false, err
		}
		if err := validateStateTransition(alarm, action, vnic); err != nil {
			return nil, false, err
		}
		return nil, true, nil
	case ifs.PATCH:
		alarm, ok := any.(*alm.Alarm)
		if !ok {
			return nil, false, errors.New("invalid Alarm type")
		}
		if err := protectPatchFields(alarm, action, vnic); err != nil {
			return nil, false, err
		}
		return nil, true, nil
	default:
		return nil, true, nil
	}
}

// After runs the existing correlation/notification/escalation chain. Only
// ever invoked when Before returned cont=true (POST-create, PUT, PATCH) —
// the framework skips After entirely when cont=false (DROP/CLEAR/MERGE),
// which is exactly why those branches perform their side effects
// synchronously inside Before/decideAlarmForEvent instead of relying on
// this hook.
func (c *alarmCallback) After(any interface{}, action ifs.Action, cont bool, vnic ifs.IVNic) (interface{}, bool, error) {
	if action != ifs.POST && action != ifs.PUT && action != ifs.PATCH {
		return nil, true, nil
	}
	alarm, ok := any.(*alm.Alarm)
	if !ok {
		return nil, true, nil
	}

	if action == ifs.POST {
		afterAlarmCreated(alarm, vnic)
	}
	if err := runCorrelation(alarm, action, vnic); err != nil {
		fmt.Println("[alarms] correlation warning:", err.Error())
	}
	if err := runNotification(alarm, action, vnic); err != nil {
		fmt.Println("[alarms] notification warning:", err.Error())
	}
	if err := runEscalation(alarm, action, vnic); err != nil {
		fmt.Println("[alarms] escalation warning:", err.Error())
	}
	return nil, true, nil
}
