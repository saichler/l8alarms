package alarms

import (
	"github.com/saichler/l8alarms/go/alm/maintenancewindows"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

// checkMaintenanceWindow runs before alarm persistence on POST.
// If the alarm's node is in an active maintenance window with suppress_alarms=true,
// the alarm state is set to SUPPRESSED before it's saved.
func checkMaintenanceWindow(alarm *alm.Alarm, action ifs.Action, vnic ifs.IVNic) error {
	if action != ifs.POST {
		return nil
	}

	result := maintenancewindows.Check(alarm, vnic)
	if !result.InWindow {
		return nil
	}

	if result.SuppressAlarms {
		alarm.State = alm.AlarmState_ALARM_STATE_SUPPRESSED
		alarm.IsSuppressed = true
		alarm.SuppressedBy = "maintenance:" + result.WindowId
	}

	return nil
}
