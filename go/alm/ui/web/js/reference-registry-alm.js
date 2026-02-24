/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
/**
 * Reference Registry - ALM Models
 * Uses Layer8RefFactory for reduced boilerplate
 */
const refAlm = window.Layer8RefFactory;

Layer8DReferenceRegistry.register({
    // ========================================
    // ALM - Alarms
    // ========================================
    Alarm: {
        idColumn: 'alarmId',
        displayColumn: 'name',
        selectColumns: ['alarmId', 'name', 'severity', 'state'],
        displayLabel: 'Alarm'
    },
    ...refAlm.simple('AlarmDefinition', 'definitionId', 'name', 'Definition'),
    ...refAlm.simple('AlarmFilter', 'filterId', 'name', 'Filter'),

    // ========================================
    // ALM - Events
    // ========================================
    Event: {
        idColumn: 'eventId',
        displayColumn: 'message',
        selectColumns: ['eventId', 'message', 'eventType'],
        displayLabel: 'Event'
    },

    // ========================================
    // ALM - Correlation
    // ========================================
    ...refAlm.simple('CorrelationRule', 'ruleId', 'name', 'Rule'),

    // ========================================
    // ALM - Policies
    // ========================================
    ...refAlm.simple('NotificationPolicy', 'policyId', 'name', 'Notification Policy'),
    ...refAlm.simple('EscalationPolicy', 'policyId', 'name', 'Escalation Policy'),

    // ========================================
    // ALM - Maintenance
    // ========================================
    ...refAlm.simple('MaintenanceWindow', 'windowId', 'name', 'Maintenance Window')
});
