package main

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/alm/ui"
	"github.com/saichler/l8bus/go/overlay/health"
	"github.com/saichler/l8bus/go/overlay/vnic"
	l8common "github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8utils/go/utils/ipsegment"
	"github.com/saichler/l8web/go/web/server"
)

func main() {
	startWebServer(2780, "/data/alm")
}

func startWebServer(port int, _ string) {
	serverConfig := &server.RestServerConfig{
		Host:           ipsegment.MachineIP,
		Port:           port,
		Authentication: true,
		Prefix:         common.PREFIX,
	}
	svr, err := server.NewRestServer(serverConfig)
	if err != nil {
		panic(err)
	}

	resources := l8common.CreateResources("web", false)
	ui.RegisterAlmTypes(resources)

	nic := vnic.NewVirtualNetworkInterface(resources, nil)
	nic.Start()
	nic.WaitForConnection()

	hs, ok := nic.Resources().Services().ServiceHandler(health.ServiceName, 0)
	if ok {
		ws := hs.WebService()
		svr.RegisterWebService(ws, nic)
	}

	// Activate the webpoints service
	sla := ifs.NewServiceLevelAgreement(&server.WebService{}, ifs.WebService, 0, false, nil)
	sla.SetArgs(svr, nic)
	nic.Resources().Services().Activate(sla, nic)

	nic.Resources().Logger().Info("Web Server Started!")

	svr.Start()
}
