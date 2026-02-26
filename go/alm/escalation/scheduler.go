package escalation

import (
	"fmt"
	"github.com/saichler/l8alarms/go/alm/common"
	"github.com/saichler/l8alarms/go/alm/escalationpolicies"
	"github.com/saichler/l8alarms/go/alm/notification"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
	"sort"
	"sync"
	"time"
)

// Scheduler manages escalation timers for unacknowledged alarms.
type Scheduler struct {
	// active tracks running escalation timers by alarm ID
	active map[string]*escalationState
	mtx    sync.Mutex
}

type escalationState struct {
	alarmId   string
	policyId  string
	stepIndex int
	timer     *time.Timer
	cancel    chan struct{}
}

// NewScheduler creates a new escalation scheduler.
func NewScheduler() *Scheduler {
	return &Scheduler{
		active: make(map[string]*escalationState),
	}
}

// Schedule evaluates escalation policies for a new alarm and starts timers
// for matching policies.
func (s *Scheduler) Schedule(alarm *alm.Alarm, vnic ifs.IVNic) {
	// Only schedule for active alarms
	if alarm.State != alm.AlarmState_ALARM_STATE_ACTIVE {
		return
	}

	policies, err := common.GetEntities[alm.EscalationPolicy](
		escalationpolicies.ServiceName, escalationpolicies.ServiceArea,
		fmt.Sprintf("select * from EscalationPolicy where Status=%d",
			alm.PolicyStatus_POLICY_STATUS_ACTIVE),
		vnic,
	)
	if err != nil || len(policies) == 0 {
		return
	}

	for _, policy := range policies {
		if !matchesEscalationPolicy(alarm, policy) {
			continue
		}
		if len(policy.Steps) == 0 {
			continue
		}

		// Sort steps by order
		steps := make([]*alm.EscalationStep, len(policy.Steps))
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
	s.mtx.Lock()
	defer s.mtx.Unlock()

	if state, ok := s.active[alarmId]; ok {
		close(state.cancel)
		state.timer.Stop()
		delete(s.active, alarmId)
	}
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

func (s *Scheduler) startEscalation(alarm *alm.Alarm, policy *alm.EscalationPolicy, steps []*alm.EscalationStep, stepIdx int, vnic ifs.IVNic) {
	if stepIdx >= len(steps) {
		return
	}

	step := steps[stepIdx]
	delay := time.Duration(step.DelayMinutes) * time.Minute

	cancel := make(chan struct{})
	timer := time.NewTimer(delay)

	s.mtx.Lock()
	// Cancel any existing escalation for this alarm
	if existing, ok := s.active[alarm.AlarmId]; ok {
		close(existing.cancel)
		existing.timer.Stop()
	}
	s.active[alarm.AlarmId] = &escalationState{
		alarmId:   alarm.AlarmId,
		policyId:  policy.PolicyId,
		stepIndex: stepIdx,
		timer:     timer,
		cancel:    cancel,
	}
	s.mtx.Unlock()

	go func() {
		select {
		case <-timer.C:
			s.fireStep(alarm, policy, steps, stepIdx, vnic)
		case <-cancel:
			timer.Stop()
		}
	}()
}

func (s *Scheduler) fireStep(alarm *alm.Alarm, policy *alm.EscalationPolicy, steps []*alm.EscalationStep, stepIdx int, vnic ifs.IVNic) {
	step := steps[stepIdx]

	// Render message
	msg := step.MessageTemplate
	if msg == "" {
		msg = fmt.Sprintf("[ESCALATION] Alarm %s (%s) on %s - unacknowledged for %d minutes",
			alarm.AlarmId, alarm.Name, alarm.NodeName, step.DelayMinutes)
	}

	// Send notification for this escalation step
	if err := notification.Send(step.Channel, step.Endpoint, msg); err != nil {
		fmt.Printf("[escalation] step %d failed for alarm %s: %v\n",
			step.StepOrder, alarm.AlarmId, err)
	}

	// Clean up current state
	s.mtx.Lock()
	delete(s.active, alarm.AlarmId)
	s.mtx.Unlock()

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
