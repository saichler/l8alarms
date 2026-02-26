package mocks

// MockDataStore holds generated IDs for cross-referencing between phases.
type MockDataStore struct {
	// Phase 1: Foundation
	DefinitionIDs []string // AlarmDefinition IDs

	// Phase 2: Configuration
	FilterIDs      []string // AlarmFilter IDs
	CorrRuleIDs    []string // CorrelationRule IDs
	NotifPolIDs    []string // NotificationPolicy IDs
	EscPolicyIDs   []string // EscalationPolicy IDs
	MaintWindowIDs []string // MaintenanceWindow IDs

	// Phase 3: Events
	EventIDs []string // Event IDs

	// Phase 4: Alarms
	AlarmIDs []string // Alarm IDs

	// Phase 5: Archive
	ArchivedAlarmIDs []string // ArchivedAlarm IDs
	ArchivedEventIDs []string // ArchivedEvent IDs
}
