package tests

import (
	"github.com/saichler/l8alarms/go/tests/mocks"
	"github.com/saichler/l8bus/go/overlay/protocol"
	. "github.com/saichler/l8test/go/infra/t_resources"
	. "github.com/saichler/l8test/go/infra/t_topology"
	. "github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8utils/go/utils/logger"
)

var topo *TestTopology
var FLog = logger.NewLoggerDirectImpl(logger.NewFileLogMethod("test.log"))
var testStore *mocks.MockDataStore

func init() {
	Log.SetLogLevel(Trace_Level)
}

func setup() {
	setupTopology()
}

func tear() {
	shutdownTopology()
}

func setupTopology() {
	protocol.MessageLog = true
	topo = NewTestTopology(4, []int{20000, 30000, 40000}, Info_Level)
}

func shutdownTopology() {
	topo.Shutdown()
}
