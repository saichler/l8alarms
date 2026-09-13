/*
Layer 8 Alarms - Column Configurations
Table column definitions for Alarm, AlarmDefinition, AlarmFilter
*/

(function() {
    'use strict';

    window.AlmAlarms = window.AlmAlarms || {};

    const col = window.Layer8ColumnFactory;
    const render = AlmAlarms.render;

    // L8EventsAlarmTable.getColumns() covers severity/name/state/firstOccurrence/
    // lastOccurrence/occurrenceCount/acknowledgedBy, but its 'sourceName' column
    // has no equivalent on l8alarms's Alarm (which has nodeId/nodeName/linkId/
    // location/sourceIdentifier instead — see js-protobuf-field-names.md) — drop
    // it rather than alias a mismatched field. Append the alarm-specific columns
    // (nodeName, isRootCause, symptomCount) that l8ui has no equivalent for.
    const alarmColumns = L8EventsAlarmTable.getColumns()
        .filter((c) => c.key !== 'sourceName')
        .concat([
            ...col.col('nodeName', 'Node'),
            ...col.boolean('isRootCause', 'Root Cause'),
            ...col.col('symptomCount', 'Symptoms')
        ]);

    AlmAlarms.columns = {
        Alarm: alarmColumns,

        AlarmDefinition: [
            ...col.id('definitionId'),
            ...col.col('name', 'Name'),
            ...col.status('status', 'Status', null, render.definitionStatus),
            ...col.status('defaultSeverity', 'Default Severity', null, render.severity),
            ...col.col('eventPattern', 'Event Pattern'),
            ...col.col('thresholdCount', 'Threshold')
        ],

        AlarmFilter: [
            ...col.id('filterId'),
            ...col.col('name', 'Name'),
            ...col.col('owner', 'Owner'),
            ...col.boolean('isShared', 'Shared'),
            ...col.boolean('isDefault', 'Default')
        ]
    };

})();
