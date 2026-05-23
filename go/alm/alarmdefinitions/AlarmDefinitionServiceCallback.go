package alarmdefinitions

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	l8events "github.com/saichler/l8types/go/types/l8events"
	"github.com/saichler/l8types/go/ifs"
)

func newAlarmDefinitionServiceCallback(vnic ifs.IVNic) ifs.IServiceCallback {
	return common.NewValidation(&alm.AlarmDefinition{}, vnic).
		Require(func(e interface{}) string { return e.(*alm.AlarmDefinition).DefinitionId }, "DefinitionId").
		Require(func(e interface{}) string { return e.(*alm.AlarmDefinition).Name }, "Name").
		Enum(func(e interface{}) int32 { return int32(e.(*alm.AlarmDefinition).Status) }, alm.AlarmDefinitionStatus_name, "Status").
		Enum(func(e interface{}) int32 { return int32(e.(*alm.AlarmDefinition).DefaultSeverity) }, l8events.Severity_name, "DefaultSeverity").
		Build()
}
