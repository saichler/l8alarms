package alarmdefinitions

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "AlmDef"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	common.ActivateService(common.ServiceConfig{
		ServiceName: ServiceName, ServiceArea: ServiceArea,
		PrimaryKey: "DefinitionId", Callback: newAlarmDefinitionServiceCallback(vnic),
	}, &alm.AlarmDefinition{}, &alm.AlarmDefinitionList{}, creds, dbname, vnic)
}

func AlarmDefinitions(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func AlarmDefinition(id string, vnic ifs.IVNic) (*alm.AlarmDefinition, error) {
	result, err := common.GetEntity(ServiceName, ServiceArea, &alm.AlarmDefinition{DefinitionId: id}, vnic)
	if err != nil || result == nil {
		return nil, err
	}
	return result.(*alm.AlarmDefinition), nil
}
