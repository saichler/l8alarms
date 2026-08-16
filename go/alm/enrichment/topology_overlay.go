package enrichment

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8topology/go/types/l8topo"
)

// EnrichTopology populates alarm_count and highest_alarm_severity
// on each node and link in the given topology based on active alarms.
func EnrichTopology(topo *l8topo.L8Topology, activeAlarms []*alm.Alarm) {
	if topo == nil {
		return
	}

	// Build maps of nodeId/linkId -> alarm aggregates
	nodeAlarms := make(map[string]*alarmAgg)
	linkAlarms := make(map[string]*alarmAgg)

	for _, a := range activeAlarms {
		if a.State == alm.AlarmState_ALARM_STATE_CLEARED || a.State == alm.AlarmState_ALARM_STATE_SUPPRESSED {
			continue
		}
		if a.NodeId != "" {
			agg := getOrCreate(nodeAlarms, a.NodeId)
			agg.count++
			if int32(a.Severity) > agg.maxSeverity {
				agg.maxSeverity = int32(a.Severity)
			}
		}
		if a.LinkId != "" {
			agg := getOrCreate(linkAlarms, a.LinkId)
			agg.count++
			if int32(a.Severity) > agg.maxSeverity {
				agg.maxSeverity = int32(a.Severity)
			}
		}
	}

	// Apply to topology nodes
	for nodeId, node := range topo.Nodes {
		if agg, ok := nodeAlarms[nodeId]; ok {
			node.AlarmCount = agg.count
			node.HighestAlarmSeverity = agg.maxSeverity
		} else {
			node.AlarmCount = 0
			node.HighestAlarmSeverity = 0
		}
	}

	// Apply to topology links
	for linkId, link := range topo.Links {
		if agg, ok := linkAlarms[linkId]; ok {
			link.AlarmCount = agg.count
			link.HighestAlarmSeverity = agg.maxSeverity
		} else {
			link.AlarmCount = 0
			link.HighestAlarmSeverity = 0
		}
	}
}

type alarmAgg struct {
	count       int32
	maxSeverity int32
}

func getOrCreate(m map[string]*alarmAgg, key string) *alarmAgg {
	agg, ok := m[key]
	if !ok {
		agg = &alarmAgg{}
		m[key] = agg
	}
	return agg
}
