package alarms

import (
	"github.com/saichler/l8alarms/go/alm/maintenancewindows"
	"github.com/saichler/l8alarms/go/alm/notification"
	"github.com/saichler/l8alarms/go/types/alm"
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
	if alarm.State == alm.AlarmState_ALARM_STATE_SUPPRESSED {
		return nil
	}

	// Check if notifications are suppressed by maintenance window
	suppressNotif := false
	result := maintenancewindows.Check(alarm, vnic)
	if result.InWindow && result.SuppressNotifications {
		suppressNotif = true
	}

	notifEngine.Notify(alarm, action, suppressNotif, vnic)
	return nil
}
