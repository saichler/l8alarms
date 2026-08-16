/*
Layer 8 Alarms - Archive Form Definitions
All fields are display-only (immutable archived records)
*/

(function() {
    'use strict';

    window.AlmArchive = window.AlmArchive || {};

    const f = Layer8FormFactory;
    const enums = AlmAlarms.enums;

    AlmArchive.forms = {
        ArchivedAlarm: f.form('Archived Alarm', [
            f.section('Alarm Details', [
                ...f.text('name', 'Name'),
                ...f.textarea('description', 'Description'),
                ...f.select('severity', 'Severity', enums.ALARM_SEVERITY),
                ...f.select('state', 'State', enums.ALARM_STATE),
                ...f.text('nodeId', 'Node ID'),
                ...f.text('nodeName', 'Node Name'),
                ...f.text('location', 'Location'),
                ...f.text('sourceIdentifier', 'Source Identifier')
            ]),
            f.section('Timing', [
                ...f.datetime('firstOccurrence', 'First Occurrence'),
                ...f.datetime('lastOccurrence', 'Last Occurrence'),
                ...f.datetime('acknowledgedAt', 'Acknowledged At'),
                ...f.datetime('clearedAt', 'Cleared At')
            ]),
            f.section('Archive Info', [
                ...f.datetime('archivedAt', 'Archived At'),
                ...f.text('archivedBy', 'Archived By')
            ])
        ])
    };

    AlmArchive.primaryKeys = {
        ArchivedAlarm: 'alarmId'
    };

})();
