package main

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8bus/go/overlay/vnet"
	"os"
)

func main() {
	resources := common.CreateResources("vnet-" + os.Getenv("HOSTNAME"))
	net := vnet.NewVNet(resources)
	net.Start()
	resources.Logger().Info("alm vnet started!")
	common.WaitForSignal(resources)
}
