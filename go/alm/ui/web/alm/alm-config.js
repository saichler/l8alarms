/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/

// ALM Module Configuration - Uses Layer8ModuleConfigFactory
Layer8ModuleConfigFactory.create({
    namespace: 'Alm',
    modules: {
        'alarms': {
            label: 'Alarms',
            services: [
                // readOnly: true — Alarm's POST/PUT have no HTTP route at all (see
                // AlarmService.go's hand-built WebService — POST only accepts an
                // l8events.EventRecord via a direct vnic call, and there is no PUT).
                // Row click still opens the detail popup (onRowClick is unconditional);
                // state transitions happen via PATCH through the state-action buttons
                // wired in alarms-state-actions.js, not through a generic Add/Edit modal.
                { key: 'alarms', label: 'Active Alarms', endpoint: '/10/Alarm', model: 'Alarm', supportedViews: ['table', 'kanban', 'chart'], readOnly: true },
                { key: 'alarm-definitions', label: 'Definitions', endpoint: '/10/AlmDef', model: 'AlarmDefinition' },
                { key: 'alarm-filters', label: 'Saved Filters', endpoint: '/10/AlmFilter', model: 'AlarmFilter' }
            ]
        },
        'correlation': {
            label: 'Correlation',
            services: [
                { key: 'correlation-rules', label: 'Rules', endpoint: '/10/CorrRule', model: 'CorrelationRule' }
            ]
        },
        'policies': {
            label: 'Policies',
            services: [
                { key: 'notification-policies', label: 'Notification', endpoint: '/10/NotifPol', model: 'NotificationPolicy' },
                { key: 'escalation-policies', label: 'Escalation', endpoint: '/10/EscPolicy', model: 'EscalationPolicy' }
            ]
        },
        'archive': {
            label: 'Archive',
            services: [
                { key: 'archived-alarms', label: 'Archived Alarms', endpoint: '/10/ArcAlarm', model: 'ArchivedAlarm', readOnly: true }
            ]
        }
    },
    submodules: ['AlmAlarms', 'AlmCorrelation', 'AlmPolicies', 'AlmArchive']
});
