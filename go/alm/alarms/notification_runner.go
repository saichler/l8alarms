package alarms

import (
	"github.com/saichler/l8alarms/go/alm/notification"
	"github.com/saichler/l8alarms/go/types/alm"
	l8events "github.com/saichler/l8types/go/types/l8events"
	"github.com/saichler/l8types/go/ifs"
)

var notifEngine = notification.NewEngine()

// runNotification is called after an alarm is persisted (POST, PUT, PATCH).
// It evaluates notification policies and dispatches notifications.
func runNotification(alarm *alm.Alarm, action ifs.Action, vnic ifs.IVNic) error {
	if action != ifs.POST && action != ifs.PUT && action != ifs.PATCH {
		return nil
	}

	// Skip suppressed alarms
	if alarm.State == l8events.AlarmState_ALARM_STATE_SUPPRESSED {
		return nil
	}

	notifEngine.Notify(alarm, action, false, vnic)
	return nil
}
