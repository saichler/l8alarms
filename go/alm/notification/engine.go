package notification

import (
	"fmt"
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/alm/notificationpolicies"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8notify/go/channel"
	"github.com/saichler/l8notify/go/template"
	"github.com/saichler/l8notify/go/throttle"
	"github.com/saichler/l8types/go/ifs"
)

// Engine evaluates notification policies and dispatches notifications.
// Uses l8notify for throttling, template rendering, and channel dispatch.
type Engine struct {
	throttler *throttle.Throttler
}

// NewEngine creates a new notification engine.
func NewEngine() *Engine {
	return &Engine{
		throttler: throttle.New(),
	}
}

// Notify evaluates all active notification policies for the given alarm and action.
func (e *Engine) Notify(alarm *alm.Alarm, action ifs.Action, suppressNotifications bool, vnic ifs.IVNic) {
	if suppressNotifications {
		return
	}

	policies, err := common.GetEntities[alm.NotificationPolicy](
		notificationpolicies.ServiceName, notificationpolicies.ServiceArea,
		fmt.Sprintf("select * from NotificationPolicy where Status=%d",
			alm.AlmPolicyStatus_ALM_POLICY_STATUS_ACTIVE),
		vnic,
	)
	if err != nil || len(policies) == 0 {
		return
	}

	isStateChange := action == ifs.PUT || action == ifs.PATCH

	for _, policy := range policies {
		if !matchesPolicy(alarm, policy, isStateChange) {
			continue
		}
		key := alarm.AlarmId + ":" + policy.PolicyId
		groupKey := policy.PolicyId
		if e.throttler.IsThrottled(key, groupKey, policy.CooldownSeconds, policy.MaxNotificationsPerHour) {
			continue
		}
		e.throttler.Record(key, groupKey)
		dispatch(alarm, policy)
	}
}

// matchesPolicy checks if an alarm satisfies a notification policy's trigger conditions.
func matchesPolicy(alarm *alm.Alarm, policy *alm.NotificationPolicy, isStateChange bool) bool {
	if isStateChange && !policy.NotifyOnStateChange {
		return false
	}
	if policy.MinSeverity > 0 && alarm.Severity < policy.MinSeverity {
		return false
	}
	if len(policy.AlarmDefinitionIds) > 0 {
		found := false
		for _, defId := range policy.AlarmDefinitionIds {
			if defId == alarm.DefinitionId {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	if len(policy.NodeTypeFilter) > 0 {
		nodeType, ok := alarm.Attributes["nodeType"]
		if !ok {
			return false
		}
		found := false
		for _, nt := range policy.NodeTypeFilter {
			if nt == nodeType {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

// dispatch sends notifications to all targets of a policy using l8notify.
func dispatch(alarm *alm.Alarm, policy *alm.NotificationPolicy) {
	vars := alarmTemplateVars(alarm)
	for _, target := range policy.Targets {
		msg := template.RenderWithDefault(target.Template, vars,
			fmt.Sprintf("Alarm %s: %s on %s (severity: %s, state: %s)",
				alarm.AlarmId, alarm.Name, alarm.NodeName,
				alarm.Severity.String(), alarm.State.String()))
		result := channel.Dispatch(target, msg, nil, nil)
		if result != nil && result.ErrorMessage != "" {
			fmt.Printf("[notification] failed to send %s to %s: %s\n",
				target.Channel.String(), target.Endpoint, result.ErrorMessage)
		}
	}
}

// alarmTemplateVars builds a template variable map from an alarm.
func alarmTemplateVars(alarm *alm.Alarm) map[string]string {
	return map[string]string{
		"alarm.id":          alarm.AlarmId,
		"alarm.name":        alarm.Name,
		"alarm.severity":    alarm.Severity.String(),
		"alarm.state":       alarm.State.String(),
		"alarm.nodeId":      alarm.NodeId,
		"alarm.nodeName":    alarm.NodeName,
		"alarm.location":    alarm.Location,
		"alarm.description": alarm.Description,
	}
}
