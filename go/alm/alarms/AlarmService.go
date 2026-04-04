package alarms

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "Alarm"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	common.ActivateService(common.ServiceConfig{
		ServiceName: ServiceName, ServiceArea: ServiceArea,
		PrimaryKey: "AlarmId", Callback: newAlarmServiceCallback(vnic),
	}, &alm.Alarm{}, &alm.AlarmList{}, creds, dbname, vnic)
}

func Alarms(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func GetAlarm(id string, vnic ifs.IVNic) (*alm.Alarm, error) {
	result, err := common.GetEntity(ServiceName, ServiceArea, &alm.Alarm{AlarmId: id}, vnic)
	if err != nil || result == nil {
		return nil, err
	}
	return result.(*alm.Alarm), nil
}
