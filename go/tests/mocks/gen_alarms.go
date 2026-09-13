package mocks

// Seeds Alarm data by POSTing l8events.EventRecord instances through the
// vnic directly — common.PostEntity("Alarm", 10, eventRecord, vnic) — not
// via the HTTP client. Alarm's POST has no HTTP route at all (see Phase 3.2:
// AlarmService.go's hand-built WebService omits it); the AlarmServiceCallback
// now decides DROP/CLEAR/MERGE/CREATE from the event, exactly like a real
// event source would. This replaces the old direct-construction of
// *alm.Alarm{} records, which is no longer a valid path.
//
// Correlation-tree scenarios (RootCauseAlarmId/IsRootCause/SymptomCount) are
// NOT hand-assigned here — under the old design they were hardcoded directly
// on the Alarm struct; under the new design those fields are exclusively
// engine-computed after each POST/PUT (Phase 3.4's runCorrelation). The mock
// CorrelationRule data (gen_config.go) matches against literal, lowercase-
// keyword-style alarm names ("linkDown|reachabilityLost" etc.) which do not
// align with the Title Case AlarmDefinition.Name values used here ("Link
// Down"), so correlation will not naturally fire during this seeding pass as
// currently configured. Phase 5's own tests set up bespoke, deliberately-
// matching AlarmDefinition/CorrelationRule/EventRecord data to exercise that
// path — this seeding pass does not attempt to reproduce it.

import (
	"fmt"
	"github.com/saichler/l8alarms/go/alm/alarmdefinitions"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
	l8events "github.com/saichler/l8types/go/types/l8events"
)

// seedAlarms POSTs EventRecords for each AlarmDefinition, producing a
// realistic mix of CREATE, MERGE (repeat occurrences), PENDING_THRESHOLD
// (definitions with threshold_count>1 sent fewer events than needed), and
// CLEAR (clear_event_pattern match) scenarios. Returns the AlarmIds created.
func seedAlarms(store *MockDataStore, vnic ifs.IVNic) []string {
	var alarmIDs []string

	for i, defId := range store.DefinitionIDs {
		nodeIdx := i % len(nodeIDs)
		sourceId := nodeIDs[nodeIdx]
		category := eventCategoryForIndex(i)

		// Read the definition's REAL threshold_count (it's randomized in
		// generateAlarmDefinitions — rand.Intn(3)+1 — so it can't be
		// guessed/derived from i; must be fetched to correctly land on
		// PENDING_THRESHOLD vs. OPEN_FOR_CORRELATION below).
		threshold := int32(1)
		if def, err := alarmdefinitions.AlarmDefinition(defId, vnic); err == nil && def != nil && def.ThresholdCount > 0 {
			threshold = def.ThresholdCount
		}

		// Occurrences to send: threshold-1 (leaves a PENDING_THRESHOLD alarm)
		// for every 4th definition, threshold+1 (crosses into
		// OPEN_FOR_CORRELATION plus one extra MERGE) otherwise.
		occurrences := threshold + 1
		if i%4 == 0 && threshold > 1 {
			occurrences = threshold - 1
		}

		for occ := int32(0); occ < occurrences; occ++ {
			event := &l8events.EventRecord{
				Category:   category,
				EventType:  triggerEventTypes[i%len(triggerEventTypes)],
				Message:    eventMessages[i%len(eventMessages)],
				SourceId:   sourceId,
				SourceName: nodeNames[nodeIdx],
				SourceType: nodeTypes[nodeIdx],
				OccurredAt: randomPastDate(0, 7) + int64(occ*60),
			}
			if _, err := common.PostEntity("Alarm", 10, event, vnic); err != nil {
				fmt.Printf("    WARNING: failed to post event for definition %s: %v\n", defId, err)
			}
		}

		// l8orm's OrmService.do() (../l8orm/go/orm/persist/OrmDoAction.go)
		// always returns an empty response on POST/PUT/PATCH success — it
		// never echoes back the persisted entity — so PostEntity's return
		// value above is useless for learning the AlarmId the callback
		// decided on (CREATE vs. MERGE, and the server-generated id).
		// AlarmServiceCallback itself never relies on this either (see
		// GetAlarm/GetEntitiesByQuery throughout alm/alarms/*.go) — it's
		// only this mock seeding path that needs it, so look the alarm up
		// the same way production code would: by DedupKey (mirrors
		// alm/alarms/matcher.go's computeDedupKey, "definitionId:sourceId").
		alarmId := lookupAlarmIdByDedupKey(fmt.Sprintf("%s:%s", defId, sourceId), vnic)
		if alarmId == "" {
			continue
		}
		alarmIDs = append(alarmIDs, alarmId)

		// Demonstrate CLEAR for roughly a third of definitions that have a
		// clear_event_pattern, by sending a matching clear event afterward.
		if i%3 == 0 && clearEventTypes[i%len(clearEventTypes)] != "" {
			clearEvent := &l8events.EventRecord{
				Category:   category,
				EventType:  clearEventTypes[i%len(clearEventTypes)],
				Message:    "Condition cleared",
				SourceId:   sourceId,
				SourceName: nodeNames[nodeIdx],
				SourceType: nodeTypes[nodeIdx],
				OccurredAt: randomPastDate(0, 1),
			}
			if _, err := common.PostEntity("Alarm", 10, clearEvent, vnic); err != nil {
				fmt.Printf("    WARNING: failed to post clear event for definition %s: %v\n", defId, err)
			}
		}
	}

	return alarmIDs
}

// lookupAlarmIdByDedupKey finds the Alarm (if any) that
// AlarmServiceCallback created or merged for dedupKey. See seedAlarms'
// comment above its call site for why this GET-based lookup replaces
// relying on PostEntity's return value.
func lookupAlarmIdByDedupKey(dedupKey string, vnic ifs.IVNic) string {
	raw, err := common.GetEntitiesByQuery("Alarm", 10,
		fmt.Sprintf("select * from Alarm where DedupKey=%s", dedupKey), vnic)
	if err != nil {
		return ""
	}
	for _, r := range raw {
		if a, ok := r.(*alm.Alarm); ok {
			return a.AlarmId
		}
	}
	return ""
}

// eventCategoryForIndex mirrors generateAlarmDefinitions' eventCategories
// rotation so the event actually satisfies event_category_filter.
func eventCategoryForIndex(i int) l8events.EventCategory {
	categories := []l8events.EventCategory{
		l8events.EventCategory_EVENT_CATEGORY_TRAP,
		l8events.EventCategory_EVENT_CATEGORY_SYSLOG,
		l8events.EventCategory_EVENT_CATEGORY_PERFORMANCE,
		l8events.EventCategory_EVENT_CATEGORY_NETWORK,
	}
	return categories[i%len(categories)]
}

// varyAlarmStateViaPatch varies alarm state post-seed via PATCH (the
// only externally-reachable Alarm mutation — see Phase 3.2/3.3): acknowledges
// roughly a quarter of the seeded alarms, and adds a note to every 5th one.
// Uses the HTTP client since PATCH, unlike POST, does have an HTTP route.
func varyAlarmStateViaPatch(client *Client, alarmIDs []string) {
	for i, id := range alarmIDs {
		switch {
		case i%4 == 1:
			patch := map[string]interface{}{
				"alarm_id":        id,
				"state":           2, // ACKNOWLEDGED
				"acknowledged_by": "noc-operator",
			}
			if _, err := client.Patch("/alm/10/Alarm", patch); err != nil {
				fmt.Printf("    WARNING: failed to acknowledge alarm %s: %v\n", id, err)
			}
		case i%5 == 0:
			patch := map[string]interface{}{
				"alarm_id": id,
				"notes": []map[string]interface{}{
					{"note_id": genID("note", i), "author": "admin", "text": "Investigating this alarm", "created_at": nowUnix()},
				},
			}
			if _, err := client.Patch("/alm/10/Alarm", patch); err != nil {
				fmt.Printf("    WARNING: failed to add note to alarm %s: %v\n", id, err)
			}
		}
	}
}
