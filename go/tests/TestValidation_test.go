package tests

import (
	"github.com/saichler/l8alarms/go/tests/mocks"
	"github.com/saichler/l8types/go/ifs"
	"strings"
	"testing"
	"time"
)

func testValidation(t *testing.T, client *mocks.Client, vnic ifs.IVNic) {
	testValidationAlarmDefinition(t, client)
	testValidationAlarm(t, client, vnic)
	testValidationCorrelationRule(t, client)
	testValidationNotificationPolicy(t, client)
	testValidationEscalationPolicy(t, client)
	testValidationAlarmFilter(t, client)
	testValidationAutoID(t, client)
	testValidationAlarmFieldProtection(t, client, vnic)
}

func testValidationAlarmDefinition(t *testing.T, client *mocks.Client) {
	// Missing name — should fail
	defNoName := map[string]interface{}{
		"status":           1,
		"default_severity": 1,
	}
	_, err := client.Post("/alm/10/AlmDef", defNoName)
	if err == nil {
		t.Fatal("POST AlarmDefinition without name should have failed")
	}
	if !strings.Contains(err.Error(), "Name is required") {
		t.Fatalf("Expected 'Name is required' error, got: %v", err)
	}
}

// testValidationAlarm covers Phase 5 bullet 3 from the "validation" angle:
// since Alarm's POST body is now an l8events.EventRecord decided by
// matching against active AlarmDefinitions (not a caller-supplied *alm.Alarm
// with required-field checks), "invalid input" no longer means a rejected
// POST — a non-matching event is simply dropped (no error, no alarm).
func testValidationAlarm(t *testing.T, client *mocks.Client, vnic ifs.IVNic) {
	defId := createAlarmDefFixture(t, client, vnic, alarmDefFixture{
		Name:           "flow5-validation-nomatch",
		EventPattern:   "flow5ValidationTrigger",
		ThresholdCount: 1,
		DedupEnabled:   true,
	})
	defer deleteAlarmDefFixture(client, defId)

	sourceId := "flow5-validation-node"
	if err := postAlarmEvent(vnic, "flow5SomethingElseEntirely", sourceId, "Node"); err != nil {
		t.Fatalf("POST non-matching event failed: %v", err)
	}
	if got := findAlarmsByDedupKey(t, vnic, defId, sourceId); len(got) != 0 {
		t.Fatalf("expected no alarm for a non-matching event, got %d", len(got))
	}
}

func testValidationCorrelationRule(t *testing.T, client *mocks.Client) {
	// Missing name — should fail
	ruleNoName := map[string]interface{}{
		"rule_type": 1,
		"status":    2,
	}
	_, err := client.Post("/alm/10/CorrRule", ruleNoName)
	if err == nil {
		t.Fatal("POST CorrelationRule without name should have failed")
	}
	if !strings.Contains(err.Error(), "Name is required") {
		t.Fatalf("Expected 'Name is required' error, got: %v", err)
	}
}

func testValidationNotificationPolicy(t *testing.T, client *mocks.Client) {
	// Missing name — should fail
	polNoName := map[string]interface{}{
		"status": 1,
	}
	_, err := client.Post("/alm/10/NotifPol", polNoName)
	if err == nil {
		t.Fatal("POST NotificationPolicy without name should have failed")
	}
	if !strings.Contains(err.Error(), "Name is required") {
		t.Fatalf("Expected 'Name is required' error, got: %v", err)
	}
}

func testValidationEscalationPolicy(t *testing.T, client *mocks.Client) {
	// Missing name — should fail
	polNoName := map[string]interface{}{
		"status": 1,
	}
	_, err := client.Post("/alm/10/EscPolicy", polNoName)
	if err == nil {
		t.Fatal("POST EscalationPolicy without name should have failed")
	}
	if !strings.Contains(err.Error(), "Name is required") {
		t.Fatalf("Expected 'Name is required' error, got: %v", err)
	}
}

func testValidationAlarmFilter(t *testing.T, client *mocks.Client) {
	// Missing name — should fail
	filterNoName := map[string]interface{}{
		"owner": "test-user",
	}
	_, err := client.Post("/alm/10/AlmFilter", filterNoName)
	if err == nil {
		t.Fatal("POST AlarmFilter without name should have failed")
	}
	if !strings.Contains(err.Error(), "Name is required") {
		t.Fatalf("Expected 'Name is required' error, got: %v", err)
	}

	// Missing owner — should fail
	filterNoOwner := map[string]interface{}{
		"name": "Test Filter",
	}
	_, err = client.Post("/alm/10/AlmFilter", filterNoOwner)
	if err == nil {
		t.Fatal("POST AlarmFilter without owner should have failed")
	}
	if !strings.Contains(err.Error(), "Owner is required") {
		t.Fatalf("Expected 'Owner is required' error, got: %v", err)
	}
}

func testValidationAutoID(t *testing.T, client *mocks.Client) {
	// POST an alarm definition without explicit ID — should succeed (auto-generated)
	def := map[string]interface{}{
		"name":             "Auto ID Test",
		"description":      "Testing auto ID generation",
		"status":           1,
		"default_severity": 1,
	}
	_, err := client.Post("/alm/10/AlmDef", def)
	if err != nil {
		t.Fatalf("POST AlarmDefinition for auto-ID test failed: %v", err)
	}

	// Verify the entity was created by querying its unique name
	q := mocks.L8QueryText("select * from AlarmDefinition where name=Auto ID Test")
	getResp, err := client.Get("/alm/10/AlmDef", q)
	if err != nil {
		t.Fatalf("GET auto-ID alarm definition failed: %v", err)
	}
	if !strings.Contains(getResp, "Auto ID Test") {
		t.Fatalf("Auto-ID alarm definition not found in GET response: %s", getResp)
	}
}

// testValidationAlarmFieldProtection covers Phase 5 bullet 13:
// protectPatchFields' restricted PATCH scope now that Alarm has no PUT
// endpoint at all. PATCH may only transition State to ACKNOWLEDGED or
// CLEARED (never SUPPRESSED, never ACTIVE/"Reactivate"), plus notes —
// everything else is rejected as system-managed.
func testValidationAlarmFieldProtection(t *testing.T, client *mocks.Client, vnic ifs.IVNic) {
	defId := createAlarmDefFixture(t, client, vnic, alarmDefFixture{
		Name:           "flow5-patch-scope",
		EventPattern:   "flow5PatchScopeTrigger",
		ThresholdCount: 1,
		DedupEnabled:   true,
	})
	defer deleteAlarmDefFixture(client, defId)

	sourceId := "flow5-patch-scope-node"
	if err := postAlarmEvent(vnic, "flow5PatchScopeTrigger", sourceId, "Node"); err != nil {
		t.Fatalf("POST event failed: %v", err)
	}
	alarm := mustFindOneAlarm(t, vnic, defId, sourceId)

	// Out-of-scope fields — rejected as system-managed.
	badSeverity := map[string]interface{}{"alarm_id": alarm.AlarmId, "severity": 1}
	if _, err := client.Patch("/alm/10/Alarm", badSeverity); err == nil {
		t.Fatal("PATCH changing severity should have been rejected")
	} else if !strings.Contains(err.Error(), "system-managed") {
		t.Fatalf("expected system-managed field error, got: %v", err)
	}

	badDef := map[string]interface{}{"alarm_id": alarm.AlarmId, "definition_id": ifs.NewUuid()}
	if _, err := client.Patch("/alm/10/Alarm", badDef); err == nil {
		t.Fatal("PATCH changing definitionId should have been rejected")
	} else if !strings.Contains(err.Error(), "system-managed") {
		t.Fatalf("expected system-managed field error, got: %v", err)
	}

	badThresholdState := map[string]interface{}{"alarm_id": alarm.AlarmId, "correlation_threshold_state": 3}
	if _, err := client.Patch("/alm/10/Alarm", badThresholdState); err == nil {
		t.Fatal("PATCH changing correlationThresholdState should have been rejected")
	} else if !strings.Contains(err.Error(), "system-managed") {
		t.Fatalf("expected system-managed field error, got: %v", err)
	}

	// Allowed: Acknowledge.
	ack := map[string]interface{}{"alarm_id": alarm.AlarmId, "state": 2, "acknowledged_by": "field-protection-test"}
	if _, err := client.Patch("/alm/10/Alarm", ack); err != nil {
		t.Fatalf("PATCH Acknowledge should have succeeded: %v", err)
	}

	// Disallowed state transitions from ACKNOWLEDGED — rejected.
	suppress := map[string]interface{}{"alarm_id": alarm.AlarmId, "state": 4} // SUPPRESSED
	if _, err := client.Patch("/alm/10/Alarm", suppress); err == nil {
		t.Fatal("PATCH State=SUPPRESSED should have been rejected")
	}
	reactivate := map[string]interface{}{"alarm_id": alarm.AlarmId, "state": 1} // ACTIVE ("Reactivate")
	if _, err := client.Patch("/alm/10/Alarm", reactivate); err == nil {
		t.Fatal("PATCH State=ACTIVE (reactivate) should have been rejected")
	}

	// Allowed: notes.
	notePatch := map[string]interface{}{
		"alarm_id": alarm.AlarmId,
		"notes": []map[string]interface{}{
			{"note_id": ifs.NewUuid(), "author": "field-protection-test", "text": "note", "created_at": time.Now().Unix()},
		},
	}
	if _, err := client.Patch("/alm/10/Alarm", notePatch); err != nil {
		t.Fatalf("PATCH adding a note should have succeeded: %v", err)
	}

	// Allowed: Clear.
	clear := map[string]interface{}{"alarm_id": alarm.AlarmId, "state": 3} // CLEARED
	if _, err := client.Patch("/alm/10/Alarm", clear); err != nil {
		t.Fatalf("PATCH Clear should have succeeded: %v", err)
	}
}
