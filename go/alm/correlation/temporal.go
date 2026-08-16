package correlation

import (
	"github.com/saichler/l8alarms/go/types/alm"
	"regexp"
)

// TemporalStrategy correlates alarms that occur within a time window.
// It looks for a root cause alarm matching the root pattern within
// the configured time window of the new alarm.
type TemporalStrategy struct{}

func (s *TemporalStrategy) Name() string { return "temporal" }

func (s *TemporalStrategy) Correlate(alarm *alm.Alarm, rule *alm.CorrelationRule, ctx *CorrelationContext) (*alm.Alarm, bool) {
	windowSec := int64(rule.TimeWindowSeconds)
	if windowSec <= 0 {
		return nil, false
	}

	alarmTime := alarm.FirstOccurrence
	if alarmTime == 0 {
		alarmTime = alarm.LastOccurrence
	}

	var rootPattern *regexp.Regexp
	if rule.RootAlarmPattern != "" {
		var err error
		rootPattern, err = regexp.Compile(rule.RootAlarmPattern)
		if err != nil {
			return nil, false
		}
	}

	// Check if this alarm matches the symptom pattern
	if rule.SymptomAlarmPattern != "" {
		symptomPattern, err := regexp.Compile(rule.SymptomAlarmPattern)
		if err != nil {
			return nil, false
		}
		if !symptomPattern.MatchString(alarm.Name) {
			return nil, false
		}
	}

	// Search for a root cause alarm within the time window
	var bestCandidate *alm.Alarm
	for _, candidate := range ctx.ActiveAlarms {
		if candidate.AlarmId == alarm.AlarmId {
			continue
		}
		if candidate.State == alm.AlarmState_ALARM_STATE_CLEARED {
			continue
		}

		// Check time window
		candidateTime := candidate.FirstOccurrence
		if candidateTime == 0 {
			candidateTime = candidate.LastOccurrence
		}
		diff := alarmTime - candidateTime
		if diff < 0 {
			diff = -diff
		}
		if diff > windowSec {
			continue
		}

		// Check root alarm pattern
		if rootPattern != nil && !rootPattern.MatchString(candidate.Name) {
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
