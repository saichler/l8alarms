package correlation

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"regexp"
)

// PatternStrategy correlates alarms by matching alarm name patterns
// regardless of topology relationships. It pairs alarms where one
// matches the root pattern and another matches the symptom pattern.
type PatternStrategy struct{}

func (s *PatternStrategy) Name() string { return "pattern" }

func (s *PatternStrategy) Correlate(alarm *alm.Alarm, rule *alm.CorrelationRule, ctx *CorrelationContext) (*alm.Alarm, bool) {
	if rule.RootAlarmPattern == "" || rule.SymptomAlarmPattern == "" {
		return nil, false
	}

	symptomPattern, err := regexp.Compile(rule.SymptomAlarmPattern)
	if err != nil {
		return nil, false
	}

	// This alarm must match the symptom pattern
	if !symptomPattern.MatchString(alarm.Name) {
		return nil, false
	}

	rootPattern, err := regexp.Compile(rule.RootAlarmPattern)
	if err != nil {
		return nil, false
	}

	// Search for an active alarm matching the root pattern
	var bestCandidate *alm.Alarm
	for _, candidate := range ctx.ActiveAlarms {
		if candidate.AlarmId == alarm.AlarmId {
			continue
		}
		if candidate.State == alm.AlarmState_ALARM_STATE_CLEARED {
			continue
		}
		if !rootPattern.MatchString(candidate.Name) {
			continue
		}

		// Prefer the candidate with higher severity
		if bestCandidate == nil || candidate.Severity > bestCandidate.Severity {
			bestCandidate = candidate
		}
	}

	if bestCandidate != nil {
		return bestCandidate, true
	}
	return nil, false
}
