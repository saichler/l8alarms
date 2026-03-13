package alarms

import (
	"fmt"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8events/go/state"
	l8events "github.com/saichler/l8events/go/types/l8events"
	"github.com/saichler/l8types/go/ifs"
)

// validateStateTransition uses the l8events state machine to validate that
// alarm state changes follow allowed transitions. Only applies on PUT.
func validateStateTransition(incoming *alm.Alarm, action ifs.Action, vnic ifs.IVNic) error {
	if action != ifs.PUT {
		return nil
	}

	// UNSPECIFIED state means the caller isn't changing state
	if incoming.State == l8events.AlarmState_ALARM_STATE_UNSPECIFIED {
		return nil
	}

	existing, err := GetAlarm(incoming.AlarmId, vnic)
	if err != nil {
		return fmt.Errorf("cannot validate state transition: %w", err)
	}
	if existing == nil {
		return nil
	}

	// If state hasn't changed, nothing to validate
	if incoming.State == existing.State {
		return nil
	}

	if !state.ValidTransition(existing.State, incoming.State) {
		return fmt.Errorf("invalid state transition from %s to %s",
			existing.State.String(), incoming.State.String())
	}

	return nil
}
