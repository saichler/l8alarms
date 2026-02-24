package alarmdefinitions

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "AlmDef"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	common.ActivateService[alm.AlarmDefinition, alm.AlarmDefinitionList](common.ServiceConfig{
		ServiceName: ServiceName, ServiceArea: ServiceArea,
		PrimaryKey: "DefinitionId", Callback: newAlarmDefinitionServiceCallback(),
		Transactional: true,
	}, creds, dbname, vnic)
}

func AlarmDefinitions(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func AlarmDefinition(id string, vnic ifs.IVNic) (*alm.AlarmDefinition, error) {
	return common.GetEntity(ServiceName, ServiceArea, &alm.AlarmDefinition{DefinitionId: id}, vnic)
}
