package mocks

// Generates: ArchivedAlarm, ArchivedEvent (small set from oldest cleared alarms/events)

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"time"
)

func generateArchivedAlarms(store *MockDataStore) []*alm.ArchivedAlarm {
	count := 5
	if len(store.AlarmIDs) < count {
		count = len(store.AlarmIDs)
	}
	if count == 0 {
		return nil
	}

	now := time.Now().Unix()
	result := make([]*alm.ArchivedAlarm, count)

	for i := 0; i < count; i++ {
		firstOccurrence := randomPastDate(3, 30)
		clearedAt := firstOccurrence + 7200

		result[i] = &alm.ArchivedAlarm{
			AlarmId:         genID("arc-alm", i),
			DefinitionId:    pickRef(store.DefinitionIDs, i),
			Name:            archiveAlarmNames[i%len(archiveAlarmNames)],
			Description:     "Archived alarm from cleared state",
			State:           alm.AlarmState_ALARM_STATE_CLEARED,
			Severity:        alm.AlarmSeverity(int32(i%5) + 1),
			OriginalSeverity: alm.AlarmSeverity(int32(i%5) + 1),
			NodeId:          nodeIDs[i%len(nodeIDs)],
			NodeName:        nodeNames[i%len(nodeNames)],
			Location:        locations[i%len(locations)],
			SourceIdentifier: nodeIDs[i%len(nodeIDs)] + ":SNMP",
			FirstOccurrence: firstOccurrence,
			LastOccurrence:  firstOccurrence + 3600,
			ClearedAt:       clearedAt,
			ClearedBy:       "auto-clear",
			OccurrenceCount: int32(i + 1),
			DedupKey:        genID("arc-dedup", i),
			ArchivedAt:      now - int64(i*86400),
			ArchivedBy:      "archive-system",
		}
	}
	return result
}

func generateArchivedEvents(store *MockDataStore) []*alm.ArchivedEvent {
	count := 8
	if len(store.ArchivedAlarmIDs) == 0 {
		return nil
	}

	now := time.Now().Unix()
	result := make([]*alm.ArchivedEvent, count)

	eventTypes := []alm.EventType{
		alm.EventType_EVENT_TYPE_TRAP,
		alm.EventType_EVENT_TYPE_SYSLOG,
		alm.EventType_EVENT_TYPE_THRESHOLD,
		alm.EventType_EVENT_TYPE_STATE_CHANGE,
	}

	for i := 0; i < count; i++ {
		occurredAt := randomPastDate(3, 30)

		categories := []string{"network", "hardware", "security", "application", "system"}

		result[i] = &alm.ArchivedEvent{
			EventId:         genID("arc-evt", i),
			EventType:       eventTypes[i%len(eventTypes)],
			ProcessingState: alm.EventProcessingState_EVENT_PROCESSING_STATE_ARCHIVED,
			NodeId:          nodeIDs[i%len(nodeIDs)],
			NodeName:        nodeNames[i%len(nodeNames)],
			SourceIdentifier: nodeIDs[i%len(nodeIDs)] + ":SNMP",
			Severity:        alm.AlarmSeverity(int32(i%5) + 1),
			Message:         archiveEventMessages[i%len(archiveEventMessages)],
			Category:        categories[i%len(categories)],
			AlarmId:         pickRef(store.ArchivedAlarmIDs, i),
			OccurredAt:      occurredAt,
			ReceivedAt:      occurredAt + 1,
			ProcessedAt:     occurredAt + 5,
			ArchivedAt:      now - int64(i*86400),
			ArchivedBy:      "archive-system",
		}
	}
	return result
}

var archiveAlarmNames = []string{
	"Link Down (archived)", "CPU Threshold Exceeded (archived)",
	"Memory Warning (archived)", "Interface Flapping (archived)",
	"BGP Peer Down (archived)",
}

var archiveEventMessages = []string{
	"Interface GigabitEthernet0/1 link down (archived)",
	"CPU utilization exceeded 90% threshold (archived)",
	"Available memory dropped below 512MB (archived)",
	"BGP peer 10.0.0.1 session terminated (archived)",
	"OSPF adjacency lost on interface eth0 (archived)",
	"Power supply unit 2 failure detected (archived)",
	"Fan tray 1 speed warning (archived)",
	"Configuration change detected via SNMP (archived)",
}
