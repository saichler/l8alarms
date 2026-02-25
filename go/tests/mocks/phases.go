package mocks

import (
	"github.com/saichler/l8alarms/go/types/alm"
)

const almArea = "/alm/10/"

// RunAllPhases generates and inserts all mock data in dependency order.
func RunAllPhases(client *Client, store *MockDataStore) {
	runPhase("Phase 1: Foundation", func() error {
		return runPhase1(client, store)
	})
	runPhase("Phase 2: Configuration", func() error {
		return runPhase2(client, store)
	})
	runPhase("Phase 3: Events", func() error {
		return runPhase3(client, store)
	})
	runPhase("Phase 4: Alarms", func() error {
		return runPhase4(client, store)
	})
}

// Phase 1: AlarmDefinitions (no dependencies)
func runPhase1(client *Client, store *MockDataStore) error {
	defs := generateAlarmDefinitions()
	if err := runOp(client, "Alarm Definitions", almArea+"AlmDef",
		&alm.AlarmDefinitionList{List: defs},
		extractIDs(defs, func(e *alm.AlarmDefinition) string { return e.DefinitionId }),
		&store.DefinitionIDs); err != nil {
		return err
	}
	return nil
}

// Phase 2: Configuration (depends on DefinitionIDs)
func runPhase2(client *Client, store *MockDataStore) error {
	// Alarm Filters
	filters := generateAlarmFilters(store)
	if err := runOp(client, "Alarm Filters", almArea+"AlmFilter",
		&alm.AlarmFilterList{List: filters},
		extractIDs(filters, func(e *alm.AlarmFilter) string { return e.FilterId }),
		&store.FilterIDs); err != nil {
		return err
	}

	// Correlation Rules
	rules := generateCorrelationRules(store)
	if err := runOp(client, "Correlation Rules", almArea+"CorrRule",
		&alm.CorrelationRuleList{List: rules},
		extractIDs(rules, func(e *alm.CorrelationRule) string { return e.RuleId }),
		&store.CorrRuleIDs); err != nil {
		return err
	}

	// Notification Policies
	notifPols := generateNotificationPolicies()
	if err := runOp(client, "Notification Policies", almArea+"NotifPol",
		&alm.NotificationPolicyList{List: notifPols},
		extractIDs(notifPols, func(e *alm.NotificationPolicy) string { return e.PolicyId }),
		&store.NotifPolIDs); err != nil {
		return err
	}

	// Escalation Policies
	escPols := generateEscalationPolicies()
	if err := runOp(client, "Escalation Policies", almArea+"EscPolicy",
		&alm.EscalationPolicyList{List: escPols},
		extractIDs(escPols, func(e *alm.EscalationPolicy) string { return e.PolicyId }),
		&store.EscPolicyIDs); err != nil {
		return err
	}

	// Maintenance Windows
	windows := generateMaintenanceWindows()
	if err := runOp(client, "Maintenance Windows", almArea+"MaintWin",
		&alm.MaintenanceWindowList{List: windows},
		extractIDs(windows, func(e *alm.MaintenanceWindow) string { return e.WindowId }),
		&store.MaintWindowIDs); err != nil {
		return err
	}

	return nil
}

// Phase 3: Events (depends on DefinitionIDs)
func runPhase3(client *Client, store *MockDataStore) error {
	events := generateEvents(store)
	if err := runOp(client, "Events", almArea+"Event",
		&alm.EventList{List: events},
		extractIDs(events, func(e *alm.Event) string { return e.EventId }),
		&store.EventIDs); err != nil {
		return err
	}
	return nil
}

// Phase 4: Alarms (depends on DefinitionIDs, EventIDs, CorrRuleIDs)
func runPhase4(client *Client, store *MockDataStore) error {
	alarms := generateAlarms(store)
	if err := runOp(client, "Alarms", almArea+"Alarm",
		&alm.AlarmList{List: alarms},
		extractIDs(alarms, func(e *alm.Alarm) string { return e.AlarmId }),
		&store.AlarmIDs); err != nil {
		return err
	}
	return nil
}
