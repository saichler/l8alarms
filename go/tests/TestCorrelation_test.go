package tests

import (
	"encoding/json"
	"fmt"
	"github.com/saichler/l8alarms/go/tests/mocks"
	"github.com/saichler/l8types/go/ifs"
	"testing"
	"time"
)

func testCorrelation(t *testing.T, client *mocks.Client) {
	testPatternCorrelation(t, client)
	testMaintenanceWindowSuppression(t, client)
	testNoCorrelationWhenAlreadyCleared(t, client)
}

// extractFirstFromList parses a protojson list response and returns the first item.
// The server returns GET responses as {"list": [{...}, ...]}.
func extractFirstFromList(respJSON string) (map[string]interface{}, error) {
	var wrapper map[string]interface{}
	if err := json.Unmarshal([]byte(respJSON), &wrapper); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}
	list, ok := wrapper["list"].([]interface{})
	if !ok || len(list) == 0 {
		return nil, fmt.Errorf("response has no list or list is empty")
	}
	item, ok := list[0].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("first list element is not an object")
	}
	return item, nil
}

// testPatternCorrelation verifies the pattern-based correlation strategy.
// Mock data creates a PATTERN rule (index 5) with:
//   - RootAlarmPattern: "powerSupply.*fail|fan.*fail"
//   - SymptomAlarmPattern: "tempAboveThreshold|overheating"
//
// We create a root cause alarm matching the root pattern, then a symptom
// alarm matching the symptom pattern. The engine should link them.
func testPatternCorrelation(t *testing.T, client *mocks.Client) {
	// 1. Create the root cause alarm (name matches "powerSupply.*fail")
	rootId := ifs.NewUuid()
	rootAlarm := map[string]interface{}{
		"alarm_id":      rootId,
		"definition_id": testStore.DefinitionIDs[0],
		"node_id":       "node-srv-app-01",
		"name":          "powerSupplyFailure",
		"state":         1, // ACTIVE
		"severity":      4, // CRITICAL
	}
	_, err := client.Post("/alm/10/Alarm", rootAlarm)
	if err != nil {
		t.Fatalf("POST root cause alarm failed: %v", err)
	}

	// Small delay for persistence and service processing
	time.Sleep(2 * time.Second)

	// 2. Create the symptom alarm (name matches "tempAboveThreshold")
	symptomId := ifs.NewUuid()
	symptomAlarm := map[string]interface{}{
		"alarm_id":      symptomId,
		"definition_id": testStore.DefinitionIDs[0],
		"node_id":       "node-srv-app-02",
		"name":          "tempAboveThreshold",
		"state":         1, // ACTIVE
		"severity":      3, // MAJOR
	}
	_, err = client.Post("/alm/10/Alarm", symptomAlarm)
	if err != nil {
		t.Fatalf("POST symptom alarm failed: %v", err)
	}

	time.Sleep(2 * time.Second)

	// 3. GET the symptom alarm and verify correlation fields
	q := mocks.L8QueryText(fmt.Sprintf("select * from Alarm where AlarmId=%s", symptomId))
	getResp, err := client.Get("/alm/10/Alarm", q)
	if err != nil {
		t.Fatalf("GET symptom alarm failed: %v", err)
	}

	symptomResult, err := extractFirstFromList(getResp)
	if err != nil {
		t.Fatalf("Failed to parse symptom alarm response: %v", err)
	}

	// The symptom should be linked to the root cause
	rcaId, _ := symptomResult["rootCauseAlarmId"].(string)
	if rcaId != rootId {
		t.Fatalf("Expected symptom rootCauseAlarmId=%s, got=%s", rootId, rcaId)
	}

	corrRuleId, _ := symptomResult["correlationRuleId"].(string)
	if corrRuleId == "" {
		t.Fatal("Expected symptom correlationRuleId to be set")
	}

	// 4. GET the root cause alarm and verify it's marked as root cause
	q = mocks.L8QueryText(fmt.Sprintf("select * from Alarm where AlarmId=%s", rootId))
	getResp, err = client.Get("/alm/10/Alarm", q)
	if err != nil {
		t.Fatalf("GET root cause alarm failed: %v", err)
	}

	rootResult, err := extractFirstFromList(getResp)
	if err != nil {
		t.Fatalf("Failed to parse root cause alarm response: %v", err)
	}

	isRoot, _ := rootResult["isRootCause"].(bool)
	if !isRoot {
		t.Fatal("Expected root cause alarm isRootCause=true")
	}

	symptomCount, _ := rootResult["symptomCount"].(float64)
	if symptomCount < 1 {
		t.Fatalf("Expected root cause symptomCount >= 1, got=%v", symptomCount)
	}

	// Cleanup
	delQ := mocks.L8QueryText(fmt.Sprintf("select * from Alarm where AlarmId=%s", symptomId))
	client.Delete("/alm/10/Alarm", delQ)
	delQ = mocks.L8QueryText(fmt.Sprintf("select * from Alarm where AlarmId=%s", rootId))
	client.Delete("/alm/10/Alarm", delQ)
}

// testMaintenanceWindowSuppression verifies that alarms on nodes within
// an active maintenance window get suppressed automatically.
// Mock data creates an ACTIVE window (case 2) with Locations: ["DC-East"]
// and SuppressAlarms: true.
func testMaintenanceWindowSuppression(t *testing.T, client *mocks.Client) {
	alarmId := ifs.NewUuid()
	alarm := map[string]interface{}{
		"alarm_id":      alarmId,
		"definition_id": testStore.DefinitionIDs[0],
		"node_id":       "node-maint-test-01",
		"name":          "testMaintenanceAlarm",
		"location":      "DC-East", // Matches the active maintenance window scope
		"state":         1,         // ACTIVE
		"severity":      2,         // WARNING
	}
	_, err := client.Post("/alm/10/Alarm", alarm)
	if err != nil {
		t.Fatalf("POST alarm in maintenance window failed: %v", err)
	}

	time.Sleep(1 * time.Second)

	// GET the alarm and verify it was suppressed by the maintenance window
	q := mocks.L8QueryText(fmt.Sprintf("select * from Alarm where AlarmId=%s", alarmId))
	getResp, err := client.Get("/alm/10/Alarm", q)
	if err != nil {
		t.Fatalf("GET maintenance alarm failed: %v", err)
	}

	result, err := extractFirstFromList(getResp)
	if err != nil {
		t.Fatalf("Failed to parse maintenance alarm response: %v", err)
	}

	// State should be SUPPRESSED (value 4)
	state, _ := result["state"].(float64)
	if int(state) != 4 {
		t.Fatalf("Expected alarm state=4 (SUPPRESSED), got=%v", state)
	}

	isSuppressed, _ := result["isSuppressed"].(bool)
	if !isSuppressed {
		t.Fatal("Expected alarm isSuppressed=true")
	}

	suppressedBy, _ := result["suppressedBy"].(string)
	if suppressedBy == "" {
		t.Fatal("Expected alarm suppressedBy to be set (maintenance:windowId)")
	}

	// Cleanup
	delQ := mocks.L8QueryText(fmt.Sprintf("select * from Alarm where AlarmId=%s", alarmId))
	client.Delete("/alm/10/Alarm", delQ)
}

// testNoCorrelationWhenAlreadyCleared verifies that cleared alarms
// are skipped by the correlation engine.
func testNoCorrelationWhenAlreadyCleared(t *testing.T, client *mocks.Client) {
	alarmId := ifs.NewUuid()
	alarm := map[string]interface{}{
		"alarm_id":           alarmId,
		"definition_id":      testStore.DefinitionIDs[0],
		"node_id":            "node-cleared-test",
		"name":               "tempAboveThreshold",
		"state":              3, // CLEARED
		"severity":           3,
		"root_cause_alarm_id": "",
	}
	_, err := client.Post("/alm/10/Alarm", alarm)
	if err != nil {
		t.Fatalf("POST cleared alarm failed: %v", err)
	}

	time.Sleep(1 * time.Second)

	// GET the alarm — correlation should NOT have run
	q := mocks.L8QueryText(fmt.Sprintf("select * from Alarm where AlarmId=%s", alarmId))
	getResp, err := client.Get("/alm/10/Alarm", q)
	if err != nil {
		t.Fatalf("GET cleared alarm failed: %v", err)
	}

	result, err := extractFirstFromList(getResp)
	if err != nil {
		t.Fatalf("Failed to parse cleared alarm response: %v", err)
	}

	rcaId, _ := result["rootCauseAlarmId"].(string)
	if rcaId != "" {
		t.Fatalf("Cleared alarm should not be correlated, but got rootCauseAlarmId=%s", rcaId)
	}

	// Cleanup
	delQ := mocks.L8QueryText(fmt.Sprintf("select * from Alarm where AlarmId=%s", alarmId))
	client.Delete("/alm/10/Alarm", delQ)
}
