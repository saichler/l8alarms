package correlation

import (
	"github.com/saichler/l8alarms/go/types/alm"
)

// TopologicalStrategy correlates alarms based on topology adjacency.
// It uses BFS traversal from the alarming node to find a root cause
// on a connected, higher-priority node.
type TopologicalStrategy struct{}

func (s *TopologicalStrategy) Name() string { return "topological" }

func (s *TopologicalStrategy) Correlate(alarm *alm.Alarm, rule *alm.CorrelationRule, ctx *CorrelationContext) (*alm.Alarm, bool) {
	if len(ctx.Adjacency) == 0 {
		return nil, false
	}

	maxDepth := int(rule.TraversalDepth)
	if maxDepth <= 0 {
		maxDepth = 5 // default max hops
	}

	// BFS from the alarming node
	visited := map[string]bool{alarm.NodeId: true}
	queue := []bfsEntry{{nodeId: alarm.NodeId, depth: 0}}

	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]

		if current.depth >= maxDepth {
			continue
		}

		neighbors := ctx.Adjacency[current.nodeId]
		for _, neighborId := range neighbors {
			if visited[neighborId] {
				continue
			}
			visited[neighborId] = true

			// Check if any active alarm on this neighbor qualifies as root cause
			candidate := findAlarmOnNode(neighborId, ctx.ActiveAlarms)
			if candidate != nil && candidate.AlarmId != alarm.AlarmId {
				if isRootCandidate(candidate, alarm, rule) {
					return candidate, true
				}
			}

			queue = append(queue, bfsEntry{nodeId: neighborId, depth: current.depth + 1})
		}
	}

	return nil, false
}

type bfsEntry struct {
	nodeId string
	depth  int
}

// findAlarmOnNode returns the highest severity active alarm on a node.
func findAlarmOnNode(nodeId string, activeAlarms []*alm.Alarm) *alm.Alarm {
	var best *alm.Alarm
	for _, a := range activeAlarms {
		if a.NodeId != nodeId {
			continue
		}
		if a.State == alm.AlarmState_ALARM_STATE_CLEARED || a.State == alm.AlarmState_ALARM_STATE_SUPPRESSED {
			continue
		}
		if best == nil || a.Severity > best.Severity {
			best = a
		}
	}
	return best
}

// isRootCandidate checks if candidate can be root cause for symptom per rule filters.
func isRootCandidate(candidate, symptom *alm.Alarm, rule *alm.CorrelationRule) bool {
	// Root cause must have equal or higher severity
	if candidate.Severity < symptom.Severity {
		return false
	}

	// Check node type filters if configured
	if len(rule.RootNodeTypes) > 0 {
		if !stringInSlice(candidate.NodeName, rule.RootNodeTypes) {
			// Also check attributes for nodeType
			if nodeType, ok := candidate.Attributes["nodeType"]; ok {
				if !stringInSlice(nodeType, rule.RootNodeTypes) {
					return false
				}
			} else {
				return false
			}
		}
	}

	if len(rule.SymptomNodeTypes) > 0 {
		if !stringInSlice(symptom.NodeName, rule.SymptomNodeTypes) {
			if nodeType, ok := symptom.Attributes["nodeType"]; ok {
				if !stringInSlice(nodeType, rule.SymptomNodeTypes) {
					return false
				}
			} else {
				return false
			}
		}
	}

	return true
}

func stringInSlice(s string, list []string) bool {
	for _, v := range list {
		if v == s {
			return true
		}
	}
	return false
}
