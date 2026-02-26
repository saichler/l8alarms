package events

import (
	"errors"
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

func rejectPut(_ *alm.Event, action ifs.Action, _ ifs.IVNic) error {
	if action == ifs.PUT {
		return errors.New("Events are immutable and cannot be updated")
	}
	return nil
}

func newEventServiceCallback() ifs.IServiceCallback {
	return common.NewValidation[alm.Event]("Event",
		func(e *alm.Event) { common.GenerateID(&e.EventId) }).
		BeforeAction(rejectPut).
		Require(func(e *alm.Event) string { return e.EventId }, "EventId").
		Enum(func(e *alm.Event) int32 { return int32(e.EventType) }, alm.EventType_name, "EventType").
		Require(func(e *alm.Event) string { return e.NodeId }, "NodeId").
		Require(func(e *alm.Event) string { return e.Message }, "Message").
		Build()
}
