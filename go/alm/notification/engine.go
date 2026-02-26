package notification

import (
	"fmt"
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/alm/notificationpolicies"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
	"sync"
	"time"
)

// Engine evaluates notification policies and dispatches notifications.
type Engine struct {
	// throttle tracks last notification time per alarm+policy combo
	throttle map[string]int64
	// hourlyCount tracks notifications per policy in current hour
	hourlyCount map[string]*hourCounter
	mtx         sync.Mutex
}

type hourCounter struct {
	hour  int
	count int32
}

// NewEngine creates a new notification engine.
func NewEngine() *Engine {
	return &Engine{
		throttle:    make(map[string]int64),
		hourlyCount: make(map[string]*hourCounter),
	}
}

// Notify evaluates all active notification policies for the given alarm and action.
// It sends notifications for matching policies, respecting throttling limits.
func (e *Engine) Notify(alarm *alm.Alarm, action ifs.Action, suppressNotifications bool, vnic ifs.IVNic) {
	if suppressNotifications {
		return
	}

	policies, err := common.GetEntities[alm.NotificationPolicy](
		notificationpolicies.ServiceName, notificationpolicies.ServiceArea,
		fmt.Sprintf("select * from NotificationPolicy where Status=%d",
			alm.PolicyStatus_POLICY_STATUS_ACTIVE),
		vnic,
	)
	if err != nil || len(policies) == 0 {
		return
	}

	isStateChange := action == ifs.PUT || action == ifs.PATCH

	for _, policy := range policies {
		if !e.matchesPolicy(alarm, policy, isStateChange) {
			continue
		}
		if e.isThrottled(alarm.AlarmId, policy) {
			continue
		}
		e.dispatch(alarm, policy)
	}
}

// matchesPolicy checks if an alarm satisfies a notification policy's trigger conditions.
func (e *Engine) matchesPolicy(alarm *alm.Alarm, policy *alm.NotificationPolicy, isStateChange bool) bool {
	// Skip state-change notifications if policy doesn't want them
	if isStateChange && !policy.NotifyOnStateChange {
		return false
	}

	// Check minimum severity
	if policy.MinSeverity > 0 && alarm.Severity < policy.MinSeverity {
		return false
	}

	// Check alarm definition filter
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

	// Check node type filter
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

// isThrottled checks if the notification is throttled by cooldown or hourly limit.
func (e *Engine) isThrottled(alarmId string, policy *alm.NotificationPolicy) bool {
	e.mtx.Lock()
	defer e.mtx.Unlock()

	now := time.Now()
	key := alarmId + ":" + policy.PolicyId

	// Check cooldown
	if policy.CooldownSeconds > 0 {
		if lastSent, ok := e.throttle[key]; ok {
			if now.Unix()-lastSent < int64(policy.CooldownSeconds) {
				return true
			}
		}
	}

	// Check hourly limit
	if policy.MaxNotificationsPerHour > 0 {
		currentHour := now.Hour()
		hc, ok := e.hourlyCount[policy.PolicyId]
		if !ok {
			hc = &hourCounter{hour: currentHour}
			e.hourlyCount[policy.PolicyId] = hc
		}
		if hc.hour != currentHour {
			hc.hour = currentHour
			hc.count = 0
		}
		if hc.count >= policy.MaxNotificationsPerHour {
			return true
		}
		hc.count++
	}

	// Record this send
	e.throttle[key] = now.Unix()

	return false
}

// dispatch sends notifications to all targets of a policy.
func (e *Engine) dispatch(alarm *alm.Alarm, policy *alm.NotificationPolicy) {
	for _, target := range policy.Targets {
		msg := renderTemplate(target.Template, alarm)
		if err := Send(target.Channel, target.Endpoint, msg); err != nil {
			fmt.Printf("[notification] failed to send %s to %s: %v\n",
				target.Channel.String(), target.Endpoint, err)
		}
	}
}

// renderTemplate replaces {{field}} placeholders in a template with alarm field values.
func renderTemplate(tmpl string, alarm *alm.Alarm) string {
	if tmpl == "" {
		return fmt.Sprintf("Alarm %s: %s on %s (severity: %s, state: %s)",
			alarm.AlarmId, alarm.Name, alarm.NodeName,
			alarm.Severity.String(), alarm.State.String())
	}

	result := tmpl
	result = replaceAll(result, "{{alarm.id}}", alarm.AlarmId)
	result = replaceAll(result, "{{alarm.name}}", alarm.Name)
	result = replaceAll(result, "{{alarm.severity}}", alarm.Severity.String())
	result = replaceAll(result, "{{alarm.state}}", alarm.State.String())
	result = replaceAll(result, "{{alarm.nodeId}}", alarm.NodeId)
	result = replaceAll(result, "{{alarm.nodeName}}", alarm.NodeName)
	result = replaceAll(result, "{{alarm.location}}", alarm.Location)
	result = replaceAll(result, "{{alarm.description}}", alarm.Description)
	return result
}

func replaceAll(s, old, new string) string {
	for {
		i := indexOf(s, old)
		if i < 0 {
			return s
		}
		s = s[:i] + new + s[i+len(old):]
	}
}

func indexOf(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}
