package mocks

import "fmt"

// PrintSummary prints the count of all generated entities.
func PrintSummary(store *MockDataStore) {
	fmt.Printf("\n========================================\n")
	fmt.Printf("Mock Data Generation Summary\n")
	fmt.Printf("========================================\n")
	fmt.Printf("  Alarm Definitions:      %d\n", len(store.DefinitionIDs))
	fmt.Printf("  Alarm Filters:          %d\n", len(store.FilterIDs))
	fmt.Printf("  Correlation Rules:      %d\n", len(store.CorrRuleIDs))
	fmt.Printf("  Notification Policies:  %d\n", len(store.NotifPolIDs))
	fmt.Printf("  Escalation Policies:    %d\n", len(store.EscPolicyIDs))
	fmt.Printf("  Maintenance Windows:    %d\n", len(store.MaintWindowIDs))
	fmt.Printf("  Events:                 %d\n", len(store.EventIDs))
	fmt.Printf("  Alarms:                 %d\n", len(store.AlarmIDs))
	fmt.Printf("========================================\n")

	total := len(store.DefinitionIDs) + len(store.FilterIDs) + len(store.CorrRuleIDs) +
		len(store.NotifPolIDs) + len(store.EscPolicyIDs) + len(store.MaintWindowIDs) +
		len(store.EventIDs) + len(store.AlarmIDs)
	fmt.Printf("  Total entities:         %d\n", total)
	fmt.Printf("========================================\n")
}
