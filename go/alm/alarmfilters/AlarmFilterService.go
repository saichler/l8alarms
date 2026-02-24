package alarmfilters

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "AlmFilter"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	common.ActivateService[alm.AlarmFilter, alm.AlarmFilterList](common.ServiceConfig{
		ServiceName: ServiceName, ServiceArea: ServiceArea,
		PrimaryKey: "FilterId", Callback: newAlarmFilterServiceCallback(),
		Transactional: true,
	}, creds, dbname, vnic)
}

func AlarmFilters(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func GetAlarmFilter(id string, vnic ifs.IVNic) (*alm.AlarmFilter, error) {
	return common.GetEntity(ServiceName, ServiceArea, &alm.AlarmFilter{FilterId: id}, vnic)
}
