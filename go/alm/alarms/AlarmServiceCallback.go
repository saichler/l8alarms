package alarms

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	l8events "github.com/saichler/l8events/go/types/l8events"
	"github.com/saichler/l8types/go/ifs"
)

func newAlarmServiceCallback() ifs.IServiceCallback {
	return common.NewValidation[alm.Alarm]("Alarm",
		func(e *alm.Alarm) { common.GenerateID(&e.AlarmId) }).
		Require(func(e *alm.Alarm) string { return e.AlarmId }, "AlarmId").
		Require(func(e *alm.Alarm) string { return e.DefinitionId }, "DefinitionId").
		Require(func(e *alm.Alarm) string { return e.NodeId }, "NodeId").
		Enum(func(e *alm.Alarm) int32 { return int32(e.State) }, l8events.AlarmState_name, "State").
		Enum(func(e *alm.Alarm) int32 { return int32(e.Severity) }, l8events.Severity_name, "Severity").
		BeforeAction(protectSystemFields).
		BeforeAction(validateStateTransition).
		BeforeAction(checkMaintenanceWindow).
		After(runCorrelation).
		After(runNotification).
		After(runEscalation).
		Build()
}
