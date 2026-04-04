package alarms

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	l8events "github.com/saichler/l8events/go/types/l8events"
	"github.com/saichler/l8types/go/ifs"
)

func newAlarmServiceCallback(vnic ifs.IVNic) ifs.IServiceCallback {
	return common.NewValidation(&alm.Alarm{}, vnic).
		Require(func(e interface{}) string { return e.(*alm.Alarm).AlarmId }, "AlarmId").
		Require(func(e interface{}) string { return e.(*alm.Alarm).DefinitionId }, "DefinitionId").
		Require(func(e interface{}) string { return e.(*alm.Alarm).NodeId }, "NodeId").
		Enum(func(e interface{}) int32 { return int32(e.(*alm.Alarm).State) }, l8events.AlarmState_name, "State").
		Enum(func(e interface{}) int32 { return int32(e.(*alm.Alarm).Severity) }, l8events.Severity_name, "Severity").
		BeforeAction(protectSystemFields).
		BeforeAction(validateStateTransition).
		BeforeAction(checkMaintenanceWindow).
		After(runCorrelation).
		After(runNotification).
		After(runEscalation).
		Build()
}
