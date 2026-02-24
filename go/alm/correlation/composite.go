package correlation

import (
	"github.com/saichler/l8alarms/go/types/alm"
)

// CompositeStrategy combines topological and temporal checks.
// Both must agree for correlation to activate.
type CompositeStrategy struct{}

func (s *CompositeStrategy) Name() string { return "composite" }

func (s *CompositeStrategy) Correlate(alarm *alm.Alarm, rule *alm.CorrelationRule, ctx *CorrelationContext) (*alm.Alarm, bool) {
	// Step 1: Run topological check
	topo := &TopologicalStrategy{}
	topoRoot, topoFound := topo.Correlate(alarm, rule, ctx)
	if !topoFound {
		return nil, false
	}

	// Step 2: Verify temporal proximity
	windowSec := int64(rule.TimeWindowSeconds)
	if windowSec <= 0 {
		// No time window constraint, topological match is sufficient
		return topoRoot, true
	}

	alarmTime := alarm.FirstOccurrence
	if alarmTime == 0 {
		alarmTime = alarm.LastOccurrence
	}

	candidateTime := topoRoot.FirstOccurrence
	if candidateTime == 0 {
		candidateTime = topoRoot.LastOccurrence
	}

	diff := alarmTime - candidateTime
	if diff < 0 {
		diff = -diff
	}

	if diff <= windowSec {
		return topoRoot, true
	}

	return nil, false
}
