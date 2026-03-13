package maintenancewindows

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	l8events "github.com/saichler/l8events/go/types/l8events"
	"github.com/saichler/l8types/go/ifs"
)

func newMaintenanceWindowServiceCallback() ifs.IServiceCallback {
	return common.NewValidation[alm.MaintenanceWindow]("MaintenanceWindow",
		func(e *alm.MaintenanceWindow) { common.GenerateID(&e.WindowId) }).
		Require(func(e *alm.MaintenanceWindow) string { return e.WindowId }, "WindowId").
		Require(func(e *alm.MaintenanceWindow) string { return e.Name }, "Name").
		Enum(func(e *alm.MaintenanceWindow) int32 { return int32(e.Status) }, l8events.MaintenanceStatus_name, "Status").
		DateNotZero(func(e *alm.MaintenanceWindow) int64 { return e.StartTime }, "StartTime").
		DateNotZero(func(e *alm.MaintenanceWindow) int64 { return e.EndTime }, "EndTime").
		Build()
}
