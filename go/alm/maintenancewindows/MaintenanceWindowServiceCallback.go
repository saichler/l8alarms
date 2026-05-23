package maintenancewindows

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	l8events "github.com/saichler/l8types/go/types/l8events"
	"github.com/saichler/l8types/go/ifs"
)

func newMaintenanceWindowServiceCallback(vnic ifs.IVNic) ifs.IServiceCallback {
	return common.NewValidation(&alm.MaintenanceWindow{}, vnic).
		Require(func(e interface{}) string { return e.(*alm.MaintenanceWindow).WindowId }, "WindowId").
		Require(func(e interface{}) string { return e.(*alm.MaintenanceWindow).Name }, "Name").
		Enum(func(e interface{}) int32 { return int32(e.(*alm.MaintenanceWindow).Status) }, l8events.MaintenanceStatus_name, "Status").
		DateNotZero(func(e interface{}) int64 { return e.(*alm.MaintenanceWindow).StartTime }, "StartTime").
		DateNotZero(func(e interface{}) int64 { return e.(*alm.MaintenanceWindow).EndTime }, "EndTime").
		Build()
}
