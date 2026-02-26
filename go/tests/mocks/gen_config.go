package mocks

// Generates: CorrelationRule, NotificationPolicy, EscalationPolicy, MaintenanceWindow

import (
	"fmt"
	"github.com/saichler/l8alarms/go/types/alm"
	"math/rand"
)

func generateCorrelationRules(store *MockDataStore) []*alm.CorrelationRule {
	count := len(corrRuleNames)
	result := make([]*alm.CorrelationRule, count)

	ruleTypes := []alm.CorrelationRuleType{
		alm.CorrelationRuleType_CORRELATION_RULE_TYPE_TOPOLOGICAL,
		alm.CorrelationRuleType_CORRELATION_RULE_TYPE_TOPOLOGICAL,
		alm.CorrelationRuleType_CORRELATION_RULE_TYPE_COMPOSITE,
		alm.CorrelationRuleType_CORRELATION_RULE_TYPE_TOPOLOGICAL,
		alm.CorrelationRuleType_CORRELATION_RULE_TYPE_TEMPORAL,
		alm.CorrelationRuleType_CORRELATION_RULE_TYPE_PATTERN,
	}

	for i := 0; i < count; i++ {
		rule := &alm.CorrelationRule{
			RuleId:      genID("corr", i),
			Name:        corrRuleNames[i],
			Description: "Correlation rule: " + corrRuleNames[i],
			RuleType:    ruleTypes[i],
			Status:      alm.CorrelationRuleStatus_CORRELATION_RULE_STATUS_ACTIVE,
			Priority:    int32(i + 1),
			CreatedAt:   randomPastDate(6, 30),
			UpdatedAt:   nowUnix(),
		}

		// Configure based on type
		switch ruleTypes[i] {
		case alm.CorrelationRuleType_CORRELATION_RULE_TYPE_TOPOLOGICAL:
			rule.TraversalDirection = alm.TraversalDirection_TRAVERSAL_DIRECTION_UPSTREAM
			rule.TraversalDepth = int32(rand.Intn(3) + 2)
			rule.MinSymptomCount = 1
			rule.AutoSuppressSymptoms = true
		case alm.CorrelationRuleType_CORRELATION_RULE_TYPE_TEMPORAL:
			rule.TimeWindowSeconds = int32(rand.Intn(600) + 60)
			rule.RootAlarmPattern = "linkDown|reachabilityLost"
			rule.SymptomAlarmPattern = ".*"
		case alm.CorrelationRuleType_CORRELATION_RULE_TYPE_COMPOSITE:
			rule.TraversalDirection = alm.TraversalDirection_TRAVERSAL_DIRECTION_BOTH
			rule.TraversalDepth = 3
			rule.TimeWindowSeconds = 300
			rule.MinSymptomCount = 2
			rule.AutoSuppressSymptoms = true
		case alm.CorrelationRuleType_CORRELATION_RULE_TYPE_PATTERN:
			rule.RootAlarmPattern = "(?i)powerSupply.*fail|fan.*fail"
			rule.SymptomAlarmPattern = "(?i)tempAboveThreshold|overheating"
		}

		// Add conditions for some rules
		if i%2 == 0 {
			rule.Conditions = []*alm.CorrelationCondition{
				{
					ConditionId: genID("cond", i*10),
					Field:       "severity",
					Operator:    alm.ConditionOperator_CONDITION_OPERATOR_GREATER_THAN,
					Value:       "ALARM_SEVERITY_WARNING",
				},
			}
		}

		result[i] = rule
	}
	return result
}

func generateNotificationPolicies() []*alm.NotificationPolicy {
	count := len(notifPolicyNames)
	result := make([]*alm.NotificationPolicy, count)

	for i := 0; i < count; i++ {
		policy := &alm.NotificationPolicy{
			PolicyId:    genID("npol", i),
			Name:        notifPolicyNames[i],
			Description: "Notification policy: " + notifPolicyNames[i],
			Status:      alm.PolicyStatus_POLICY_STATUS_ACTIVE,
			CreatedAt:   randomPastDate(6, 30),
			UpdatedAt:   nowUnix(),
		}

		switch i {
		case 0: // Critical - NOC
			policy.MinSeverity = alm.AlarmSeverity_ALARM_SEVERITY_CRITICAL
			policy.NotifyOnStateChange = true
			policy.CooldownSeconds = 300
			policy.MaxNotificationsPerHour = 20
			policy.Targets = []*alm.NotificationTarget{
				{TargetId: genID("tgt", i*10), Channel: alm.NotificationChannel_NOTIFICATION_CHANNEL_PAGERDUTY, Endpoint: "noc-oncall@example.com"},
				{TargetId: genID("tgt", i*10+1), Channel: alm.NotificationChannel_NOTIFICATION_CHANNEL_SLACK, Endpoint: "https://hooks.slack.com/services/T00/B00/critical"},
			}
		case 1: // Major - Engineering
			policy.MinSeverity = alm.AlarmSeverity_ALARM_SEVERITY_MAJOR
			policy.CooldownSeconds = 600
			policy.MaxNotificationsPerHour = 10
			policy.Targets = []*alm.NotificationTarget{
				{TargetId: genID("tgt", i*10), Channel: alm.NotificationChannel_NOTIFICATION_CHANNEL_EMAIL, Endpoint: "engineering@example.com"},
				{TargetId: genID("tgt", i*10+1), Channel: alm.NotificationChannel_NOTIFICATION_CHANNEL_SLACK, Endpoint: "https://hooks.slack.com/services/T00/B00/major"},
			}
		case 2: // All - Dashboard
			policy.MinSeverity = alm.AlarmSeverity_ALARM_SEVERITY_INFO
			policy.Targets = []*alm.NotificationTarget{
				{TargetId: genID("tgt", i*10), Channel: alm.NotificationChannel_NOTIFICATION_CHANNEL_WEBHOOK, Endpoint: "https://dashboard.example.com/webhook/alarms"},
			}
		case 3: // Security
			policy.MinSeverity = alm.AlarmSeverity_ALARM_SEVERITY_WARNING
			policy.NodeTypeFilter = []string{"FIREWALL", "SERVER"}
			policy.NotifyOnStateChange = true
			policy.Targets = []*alm.NotificationTarget{
				{TargetId: genID("tgt", i*10), Channel: alm.NotificationChannel_NOTIFICATION_CHANNEL_EMAIL, Endpoint: "secops@example.com"},
			}
		}

		result[i] = policy
	}
	return result
}

func generateEscalationPolicies() []*alm.EscalationPolicy {
	count := len(escPolicyNames)
	result := make([]*alm.EscalationPolicy, count)

	for i := 0; i < count; i++ {
		policy := &alm.EscalationPolicy{
			PolicyId:    genID("epol", i),
			Name:        escPolicyNames[i],
			Description: "Escalation policy: " + escPolicyNames[i],
			Status:      alm.PolicyStatus_POLICY_STATUS_ACTIVE,
			CreatedAt:   randomPastDate(6, 30),
			UpdatedAt:   nowUnix(),
		}

		switch i {
		case 0: // Critical path
			policy.MinSeverity = alm.AlarmSeverity_ALARM_SEVERITY_CRITICAL
			policy.Steps = []*alm.EscalationStep{
				{StepId: genID("step", i*10), StepOrder: 1, DelayMinutes: 5, Channel: alm.NotificationChannel_NOTIFICATION_CHANNEL_PAGERDUTY, Endpoint: "l1-oncall@example.com", MessageTemplate: "[ESC L1] Critical alarm {{alarm.name}} on {{alarm.nodeName}}"},
				{StepId: genID("step", i*10+1), StepOrder: 2, DelayMinutes: 15, Channel: alm.NotificationChannel_NOTIFICATION_CHANNEL_PAGERDUTY, Endpoint: "l2-manager@example.com", MessageTemplate: "[ESC L2] Unresolved critical alarm {{alarm.name}} on {{alarm.nodeName}}"},
				{StepId: genID("step", i*10+2), StepOrder: 3, DelayMinutes: 30, Channel: alm.NotificationChannel_NOTIFICATION_CHANNEL_EMAIL, Endpoint: "vp-engineering@example.com", MessageTemplate: "[ESC L3] Prolonged critical alarm {{alarm.name}} on {{alarm.nodeName}}"},
			}
		case 1: // Major path
			policy.MinSeverity = alm.AlarmSeverity_ALARM_SEVERITY_MAJOR
			policy.Steps = []*alm.EscalationStep{
				{StepId: genID("step", i*10), StepOrder: 1, DelayMinutes: 15, Channel: alm.NotificationChannel_NOTIFICATION_CHANNEL_EMAIL, Endpoint: "noc-team@example.com", MessageTemplate: "[ESC] Major alarm {{alarm.name}} on {{alarm.nodeName}}"},
				{StepId: genID("step", i*10+1), StepOrder: 2, DelayMinutes: 60, Channel: alm.NotificationChannel_NOTIFICATION_CHANNEL_PAGERDUTY, Endpoint: "l1-oncall@example.com", MessageTemplate: "[ESC] Unresolved major alarm {{alarm.name}} - 1 hour"},
			}
		}

		result[i] = policy
	}
	return result
}

func generateMaintenanceWindows() []*alm.MaintenanceWindow {
	count := len(maintWindowNames)
	result := make([]*alm.MaintenanceWindow, count)

	for i := 0; i < count; i++ {
		w := &alm.MaintenanceWindow{
			WindowId:    genID("mwin", i),
			Name:        maintWindowNames[i],
			Description: fmt.Sprintf("Scheduled: %s", maintWindowNames[i]),
			CreatedBy:   "admin",
			CreatedAt:   randomPastDate(3, 15),
			UpdatedAt:   nowUnix(),
		}

		switch i {
		case 0: // Weekly network maintenance - scheduled
			w.Status = alm.MaintenanceWindowStatus_MAINTENANCE_WINDOW_STATUS_SCHEDULED
			w.StartTime = randomFutureDate(0, 7)
			w.EndTime = w.StartTime + 14400
			w.Recurrence = alm.RecurrenceType_RECURRENCE_TYPE_WEEKLY
			w.RecurrenceInterval = 1
			w.SuppressAlarms = false
			w.SuppressNotifications = true
		case 1: // Monthly patch - scheduled
			w.Status = alm.MaintenanceWindowStatus_MAINTENANCE_WINDOW_STATUS_SCHEDULED
			w.StartTime = randomFutureDate(1, 15)
			w.EndTime = w.StartTime + 28800
			w.Recurrence = alm.RecurrenceType_RECURRENCE_TYPE_MONTHLY
			w.RecurrenceInterval = 1
			w.SuppressAlarms = true
			w.SuppressNotifications = true
			w.NodeTypes = []string{"SERVER"}
		case 2: // DC-East UPS - active
			w.Status = alm.MaintenanceWindowStatus_MAINTENANCE_WINDOW_STATUS_ACTIVE
			w.StartTime = nowUnix() - 3600
			w.EndTime = nowUnix() + 7200
			w.Recurrence = alm.RecurrenceType_RECURRENCE_TYPE_NONE
			w.SuppressAlarms = true
			w.SuppressNotifications = true
			w.Locations = []string{"DC-East"}
		case 3: // Firewall rule update - completed
			w.Status = alm.MaintenanceWindowStatus_MAINTENANCE_WINDOW_STATUS_COMPLETED
			w.StartTime = randomPastDate(0, 7)
			w.EndTime = w.StartTime + 3600
			w.Recurrence = alm.RecurrenceType_RECURRENCE_TYPE_NONE
			w.NodeIds = []string{"node-fw-01", "node-fw-02"}
			w.SuppressNotifications = true
		}

		result[i] = w
	}
	return result
}
