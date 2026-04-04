package archivedalarms

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "ArcAlarm"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	common.ActivateService(common.ServiceConfig{
		ServiceName: ServiceName, ServiceArea: ServiceArea,
		PrimaryKey: "AlarmId", Callback: newArchivedAlarmServiceCallback(vnic),
	}, &alm.ArchivedAlarm{}, &alm.ArchivedAlarmList{}, creds, dbname, vnic)
}

func ArchivedAlarms(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func GetArchivedAlarm(id string, vnic ifs.IVNic) (*alm.ArchivedAlarm, error) {
	result, err := common.GetEntity(ServiceName, ServiceArea, &alm.ArchivedAlarm{AlarmId: id}, vnic)
	if err != nil || result == nil {
		return nil, err
	}
	return result.(*alm.ArchivedAlarm), nil
}
