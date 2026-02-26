package archivedevents

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "ArcEvent"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	common.ActivateService[alm.ArchivedEvent, alm.ArchivedEventList](common.ServiceConfig{
		ServiceName: ServiceName, ServiceArea: ServiceArea,
		PrimaryKey: "EventId", Callback: newArchivedEventServiceCallback(),
		Transactional: true,
	}, creds, dbname, vnic)
}

func ArchivedEvents(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func GetArchivedEvent(id string, vnic ifs.IVNic) (*alm.ArchivedEvent, error) {
	return common.GetEntity(ServiceName, ServiceArea, &alm.ArchivedEvent{EventId: id}, vnic)
}
