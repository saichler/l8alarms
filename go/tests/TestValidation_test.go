package tests

import (
	"github.com/saichler/l8alarms/go/tests/mocks"
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
}

func testValidationAlarmDefinition(t *testing.T, client *mocks.Client) {
	// Missing name — should fail
	defNoName := map[string]interface{}{
		"status":          1,
		"defaultSeverity": 1,
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
	// Missing definitionId — should fail
	alarmNoDef := map[string]interface{}{
		"nodeId":   "test-node",
		"state":    1,
		"severity": 1,
	}
	_, err := client.Post("/alm/10/Alarm", alarmNoDef)
	if err == nil {
		t.Fatal("POST Alarm without definitionId should have failed")
	}

	// Missing nodeId — should fail
	alarmNoNode := map[string]interface{}{
		"definitionId": testStore.DefinitionIDs[0],
		"state":        1,
		"severity":     1,
	}
	_, err = client.Post("/alm/10/Alarm", alarmNoNode)
	if err == nil {
		t.Fatal("POST Alarm without nodeId should have failed")
	}
}

func testValidationEvent(t *testing.T, client *mocks.Client) {
	// Missing nodeId — should fail
	eventNoNode := map[string]interface{}{
		"eventType": 1,
		"message":   "Test",
	}
	_, err := client.Post("/alm/10/Event", eventNoNode)
	if err == nil {
		t.Fatal("POST Event without nodeId should have failed")
	}

	// Missing message — should fail
	eventNoMsg := map[string]interface{}{
		"eventType": 1,
		"nodeId":    "test-node",
	}
	_, err = client.Post("/alm/10/Event", eventNoMsg)
	if err == nil {
		t.Fatal("POST Event without message should have failed")
	}
}

func testValidationCorrelationRule(t *testing.T, client *mocks.Client) {
	// Missing name — should fail
	ruleNoName := map[string]interface{}{
		"ruleType": 1,
		"status":   2,
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
		"status":    2,
		"startTime": 1700000000,
		"endTime":   1700086400,
	}
	_, err := client.Post("/alm/10/MaintWin", winNoName)
	if err == nil {
		t.Fatal("POST MaintenanceWindow without name should have failed")
	}
	if !strings.Contains(err.Error(), "Name is required") {
		t.Fatalf("Expected 'Name is required' error, got: %v", err)
	}

	// Missing startTime — should fail
	winNoStart := map[string]interface{}{
		"name":    "Test Window",
		"status":  2,
		"endTime": 1700086400,
	}
	_, err = client.Post("/alm/10/MaintWin", winNoStart)
	if err == nil {
		t.Fatal("POST MaintenanceWindow without startTime should have failed")
	}

	// Missing endTime — should fail
	winNoEnd := map[string]interface{}{
		"name":      "Test Window",
		"status":    2,
		"startTime": 1700000000,
	}
	_, err = client.Post("/alm/10/MaintWin", winNoEnd)
	if err == nil {
		t.Fatal("POST MaintenanceWindow without endTime should have failed")
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
		"name":            "Auto ID Test",
		"description":     "Testing auto ID generation",
		"status":          1,
		"defaultSeverity": 1,
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
