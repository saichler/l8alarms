package events

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "Event"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	common.ActivateService(common.ServiceConfig{
		ServiceName: ServiceName, ServiceArea: ServiceArea,
		PrimaryKey: "EventId", Callback: newEventServiceCallback(vnic),
	}, &alm.Event{}, &alm.EventList{}, creds, dbname, vnic)
}

func Events(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func GetEvent(id string, vnic ifs.IVNic) (*alm.Event, error) {
	result, err := common.GetEntity(ServiceName, ServiceArea, &alm.Event{EventId: id}, vnic)
	if err != nil || result == nil {
		return nil, err
	}
	return result.(*alm.Event), nil
}
