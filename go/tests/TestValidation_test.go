package tests

import (
	"fmt"
	"github.com/saichler/l8alarms/go/tests/mocks"
	"github.com/saichler/l8types/go/ifs"
	"strings"
	"testing"
)

func testValidation(t *testing.T, client *mocks.Client) {
	testValidationAlarmDefinition(t, client)
	testValidationAlarm(t, client)
	testValidationEvent(t, client)
	testValidationCorrelationRule(t, client)
	testValidationNotificationPolicy(t, client)
	testValidationEscalationPolicy(t, client)
	testValidationMaintenanceWindow(t, client)
	testValidationAlarmFilter(t, client)
	testValidationAutoID(t, client)
	testValidationEventImmutability(t, client)
	testValidationAlarmFieldProtection(t, client)
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

func testValidationAlarm(t *testing.T, client *mocks.Client) {
	// Missing definition_id — should fail
	alarmNoDef := map[string]interface{}{
		"node_id":  "test-node",
		"state":    1,
		"severity": 1,
	}
	_, err := client.Post("/alm/10/Alarm", alarmNoDef)
	if err == nil {
		t.Fatal("POST Alarm without definition_id should have failed")
	}

	// Missing node_id — should fail
	alarmNoNode := map[string]interface{}{
		"definition_id": testStore.DefinitionIDs[0],
		"state":         1,
		"severity":      1,
	}
	_, err = client.Post("/alm/10/Alarm", alarmNoNode)
	if err == nil {
		t.Fatal("POST Alarm without node_id should have failed")
	}
}

func testValidationEvent(t *testing.T, client *mocks.Client) {
	// Missing node_id — should fail
	eventNoNode := map[string]interface{}{
		"event_type": 1,
		"message":    "Test",
	}
	_, err := client.Post("/alm/10/Event", eventNoNode)
	if err == nil {
		t.Fatal("POST Event without node_id should have failed")
	}

	// Missing message — should fail
	eventNoMsg := map[string]interface{}{
		"event_type": 1,
		"node_id":    "test-node",
	}
	_, err = client.Post("/alm/10/Event", eventNoMsg)
	if err == nil {
		t.Fatal("POST Event without message should have failed")
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

func testValidationMaintenanceWindow(t *testing.T, client *mocks.Client) {
	// Missing name — should fail
	winNoName := map[string]interface{}{
		"status":     2,
		"start_time": 1700000000,
		"end_time":   1700086400,
	}
	_, err := client.Post("/alm/10/MaintWin", winNoName)
	if err == nil {
		t.Fatal("POST MaintenanceWindow without name should have failed")
	}
	if !strings.Contains(err.Error(), "Name is required") {
		t.Fatalf("Expected 'Name is required' error, got: %v", err)
	}

	// Missing start_time — should fail
	winNoStart := map[string]interface{}{
		"name":     "Test Window",
		"status":   2,
		"end_time": 1700086400,
	}
	_, err = client.Post("/alm/10/MaintWin", winNoStart)
	if err == nil {
		t.Fatal("POST MaintenanceWindow without start_time should have failed")
	}

	// Missing end_time — should fail
	winNoEnd := map[string]interface{}{
		"name":       "Test Window",
		"status":     2,
		"start_time": 1700000000,
	}
	_, err = client.Post("/alm/10/MaintWin", winNoEnd)
	if err == nil {
		t.Fatal("POST MaintenanceWindow without end_time should have failed")
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

func testValidationEventImmutability(t *testing.T, client *mocks.Client) {
	// POST a valid event
	eventId := ifs.NewUuid()
	event := map[string]interface{}{
		"event_id":   eventId,
		"event_type": 1,
		"node_id":    "test-node-001",
		"message":    "Immutability Test Event",
	}
	_, err := client.Post("/alm/10/Event", event)
	if err != nil {
		t.Fatalf("POST Event for immutability test failed: %v", err)
	}

	// PUT should be rejected
	event["message"] = "Should Not Update"
	_, err = client.Put("/alm/10/Event", event)
	if err == nil {
		t.Fatal("PUT Event should have been rejected (events are immutable)")
	}
	if !strings.Contains(err.Error(), "immutable") {
		t.Fatalf("Expected immutability error, got: %v", err)
	}

	// Cleanup
	delQ := mocks.L8QueryText(fmt.Sprintf("select * from Event where EventId=%s", eventId))
	_, _ = client.Delete("/alm/10/Event", delQ)
}

func testValidationAlarmFieldProtection(t *testing.T, client *mocks.Client) {
	// POST a valid alarm
	alarmId := ifs.NewUuid()
	alarm := map[string]interface{}{
		"alarm_id":      alarmId,
		"definition_id": testStore.DefinitionIDs[0],
		"node_id":       "test-node-001",
		"state":         1,
		"severity":      1,
		"name":          "Field Protection Test",
	}
	_, err := client.Post("/alm/10/Alarm", alarm)
	if err != nil {
		t.Fatalf("POST Alarm for field protection test failed: %v", err)
	}

	// PUT changing a system-managed field (name) — should be rejected
	alarm["name"] = "Changed Name"
	_, err = client.Put("/alm/10/Alarm", alarm)
	if err == nil {
		t.Fatal("PUT Alarm with changed system field should have been rejected")
	}
	if !strings.Contains(err.Error(), "system-managed") {
		t.Fatalf("Expected system-managed field error, got: %v", err)
	}

	// PUT changing only user-editable field (state) — should succeed
	alarm["name"] = "Field Protection Test" // restore original
	alarm["state"] = 2
	_, err = client.Put("/alm/10/Alarm", alarm)
	if err != nil {
		t.Fatalf("PUT Alarm with only user-editable field change should succeed: %v", err)
	}

	// Cleanup
	delQ := mocks.L8QueryText(fmt.Sprintf("select * from Alarm where AlarmId=%s", alarmId))
	_, _ = client.Delete("/alm/10/Alarm", delQ)
}
