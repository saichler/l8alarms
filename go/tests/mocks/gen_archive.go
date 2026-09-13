package mocks

// Generates: ArchivedAlarm (small set from oldest cleared alarms)

import (
	"github.com/saichler/l8alarms/go/types/alm"
	l8events "github.com/saichler/l8types/go/types/l8events"
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
			AlarmId:          genID("arc-alm", i),
			DefinitionId:     pickRef(store.DefinitionIDs, i),
			Name:             archiveAlarmNames[i%len(archiveAlarmNames)],
			Description:      "Archived alarm from cleared state",
			State:            alm.AlarmState_ALARM_STATE_CLEARED,
			Severity:         l8events.Severity(int32(i%5) + 1),
			OriginalSeverity: l8events.Severity(int32(i%5) + 1),
			NodeId:           nodeIDs[i%len(nodeIDs)],
			NodeName:         nodeNames[i%len(nodeNames)],
			Location:         locations[i%len(locations)],
			SourceIdentifier: nodeIDs[i%len(nodeIDs)] + ":SNMP",
			FirstOccurrence:  firstOccurrence,
			LastOccurrence:   firstOccurrence + 3600,
			ClearedAt:        clearedAt,
			ClearedBy:        "auto-clear",
			OccurrenceCount:  int32(i + 1),
			DedupKey:         genID("arc-dedup", i),
			ArchivedAt:       now - int64(i*86400),
			ArchivedBy:       "archive-system",
		}
	}
	return result
}

var archiveAlarmNames = []string{
	"Link Down (archived)", "CPU Threshold Exceeded (archived)",
	"Memory Warning (archived)", "Interface Flapping (archived)",
	"BGP Peer Down (archived)",
}
