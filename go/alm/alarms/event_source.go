package alarms

import (
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8srlz/go/serialize/object"
	"github.com/saichler/l8types/go/ifs"
	l8events "github.com/saichler/l8types/go/types/l8events"
)

// EventsServiceName/EventsServiceArea identify l8events's shared EventRecord
// service. l8alarms never activates its own copy of this service (see
// single-owner-database-table.md) — it only reaches it over vnic.
const (
	EventsServiceName = "Events"
	EventsServiceArea = byte(76)
)

// markEventProcessed PATCHes the source EventRecord in l8events back to
// State=PROCESSED with GeneratedAlarmId set to the alarm the event resulted
// in (created, merged into, or used to clear). Best-effort: errors are
// returned to the caller to log, never fatal to the Alarm-side operation.
func markEventProcessed(eventId, alarmId string, vnic ifs.IVNic) error {
	if eventId == "" {
		return nil
	}
	patch := &l8events.EventRecord{
		EventId:          eventId,
		State:            l8events.EventState_EVENT_STATE_PROCESSED,
		GeneratedAlarmId: alarmId,
	}
	handler, ok := common.ServiceHandler(EventsServiceName, EventsServiceArea, vnic)
	if ok {
		resp := handler.Patch(object.New(nil, patch), vnic)
		if resp.Error() != nil {
			return resp.Error()
		}
		return nil
	}
	resp := vnic.Request("", EventsServiceName, EventsServiceArea, ifs.PATCH, patch, 30)
	if resp.Error() != nil {
		return resp.Error()
	}
	return nil
}
