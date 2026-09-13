package tests

import (
	"fmt"
	"github.com/saichler/l8alarms/go/tests/mocks"
	almtypes "github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
	l8events "github.com/saichler/l8types/go/types/l8events"
	"testing"
	"time"
)

// alarmDefFixture describes a bespoke AlarmDefinition to create as a Phase 5
// test fixture. Zero-value fields mean "unspecified" (matches everything /
// disabled), matching AlarmDefinition's own proto semantics.
type alarmDefFixture struct {
	Name                     string
	EventPattern             string
	ClearEventPattern        string
	ThresholdCount           int
	ThresholdWindowSeconds   int
	CorrelationWindowSeconds int
	DedupEnabled             bool
}

// waitForVisible polls serviceName/serviceArea until query returns at least
// one row, or 5s elapse. The test topology's vnic mesh applies writes
// asynchronously — the vnic that accepted an HTTP POST may be different
// from the one hosting the service handler, so a just-created fixture isn't
// guaranteed to be visible to a query the instant the POST call returns.
// The mock-seeding phases never hit this because several sequential HTTP
// calls happen to provide enough natural spacing; back-to-back
// fixture-then-event calls in these tests do not.
func waitForVisible(t *testing.T, vnic ifs.IVNic, serviceName string, serviceArea byte, query string) {
	deadline := time.Now().Add(5 * time.Second)
	for {
		raw, err := common.GetEntitiesByQuery(serviceName, serviceArea, query, vnic)
		if err == nil && len(raw) > 0 {
			return
		}
		if time.Now().After(deadline) {
			t.Fatalf("fixture never became visible: %s / %s", serviceName, query)
		}
		time.Sleep(100 * time.Millisecond)
	}
}

// createAlarmDefFixture POSTs a bespoke, ACTIVE AlarmDefinition via HTTP —
// AlarmDefinition's own CRUD is untouched by Phase 3, only Alarm's POST
// changed — for use as a Phase 5 test fixture, and waits for it to become
// visible (see waitForVisible) before returning. Returns the DefinitionId.
func createAlarmDefFixture(t *testing.T, client *mocks.Client, vnic ifs.IVNic, f alarmDefFixture) string {
	defId := ifs.NewUuid()
	threshold := f.ThresholdCount
	if threshold == 0 {
		threshold = 1
	}
	def := map[string]interface{}{
		"definition_id":              defId,
		"name":                       f.Name,
		"description":                "Phase 5 test fixture",
		"status":                     2, // ALARM_DEFINITION_STATUS_ACTIVE
		"default_severity":           5, // SEVERITY_CRITICAL
		"event_pattern":              f.EventPattern,
		"clear_event_pattern":        f.ClearEventPattern,
		"threshold_count":            threshold,
		"threshold_window_seconds":   f.ThresholdWindowSeconds,
		"correlation_window_seconds": f.CorrelationWindowSeconds,
		"dedup_enabled":              f.DedupEnabled,
		"auto_clear_enabled":         false,
	}
	if _, err := client.Post("/alm/10/AlmDef", def); err != nil {
		t.Fatalf("POST AlarmDefinition fixture %q failed: %v", f.Name, err)
	}
	waitForVisible(t, vnic, "AlmDef", 10, fmt.Sprintf("select * from AlarmDefinition where DefinitionId=%s", defId))
	return defId
}

func deleteAlarmDefFixture(client *mocks.Client, defId string) {
	q := mocks.L8QueryText(fmt.Sprintf("select * from AlarmDefinition where DefinitionId=%s", defId))
	_, _ = client.Delete("/alm/10/AlmDef", q)
}

// postAlarmEvent POSTs an l8events.EventRecord straight through the vnic —
// the only way to reach Alarm's POST (AlarmService.go gives it no HTTP
// route). eventType drives event_pattern/clear_event_pattern matching.
func postAlarmEvent(vnic ifs.IVNic, eventType, sourceId, sourceName string) error {
	event := &l8events.EventRecord{
		EventType:  eventType,
		Message:    eventType,
		SourceId:   sourceId,
		SourceName: sourceName,
		SourceType: "TEST_NODE",
		OccurredAt: time.Now().Unix(),
	}
	_, err := common.PostEntity("Alarm", 10, event, vnic)
	return err
}

// findAlarmsByDedupKey mirrors alm/alarms/matcher.go's computeDedupKey
// ("definitionId:sourceId") and returns every Alarm row matching it (there
// can be more than one when dedup_enabled=false).
func findAlarmsByDedupKey(t *testing.T, vnic ifs.IVNic, defId, sourceId string) []*almtypes.Alarm {
	dedupKey := fmt.Sprintf("%s:%s", defId, sourceId)
	raw, err := common.GetEntitiesByQuery("Alarm", 10,
		fmt.Sprintf("select * from Alarm where DedupKey=%s", dedupKey), vnic)
	if err != nil {
		t.Fatalf("query Alarm by dedup key %q failed: %v", dedupKey, err)
	}
	var out []*almtypes.Alarm
	for _, r := range raw {
		if a, ok := r.(*almtypes.Alarm); ok {
			out = append(out, a)
		}
	}
	return out
}

// mustFindOneAlarm is findAlarmsByDedupKey plus a t.Fatalf if the count
// isn't exactly one — the common case for CREATE/MERGE scenarios.
func mustFindOneAlarm(t *testing.T, vnic ifs.IVNic, defId, sourceId string) *almtypes.Alarm {
	alarms := findAlarmsByDedupKey(t, vnic, defId, sourceId)
	if len(alarms) != 1 {
		t.Fatalf("expected exactly 1 alarm for definition %s / source %s, got %d", defId, sourceId, len(alarms))
	}
	return alarms[0]
}
