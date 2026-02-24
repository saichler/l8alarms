package alarms

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "Alarm"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	common.ActivateService[alm.Alarm, alm.AlarmList](common.ServiceConfig{
		ServiceName: ServiceName, ServiceArea: ServiceArea,
		PrimaryKey: "AlarmId", Callback: newAlarmServiceCallback(),
		Transactional: true,
	}, creds, dbname, vnic)
}

func Alarms(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func GetAlarm(id string, vnic ifs.IVNic) (*alm.Alarm, error) {
	return common.GetEntity(ServiceName, ServiceArea, &alm.Alarm{AlarmId: id}, vnic)
}
