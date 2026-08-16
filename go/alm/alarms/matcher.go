package alarms

import (
	"fmt"
	"github.com/saichler/l8alarms/go/alm/alarmdefinitions"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
	l8events "github.com/saichler/l8types/go/types/l8events"
	"regexp"
)

// matchesPattern compiles pattern as a regexp and reports whether it matches
// either s1 or s2. An empty pattern matches everything (no filtering).
// Shared by event_pattern and clear_event_pattern — both are the same
// operation against different pattern strings.
func matchesPattern(pattern, s1, s2 string) bool {
	if pattern == "" {
		return true
	}
	re, err := regexp.Compile(pattern)
	if err != nil {
		return false
	}
	return re.MatchString(s1) || re.MatchString(s2)
}

// fetchActiveDefinitions loads all active AlarmDefinition records.
func fetchActiveDefinitions(vnic ifs.IVNic) ([]*alm.AlarmDefinition, error) {
	raw, err := common.GetEntitiesByQuery(
		alarmdefinitions.ServiceName, alarmdefinitions.ServiceArea,
		fmt.Sprintf("select * from AlarmDefinition where Status=%d",
			alm.AlarmDefinitionStatus_ALARM_DEFINITION_STATUS_ACTIVE),
		vnic,
	)
	if err != nil {
		return nil, err
	}
	defs := make([]*alm.AlarmDefinition, 0, len(raw))
	for _, r := range raw {
		defs = append(defs, r.(*alm.AlarmDefinition))
	}
	return defs, nil
}

// matchDefinition returns the first active AlarmDefinition whose criteria
// the event satisfies (event_category_filter, event_pattern regex against
// EventType/Message, node_type_filter), or nil if none match.
func matchDefinition(event *l8events.EventRecord, defs []*alm.AlarmDefinition) *alm.AlarmDefinition {
	for _, def := range defs {
		if def.EventCategoryFilter != l8events.EventCategory_EVENT_CATEGORY_UNSPECIFIED &&
			def.EventCategoryFilter != event.Category {
			continue
		}
		if def.NodeTypeFilter != "" && def.NodeTypeFilter != event.SourceType {
			continue
		}
		if !matchesPattern(def.EventPattern, event.EventType, event.Message) {
			continue
		}
		return def
	}
	return nil
}

// matchesClearPattern reports whether the event satisfies def's
// clear_event_pattern. Reuses matchesPattern — clear_event_pattern is the
// same regex-match operation as event_pattern, just a different string.
func matchesClearPattern(event *l8events.EventRecord, def *alm.AlarmDefinition) bool {
	if def.ClearEventPattern == "" {
		return false
	}
	return matchesPattern(def.ClearEventPattern, event.EventType, event.Message)
}

// computeDedupKey derives the dedup key for a new alarm from its definition
// and the triggering event. AlarmDefinition.dedup_key_expression is a
// display-only field today (no evaluator exists anywhere in this codebase);
// the actual key is definitionId+sourceId, matching the mock data's
// documented "nodeId+definitionId" convention.
func computeDedupKey(def *alm.AlarmDefinition, event *l8events.EventRecord) string {
	return fmt.Sprintf("%s:%s", def.DefinitionId, event.SourceId)
}

// findActiveAlarmByDedupKey looks up an existing (non-cleared) alarm for the
// given dedup key, or nil if none exists.
func findActiveAlarmByDedupKey(dedupKey string, vnic ifs.IVNic) (*alm.Alarm, error) {
	if dedupKey == "" {
		return nil, nil
	}
	raw, err := common.GetEntitiesByQuery(
		ServiceName, ServiceArea,
		fmt.Sprintf("select * from Alarm where DedupKey=%s", dedupKey),
		vnic,
	)
	if err != nil {
		return nil, err
	}
	for _, r := range raw {
		a := r.(*alm.Alarm)
		if a.State != alm.AlarmState_ALARM_STATE_CLEARED {
			return a, nil
		}
	}
	return nil, nil
}
