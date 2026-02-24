package alarmdefinitions

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

func newAlarmDefinitionServiceCallback() ifs.IServiceCallback {
	return common.NewValidation[alm.AlarmDefinition]("AlarmDefinition",
		func(e *alm.AlarmDefinition) { common.GenerateID(&e.DefinitionId) }).
		Require(func(e *alm.AlarmDefinition) string { return e.DefinitionId }, "DefinitionId").
		Require(func(e *alm.AlarmDefinition) string { return e.Name }, "Name").
		Enum(func(e *alm.AlarmDefinition) int32 { return int32(e.Status) }, alm.AlarmDefinitionStatus_name, "Status").
		Enum(func(e *alm.AlarmDefinition) int32 { return int32(e.DefaultSeverity) }, alm.AlarmSeverity_name, "DefaultSeverity").
		Build()
}
