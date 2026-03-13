package mocks

// Generates: AlarmDefinition, AlarmFilter

import (
	"github.com/saichler/l8alarms/go/types/alm"
	l8events "github.com/saichler/l8events/go/types/l8events"
	"math/rand"
)

func generateAlarmDefinitions() []*alm.AlarmDefinition {
	count := len(alarmDefNames)
	result := make([]*alm.AlarmDefinition, count)

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
	}

	for i := 0; i < count; i++ {
		result[i] = &alm.AlarmDefinition{
			DefinitionId:         genID("def", i),
			Name:                 alarmDefNames[i],
			Description:          alarmDefDescriptions[i],
			Status:               alm.AlarmDefinitionStatus_ALARM_DEFINITION_STATUS_ACTIVE,
			DefaultSeverity:      severities[i%len(severities)],
			EventPattern:         eventPatterns[i],
			EventTypeFilter:      eventTypes[i%len(eventTypes)],
			ThresholdCount:       int32(rand.Intn(3) + 1),
			ThresholdWindowSeconds: int32(rand.Intn(300) + 60),
			AutoClearEnabled:     i%3 != 0,
			AutoClearSeconds:     int32(rand.Intn(3600) + 300),
			ClearEventPattern:    clearPatterns[i],
			DedupEnabled:         true,
			DedupKeyExpression:   "nodeId+definitionId",
			CreatedAt:            randomPastDate(6, 30),
			UpdatedAt:            nowUnix(),
		}
	}
	return result
}

func generateAlarmFilters(store *MockDataStore) []*alm.AlarmFilter {
	count := len(filterNames)
	result := make([]*alm.AlarmFilter, count)

	for i := 0; i < count; i++ {
		f := &alm.AlarmFilter{
			FilterId:    genID("filter", i),
			Name:        filterNames[i],
			Description: "Saved filter: " + filterNames[i],
			Owner:       "admin",
			IsShared:    i%2 == 0,
			IsDefault:   i == 0,
			CreatedAt:   randomPastDate(3, 30),
			UpdatedAt:   nowUnix(),
		}

		// Vary filters
		switch i {
		case 0: // Critical Active
			f.Severities = []l8events.Severity{l8events.Severity_SEVERITY_CRITICAL}
			f.States = []l8events.AlarmState{l8events.AlarmState_ALARM_STATE_ACTIVE}
			f.ExcludeSuppressed = true
		case 1: // All Active
			f.States = []l8events.AlarmState{l8events.AlarmState_ALARM_STATE_ACTIVE, l8events.AlarmState_ALARM_STATE_ACKNOWLEDGED}
			f.ExcludeSuppressed = true
		case 2: // Root Cause Only
			f.RootCauseOnly = true
			f.ExcludeSuppressed = true
		case 3: // DC-East
			f.Locations = []string{"DC-East"}
			f.ExcludeSuppressed = true
		case 4: // Suppressed
			f.States = []l8events.AlarmState{l8events.AlarmState_ALARM_STATE_SUPPRESSED}
		case 5: // Server Alarms
			f.NodeTypes = []string{"SERVER"}
			f.ExcludeSuppressed = true
		}

		result[i] = f
	}
	return result
}
