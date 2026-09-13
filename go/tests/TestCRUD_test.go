package tests

import (
	"fmt"
	"github.com/saichler/l8alarms/go/tests/mocks"
	"github.com/saichler/l8types/go/ifs"
	"strings"
	"testing"
	"time"
)

func testCRUD(t *testing.T, client *mocks.Client, vnic ifs.IVNic) {
	testCRUDAlarmDefinition(t, client)
	testCRUDAlarm(t, client, vnic)
	testAlarmHasNoHttpCreateRoute(t, client)
	testCRUDCorrelationRule(t, client)
	testCRUDNotificationPolicy(t, client)
	testCRUDEscalationPolicy(t, client)
	testCRUDAlarmFilter(t, client)
	testCRUDArchivedAlarm(t, client)
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

// testCRUDAlarm exercises Alarm's actual lifecycle post-Phase-3: create via
// an EventRecord posted through the vnic (Alarm's POST has no HTTP route —
// see AlarmService.go), read via HTTP GET, transition via HTTP PATCH
// (Acknowledge — Alarm has no PUT endpoint at all), then HTTP DELETE.
func testCRUDAlarm(t *testing.T, client *mocks.Client, vnic ifs.IVNic) {
	defId := createAlarmDefFixture(t, client, vnic, alarmDefFixture{
		Name:           "flow5-crud",
		EventPattern:   "flow5CrudTrigger",
		ThresholdCount: 1,
		DedupEnabled:   true,
	})
	defer deleteAlarmDefFixture(client, defId)

	sourceId := "flow5-crud-node"
	if err := postAlarmEvent(vnic, "flow5CrudTrigger", sourceId, "CRUD Node"); err != nil {
		t.Fatalf("POST event (create alarm) failed: %v", err)
	}
	alarm := mustFindOneAlarm(t, vnic, defId, sourceId)

	q := mocks.L8QueryText(fmt.Sprintf("select * from Alarm where AlarmId=%s", alarm.AlarmId))
	getResp, err := client.Get("/alm/10/Alarm", q)
	if err != nil {
		t.Fatalf("GET Alarm failed: %v", err)
	}
	if !strings.Contains(getResp, "flow5-crud") {
		t.Fatalf("GET Alarm did not return expected name, got: %s", getResp)
	}

	patch := map[string]interface{}{
		"alarm_id":        alarm.AlarmId,
		"state":           2, // ACKNOWLEDGED
		"acknowledged_by": "crud-test",
	}
	if _, err := client.Patch("/alm/10/Alarm", patch); err != nil {
		t.Fatalf("PATCH Alarm (acknowledge) failed: %v", err)
	}

	delQ := mocks.L8QueryText(fmt.Sprintf("select * from Alarm where AlarmId=%s", alarm.AlarmId))
	if _, err := client.Delete("/alm/10/Alarm", delQ); err != nil {
		t.Fatalf("DELETE Alarm failed: %v", err)
	}
}

// testAlarmHasNoHttpCreateRoute covers Phase 5 bullet 14: Alarm's POST and
// PUT are reachable only via a direct vnic call (see AlarmService.go's
// hand-built WebService) — neither has an HTTP route.
func testAlarmHasNoHttpCreateRoute(t *testing.T, client *mocks.Client) {
	body := map[string]interface{}{"alarm_id": ifs.NewUuid(), "name": "should not route"}
	if _, err := client.Post("/alm/10/Alarm", body); err == nil {
		t.Fatal("expected POST /alm/10/Alarm to fail to route, but it succeeded")
	}
	if _, err := client.Put("/alm/10/Alarm", body); err == nil {
		t.Fatal("expected PUT /alm/10/Alarm to fail to route, but it succeeded")
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

func testCRUDArchivedAlarm(t *testing.T, client *mocks.Client) {
	alarmId := ifs.NewUuid()
	now := time.Now().Unix()
	arcAlarm := map[string]interface{}{
		"alarm_id":    alarmId,
		"name":        "CRUD Test Archived Alarm",
		"state":       4, // CLEARED
		"severity":    2,
		"node_id":     "test-node-001",
		"archived_at": now,
		"archived_by": "test-user",
	}
	_, err := client.Post("/alm/10/ArcAlarm", arcAlarm)
	if err != nil {
		t.Fatalf("POST ArchivedAlarm failed: %v", err)
	}

	q := mocks.L8QueryText(fmt.Sprintf("select * from ArchivedAlarm where AlarmId=%s", alarmId))
	getResp, err := client.Get("/alm/10/ArcAlarm", q)
	if err != nil {
		t.Fatalf("GET ArchivedAlarm failed: %v", err)
	}
	if !strings.Contains(getResp, "CRUD Test Archived Alarm") {
		t.Fatalf("GET ArchivedAlarm did not return expected name, got: %s", getResp)
	}

	// PUT should be rejected — archived alarms are immutable
	arcAlarm["name"] = "Should Not Update"
	_, err = client.Put("/alm/10/ArcAlarm", arcAlarm)
	if err == nil {
		t.Fatal("PUT ArchivedAlarm should have been rejected (immutable)")
	}
	if !strings.Contains(err.Error(), "immutable") {
		t.Fatalf("Expected immutability error, got: %v", err)
	}

	delQ := mocks.L8QueryText(fmt.Sprintf("select * from ArchivedAlarm where AlarmId=%s", alarmId))
	_, err = client.Delete("/alm/10/ArcAlarm", delQ)
	if err != nil {
		t.Fatalf("DELETE ArchivedAlarm failed: %v", err)
	}
}
