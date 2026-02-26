package archivedevents

import (
	"errors"
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

func rejectPut(_ *alm.ArchivedEvent, action ifs.Action, _ ifs.IVNic) error {
	if action == ifs.PUT {
		return errors.New("Archived events are immutable and cannot be updated")
	}
	return nil
}

func newArchivedEventServiceCallback() ifs.IServiceCallback {
	return common.NewValidation[alm.ArchivedEvent]("ArchivedEvent",
		func(e *alm.ArchivedEvent) {}).
		BeforeAction(rejectPut).
		Require(func(e *alm.ArchivedEvent) string { return e.EventId }, "EventId").
		Build()
}
