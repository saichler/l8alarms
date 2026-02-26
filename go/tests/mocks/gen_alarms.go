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
	// Multi-level correlation trees:
	// Tree 1 (4 levels): 0 -> {3,4,5}, 3 -> {8,9}, 4 -> {10}, 8 -> {12}
	// Tree 2 (3 levels): 1 -> {6,7}, 6 -> {11}
	type corrEntry struct {
		parentIdx    int   // -1 = tree root
		symptomCount int32 // 0 = leaf
	}
	corrMap := map[int]corrEntry{
		0:  {-1, 3}, // Tree 1 root
		1:  {-1, 2}, // Tree 2 root
		3:  {0, 2},  // L2: child of 0, parent of {8,9}
		4:  {0, 1},  // L2: child of 0, parent of {10}
		5:  {0, 0},  // L2: leaf child of 0
		6:  {1, 1},  // L2: child of 1, parent of {11}
		7:  {1, 0},  // L2: leaf child of 1
		8:  {3, 1},  // L3: child of 3, parent of {12}
		9:  {3, 0},  // L3: leaf child of 3
		10: {4, 0},  // L3: leaf child of 4
		11: {6, 0},  // L3: leaf child of 6
		12: {8, 0},  // L4: leaf child of 8
	}

	entry, ok := corrMap[i]
	if !ok {
		return
	}

	if entry.parentIdx == -1 {
		a.IsRootCause = true
		a.SymptomCount = entry.symptomCount
		a.Severity = alm.AlarmSeverity_ALARM_SEVERITY_CRITICAL
		a.State = alm.AlarmState_ALARM_STATE_ACTIVE
		return
	}

	parentID := genID("alm", entry.parentIdx)
	a.RootCauseAlarmId = parentID
	a.CorrelationRuleId = pickRef(store.CorrRuleIDs, entry.parentIdx)
	a.State = alm.AlarmState_ALARM_STATE_SUPPRESSED
	a.IsSuppressed = true
	a.SuppressedBy = parentID
	if entry.symptomCount > 0 {
		a.IsRootCause = true
		a.SymptomCount = entry.symptomCount
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
