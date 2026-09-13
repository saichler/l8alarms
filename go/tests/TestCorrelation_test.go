package tests

import (
	"fmt"
	"github.com/saichler/l8alarms/go/tests/mocks"
	almtypes "github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
	"testing"
	"time"
)

// testCorrelation exercises correlation_runner.go's post-Phase-3.4 sourcing
// rules (correlation-eligible cache for the "gains a symptom" direction,
// direct query including STABLE for the "becomes a root cause" direction),
// through the real EventRecord -> Alarm flow. Each sub-test uses its own
// uniquely-named AlarmDefinition/CorrelationRule fixtures.
func testCorrelation(t *testing.T, client *mocks.Client, vnic ifs.IVNic) {
	testPatternCorrelationLinksRootAndSymptom(t, client, vnic)
	testPendingThresholdExcludedFromCorrelation(t, client, vnic)
	testCorrelationWindowExpiryToStable(t, client, vnic)
	testStableAlarmCanStillBecomeSymptom(t, client, vnic)
}

// createCorrelationRuleFixture POSTs a bespoke, ACTIVE PATTERN
// CorrelationRule via HTTP (CorrelationRule's own CRUD is untouched by
// Phase 3), and waits for it to become visible (see waitForVisible) before
// returning. Returns the RuleId.
func createCorrelationRuleFixture(t *testing.T, client *mocks.Client, vnic ifs.IVNic, name, rootPattern, symptomPattern string) string {
	ruleId := ifs.NewUuid()
	rule := map[string]interface{}{
		"rule_id":               ruleId,
		"name":                  name,
		"rule_type":             3, // CORRELATION_RULE_TYPE_PATTERN
		"status":                2, // CORRELATION_RULE_STATUS_ACTIVE
		"root_alarm_pattern":    rootPattern,
		"symptom_alarm_pattern": symptomPattern,
	}
	if _, err := client.Post("/alm/10/CorrRule", rule); err != nil {
		t.Fatalf("POST CorrelationRule fixture %q failed: %v", name, err)
	}
	waitForVisible(t, vnic, "CorrRule", 10, fmt.Sprintf("select * from CorrelationRule where RuleId=%s", ruleId))
	return ruleId
}

func deleteCorrelationRuleFixture(client *mocks.Client, ruleId string) {
	q := mocks.L8QueryText(fmt.Sprintf("select * from CorrelationRule where RuleId=%s", ruleId))
	_, _ = client.Delete("/alm/10/CorrRule", q)
}

// testPatternCorrelationLinksRootAndSymptom covers Phase 5 bullet 6: a
// symptom alarm created after an OPEN_FOR_CORRELATION root gets linked to
// it, and the root is marked accordingly. PatternStrategy matches against
// Alarm.Name, which is always copied verbatim from AlarmDefinition.Name.
func testPatternCorrelationLinksRootAndSymptom(t *testing.T, client *mocks.Client, vnic ifs.IVNic) {
	ruleId := createCorrelationRuleFixture(t, client, vnic, "flow5-rule-main", "^flow5-root-main$", "^flow5-symptom-main$")
	defer deleteCorrelationRuleFixture(client, ruleId)

	rootDefId := createAlarmDefFixture(t, client, vnic, alarmDefFixture{
		Name: "flow5-root-main", EventPattern: "flow5RootMainTrigger",
		ThresholdCount: 1, CorrelationWindowSeconds: 120, DedupEnabled: true,
	})
	defer deleteAlarmDefFixture(client, rootDefId)
	symptomDefId := createAlarmDefFixture(t, client, vnic, alarmDefFixture{
		Name: "flow5-symptom-main", EventPattern: "flow5SymptomMainTrigger",
		ThresholdCount: 1, CorrelationWindowSeconds: 120, DedupEnabled: true,
	})
	defer deleteAlarmDefFixture(client, symptomDefId)

	rootSource := "flow5-root-main-node"
	if err := postAlarmEvent(vnic, "flow5RootMainTrigger", rootSource, "Root Node"); err != nil {
		t.Fatalf("POST root event failed: %v", err)
	}
	root := mustFindOneAlarm(t, vnic, rootDefId, rootSource)

	symptomSource := "flow5-symptom-main-node"
	if err := postAlarmEvent(vnic, "flow5SymptomMainTrigger", symptomSource, "Symptom Node"); err != nil {
		t.Fatalf("POST symptom event failed: %v", err)
	}
	symptom := mustFindOneAlarm(t, vnic, symptomDefId, symptomSource)

	if symptom.RootCauseAlarmId != root.AlarmId {
		t.Fatalf("expected symptom.RootCauseAlarmId=%s, got %s", root.AlarmId, symptom.RootCauseAlarmId)
	}
	if symptom.CorrelationRuleId != ruleId {
		t.Fatalf("expected symptom.CorrelationRuleId=%s, got %s", ruleId, symptom.CorrelationRuleId)
	}

	rootAfter := mustFindOneAlarm(t, vnic, rootDefId, rootSource)
	if !rootAfter.IsRootCause {
		t.Fatal("expected root.IsRootCause=true")
	}
	if rootAfter.SymptomCount < 1 {
		t.Fatalf("expected root.SymptomCount>=1, got %d", rootAfter.SymptomCount)
	}
}

// testPendingThresholdExcludedFromCorrelation covers Phase 5 bullet 7: a
// PENDING_THRESHOLD alarm is never picked up as a root cause, even when its
// name would otherwise match — it's never added to the correlation-eligible
// cache in the first place.
func testPendingThresholdExcludedFromCorrelation(t *testing.T, client *mocks.Client, vnic ifs.IVNic) {
	ruleId := createCorrelationRuleFixture(t, client, vnic, "flow5-rule-pending", "^flow5-root-pending$", "^flow5-symptom-pending$")
	defer deleteCorrelationRuleFixture(client, ruleId)

	rootDefId := createAlarmDefFixture(t, client, vnic, alarmDefFixture{
		Name: "flow5-root-pending", EventPattern: "flow5RootPendingTrigger",
		ThresholdCount: 3, ThresholdWindowSeconds: 60, CorrelationWindowSeconds: 60, DedupEnabled: true,
	})
	defer deleteAlarmDefFixture(client, rootDefId)
	symptomDefId := createAlarmDefFixture(t, client, vnic, alarmDefFixture{
		Name: "flow5-symptom-pending", EventPattern: "flow5SymptomPendingTrigger",
		ThresholdCount: 1, CorrelationWindowSeconds: 60, DedupEnabled: true,
	})
	defer deleteAlarmDefFixture(client, symptomDefId)

	rootSource := "flow5-root-pending-node"
	// Only 1 of 3 needed — stays PENDING_THRESHOLD, never added to the
	// correlation-eligible cache.
	if err := postAlarmEvent(vnic, "flow5RootPendingTrigger", rootSource, "Root Node"); err != nil {
		t.Fatalf("POST root event failed: %v", err)
	}
	root := mustFindOneAlarm(t, vnic, rootDefId, rootSource)
	if root.CorrelationThresholdState != almtypes.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_PENDING_THRESHOLD {
		t.Fatalf("expected PENDING_THRESHOLD, got %s", root.CorrelationThresholdState)
	}

	symptomSource := "flow5-symptom-pending-node"
	if err := postAlarmEvent(vnic, "flow5SymptomPendingTrigger", symptomSource, "Symptom Node"); err != nil {
		t.Fatalf("POST symptom event failed: %v", err)
	}
	symptom := mustFindOneAlarm(t, vnic, symptomDefId, symptomSource)
	if symptom.RootCauseAlarmId != "" {
		t.Fatalf("expected symptom to NOT be linked to a PENDING_THRESHOLD root, got RootCauseAlarmId=%s", symptom.RootCauseAlarmId)
	}
}

// testCorrelationWindowExpiryToStable covers Phase 5 bullet 8: once its
// correlation window closes, an OPEN_FOR_CORRELATION alarm transitions to
// STABLE, is evicted from the correlation-eligible cache, and stops gaining
// new symptoms.
func testCorrelationWindowExpiryToStable(t *testing.T, client *mocks.Client, vnic ifs.IVNic) {
	ruleId := createCorrelationRuleFixture(t, client, vnic, "flow5-rule-window", "^flow5-root-window$", "^flow5-symptom-window$")
	defer deleteCorrelationRuleFixture(client, ruleId)

	rootDefId := createAlarmDefFixture(t, client, vnic, alarmDefFixture{
		Name: "flow5-root-window", EventPattern: "flow5RootWindowTrigger",
		ThresholdCount: 1, CorrelationWindowSeconds: 2, DedupEnabled: true,
	})
	defer deleteAlarmDefFixture(client, rootDefId)
	symptomDefId := createAlarmDefFixture(t, client, vnic, alarmDefFixture{
		Name: "flow5-symptom-window", EventPattern: "flow5SymptomWindowTrigger",
		ThresholdCount: 1, CorrelationWindowSeconds: 60, DedupEnabled: true,
	})
	defer deleteAlarmDefFixture(client, symptomDefId)

	rootSource := "flow5-root-window-node"
	if err := postAlarmEvent(vnic, "flow5RootWindowTrigger", rootSource, "Root Node"); err != nil {
		t.Fatalf("POST root event failed: %v", err)
	}

	time.Sleep(4 * time.Second) // past the 2s correlation window

	root := mustFindOneAlarm(t, vnic, rootDefId, rootSource)
	if root.CorrelationThresholdState != almtypes.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_STABLE {
		t.Fatalf("expected STABLE after correlation window expiry, got %s", root.CorrelationThresholdState)
	}

	symptomSource := "flow5-symptom-window-node"
	if err := postAlarmEvent(vnic, "flow5SymptomWindowTrigger", symptomSource, "Symptom Node"); err != nil {
		t.Fatalf("POST symptom event failed: %v", err)
	}
	symptom := mustFindOneAlarm(t, vnic, symptomDefId, symptomSource)
	if symptom.RootCauseAlarmId != "" {
		t.Fatalf("expected symptom to NOT link to a STABLE (evicted) root, got RootCauseAlarmId=%s", symptom.RootCauseAlarmId)
	}

	rootAfter := mustFindOneAlarm(t, vnic, rootDefId, rootSource)
	if rootAfter.SymptomCount != 0 {
		t.Fatalf("expected STABLE root's SymptomCount to stay 0, got %d", rootAfter.SymptomCount)
	}
}

// testStableAlarmCanStillBecomeSymptom covers Phase 5 bullet 9: a STABLE
// alarm (aged out of its own correlation window without gaining a root)
// can still be linked as someone else's symptom afterward — it just can't
// gain new symptoms of its own anymore.
func testStableAlarmCanStillBecomeSymptom(t *testing.T, client *mocks.Client, vnic ifs.IVNic) {
	ruleId := createCorrelationRuleFixture(t, client, vnic, "flow5-rule-reverse", "^flow5-root-reverse$", "^flow5-root-forstable$")
	defer deleteCorrelationRuleFixture(client, ruleId)

	// This definition's own alarm plays the STABLE "symptom" role — its
	// correlation window expires with nothing ever having claimed it, so
	// by the time the reverse-direction event fires, it's STABLE.
	stableDefId := createAlarmDefFixture(t, client, vnic, alarmDefFixture{
		Name: "flow5-root-forstable", EventPattern: "flow5RootForStableTrigger",
		ThresholdCount: 1, CorrelationWindowSeconds: 2, DedupEnabled: true,
	})
	defer deleteAlarmDefFixture(client, stableDefId)
	reverseDefId := createAlarmDefFixture(t, client, vnic, alarmDefFixture{
		Name: "flow5-root-reverse", EventPattern: "flow5RootReverseTrigger",
		ThresholdCount: 1, CorrelationWindowSeconds: 60, DedupEnabled: true,
	})
	defer deleteAlarmDefFixture(client, reverseDefId)

	stableSource := "flow5-root-forstable-node"
	if err := postAlarmEvent(vnic, "flow5RootForStableTrigger", stableSource, "Node"); err != nil {
		t.Fatalf("POST event failed: %v", err)
	}

	time.Sleep(4 * time.Second) // past the 2s correlation window -> STABLE

	stable := mustFindOneAlarm(t, vnic, stableDefId, stableSource)
	if stable.CorrelationThresholdState != almtypes.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_STABLE {
		t.Fatalf("expected STABLE, got %s", stable.CorrelationThresholdState)
	}

	reverseSource := "flow5-root-reverse-node"
	if err := postAlarmEvent(vnic, "flow5RootReverseTrigger", reverseSource, "Node"); err != nil {
		t.Fatalf("POST reverse-direction event failed: %v", err)
	}
	reverseRoot := mustFindOneAlarm(t, vnic, reverseDefId, reverseSource)

	stableAfter := mustFindOneAlarm(t, vnic, stableDefId, stableSource)
	if stableAfter.RootCauseAlarmId != reverseRoot.AlarmId {
		t.Fatalf("expected STABLE alarm to be linked as a symptom of the new alarm, got RootCauseAlarmId=%s want %s",
			stableAfter.RootCauseAlarmId, reverseRoot.AlarmId)
	}
}
