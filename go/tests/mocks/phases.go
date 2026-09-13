package mocks

import (
	"fmt"
	"github.com/saichler/l8alarms/go/types/alm"
	"github.com/saichler/l8types/go/ifs"
)

const almArea = "/alm/10/"

// RunAllPhases generates and inserts all mock data in dependency order.
// vnic is required for Phase 3 (Alarms) only: Alarm's POST has no HTTP
// route (Phase 3.2), so seeding it goes through common.PostEntity directly
// rather than the HTTP client used by every other phase.
func RunAllPhases(client *Client, store *MockDataStore, vnic ifs.IVNic) {
	runPhase("Phase 1: Foundation", func() error {
		return runPhase1(client, store)
	})
	runPhase("Phase 2: Configuration", func() error {
		return runPhase2(client, store)
	})
	runPhase("Phase 3: Alarms", func() error {
		if vnic == nil {
			fmt.Printf("  SKIPPED — Alarm seeding requires a vnic (see AlarmService.go's WebService: Alarm's POST has no HTTP route). This mock generator invocation has no in-process vnic (e.g. the standalone HTTP-only CLI in go/tests/cmd), so Alarms cannot be seeded here.\n")
			return nil
		}
		return runPhase3(client, store, vnic)
	})
	runPhase("Phase 4: Archive", func() error {
		return runPhase4(client, store)
	})
}

// Phase 1: AlarmDefinitions (no dependencies)
func runPhase1(client *Client, store *MockDataStore) error {
	defs := generateAlarmDefinitions()
	if err := runOp(client, "Alarm Definitions", almArea+"AlmDef",
		&alm.AlarmDefinitionList{List: defs},
		extractIDs(defs, func(e interface{}) string { return e.(*alm.AlarmDefinition).DefinitionId }),
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
		extractIDs(filters, func(e interface{}) string { return e.(*alm.AlarmFilter).FilterId }),
		&store.FilterIDs); err != nil {
		return err
	}

	// Correlation Rules
	rules := generateCorrelationRules(store)
	if err := runOp(client, "Correlation Rules", almArea+"CorrRule",
		&alm.CorrelationRuleList{List: rules},
		extractIDs(rules, func(e interface{}) string { return e.(*alm.CorrelationRule).RuleId }),
		&store.CorrRuleIDs); err != nil {
		return err
	}

	// Notification Policies
	notifPols := generateNotificationPolicies()
	if err := runOp(client, "Notification Policies", almArea+"NotifPol",
		&alm.NotificationPolicyList{List: notifPols},
		extractIDs(notifPols, func(e interface{}) string { return e.(*alm.NotificationPolicy).PolicyId }),
		&store.NotifPolIDs); err != nil {
		return err
	}

	// Escalation Policies
	escPols := generateEscalationPolicies()
	if err := runOp(client, "Escalation Policies", almArea+"EscPolicy",
		&alm.EscalationPolicyList{List: escPols},
		extractIDs(escPols, func(e interface{}) string { return e.(*alm.EscalationPolicy).PolicyId }),
		&store.EscPolicyIDs); err != nil {
		return err
	}

	return nil
}

// Phase 3: Alarms (depends on DefinitionIDs). Seeded via EventRecord POSTs
// straight through the vnic — see gen_alarms.go's seedAlarms — since
// Alarm's own POST has no HTTP route. State variety (Acknowledge/notes) is
// then applied via PATCH through the HTTP client, which does have a route.
func runPhase3(client *Client, store *MockDataStore, vnic ifs.IVNic) error {
	fmt.Printf("  Seeding Alarms via EventRecord POSTs...")
	alarmIDs := seedAlarms(store, vnic)
	if len(alarmIDs) == 0 {
		fmt.Printf(" FAILED\n")
		return fmt.Errorf("Alarms: no alarms were created from seeded events")
	}
	store.AlarmIDs = append(store.AlarmIDs, alarmIDs...)
	fmt.Printf(" %d created\n", len(alarmIDs))

	fmt.Printf("  Varying Alarm state (Acknowledge/notes) via PATCH...")
	varyAlarmStateViaPatch(client, alarmIDs)
	fmt.Printf(" done\n")
	return nil
}

// Phase 4: Archive (depends on AlarmIDs, DefinitionIDs)
func runPhase4(client *Client, store *MockDataStore) error {
	arcAlarms := generateArchivedAlarms(store)
	if err := runOp(client, "Archived Alarms", almArea+"ArcAlarm",
		&alm.ArchivedAlarmList{List: arcAlarms},
		extractIDs(arcAlarms, func(e interface{}) string { return e.(*alm.ArchivedAlarm).AlarmId }),
		&store.ArchivedAlarmIDs); err != nil {
		return err
	}

	return nil
}
