package escalation

import (
	"fmt"
	"github.com/saichler/l8alarms/go/alm/escalationpolicies"
	"github.com/saichler/l8alarms/go/alm/notification"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8common/go/common"
	"github.com/saichler/l8types/go/ifs"
	l8notify "github.com/saichler/l8types/go/types/l8notify"
	"github.com/saichler/l8utils/go/utils/timer"
	"sort"
	"time"
)

// Scheduler manages escalation timers for unacknowledged alarms.
type Scheduler struct {
	timers *timer.TimerManager
}

// NewScheduler creates a new escalation scheduler.
func NewScheduler() *Scheduler {
	return &Scheduler{
		timers: timer.NewTimerManager(),
	}
}

// Schedule evaluates escalation policies for a new alarm and starts timers
// for matching policies.
func (s *Scheduler) Schedule(alarm *alm.Alarm, vnic ifs.IVNic) {
	// Only schedule for active alarms
	if alarm.State != alm.AlarmState_ALARM_STATE_ACTIVE {
		return
	}

	policiesRaw, err := common.GetEntitiesByQuery(
		escalationpolicies.ServiceName, escalationpolicies.ServiceArea,
		fmt.Sprintf("select * from EscalationPolicy where Status=%d",
			alm.AlmPolicyStatus_ALM_POLICY_STATUS_ACTIVE),
		vnic,
	)
	if err != nil || len(policiesRaw) == 0 {
		return
	}

	for _, raw := range policiesRaw {
		policy := raw.(*alm.EscalationPolicy)
		if !matchesEscalationPolicy(alarm, policy) {
			continue
		}
		if len(policy.Steps) == 0 {
			continue
		}

		// Sort steps by order
		steps := make([]*l8notify.EscalationStep, len(policy.Steps))
		copy(steps, policy.Steps)
		sort.Slice(steps, func(i, j int) bool {
			return steps[i].StepOrder < steps[j].StepOrder
		})

		s.startEscalation(alarm, policy, steps, 0, vnic)
		break // Use the first matching policy
	}
}

// Cancel stops any running escalation for the given alarm.
func (s *Scheduler) Cancel(alarmId string) {
	s.timers.Cancel(alarmId)
}

// HandleStateChange cancels escalation when alarm is acknowledged or cleared.
func (s *Scheduler) HandleStateChange(alarm *alm.Alarm) {
	switch alarm.State {
	case alm.AlarmState_ALARM_STATE_ACKNOWLEDGED,
		alm.AlarmState_ALARM_STATE_CLEARED,
		alm.AlarmState_ALARM_STATE_SUPPRESSED:
		s.Cancel(alarm.AlarmId)
	}
}

func (s *Scheduler) startEscalation(alarm *alm.Alarm, policy *alm.EscalationPolicy, steps []*l8notify.EscalationStep, stepIdx int, vnic ifs.IVNic) {
	if stepIdx >= len(steps) {
		return
	}

	step := steps[stepIdx]
	delay := time.Duration(step.DelayMinutes) * time.Minute

	s.timers.Start(alarm.AlarmId, delay, func() {
		s.fireStep(alarm, policy, steps, stepIdx, vnic)
	})
}

func (s *Scheduler) fireStep(alarm *alm.Alarm, policy *alm.EscalationPolicy, steps []*l8notify.EscalationStep, stepIdx int, vnic ifs.IVNic) {
	step := steps[stepIdx]

	// Render the escalation message locally, then dispatch through the
	// Notify service.
	vars := map[string]string{
		"alarm.id":       alarm.AlarmId,
		"alarm.name":     alarm.Name,
		"alarm.severity": alarm.Severity.String(),
		"alarm.state":    alarm.State.String(),
		"alarm.nodeName": alarm.NodeName,
		"alarm.nodeId":   alarm.NodeId,
		"step.order":     fmt.Sprintf("%d", step.StepOrder),
		"step.delay":     fmt.Sprintf("%d", step.DelayMinutes),
	}
	msg := notification.RenderTemplate(step.MessageTemplate, vars,
		fmt.Sprintf("[ESCALATION] Alarm %s (%s) on %s - unacknowledged for %d minutes",
			alarm.AlarmId, alarm.Name, alarm.NodeName, step.DelayMinutes))
	subject := fmt.Sprintf("[ESCALATION step %d] %s", step.StepOrder, alarm.Name)
	attrs := map[string]string{
		"alarmId": alarm.AlarmId, "policyId": policy.PolicyId,
		"step": fmt.Sprintf("%d", step.StepOrder),
	}

	// Send notification for this escalation step
	if err := notification.Send(vnic, step.Channel, step.Endpoint, subject, msg, attrs); err != nil {
		fmt.Printf("[escalation] step %d failed for alarm %s: %v\n",
			step.StepOrder, alarm.AlarmId, err)
	}

	// Schedule next step if available
	if stepIdx+1 < len(steps) {
		s.startEscalation(alarm, policy, steps, stepIdx+1, vnic)
	}
}

// matchesEscalationPolicy checks if an alarm matches an escalation policy's scope.
func matchesEscalationPolicy(alarm *alm.Alarm, policy *alm.EscalationPolicy) bool {
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

	return true
}
