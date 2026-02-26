package archiving

import (
	"fmt"
	"github.com/saichler/l8alarms/go/alm/alarms"
	"github.com/saichler/l8alarms/go/alm/archivedalarms"
	"github.com/saichler/l8alarms/go/alm/archivedevents"
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/alm/events"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8srlz/go/serialize/object"
	"github.com/saichler/l8types/go/ifs"
	"time"
)

// ArchiveAlarm archives an alarm and its associated events.
// If the alarm is a root cause, all symptom alarms are also archived recursively.
func ArchiveAlarm(alarmId, archivedBy string, vnic ifs.IVNic) error {
	// 1. Get the alarm
	alarm, err := alarms.GetAlarm(alarmId, vnic)
	if err != nil {
		return fmt.Errorf("failed to get alarm %s: %w", alarmId, err)
	}
	if alarm == nil {
		return fmt.Errorf("alarm %s not found", alarmId)
	}

	now := time.Now().Unix()

	// 2. Create archived alarm
	archived := toArchivedAlarm(alarm, now, archivedBy)
	if err := postArchivedAlarm(archived, vnic); err != nil {
		return fmt.Errorf("failed to archive alarm %s: %w", alarmId, err)
	}

	// 3. Archive associated events
	if err := archiveEventsForAlarm(alarmId, now, archivedBy, vnic); err != nil {
		return fmt.Errorf("failed to archive events for alarm %s: %w", alarmId, err)
	}

	// 4. If root cause, recursively archive symptom alarms
	if alarm.IsRootCause && alarm.SymptomCount > 0 {
		if err := archiveSymptoms(alarmId, archivedBy, vnic); err != nil {
			return fmt.Errorf("failed to archive symptoms of %s: %w", alarmId, err)
		}
	}

	// 5. Delete the active alarm
	if err := deleteAlarm(alarmId, vnic); err != nil {
		return fmt.Errorf("failed to delete active alarm %s: %w", alarmId, err)
	}

	return nil
}

func toArchivedAlarm(a *alm.Alarm, archivedAt int64, archivedBy string) *alm.ArchivedAlarm {
	return &alm.ArchivedAlarm{
		AlarmId:          a.AlarmId,
		DefinitionId:     a.DefinitionId,
		Name:             a.Name,
		Description:      a.Description,
		State:            a.State,
		Severity:         a.Severity,
		OriginalSeverity: a.OriginalSeverity,
		NodeId:           a.NodeId,
		NodeName:         a.NodeName,
		LinkId:           a.LinkId,
		Location:         a.Location,
		SourceIdentifier: a.SourceIdentifier,
		RootCauseAlarmId: a.RootCauseAlarmId,
		CorrelationRuleId: a.CorrelationRuleId,
		IsRootCause:      a.IsRootCause,
		SymptomCount:     a.SymptomCount,
		FirstOccurrence:  a.FirstOccurrence,
		LastOccurrence:   a.LastOccurrence,
		AcknowledgedAt:   a.AcknowledgedAt,
		AcknowledgedBy:   a.AcknowledgedBy,
		ClearedAt:        a.ClearedAt,
		ClearedBy:        a.ClearedBy,
		OccurrenceCount:  a.OccurrenceCount,
		DedupKey:         a.DedupKey,
		IsSuppressed:     a.IsSuppressed,
		SuppressedBy:     a.SuppressedBy,
		EventId:          a.EventId,
		Attributes:       a.Attributes,
		Notes:            a.Notes,
		StateHistory:     a.StateHistory,
		ArchivedAt:       archivedAt,
		ArchivedBy:       archivedBy,
	}
}

func toArchivedEvent(e *alm.Event, archivedAt int64, archivedBy string) *alm.ArchivedEvent {
	return &alm.ArchivedEvent{
		EventId:         e.EventId,
		EventType:       e.EventType,
		ProcessingState: e.ProcessingState,
		NodeId:          e.NodeId,
		NodeName:        e.NodeName,
		SourceIdentifier: e.SourceIdentifier,
		Severity:        e.Severity,
		Message:         e.Message,
		RawData:         e.RawData,
		Category:        e.Category,
		Subcategory:     e.Subcategory,
		AlarmId:         e.AlarmId,
		DefinitionId:    e.DefinitionId,
		OccurredAt:      e.OccurredAt,
		ReceivedAt:      e.ReceivedAt,
		ProcessedAt:     e.ProcessedAt,
		Attributes:      e.Attributes,
		ArchivedAt:      archivedAt,
		ArchivedBy:      archivedBy,
	}
}

func archiveEventsForAlarm(alarmId string, archivedAt int64, archivedBy string, vnic ifs.IVNic) error {
	query := fmt.Sprintf("select * from Event where AlarmId=%s", alarmId)
	evts, err := common.GetEntities[alm.Event](events.ServiceName, events.ServiceArea, query, vnic)
	if err != nil {
		return err
	}

	for _, evt := range evts {
		archived := toArchivedEvent(evt, archivedAt, archivedBy)
		if err := postArchivedEvent(archived, vnic); err != nil {
			return err
		}
		if err := deleteEvent(evt.EventId, vnic); err != nil {
			return err
		}
	}
	return nil
}

func archiveSymptoms(rootAlarmId, archivedBy string, vnic ifs.IVNic) error {
	query := fmt.Sprintf("select * from Alarm where RootCauseAlarmId=%s", rootAlarmId)
	symptoms, err := common.GetEntities[alm.Alarm](alarms.ServiceName, alarms.ServiceArea, query, vnic)
	if err != nil {
		return err
	}

	for _, symptom := range symptoms {
		if err := ArchiveAlarm(symptom.AlarmId, archivedBy, vnic); err != nil {
			return err
		}
	}
	return nil
}

func postArchivedAlarm(archived *alm.ArchivedAlarm, vnic ifs.IVNic) error {
	handler, ok := archivedalarms.ArchivedAlarms(vnic)
	if !ok {
		return fmt.Errorf("ArchivedAlarm service not available")
	}
	resp := handler.Post(object.New(nil, archived), vnic)
	if resp.Error() != nil {
		return resp.Error()
	}
	return nil
}

func postArchivedEvent(archived *alm.ArchivedEvent, vnic ifs.IVNic) error {
	handler, ok := archivedevents.ArchivedEvents(vnic)
	if !ok {
		return fmt.Errorf("ArchivedEvent service not available")
	}
	resp := handler.Post(object.New(nil, archived), vnic)
	if resp.Error() != nil {
		return resp.Error()
	}
	return nil
}

func deleteAlarm(alarmId string, vnic ifs.IVNic) error {
	handler, ok := alarms.Alarms(vnic)
	if !ok {
		return fmt.Errorf("Alarm service not available")
	}
	query := fmt.Sprintf("select * from Alarm where AlarmId=%s", alarmId)
	elems, err := object.NewQuery(query, vnic.Resources())
	if err != nil {
		return err
	}
	resp := handler.Delete(elems, vnic)
	if resp.Error() != nil {
		return resp.Error()
	}
	return nil
}

func deleteEvent(eventId string, vnic ifs.IVNic) error {
	handler, ok := events.Events(vnic)
	if !ok {
		return fmt.Errorf("Event service not available")
	}
	query := fmt.Sprintf("select * from Event where EventId=%s", eventId)
	elems, err := object.NewQuery(query, vnic.Resources())
	if err != nil {
		return err
	}
	resp := handler.Delete(elems, vnic)
	if resp.Error() != nil {
		return resp.Error()
	}
	return nil
}
