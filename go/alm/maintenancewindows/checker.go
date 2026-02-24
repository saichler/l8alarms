package maintenancewindows

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
	"time"
)

// CheckResult describes how a maintenance window affects an alarm.
type CheckResult struct {
	InWindow              bool
	SuppressAlarms        bool
	SuppressNotifications bool
	WindowId              string
}

// Check evaluates whether an alarm falls within an active maintenance window.
func Check(alarm *alm.Alarm, vnic ifs.IVNic) CheckResult {
	windows, err := common.GetEntities(
		ServiceName, ServiceArea,
		&alm.MaintenanceWindow{Status: alm.MaintenanceWindowStatus_MAINTENANCE_WINDOW_STATUS_ACTIVE},
		vnic,
	)
	if err != nil || len(windows) == 0 {
		return CheckResult{}
	}

	now := time.Now().Unix()

	for _, w := range windows {
		if !isTimeActive(w, now) {
			continue
		}
		if !matchesScope(alarm, w) {
			continue
		}
		return CheckResult{
			InWindow:              true,
			SuppressAlarms:        w.SuppressAlarms,
			SuppressNotifications: w.SuppressNotifications,
			WindowId:              w.WindowId,
		}
	}

	return CheckResult{}
}

// isTimeActive checks if the maintenance window is active at the given time.
func isTimeActive(w *alm.MaintenanceWindow, now int64) bool {
	return now >= w.StartTime && now <= w.EndTime
}

// matchesScope checks if the alarm's node matches the maintenance window scope.
func matchesScope(alarm *alm.Alarm, w *alm.MaintenanceWindow) bool {
	// If no scope defined, window applies to all
	if len(w.NodeIds) == 0 && len(w.NodeTypes) == 0 && len(w.Locations) == 0 {
		return true
	}

	// Check specific node IDs
	for _, nodeId := range w.NodeIds {
		if nodeId == alarm.NodeId {
			return true
		}
	}

	// Check node types (via alarm attributes)
	if nodeType, ok := alarm.Attributes["nodeType"]; ok {
		for _, nt := range w.NodeTypes {
			if nt == nodeType {
				return true
			}
		}
	}

	// Check locations
	for _, loc := range w.Locations {
		if loc == alarm.Location {
			return true
		}
	}

	return false
}
