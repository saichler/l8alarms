/*
Layer 8 Alarms - Form Definitions
Uses Layer8FormFactory for reduced boilerplate
*/

(function() {
    'use strict';

    window.AlmAlarms = window.AlmAlarms || {};

    const f = window.Layer8FormFactory;
    const enums = AlmAlarms.enums;

    // Mark fields as read-only (system-managed, not user-editable)
    function ro(fields) {
        return fields.map(function(field) { field.readOnly = true; return field; });
    }

    // Alarm's form definition. Kept field-complete here (data-completeness-
    // pipeline.md) even though the detail popup itself now renders via
    // L8EventsAlarmDetail (alarms-state-actions.js), not this definition —
    // every field still needs a form/column home. Every field is read-only:
    // Alarm has no PUT endpoint at all (see AlarmService.go), so there is no
    // generic-edit path left; state transitions happen via PATCH through the
    // state-action buttons, notes display-only here (adding a note is a
    // PATCH, not part of a whole-record save).
    //
    // Mirrors L8EventsAlarmTable.getFormDefinition()'s base sections, minus
    // its 'Source' section (sourceId/sourceName/sourceType have no
    // equivalent on l8alarms's Alarm — see alarms-columns.js's comment on
    // the same mismatch), plus an alarm-specific 'Topology & Correlation'
    // section for the fields l8ui's base form has no equivalent for.
    AlmAlarms.forms = {
        Alarm: f.form('Alarm', [
            f.section('Alarm Information', [
                ...ro(f.text('name', 'Name')),
                ...ro(f.textarea('description', 'Description')),
                ...ro(f.select('severity', 'Severity', enums.ALARM_SEVERITY)),
                ...ro(f.select('state', 'State', enums.ALARM_STATE)),
                ...ro(f.reference('definitionId', 'Definition', 'AlarmDefinition'))
            ]),
            f.section('Timing', [
                ...ro(f.datetime('firstOccurrence', 'First Occurrence')),
                ...ro(f.datetime('lastOccurrence', 'Last Occurrence')),
                ...ro(f.number('occurrenceCount', 'Occurrence Count')),
                ...ro(f.text('acknowledgedBy', 'Acknowledged By')),
                ...ro(f.datetime('acknowledgedAt', 'Acknowledged At')),
                ...ro(f.text('clearedBy', 'Cleared By')),
                ...ro(f.datetime('clearedAt', 'Cleared At'))
            ]),
            f.section('Topology & Correlation', [
                ...ro(f.text('nodeId', 'Node ID')),
                ...ro(f.text('nodeName', 'Node Name')),
                ...ro(f.text('linkId', 'Link ID')),
                ...ro(f.text('location', 'Location')),
                ...ro(f.text('sourceIdentifier', 'Source Identifier')),
                ...ro(f.reference('rootCauseAlarmId', 'Root Cause Alarm', 'Alarm')),
                ...ro(f.reference('correlationRuleId', 'Correlation Rule', 'CorrelationRule')),
                ...ro(f.checkbox('isRootCause', 'Is Root Cause')),
                ...ro(f.number('symptomCount', 'Symptom Count'))
            ]),
            f.section('Notes', [
                ...f.inlineTable('notes', 'Notes', [
                    { key: 'noteId', label: 'ID', hidden: true },
                    { key: 'author', label: 'Author', type: 'text' },
                    { key: 'text', label: 'Text', type: 'text', required: true },
                    { key: 'createdAt', label: 'Created', type: 'date' }
                ])
            ])
        ]),

        AlarmDefinition: f.form('Alarm Definition', [
            f.section('Definition Details', [
                ...f.text('name', 'Name', true),
                ...f.textarea('description', 'Description'),
                ...f.select('status', 'Status', enums.ALARM_DEFINITION_STATUS),
                ...f.select('defaultSeverity', 'Default Severity', enums.ALARM_SEVERITY),
                ...f.text('eventPattern', 'Event Pattern'),
                ...f.text('nodeTypeFilter', 'Node Type Filter'),
                ...f.number('thresholdCount', 'Threshold Count'),
                ...f.number('thresholdWindowSeconds', 'Threshold Window (s)')
            ]),
            f.section('Auto-Clear Configuration', [
                ...f.checkbox('autoClearEnabled', 'Auto-Clear Enabled'),
                ...f.number('autoClearSeconds', 'Auto-Clear Seconds'),
                ...f.text('clearEventPattern', 'Clear Event Pattern')
            ]),
            f.section('Deduplication', [
                ...f.checkbox('dedupEnabled', 'Dedup Enabled'),
                ...f.text('dedupKeyExpression', 'Dedup Key Expression')
            ])
        ]),

        AlarmFilter: f.form('Alarm Filter', [
            f.section('Filter Details', [
                ...f.text('name', 'Name', true),
                ...f.text('owner', 'Owner', true),
                ...f.textarea('description', 'Description'),
                ...f.checkbox('isShared', 'Shared'),
                ...f.checkbox('isDefault', 'Default'),
                ...f.checkbox('rootCauseOnly', 'Root Cause Only'),
                ...f.checkbox('excludeSuppressed', 'Exclude Suppressed'),
                ...f.number('maxAgeHours', 'Max Age (hours)')
            ])
        ])
    };

    AlmAlarms.primaryKeys = {
        Alarm: 'alarmId',
        AlarmDefinition: 'definitionId',
        AlarmFilter: 'filterId'
    };

})();
