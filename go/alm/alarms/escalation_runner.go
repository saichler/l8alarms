package alarms

import (
	"github.com/saichler/l8alarms/go/alm/escalation"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

var escScheduler = escalation.NewScheduler()

// runEscalation is called after an alarm is persisted.
// On POST: schedules escalation timers for matching policies.
// On PUT/PATCH: cancels escalation if alarm is acknowledged/cleared.
func runEscalation(alarm *alm.Alarm, action ifs.Action, vnic ifs.IVNic) error {
	switch action {
	case ifs.POST:
		escScheduler.Schedule(alarm, vnic)
	case ifs.PUT, ifs.PATCH:
		escScheduler.HandleStateChange(alarm)
	}
	return nil
}
