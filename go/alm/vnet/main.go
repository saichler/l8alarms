package main

import (
	"github.com/saichler/l8bus/go/overlay/vnet"
	l8common "github.com/saichler/l8common/go/common"
	"os"
)

func main() {
	resources := l8common.CreateResources("vnet-"+os.Getenv("HOSTNAME"), false)
	net := vnet.NewVNet(resources)
	net.Start()
	resources.Logger().Info("alm vnet started!")
	l8common.WaitForSignal(resources)
}
