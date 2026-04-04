package maintenancewindows

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
)

const (
	ServiceName = "MaintWin"
	ServiceArea = byte(10)
)

func Activate(creds, dbname string, vnic ifs.IVNic) {
	common.ActivateService(common.ServiceConfig{
		ServiceName: ServiceName, ServiceArea: ServiceArea,
		PrimaryKey: "WindowId", Callback: newMaintenanceWindowServiceCallback(vnic),
	}, &alm.MaintenanceWindow{}, &alm.MaintenanceWindowList{}, creds, dbname, vnic)
}

func MaintenanceWindows(vnic ifs.IVNic) (ifs.IServiceHandler, bool) {
	return common.ServiceHandler(ServiceName, ServiceArea, vnic)
}

func MaintenanceWindow(id string, vnic ifs.IVNic) (*alm.MaintenanceWindow, error) {
	result, err := common.GetEntity(ServiceName, ServiceArea, &alm.MaintenanceWindow{WindowId: id}, vnic)
	if err != nil || result == nil {
		return nil, err
	}
	return result.(*alm.MaintenanceWindow), nil
}
