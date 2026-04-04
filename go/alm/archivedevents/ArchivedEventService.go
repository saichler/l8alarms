package archivedevents

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "ArcEvent"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	common.ActivateService(common.ServiceConfig{
		ServiceName: ServiceName, ServiceArea: ServiceArea,
		PrimaryKey: "EventId", Callback: newArchivedEventServiceCallback(vnic),
	}, &alm.ArchivedEvent{}, &alm.ArchivedEventList{}, creds, dbname, vnic)
}

func ArchivedEvents(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func GetArchivedEvent(id string, vnic ifs.IVNic) (*alm.ArchivedEvent, error) {
	result, err := common.GetEntity(ServiceName, ServiceArea, &alm.ArchivedEvent{EventId: id}, vnic)
	if err != nil || result == nil {
		return nil, err
	}
	return result.(*alm.ArchivedEvent), nil
}
