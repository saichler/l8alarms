package alarms

import (
	"fmt"
	"github.com/saichler/l8alarms/go/alm/correlation"
	"github.com/saichler/l8alarms/go/alm/correlationrules"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8srlz/go/serialize/object"
	"github.com/saichler/l8topology/go/types/l8topo"
	"github.com/saichler/l8types/go/ifs"
)

var engine = correlation.NewEngine()

// runCorrelation is called after an alarm is persisted (POST or PUT — PUT
// because the MERGE branch in lifecycle.go calls common.PutEntity, which
// goes through the same Before/After pipeline as any other caller).
//
// Two directional passes, per the plan's "Correlation & Threshold State"
// section, resolved against Phase 5's concrete test scenarios (the
// section's own summary prose was ambiguous about which alarm ends up root
// vs. symptom in each pass; the test descriptions are unambiguous and were
// used as the authoritative source):
//
//  1. Does this alarm become a SYMPTOM of an existing OPEN_FOR_CORRELATION
//     alarm? Root-cause candidates are sourced from the correlation-eligible
//     cache only (OPEN_FOR_CORRELATION — only those alarms can still
//     "consume more events/alarms to be correlated to it").
//  2. Does this alarm become the ROOT CAUSE for some other existing alarm
//     (OPEN_FOR_CORRELATION or STABLE — STABLE alarms can still become a
//     symptom of a later alarm, just can't gain symptoms on their own)? This
//     pass queries Alarm directly, not the cache, since the cache excludes
//     STABLE by design.
//
// PENDING_THRESHOLD alarms are excluded from both directions — matches the
// pre-existing skip-if-cleared behavior this function already had.
func runCorrelation(alarm *alm.Alarm, action ifs.Action, vnic ifs.IVNic) error {
	if action != ifs.POST && action != ifs.PUT {
		return nil
	}

	if alarm.State == alm.AlarmState_ALARM_STATE_CLEARED {
		return nil
	}
	if alarm.CorrelationThresholdState == alm.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_PENDING_THRESHOLD {
		return nil
	}

	rules, err := fetchActiveCorrelationRules(vnic)
	if err != nil {
		return fmt.Errorf("failed to query correlation rules: %w", err)
	}
	if len(rules) == 0 {
		return nil
	}

	adjacency := make(map[string][]string)
	if needsTopology(rules) {
		adjacency = fetchAdjacency(vnic)
	}

	if alarm.RootCauseAlarmId == "" {
		if err := correlateAsSymptom(alarm, rules, adjacency, vnic); err != nil {
			return err
		}
	}
	if err := correlateAsRootCause(alarm, rules, adjacency, vnic); err != nil {
		return err
	}
	return nil
}

// correlateAsSymptom: pass 1 — does alarm gain a root cause from the
// correlation-eligible (OPEN_FOR_CORRELATION) cache?
func correlateAsSymptom(alarm *alm.Alarm, rules []*alm.CorrelationRule, adjacency map[string][]string, vnic ifs.IVNic) error {
	candidates := correlationEligibleSnapshot()
	if len(candidates) == 0 {
		return nil
	}
	ctx := &correlation.CorrelationContext{Vnic: vnic, ActiveAlarms: candidates, Adjacency: adjacency}

	rootCause := engine.Correlate(alarm, rules, ctx)
	if rootCause == nil {
		return nil
	}
	if err := common.PutEntity(ServiceName, ServiceArea, alarm, vnic); err != nil {
		return fmt.Errorf("failed to update symptom alarm: %w", err)
	}
	if err := common.PutEntity(ServiceName, ServiceArea, rootCause, vnic); err != nil {
		return fmt.Errorf("failed to update root cause alarm: %w", err)
	}
	return nil
}

// correlateAsRootCause: pass 2 — does alarm turn out to be the root cause
// for some other existing OPEN_FOR_CORRELATION/STABLE alarm that doesn't yet
// have one? Queried directly (not the cache), since STABLE alarms are
// deliberately excluded from the cache but remain eligible here.
func correlateAsRootCause(alarm *alm.Alarm, rules []*alm.CorrelationRule, adjacency map[string][]string, vnic ifs.IVNic) error {
	query := fmt.Sprintf(
		"select * from Alarm where AlarmId!=%s and RootCauseAlarmId='' and (CorrelationThresholdState=%d or CorrelationThresholdState=%d)",
		alarm.AlarmId,
		alm.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_OPEN_FOR_CORRELATION,
		alm.AlmCorrelationThresholdState_ALM_CORRELATION_THRESHOLD_STATE_STABLE,
	)
	raw, err := common.GetEntitiesByQuery(ServiceName, ServiceArea, query, vnic)
	if err != nil {
		return fmt.Errorf("failed to query root-cause candidates: %w", err)
	}

	ctx := &correlation.CorrelationContext{Vnic: vnic, ActiveAlarms: []*alm.Alarm{alarm}, Adjacency: adjacency}
	for _, r := range raw {
		candidate, ok := r.(*alm.Alarm)
		if !ok {
			continue
		}
		if candidate.State == alm.AlarmState_ALARM_STATE_CLEARED {
			continue
		}
		rootCause := engine.Correlate(candidate, rules, ctx)
		if rootCause == nil {
			continue
		}
		if err := common.PutEntity(ServiceName, ServiceArea, candidate, vnic); err != nil {
			return fmt.Errorf("failed to update symptom alarm %s: %w", candidate.AlarmId, err)
		}
		if err := common.PutEntity(ServiceName, ServiceArea, rootCause, vnic); err != nil {
			return fmt.Errorf("failed to update root cause alarm: %w", err)
		}
	}
	return nil
}

// fetchActiveCorrelationRules loads all active CorrelationRule records.
func fetchActiveCorrelationRules(vnic ifs.IVNic) ([]*alm.CorrelationRule, error) {
	rulesRaw, err := common.GetEntitiesByQuery(
		correlationrules.ServiceName, correlationrules.ServiceArea,
		fmt.Sprintf("select * from CorrelationRule where Status=%d",
			alm.CorrelationRuleStatus_CORRELATION_RULE_STATUS_ACTIVE),
		vnic,
	)
	if err != nil {
		return nil, err
	}
	rules := make([]*alm.CorrelationRule, 0, len(rulesRaw))
	for _, r := range rulesRaw {
		if rule, ok := r.(*alm.CorrelationRule); ok {
			rules = append(rules, rule)
		}
	}
	return rules, nil
}

// needsTopology returns true if any rule uses topological or composite correlation.
func needsTopology(rules []*alm.CorrelationRule) bool {
	for _, r := range rules {
		if r.RuleType == alm.CorrelationRuleType_CORRELATION_RULE_TYPE_TOPOLOGICAL ||
			r.RuleType == alm.CorrelationRuleType_CORRELATION_RULE_TYPE_COMPOSITE {
			return true
		}
	}
	return false
}

// fetchAdjacency queries available topologies and builds a combined adjacency map.
func fetchAdjacency(vnic ifs.IVNic) map[string][]string {
	// Query topology list to discover available topologies
	topoListHandler, ok := vnic.Resources().Services().ServiceHandler("TopoList", 0)
	if !ok {
		// Topology service not available — return empty adjacency
		return make(map[string][]string)
	}

	resp := topoListHandler.Get(nil, vnic)
	if resp == nil || resp.Error() != nil {
		return make(map[string][]string)
	}

	// Collect all topology metadata
	var metaList []*l8topo.L8TopologyMetadata
	for _, elem := range resp.Elements() {
		if md, ok := elem.(*l8topo.L8TopologyMetadata); ok {
			metaList = append(metaList, md)
		}
	}

	// Fetch each topology and merge adjacency maps
	combined := make(map[string][]string)
	for _, md := range metaList {
		topo := fetchTopology(md.ServiceName, byte(md.ServiceArea), vnic)
		if topo == nil {
			continue
		}
		adj := correlation.BuildAdjacency(topo)
		for k, v := range adj {
			combined[k] = append(combined[k], v...)
		}
	}

	return combined
}

// fetchTopology retrieves a single L8Topology from a topology service.
func fetchTopology(serviceName string, serviceArea byte, vnic ifs.IVNic) *l8topo.L8Topology {
	handler, ok := vnic.Resources().Services().ServiceHandler(serviceName, serviceArea)
	if !ok {
		return nil
	}

	query := &l8topo.L8TopologyQuery{}
	resp := handler.Get(object.New(nil, query), vnic)
	if resp == nil || resp.Error() != nil {
		return nil
	}
	if resp.Element() != nil {
		if topo, ok := resp.Element().(*l8topo.L8Topology); ok {
			return topo
		}
	}
	return nil
}
