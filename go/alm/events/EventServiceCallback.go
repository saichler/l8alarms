package events

import (
	"errors"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
)

func rejectPut(_ *alm.Event, action ifs.Action, _ ifs.IVNic) error {
	if action == ifs.PUT {
		return errors.New("Events are immutable and cannot be updated")
	}
	return nil
}

func newEventServiceCallback(vnic ifs.IVNic) ifs.IServiceCallback {
	return common.NewValidation(&alm.Event{}, vnic).
		BeforeAction(rejectPut).
		Require(func(e interface{}) string { return e.(*alm.Event).EventId }, "EventId").
		Enum(func(e interface{}) int32 { return int32(e.(*alm.Event).EventType) }, alm.AlmEventType_name, "EventType").
		Require(func(e interface{}) string { return e.(*alm.Event).NodeId }, "NodeId").
		Require(func(e interface{}) string { return e.(*alm.Event).Message }, "Message").
		Build()
}
