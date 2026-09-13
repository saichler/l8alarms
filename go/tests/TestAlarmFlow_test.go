package tests

import (
	"fmt"
	"github.com/saichler/l8alarms/go/tests/mocks"
	almtypes "github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
	"testing"
	"time"
)

// testAlarmFlow exercises the Phase 3.4 EventRecord -> Alarm decision flow
// (DROP/CLEAR/MERGE/CREATE, threshold state, dedup) end to end, per the
// plan's Phase 5 test list. Each sub-test uses its own uniquely-named
// AlarmDefinition fixture(s) so they can't interfere with each other or
// with the mock-seeded data from Phase 4.
func testAlarmFlow(t *testing.T, client *mocks.Client, vnic ifs.IVNic) {
	testAlarmCreateMergeNoMatch(t, client, vnic)
	testAlarmThresholdCrossing(t, client, vnic)
	testAlarmThresholdWindowExpiry(t, client, vnic)
	testAlarmClearEventPattern(t, client, vnic)
	testAlarmDedupDisabled(t, client, vnic)
	testAlarmMergeReactivatesAcknowledged(t, client, vnic)
}

// testAlarmCreateMergeNoMatch covers Phase 5 bullets 1-3: CREATE from a
// matching event, MERGE on a duplicate (no new row, OccurrenceCount
// increments), and no-op on a non-matching event.
func testAlarmCreateMergeNoMatch(t *testing.T, client *mocks.Client, vnic ifs.IVNic) {
	defId := createAlarmDefFixture(t, client, vnic, alarmDefFixture{
		Name:           "flow5-basic",
		EventPattern:   "flow5BasicTrigger",
		ThresholdCount: 1,
		DedupEnabled:   true,
	})
	defer deleteAlarmDefFixture(client, defId)

	sourceId := "flow5-basic-node"
	if err := postAlarmEvent(vnic, "flow5BasicTrigger", sourceId, "Basic Node"); err != nil {
		t.Fatalf("POST matching event failed: %v", err)
	}
	alarm := mustFindOneAlarm(t, vnic, defId, sourceId)
	if alarm.DedupKey != fmt.Sprintf("%s:%s", defId, sourceId) {
		t.Fatalf("unexpected DedupKey: %s", alarm.DedupKey)
	}
	if alarm.OccurrenceCount != 1 {
		t.Fatalf("expected OccurrenceCount=1, got %d", alarm.OccurrenceCount)
	}
	if alarm.FirstOccurrence == 0 {
		t.Fatal("expected FirstOccurrence to be set")
	}
	if alarm.CorrelationThresholdState != almtypes.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_OPEN_FOR_CORRELATION {
		t.Fatalf("expected OPEN_FOR_CORRELATION (threshold_count=1), got %s", alarm.CorrelationThresholdState)
	}
	firstAlarmId := alarm.AlarmId

	// Bullet 2: duplicate event merges, doesn't create a second row.
	if err := postAlarmEvent(vnic, "flow5BasicTrigger", sourceId, "Basic Node"); err != nil {
		t.Fatalf("POST duplicate event failed: %v", err)
	}
	merged := mustFindOneAlarm(t, vnic, defId, sourceId)
	if merged.AlarmId != firstAlarmId {
		t.Fatalf("expected same AlarmId on merge, got %s vs %s", merged.AlarmId, firstAlarmId)
	}
	if merged.OccurrenceCount != 2 {
		t.Fatalf("expected OccurrenceCount=2 after merge, got %d", merged.OccurrenceCount)
	}

	// Bullet 3: non-matching event creates nothing.
	noMatchSource := "flow5-basic-nomatch-node"
	if err := postAlarmEvent(vnic, "flow5NoSuchTrigger", noMatchSource, "No Match Node"); err != nil {
		t.Fatalf("POST non-matching event failed: %v", err)
	}
	if got := findAlarmsByDedupKey(t, vnic, defId, noMatchSource); len(got) != 0 {
		t.Fatalf("expected no alarm for non-matching event, got %d", len(got))
	}
}

// testAlarmThresholdCrossing covers Phase 5 bullet 4: threshold_count>1
// starts an alarm PENDING_THRESHOLD and crosses it to OPEN_FOR_CORRELATION
// once enough occurrences arrive — same AlarmId throughout, never
// re-created.
func testAlarmThresholdCrossing(t *testing.T, client *mocks.Client, vnic ifs.IVNic) {
	defId := createAlarmDefFixture(t, client, vnic, alarmDefFixture{
		Name:                   "flow5-threshold-cross",
		EventPattern:           "flow5ThresholdCrossTrigger",
		ThresholdCount:         3,
		ThresholdWindowSeconds: 60,
		DedupEnabled:           true,
	})
	defer deleteAlarmDefFixture(client, defId)

	sourceId := "flow5-threshold-cross-node"
	if err := postAlarmEvent(vnic, "flow5ThresholdCrossTrigger", sourceId, "Node"); err != nil {
		t.Fatalf("POST event 1 failed: %v", err)
	}
	a := mustFindOneAlarm(t, vnic, defId, sourceId)
	if a.CorrelationThresholdState != almtypes.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_PENDING_THRESHOLD {
		t.Fatalf("expected PENDING_THRESHOLD after 1 of 3, got %s", a.CorrelationThresholdState)
	}
	alarmId := a.AlarmId

	if err := postAlarmEvent(vnic, "flow5ThresholdCrossTrigger", sourceId, "Node"); err != nil {
		t.Fatalf("POST event 2 failed: %v", err)
	}
	a = mustFindOneAlarm(t, vnic, defId, sourceId)
	if a.AlarmId != alarmId {
		t.Fatalf("AlarmId changed across merges: %s vs %s", a.AlarmId, alarmId)
	}
	if a.CorrelationThresholdState != almtypes.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_PENDING_THRESHOLD {
		t.Fatalf("expected still PENDING_THRESHOLD after 2 of 3, got %s", a.CorrelationThresholdState)
	}

	if err := postAlarmEvent(vnic, "flow5ThresholdCrossTrigger", sourceId, "Node"); err != nil {
		t.Fatalf("POST event 3 failed: %v", err)
	}
	a = mustFindOneAlarm(t, vnic, defId, sourceId)
	if a.AlarmId != alarmId {
		t.Fatalf("AlarmId changed on crossing threshold: %s vs %s", a.AlarmId, alarmId)
	}
	if a.CorrelationThresholdState != almtypes.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_OPEN_FOR_CORRELATION {
		t.Fatalf("expected OPEN_FOR_CORRELATION after crossing threshold, got %s", a.CorrelationThresholdState)
	}
	if a.OccurrenceCount != 3 {
		t.Fatalf("expected OccurrenceCount=3, got %d", a.OccurrenceCount)
	}
}

// testAlarmThresholdWindowExpiry covers Phase 5 bullet 5: an alarm still
// PENDING_THRESHOLD when its threshold window closes never reached
// threshold_count, so it's deleted rather than left provisional forever.
func testAlarmThresholdWindowExpiry(t *testing.T, client *mocks.Client, vnic ifs.IVNic) {
	defId := createAlarmDefFixture(t, client, vnic, alarmDefFixture{
		Name:                   "flow5-threshold-window",
		EventPattern:           "flow5ThresholdWindowTrigger",
		ThresholdCount:         3,
		ThresholdWindowSeconds: 2,
		DedupEnabled:           true,
	})
	defer deleteAlarmDefFixture(client, defId)

	sourceId := "flow5-threshold-window-node"
	if err := postAlarmEvent(vnic, "flow5ThresholdWindowTrigger", sourceId, "Node"); err != nil {
		t.Fatalf("POST event failed: %v", err)
	}
	if got := findAlarmsByDedupKey(t, vnic, defId, sourceId); len(got) != 1 {
		t.Fatalf("expected 1 PENDING_THRESHOLD alarm right after creation, got %d", len(got))
	}

	time.Sleep(4 * time.Second) // past the 2s threshold window

	if got := findAlarmsByDedupKey(t, vnic, defId, sourceId); len(got) != 0 {
		t.Fatalf("expected alarm to be deleted after threshold window expiry, got %d", len(got))
	}
}

// testAlarmClearEventPattern covers Phase 5 bullet 10: an event matching
// clear_event_pattern transitions an active alarm to CLEARED.
func testAlarmClearEventPattern(t *testing.T, client *mocks.Client, vnic ifs.IVNic) {
	defId := createAlarmDefFixture(t, client, vnic, alarmDefFixture{
		Name:              "flow5-clear",
		EventPattern:      "flow5ClearTrigger",
		ClearEventPattern: "flow5ClearResolved",
		ThresholdCount:    1,
		DedupEnabled:      true,
	})
	defer deleteAlarmDefFixture(client, defId)

	sourceId := "flow5-clear-node"
	if err := postAlarmEvent(vnic, "flow5ClearTrigger", sourceId, "Node"); err != nil {
		t.Fatalf("POST trigger event failed: %v", err)
	}
	a := mustFindOneAlarm(t, vnic, defId, sourceId)
	if a.State != almtypes.AlarmState_ALARM_STATE_ACTIVE {
		t.Fatalf("expected ACTIVE after create, got %s", a.State)
	}

	if err := postAlarmEvent(vnic, "flow5ClearResolved", sourceId, "Node"); err != nil {
		t.Fatalf("POST clear event failed: %v", err)
	}
	a = mustFindOneAlarm(t, vnic, defId, sourceId)
	if a.State != almtypes.AlarmState_ALARM_STATE_CLEARED {
		t.Fatalf("expected CLEARED after clear-pattern event, got %s", a.State)
	}
}

// testAlarmDedupDisabled covers Phase 5 bullet 11: dedup_enabled=false
// skips the merge lookup entirely — two matching events always produce two
// separate rows.
func testAlarmDedupDisabled(t *testing.T, client *mocks.Client, vnic ifs.IVNic) {
	defId := createAlarmDefFixture(t, client, vnic, alarmDefFixture{
		Name:           "flow5-dedup-off",
		EventPattern:   "flow5DedupOffTrigger",
		ThresholdCount: 1,
		DedupEnabled:   false,
	})
	defer deleteAlarmDefFixture(client, defId)

	sourceId := "flow5-dedup-off-node"
	if err := postAlarmEvent(vnic, "flow5DedupOffTrigger", sourceId, "Node"); err != nil {
		t.Fatalf("POST event 1 failed: %v", err)
	}
	if err := postAlarmEvent(vnic, "flow5DedupOffTrigger", sourceId, "Node"); err != nil {
		t.Fatalf("POST event 2 failed: %v", err)
	}
	if got := findAlarmsByDedupKey(t, vnic, defId, sourceId); len(got) != 2 {
		t.Fatalf("expected 2 separate alarms with dedup_enabled=false, got %d", len(got))
	}
}

// testAlarmMergeReactivatesAcknowledged covers Phase 5 bullet 12: merging a
// new occurrence into an ACKNOWLEDGED alarm reactivates it to ACTIVE, and
// never auto-escalates Severity.
func testAlarmMergeReactivatesAcknowledged(t *testing.T, client *mocks.Client, vnic ifs.IVNic) {
	defId := createAlarmDefFixture(t, client, vnic, alarmDefFixture{
		Name:           "flow5-merge-ack",
		EventPattern:   "flow5MergeAckTrigger",
		ThresholdCount: 1,
		DedupEnabled:   true,
	})
	defer deleteAlarmDefFixture(client, defId)

	sourceId := "flow5-merge-ack-node"
	if err := postAlarmEvent(vnic, "flow5MergeAckTrigger", sourceId, "Node"); err != nil {
		t.Fatalf("POST event failed: %v", err)
	}
	a := mustFindOneAlarm(t, vnic, defId, sourceId)
	originalSeverity := a.Severity

	ackPatch := map[string]interface{}{
		"alarm_id":        a.AlarmId,
		"state":           2, // ACKNOWLEDGED
		"acknowledged_by": "flow5-test",
	}
	if _, err := client.Patch("/alm/10/Alarm", ackPatch); err != nil {
		t.Fatalf("PATCH Acknowledge failed: %v", err)
	}
	acked := mustFindOneAlarm(t, vnic, defId, sourceId)
	if acked.State != almtypes.AlarmState_ALARM_STATE_ACKNOWLEDGED {
		t.Fatalf("expected ACKNOWLEDGED after PATCH, got %s", acked.State)
	}

	if err := postAlarmEvent(vnic, "flow5MergeAckTrigger", sourceId, "Node"); err != nil {
		t.Fatalf("POST merge event failed: %v", err)
	}
	reactivated := mustFindOneAlarm(t, vnic, defId, sourceId)
	if reactivated.State != almtypes.AlarmState_ALARM_STATE_ACTIVE {
		t.Fatalf("expected ACTIVE after merge into ACKNOWLEDGED alarm, got %s", reactivated.State)
	}
	if reactivated.Severity != originalSeverity {
		t.Fatalf("expected Severity unchanged by merge, got %s vs original %s", reactivated.Severity, originalSeverity)
	}
	if reactivated.OccurrenceCount != 2 {
		t.Fatalf("expected OccurrenceCount=2, got %d", reactivated.OccurrenceCount)
	}
}
