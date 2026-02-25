package mocks

// Generates: Event

import (
	"fmt"
	"github.com/saichler/l8alarms/go/types/alm"
	"math/rand"
)

func generateEvents(store *MockDataStore) []*alm.Event {
	count := 40
	result := make([]*alm.Event, count)

	severities := []alm.AlarmSeverity{
		alm.AlarmSeverity_ALARM_SEVERITY_CRITICAL,
		alm.AlarmSeverity_ALARM_SEVERITY_MAJOR,
		alm.AlarmSeverity_ALARM_SEVERITY_MAJOR,
		alm.AlarmSeverity_ALARM_SEVERITY_MINOR,
		alm.AlarmSeverity_ALARM_SEVERITY_WARNING,
		alm.AlarmSeverity_ALARM_SEVERITY_INFO,
	}

	eventTypes := []alm.EventType{
		alm.EventType_EVENT_TYPE_TRAP,
		alm.EventType_EVENT_TYPE_SYSLOG,
		alm.EventType_EVENT_TYPE_THRESHOLD,
		alm.EventType_EVENT_TYPE_STATE_CHANGE,
		alm.EventType_EVENT_TYPE_HEARTBEAT,
	}

	categories := []string{"network", "hardware", "security", "application", "system"}

	for i := 0; i < count; i++ {
		nodeIdx := i % len(nodeIDs)
		defIdx := i % len(alarmDefNames)
		msgIdx := i % len(eventMessages)

		occurredAt := randomPastDate(0, 14)

		event := &alm.Event{
			EventId:          genID("evt", i),
			EventType:        eventTypes[i%len(eventTypes)],
			ProcessingState:  alm.EventProcessingState_EVENT_PROCESSING_STATE_PROCESSED,
			NodeId:           nodeIDs[nodeIdx],
			NodeName:         nodeNames[nodeIdx],
			SourceIdentifier: fmt.Sprintf("%s:SNMP", nodeIDs[nodeIdx]),
			Severity:         severities[i%len(severities)],
			Message:          eventMessages[msgIdx],
			RawData:          fmt.Sprintf(`{"oid":"1.3.6.1.%d","value":"%s"}`, rand.Intn(9999), eventMessages[msgIdx]),
			Category:         categories[i%len(categories)],
			Subcategory:      alarmDefNames[defIdx],
			DefinitionId:     pickRef(store.DefinitionIDs, defIdx),
			OccurredAt:       occurredAt,
			ReceivedAt:       occurredAt + int64(rand.Intn(5)),
			ProcessedAt:      occurredAt + int64(rand.Intn(10)+5),
		}

		// Assign some events to alarms (will be populated in Phase 4)
		if i < 5 {
			event.ProcessingState = alm.EventProcessingState_EVENT_PROCESSING_STATE_NEW
		} else if i > 35 {
			event.ProcessingState = alm.EventProcessingState_EVENT_PROCESSING_STATE_DISCARDED
		}

		// Add attributes
		event.Attributes = []*alm.EventAttribute{
			{Key: "nodeType", Value: nodeTypes[nodeIdx]},
			{Key: "location", Value: locations[nodeIdx]},
			{Key: "source", Value: "mock-generator"},
		}

		result[i] = event
	}
	return result
}
