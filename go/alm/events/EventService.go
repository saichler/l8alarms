package events

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "Event"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	common.ActivateService[alm.Event, alm.EventList](common.ServiceConfig{
		ServiceName: ServiceName, ServiceArea: ServiceArea,
		PrimaryKey: "EventId", Callback: newEventServiceCallback(),
		Transactional: true,
	}, creds, dbname, vnic)
}

func Events(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func GetEvent(id string, vnic ifs.IVNic) (*alm.Event, error) {
	return common.GetEntity(ServiceName, ServiceArea, &alm.Event{EventId: id}, vnic)
}
