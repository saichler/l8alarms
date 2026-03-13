(function() {
    'use strict';

    const col = Layer8ColumnFactory;
    const enums = L8EventsEnums;
    const f = Layer8FormFactory;

    window.L8EventsAlarmTable = {
        getColumns: function() {
            return [
                ...col.status('severity', 'Severity', null, enums.render.severity),
                ...col.col('name', 'Name'),
                ...col.col('sourceName', 'Source'),
                ...col.status('state', 'State', null, enums.render.alarmState),
                ...col.date('firstOccurrence', 'First Occurrence'),
                ...col.date('lastOccurrence', 'Last Occurrence'),
                ...col.number('occurrenceCount', 'Count'),
                ...col.col('acknowledgedBy', 'Acknowledged By')
            ];
        },

        getFormDefinition: function() {
            return f.form('Alarm Details', [
                f.section('Alarm Information', [
                    ...f.text('alarmId', 'Alarm ID'),
                    ...f.text('name', 'Name'),
                    ...f.textarea('description', 'Description'),
                    ...f.select('severity', 'Severity', enums.SEVERITY),
                    ...f.select('state', 'State', enums.ALARM_STATE),
                    ...f.text('definitionId', 'Definition ID')
                ]),
                f.section('Source', [
                    ...f.text('sourceId', 'Source ID'),
                    ...f.text('sourceName', 'Source Name'),
                    ...f.text('sourceType', 'Source Type')
                ]),
                f.section('Timing', [
                    ...f.date('firstOccurrence', 'First Occurrence'),
                    ...f.date('lastOccurrence', 'Last Occurrence'),
                    ...f.number('occurrenceCount', 'Occurrence Count')
                ]),
                f.section('Acknowledgement', [
                    ...f.text('acknowledgedBy', 'Acknowledged By'),
                    ...f.date('acknowledgedAt', 'Acknowledged At'),
                    ...f.text('clearedBy', 'Cleared By'),
                    ...f.date('clearedAt', 'Cleared At')
                ])
            ]);
        }
    };
})();
