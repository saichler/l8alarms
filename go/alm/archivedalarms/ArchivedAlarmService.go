package archivedalarms

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "ArcAlarm"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	common.ActivateService[alm.ArchivedAlarm, alm.ArchivedAlarmList](common.ServiceConfig{
		ServiceName: ServiceName, ServiceArea: ServiceArea,
		PrimaryKey: "AlarmId", Callback: newArchivedAlarmServiceCallback(),
		Transactional: true,
	}, creds, dbname, vnic)
}

func ArchivedAlarms(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func GetArchivedAlarm(id string, vnic ifs.IVNic) (*alm.ArchivedAlarm, error) {
	return common.GetEntity(ServiceName, ServiceArea, &alm.ArchivedAlarm{AlarmId: id}, vnic)
}
