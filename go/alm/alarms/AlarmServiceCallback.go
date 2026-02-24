package alarms

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

func newAlarmServiceCallback() ifs.IServiceCallback {
	return common.NewValidation[alm.Alarm]("Alarm",
		func(e *alm.Alarm) { common.GenerateID(&e.AlarmId) }).
		Require(func(e *alm.Alarm) string { return e.AlarmId }, "AlarmId").
		Require(func(e *alm.Alarm) string { return e.DefinitionId }, "DefinitionId").
		Require(func(e *alm.Alarm) string { return e.NodeId }, "NodeId").
		Enum(func(e *alm.Alarm) int32 { return int32(e.State) }, alm.AlarmState_name, "State").
		Enum(func(e *alm.Alarm) int32 { return int32(e.Severity) }, alm.AlarmSeverity_name, "Severity").
		BeforeAction(checkMaintenanceWindow).
		After(runCorrelation).
		After(runNotification).
		After(runEscalation).
		Build()
}
