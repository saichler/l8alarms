package alarmfilters

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "AlmFilter"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	sla := common.NewOrmSLA(ServiceName, ServiceArea, "FilterId", newAlarmFilterServiceCallback(vnic),
		&alm.AlarmFilter{}, &alm.AlarmFilterList{})
	common.ActivateService(sla, creds, dbname, vnic)
}

func AlarmFilters(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func GetAlarmFilter(id string, vnic ifs.IVNic) (*alm.AlarmFilter, error) {
	result, err := common.GetEntity(ServiceName, ServiceArea, &alm.AlarmFilter{FilterId: id}, vnic)
	if err != nil || result == nil {
		return nil, err
	}
	return result.(*alm.AlarmFilter), nil
}
