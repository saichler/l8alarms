package main

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/alm/services"
	"github.com/saichler/l8alarms/go/alm/ui"
	"github.com/saichler/l8bus/go/overlay/vnic"
	l8common "github.com/saichler/l8common/go/common"
	"os"
)

func main() {
	resources := l8common.CreateResources("alm-"+os.Getenv("HOSTNAME"), "/data/logs/alm", uint32(common.ALM_VNET))
	ui.RegisterAlmTypes(resources)

	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Start()
	nic.WaitForConnection()

	services.ActivateAlmServices(common.DB_CREDS, common.DB_NAME, nic)
	resources.Logger().Info("alm services activated!")
	l8common.WaitForSignal(resources)
}
