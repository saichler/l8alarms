package mocks

// Generates: Event

import (
	"fmt"
	"github.com/saichler/l8alarms/go/types/alm"
	l8events "github.com/saichler/l8events/go/types/l8events"
	"math/rand"
)

func generateEvents(store *MockDataStore) []*alm.Event {
	count := 40
	result := make([]*alm.Event, count)

	severities := []l8events.Severity{
		l8events.Severity_SEVERITY_CRITICAL,
		l8events.Severity_SEVERITY_MAJOR,
		l8events.Severity_SEVERITY_MAJOR,
		l8events.Severity_SEVERITY_MINOR,
		l8events.Severity_SEVERITY_WARNING,
		l8events.Severity_SEVERITY_INFO,
	}

	eventTypes := []alm.AlmEventType{
		alm.AlmEventType_ALM_EVENT_TYPE_TRAP,
		alm.AlmEventType_ALM_EVENT_TYPE_SYSLOG,
		alm.AlmEventType_ALM_EVENT_TYPE_THRESHOLD,
		alm.AlmEventType_ALM_EVENT_TYPE_STATE_CHANGE,
		alm.AlmEventType_ALM_EVENT_TYPE_HEARTBEAT,
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
			ProcessingState:  l8events.EventState_EVENT_STATE_PROCESSED,
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
			event.ProcessingState = l8events.EventState_EVENT_STATE_NEW
		} else if i > 35 {
			event.ProcessingState = l8events.EventState_EVENT_STATE_DISCARDED
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
