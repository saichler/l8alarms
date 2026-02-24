package maintenancewindows

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "MaintWin"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	common.ActivateService[alm.MaintenanceWindow, alm.MaintenanceWindowList](common.ServiceConfig{
		ServiceName: ServiceName, ServiceArea: ServiceArea,
		PrimaryKey: "WindowId", Callback: newMaintenanceWindowServiceCallback(),
		Transactional: true,
	}, creds, dbname, vnic)
}

func MaintenanceWindows(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func MaintenanceWindow(id string, vnic ifs.IVNic) (*alm.MaintenanceWindow, error) {
	return common.GetEntity(ServiceName, ServiceArea, &alm.MaintenanceWindow{WindowId: id}, vnic)
}
