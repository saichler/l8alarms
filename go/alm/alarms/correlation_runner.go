package alarms

import (
	"fmt"
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/alm/correlation"
	"github.com/saichler/l8alarms/go/alm/correlationrules"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8srlz/go/serialize/object"
	"github.com/saichler/l8topology/go/types/l8topo"
	"github.com/saichler/l8types/go/ifs"
)

var engine = correlation.NewEngine()

// runCorrelation is called after an alarm is persisted (POST).
// It queries active correlation rules and alarms, then runs the engine.
func runCorrelation(alarm *alm.Alarm, action ifs.Action, vnic ifs.IVNic) error {
	if action != ifs.POST {
		return nil
	}

	// Skip if alarm is already correlated or cleared
	if alarm.RootCauseAlarmId != "" || alarm.State == alm.AlarmState_ALARM_STATE_CLEARED {
		return nil
	}

	// Fetch active correlation rules
	rules, err := common.GetEntities[alm.CorrelationRule](
		correlationrules.ServiceName, correlationrules.ServiceArea,
		fmt.Sprintf("select * from CorrelationRule where Status=%d",
			alm.CorrelationRuleStatus_CORRELATION_RULE_STATUS_ACTIVE),
		vnic,
	)
	if err != nil {
		return fmt.Errorf("failed to query correlation rules: %w", err)
	}
	if len(rules) == 0 {
		return nil
	}

	// Fetch active alarms
	activeAlarms, err := common.GetEntities[alm.Alarm](
		ServiceName, ServiceArea,
		fmt.Sprintf("select * from Alarm where State=%d",
			alm.AlarmState_ALARM_STATE_ACTIVE),
		vnic,
	)
	if err != nil {
		return fmt.Errorf("failed to query active alarms: %w", err)
	}

	// Build adjacency from topology if any rule needs it
	adjacency := make(map[string][]string)
	if needsTopology(rules) {
		adjacency = fetchAdjacency(vnic)
	}

	// Build context
	ctx := &correlation.CorrelationContext{
		Vnic:         vnic,
		ActiveAlarms: activeAlarms,
		Adjacency:    adjacency,
	}

	// Run correlation
	rootCause := engine.Correlate(alarm, rules, ctx)
	if rootCause == nil {
		return nil
	}

	// Persist the updated symptom alarm (this alarm)
	if err := common.PutEntity(ServiceName, ServiceArea, alarm, vnic); err != nil {
		return fmt.Errorf("failed to update symptom alarm: %w", err)
	}

	// Persist the updated root cause alarm
	if err := common.PutEntity(ServiceName, ServiceArea, rootCause, vnic); err != nil {
		return fmt.Errorf("failed to update root cause alarm: %w", err)
	}

	return nil
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
