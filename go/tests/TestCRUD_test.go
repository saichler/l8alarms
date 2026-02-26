package tests

import (
	"fmt"
	"github.com/saichler/l8alarms/go/tests/mocks"
	"github.com/saichler/l8types/go/ifs"
	"strings"
	"testing"
	"time"
)

func testCRUD(t *testing.T, client *mocks.Client) {
	testCRUDAlarmDefinition(t, client)
	testCRUDAlarm(t, client)
	testCRUDEvent(t, client)
	testCRUDCorrelationRule(t, client)
	testCRUDNotificationPolicy(t, client)
	testCRUDEscalationPolicy(t, client)
	testCRUDMaintenanceWindow(t, client)
	testCRUDAlarmFilter(t, client)
}

func testCRUDAlarmDefinition(t *testing.T, client *mocks.Client) {
	defId := ifs.NewUuid()
	def := map[string]interface{}{
		"definition_id":    defId,
		"name":             "CRUD Test Definition",
		"description":      "Created by CRUD test",
		"status":           1,
		"default_severity": 1,
	}
	_, err := client.Post("/alm/10/AlmDef", def)
	if err != nil {
		t.Fatalf("POST AlarmDefinition failed: %v", err)
	}

	q := mocks.L8QueryText(fmt.Sprintf("select * from AlarmDefinition where DefinitionId=%s", defId))
	getResp, err := client.Get("/alm/10/AlmDef", q)
	if err != nil {
		t.Fatalf("GET AlarmDefinition failed: %v", err)
	}
	if !strings.Contains(getResp, "CRUD Test Definition") {
		t.Fatalf("GET AlarmDefinition did not return expected name, got: %s", getResp)
	}

	def["description"] = "Updated by CRUD test"
	_, err = client.Put("/alm/10/AlmDef", def)
	if err != nil {
		t.Fatalf("PUT AlarmDefinition failed: %v", err)
	}

	delQ := mocks.L8QueryText(fmt.Sprintf("select * from AlarmDefinition where DefinitionId=%s", defId))
	_, err = client.Delete("/alm/10/AlmDef", delQ)
	if err != nil {
		t.Fatalf("DELETE AlarmDefinition failed: %v", err)
	}
}

func testCRUDAlarm(t *testing.T, client *mocks.Client) {
	alarmId := ifs.NewUuid()
	alarm := map[string]interface{}{
		"alarm_id":      alarmId,
		"definition_id": testStore.DefinitionIDs[0],
		"node_id":       "test-node-001",
		"state":         1,
		"severity":      1,
		"name":          "CRUD Test Alarm",
	}
	_, err := client.Post("/alm/10/Alarm", alarm)
	if err != nil {
		t.Fatalf("POST Alarm failed: %v", err)
	}

	q := mocks.L8QueryText(fmt.Sprintf("select * from Alarm where AlarmId=%s", alarmId))
	getResp, err := client.Get("/alm/10/Alarm", q)
	if err != nil {
		t.Fatalf("GET Alarm failed: %v", err)
	}
	if !strings.Contains(getResp, "CRUD Test Alarm") {
		t.Fatalf("GET Alarm did not return expected name, got: %s", getResp)
	}

	alarm["description"] = "Updated by CRUD test"
	_, err = client.Put("/alm/10/Alarm", alarm)
	if err != nil {
		t.Fatalf("PUT Alarm failed: %v", err)
	}

	delQ := mocks.L8QueryText(fmt.Sprintf("select * from Alarm where AlarmId=%s", alarmId))
	_, err = client.Delete("/alm/10/Alarm", delQ)
	if err != nil {
		t.Fatalf("DELETE Alarm failed: %v", err)
	}
}

func testCRUDEvent(t *testing.T, client *mocks.Client) {
	eventId := ifs.NewUuid()
	event := map[string]interface{}{
		"event_id":   eventId,
		"event_type": 1,
		"node_id":    "test-node-001",
		"message":    "CRUD Test Event",
	}
	_, err := client.Post("/alm/10/Event", event)
	if err != nil {
		t.Fatalf("POST Event failed: %v", err)
	}

	q := mocks.L8QueryText(fmt.Sprintf("select * from Event where EventId=%s", eventId))
	getResp, err := client.Get("/alm/10/Event", q)
	if err != nil {
		t.Fatalf("GET Event failed: %v", err)
	}
	if !strings.Contains(getResp, "CRUD Test Event") {
		t.Fatalf("GET Event did not return expected message, got: %s", getResp)
	}

	event["message"] = "Updated by CRUD test"
	_, err = client.Put("/alm/10/Event", event)
	if err != nil {
		t.Fatalf("PUT Event failed: %v", err)
	}

	delQ := mocks.L8QueryText(fmt.Sprintf("select * from Event where EventId=%s", eventId))
	_, err = client.Delete("/alm/10/Event", delQ)
	if err != nil {
		t.Fatalf("DELETE Event failed: %v", err)
	}
}

func testCRUDCorrelationRule(t *testing.T, client *mocks.Client) {
	ruleId := ifs.NewUuid()
	rule := map[string]interface{}{
		"rule_id":   ruleId,
		"name":      "CRUD Test Rule",
		"rule_type": 1,
		"status":    2,
	}
	_, err := client.Post("/alm/10/CorrRule", rule)
	if err != nil {
		t.Fatalf("POST CorrelationRule failed: %v", err)
	}

	q := mocks.L8QueryText(fmt.Sprintf("select * from CorrelationRule where RuleId=%s", ruleId))
	getResp, err := client.Get("/alm/10/CorrRule", q)
	if err != nil {
		t.Fatalf("GET CorrelationRule failed: %v", err)
	}
	if !strings.Contains(getResp, "CRUD Test Rule") {
		t.Fatalf("GET CorrelationRule did not return expected name, got: %s", getResp)
	}

	rule["name"] = "Updated CRUD Test Rule"
	_, err = client.Put("/alm/10/CorrRule", rule)
	if err != nil {
		t.Fatalf("PUT CorrelationRule failed: %v", err)
	}

	delQ := mocks.L8QueryText(fmt.Sprintf("select * from CorrelationRule where RuleId=%s", ruleId))
	_, err = client.Delete("/alm/10/CorrRule", delQ)
	if err != nil {
		t.Fatalf("DELETE CorrelationRule failed: %v", err)
	}
}

func testCRUDNotificationPolicy(t *testing.T, client *mocks.Client) {
	policyId := ifs.NewUuid()
	policy := map[string]interface{}{
		"policy_id": policyId,
		"name":      "CRUD Test Notification Policy",
		"status":    1,
	}
	_, err := client.Post("/alm/10/NotifPol", policy)
	if err != nil {
		t.Fatalf("POST NotificationPolicy failed: %v", err)
	}

	q := mocks.L8QueryText(fmt.Sprintf("select * from NotificationPolicy where PolicyId=%s", policyId))
	getResp, err := client.Get("/alm/10/NotifPol", q)
	if err != nil {
		t.Fatalf("GET NotificationPolicy failed: %v", err)
	}
	if !strings.Contains(getResp, "CRUD Test Notification Policy") {
		t.Fatalf("GET NotificationPolicy did not return expected name, got: %s", getResp)
	}

	policy["name"] = "Updated CRUD Test Notification Policy"
	_, err = client.Put("/alm/10/NotifPol", policy)
	if err != nil {
		t.Fatalf("PUT NotificationPolicy failed: %v", err)
	}

	delQ := mocks.L8QueryText(fmt.Sprintf("select * from NotificationPolicy where PolicyId=%s", policyId))
	_, err = client.Delete("/alm/10/NotifPol", delQ)
	if err != nil {
		t.Fatalf("DELETE NotificationPolicy failed: %v", err)
	}
}

func testCRUDEscalationPolicy(t *testing.T, client *mocks.Client) {
	policyId := ifs.NewUuid()
	policy := map[string]interface{}{
		"policy_id": policyId,
		"name":      "CRUD Test Escalation Policy",
		"status":    1,
	}
	_, err := client.Post("/alm/10/EscPolicy", policy)
	if err != nil {
		t.Fatalf("POST EscalationPolicy failed: %v", err)
	}

	q := mocks.L8QueryText(fmt.Sprintf("select * from EscalationPolicy where PolicyId=%s", policyId))
	getResp, err := client.Get("/alm/10/EscPolicy", q)
	if err != nil {
		t.Fatalf("GET EscalationPolicy failed: %v", err)
	}
	if !strings.Contains(getResp, "CRUD Test Escalation Policy") {
		t.Fatalf("GET EscalationPolicy did not return expected name, got: %s", getResp)
	}

	policy["name"] = "Updated CRUD Test Escalation Policy"
	_, err = client.Put("/alm/10/EscPolicy", policy)
	if err != nil {
		t.Fatalf("PUT EscalationPolicy failed: %v", err)
	}

	delQ := mocks.L8QueryText(fmt.Sprintf("select * from EscalationPolicy where PolicyId=%s", policyId))
	_, err = client.Delete("/alm/10/EscPolicy", delQ)
	if err != nil {
		t.Fatalf("DELETE EscalationPolicy failed: %v", err)
	}
}

func testCRUDMaintenanceWindow(t *testing.T, client *mocks.Client) {
	windowId := ifs.NewUuid()
	now := time.Now().Unix()
	window := map[string]interface{}{
		"window_id":  windowId,
		"name":       "CRUD Test Maintenance Window",
		"status":     2,
		"start_time": now,
		"end_time":   now + 3600,
	}
	_, err := client.Post("/alm/10/MaintWin", window)
	if err != nil {
		t.Fatalf("POST MaintenanceWindow failed: %v", err)
	}

	q := mocks.L8QueryText(fmt.Sprintf("select * from MaintenanceWindow where WindowId=%s", windowId))
	getResp, err := client.Get("/alm/10/MaintWin", q)
	if err != nil {
		t.Fatalf("GET MaintenanceWindow failed: %v", err)
	}
	if !strings.Contains(getResp, "CRUD Test Maintenance Window") {
		t.Fatalf("GET MaintenanceWindow did not return expected name, got: %s", getResp)
	}

	window["name"] = "Updated CRUD Test Maintenance Window"
	_, err = client.Put("/alm/10/MaintWin", window)
	if err != nil {
		t.Fatalf("PUT MaintenanceWindow failed: %v", err)
	}

	delQ := mocks.L8QueryText(fmt.Sprintf("select * from MaintenanceWindow where WindowId=%s", windowId))
	_, err = client.Delete("/alm/10/MaintWin", delQ)
	if err != nil {
		t.Fatalf("DELETE MaintenanceWindow failed: %v", err)
	}
}

func testCRUDAlarmFilter(t *testing.T, client *mocks.Client) {
	filterId := ifs.NewUuid()
	filter := map[string]interface{}{
		"filter_id": filterId,
		"name":      "CRUD Test Filter",
		"owner":     "test-user",
	}
	_, err := client.Post("/alm/10/AlmFilter", filter)
	if err != nil {
		t.Fatalf("POST AlarmFilter failed: %v", err)
	}

	q := mocks.L8QueryText(fmt.Sprintf("select * from AlarmFilter where FilterId=%s", filterId))
	getResp, err := client.Get("/alm/10/AlmFilter", q)
	if err != nil {
		t.Fatalf("GET AlarmFilter failed: %v", err)
	}
	if !strings.Contains(getResp, "CRUD Test Filter") {
		t.Fatalf("GET AlarmFilter did not return expected name, got: %s", getResp)
	}

	filter["name"] = "Updated CRUD Test Filter"
	_, err = client.Put("/alm/10/AlmFilter", filter)
	if err != nil {
		t.Fatalf("PUT AlarmFilter failed: %v", err)
	}

	delQ := mocks.L8QueryText(fmt.Sprintf("select * from AlarmFilter where FilterId=%s", filterId))
	_, err = client.Delete("/alm/10/AlmFilter", delQ)
	if err != nil {
		t.Fatalf("DELETE AlarmFilter failed: %v", err)
	}
}
