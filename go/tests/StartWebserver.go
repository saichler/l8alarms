package tests

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/alm/ui"
	"github.com/saichler/l8bus/go/overlay/health"
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8web/go/web/server"
)

func startWebServer(port int, nic ifs.IVNic, servicesNic ...ifs.IVNic) ifs.IWebServer {
	// Register UI types on the vNic's resources
	ui.RegisterAlmTypes(nic.Resources())

	serverConfig := &server.RestServerConfig{
		Host:           "localhost",
		Port:           port,
		Authentication: true,
		Prefix:         common.PREFIX,
		CertName:       "/data/l8alarms",
	}
	svr, err := server.NewRestServer(serverConfig)
	if err != nil {
		panic(err)
	}

	hs, ok := nic.Resources().Services().ServiceHandler(health.ServiceName, 0)
	if ok {
		ws := hs.WebService()
		svr.RegisterWebService(ws, nic)
	}

	// Activate the webpoints service
	sla := ifs.NewServiceLevelAgreement(&server.WebService{}, ifs.WebService, 0, false, nil)
	sla.SetArgs(svr)
	nic.Resources().Services().Activate(sla, nic)

	nic.Resources().Logger().Info("L8Alarms Test Web Server Started!")

	go svr.Start()

	return svr
}
