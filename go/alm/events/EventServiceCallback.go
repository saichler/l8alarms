package events

import (
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

func newEventServiceCallback() ifs.IServiceCallback {
	return common.NewValidation[alm.Event]("Event",
		func(e *alm.Event) { common.GenerateID(&e.EventId) }).
		Require(func(e *alm.Event) string { return e.EventId }, "EventId").
		Enum(func(e *alm.Event) int32 { return int32(e.EventType) }, alm.EventType_name, "EventType").
		Require(func(e *alm.Event) string { return e.NodeId }, "NodeId").
		Require(func(e *alm.Event) string { return e.Message }, "Message").
		Build()
}
