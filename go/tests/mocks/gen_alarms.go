package mocks

// Generates: Alarm (with realistic correlation, suppression, and state scenarios)

import (
	"fmt"
	"github.com/saichler/l8alarms/go/types/alm"
	"math/rand"
)

func generateAlarms(store *MockDataStore) []*alm.Alarm {
	count := 30
	result := make([]*alm.Alarm, count)

	for i := 0; i < count; i++ {
		nodeIdx := i % len(nodeIDs)
		defIdx := i % len(store.DefinitionIDs)

		firstOccurrence := randomPastDate(0, 7)
		lastOccurrence := firstOccurrence + int64(rand.Intn(3600))

		a := &alm.Alarm{
			AlarmId:          genID("alm", i),
			DefinitionId:     pickRef(store.DefinitionIDs, defIdx),
			Name:             alarmDefNames[defIdx%len(alarmDefNames)],
			Description:      alarmDefDescriptions[defIdx%len(alarmDefDescriptions)],
			NodeId:           nodeIDs[nodeIdx],
			NodeName:         nodeNames[nodeIdx],
			Location:         locations[nodeIdx],
			SourceIdentifier: fmt.Sprintf("%s:SNMP", nodeIDs[nodeIdx]),
			FirstOccurrence:  firstOccurrence,
			LastOccurrence:   lastOccurrence,
			OccurrenceCount:  int32(rand.Intn(50) + 1),
			DedupKey:         fmt.Sprintf("%s:%s", nodeIDs[nodeIdx], pickRef(store.DefinitionIDs, defIdx)),
			EventId:          pickRef(store.EventIDs, i),
			Attributes: map[string]string{
				"nodeType": nodeTypes[nodeIdx],
				"location": locations[nodeIdx],
				"source":   "mock-generator",
			},
		}

		// Distribute states and severities realistically
		assignAlarmStateAndSeverity(a, i, count)

		// Create correlation scenarios
		assignCorrelation(a, i, result, store)

		// Add notes and state history for some alarms
		if i%5 == 0 {
			a.Notes = []*alm.AlarmNote{
				{NoteId: genID("note", i*10), Author: "admin", Text: "Investigating this alarm", CreatedAt: firstOccurrence + 60},
			}
		}
		if a.State != alm.AlarmState_ALARM_STATE_ACTIVE {
			a.StateHistory = generateStateHistory(a, i)
		}

		result[i] = a
	}
	return result
}

func assignAlarmStateAndSeverity(a *alm.Alarm, i, total int) {
	// State distribution: 50% active, 15% acknowledged, 20% cleared, 15% suppressed
	switch {
	case i < total*50/100:
		a.State = alm.AlarmState_ALARM_STATE_ACTIVE
	case i < total*65/100:
		a.State = alm.AlarmState_ALARM_STATE_ACKNOWLEDGED
		a.AcknowledgedAt = a.FirstOccurrence + int64(rand.Intn(1800))
		a.AcknowledgedBy = "noc-operator"
	case i < total*85/100:
		a.State = alm.AlarmState_ALARM_STATE_CLEARED
		a.ClearedAt = a.FirstOccurrence + int64(rand.Intn(7200)+300)
		a.ClearedBy = "auto-clear"
	default:
		a.State = alm.AlarmState_ALARM_STATE_SUPPRESSED
		a.IsSuppressed = true
		a.SuppressedBy = "correlation"
	}

	// Severity distribution: 10% critical, 20% major, 30% minor, 25% warning, 15% info
	switch {
	case i < total*10/100:
		a.Severity = alm.AlarmSeverity_ALARM_SEVERITY_CRITICAL
	case i < total*30/100:
		a.Severity = alm.AlarmSeverity_ALARM_SEVERITY_MAJOR
	case i < total*60/100:
		a.Severity = alm.AlarmSeverity_ALARM_SEVERITY_MINOR
	case i < total*85/100:
		a.Severity = alm.AlarmSeverity_ALARM_SEVERITY_WARNING
	default:
		a.Severity = alm.AlarmSeverity_ALARM_SEVERITY_INFO
	}
	a.OriginalSeverity = a.Severity
}

func assignCorrelation(a *alm.Alarm, i int, result []*alm.Alarm, store *MockDataStore) {
	// Make the first 3 alarms root causes, and some later alarms their symptoms
	switch {
	case i == 0:
		// Root cause: core router failure
		a.IsRootCause = true
		a.SymptomCount = 3
		a.Severity = alm.AlarmSeverity_ALARM_SEVERITY_CRITICAL
		a.State = alm.AlarmState_ALARM_STATE_ACTIVE
	case i == 1:
		// Root cause: firewall failure
		a.IsRootCause = true
		a.SymptomCount = 2
		a.Severity = alm.AlarmSeverity_ALARM_SEVERITY_CRITICAL
		a.State = alm.AlarmState_ALARM_STATE_ACTIVE
	case i >= 3 && i <= 5:
		// Symptoms of alarm 0 (core router)
		a.RootCauseAlarmId = genID("alm", 0)
		a.CorrelationRuleId = pickRef(store.CorrRuleIDs, 0)
		a.State = alm.AlarmState_ALARM_STATE_SUPPRESSED
		a.IsSuppressed = true
		a.SuppressedBy = genID("alm", 0)
	case i >= 6 && i <= 7:
		// Symptoms of alarm 1 (firewall)
		a.RootCauseAlarmId = genID("alm", 1)
		a.CorrelationRuleId = pickRef(store.CorrRuleIDs, 1)
		a.State = alm.AlarmState_ALARM_STATE_SUPPRESSED
		a.IsSuppressed = true
		a.SuppressedBy = genID("alm", 1)
	}
}

func generateStateHistory(a *alm.Alarm, i int) []*alm.AlarmStateChange {
	var history []*alm.AlarmStateChange

	// All alarms start as active
	history = append(history, &alm.AlarmStateChange{
		ChangeId:  genID("chg", i*10),
		FromState: alm.AlarmState_ALARM_STATE_UNSPECIFIED,
		ToState:   alm.AlarmState_ALARM_STATE_ACTIVE,
		ChangedBy: "system",
		Reason:    "Alarm raised",
		ChangedAt: a.FirstOccurrence,
	})

	switch a.State {
	case alm.AlarmState_ALARM_STATE_ACKNOWLEDGED:
		history = append(history, &alm.AlarmStateChange{
			ChangeId:  genID("chg", i*10+1),
			FromState: alm.AlarmState_ALARM_STATE_ACTIVE,
			ToState:   alm.AlarmState_ALARM_STATE_ACKNOWLEDGED,
			ChangedBy: a.AcknowledgedBy,
			Reason:    "Acknowledged by operator",
			ChangedAt: a.AcknowledgedAt,
		})
	case alm.AlarmState_ALARM_STATE_CLEARED:
		history = append(history, &alm.AlarmStateChange{
			ChangeId:  genID("chg", i*10+1),
			FromState: alm.AlarmState_ALARM_STATE_ACTIVE,
			ToState:   alm.AlarmState_ALARM_STATE_CLEARED,
			ChangedBy: a.ClearedBy,
			Reason:    "Auto-cleared after recovery",
			ChangedAt: a.ClearedAt,
		})
	case alm.AlarmState_ALARM_STATE_SUPPRESSED:
		history = append(history, &alm.AlarmStateChange{
			ChangeId:  genID("chg", i*10+1),
			FromState: alm.AlarmState_ALARM_STATE_ACTIVE,
			ToState:   alm.AlarmState_ALARM_STATE_SUPPRESSED,
			ChangedBy: "correlation-engine",
			Reason:    "Suppressed as symptom of root cause",
			ChangedAt: a.FirstOccurrence + 10,
		})
	}

	return history
}
