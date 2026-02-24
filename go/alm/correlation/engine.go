package correlation

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
	"sort"
	"sync"
)

// Strategy defines the interface for correlation strategies.
type Strategy interface {
	// Name returns the strategy identifier.
	Name() string
	// Correlate attempts to find a root cause for the given alarm.
	// Returns the root cause alarm and true if correlation was found.
	Correlate(alarm *alm.Alarm, rule *alm.CorrelationRule, ctx *CorrelationContext) (*alm.Alarm, bool)
}

// CorrelationContext provides shared state for correlation strategies.
type CorrelationContext struct {
	Vnic         ifs.IVNic
	ActiveAlarms []*alm.Alarm
	Adjacency    map[string][]string // nodeId -> list of neighbor nodeIds
}

// Engine orchestrates the correlation of alarms using registered strategies.
type Engine struct {
	strategies map[alm.CorrelationRuleType]Strategy
	mtx        sync.RWMutex
}

// NewEngine creates a new correlation engine with all built-in strategies.
func NewEngine() *Engine {
	e := &Engine{
		strategies: make(map[alm.CorrelationRuleType]Strategy),
	}
	e.Register(alm.CorrelationRuleType_CORRELATION_RULE_TYPE_TOPOLOGICAL, &TopologicalStrategy{})
	e.Register(alm.CorrelationRuleType_CORRELATION_RULE_TYPE_TEMPORAL, &TemporalStrategy{})
	e.Register(alm.CorrelationRuleType_CORRELATION_RULE_TYPE_PATTERN, &PatternStrategy{})
	e.Register(alm.CorrelationRuleType_CORRELATION_RULE_TYPE_COMPOSITE, &CompositeStrategy{})
	return e
}

// Register adds a correlation strategy for a given rule type.
func (e *Engine) Register(ruleType alm.CorrelationRuleType, s Strategy) {
	e.mtx.Lock()
	defer e.mtx.Unlock()
	e.strategies[ruleType] = s
}

// Correlate runs correlation for a new alarm against all active rules.
// Returns the root cause alarm if found, and updates both alarms accordingly.
func (e *Engine) Correlate(alarm *alm.Alarm, rules []*alm.CorrelationRule, ctx *CorrelationContext) *alm.Alarm {
	// Sort rules by priority (lower = higher priority)
	sorted := make([]*alm.CorrelationRule, len(rules))
	copy(sorted, rules)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Priority < sorted[j].Priority
	})

	e.mtx.RLock()
	defer e.mtx.RUnlock()

	for _, rule := range sorted {
		if rule.Status != alm.CorrelationRuleStatus_CORRELATION_RULE_STATUS_ACTIVE {
			continue
		}
		if !matchesConditions(alarm, rule.Conditions) {
			continue
		}

		strategy, ok := e.strategies[rule.RuleType]
		if !ok {
			continue
		}

		rootCause, found := strategy.Correlate(alarm, rule, ctx)
		if !found || rootCause == nil {
			continue
		}

		// Verify minimum symptom count
		if rule.MinSymptomCount > 0 && rootCause.SymptomCount+1 < rule.MinSymptomCount {
			continue
		}

		// Link the alarm to its root cause
		alarm.RootCauseAlarmId = rootCause.AlarmId
		alarm.CorrelationRuleId = rule.RuleId
		rootCause.IsRootCause = true
		rootCause.SymptomCount++

		// Apply auto-suppression
		if rule.AutoSuppressSymptoms {
			alarm.State = alm.AlarmState_ALARM_STATE_SUPPRESSED
			alarm.IsSuppressed = true
			alarm.SuppressedBy = rootCause.AlarmId
		}

		// Apply auto-acknowledge if root is acknowledged
		if rule.AutoAcknowledgeSymptoms && rootCause.State == alm.AlarmState_ALARM_STATE_ACKNOWLEDGED {
			alarm.State = alm.AlarmState_ALARM_STATE_ACKNOWLEDGED
		}

		return rootCause
	}
	return nil
}

// matchesConditions checks if an alarm satisfies all conditions of a rule.
func matchesConditions(alarm *alm.Alarm, conditions []*alm.CorrelationCondition) bool {
	for _, cond := range conditions {
		if !evaluateCondition(alarm, cond) {
			return false
		}
	}
	return true
}

// evaluateCondition evaluates a single condition against an alarm.
func evaluateCondition(alarm *alm.Alarm, cond *alm.CorrelationCondition) bool {
	fieldVal := getAlarmField(alarm, cond.Field)

	switch cond.Operator {
	case alm.ConditionOperator_CONDITION_OPERATOR_EQUALS:
		return fieldVal == cond.Value
	case alm.ConditionOperator_CONDITION_OPERATOR_NOT_EQUALS:
		return fieldVal != cond.Value
	case alm.ConditionOperator_CONDITION_OPERATOR_CONTAINS:
		return containsStr(fieldVal, cond.Value)
	default:
		return true
	}
}

// getAlarmField returns the string value of a named alarm field.
func getAlarmField(alarm *alm.Alarm, field string) string {
	switch field {
	case "severity":
		return alarm.Severity.String()
	case "state":
		return alarm.State.String()
	case "name":
		return alarm.Name
	case "nodeId":
		return alarm.NodeId
	case "nodeName":
		return alarm.NodeName
	case "location":
		return alarm.Location
	case "definitionId":
		return alarm.DefinitionId
	case "category":
		if v, ok := alarm.Attributes["category"]; ok {
			return v
		}
	}
	return ""
}

func containsStr(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		findSubstring(s, substr))
}

func findSubstring(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
