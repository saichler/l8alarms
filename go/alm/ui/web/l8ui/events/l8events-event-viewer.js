(function() {
    'use strict';

    const col = Layer8ColumnFactory;
    const enums = L8EventsEnums;
    const f = Layer8FormFactory;

    window.L8EventsEventViewer = {
        getColumns: function() {
            return [
                ...col.date('occurredAt', 'Timestamp'),
                ...col.enum('category', 'Category', null, enums.render.eventCategory),
                ...col.col('eventType', 'Type'),
                ...col.status('severity', 'Severity', null, enums.render.severity),
                ...col.col('sourceName', 'Source'),
                ...col.col('message', 'Message'),
                ...col.status('state', 'State', null, enums.render.eventState)
            ];
        },

        getFormDefinition: function() {
            return f.form('Event Details', [
                f.section('Event Information', [
                    ...f.text('eventId', 'Event ID'),
                    ...f.select('category', 'Category', enums.EVENT_CATEGORY),
                    ...f.text('eventType', 'Event Type'),
                    ...f.select('severity', 'Severity', enums.SEVERITY),
                    ...f.select('state', 'State', enums.EVENT_STATE)
                ]),
                f.section('Source', [
                    ...f.text('sourceId', 'Source ID'),
                    ...f.text('sourceName', 'Source Name'),
                    ...f.text('sourceType', 'Source Type')
                ]),
                f.section('Content', [
                    ...f.textarea('message', 'Message')
                ]),
                f.section('Timing', [
                    ...f.date('occurredAt', 'Occurred At'),
                    ...f.date('receivedAt', 'Received At'),
                    ...f.date('processedAt', 'Processed At')
                ])
            ]);
        }
    };
})();
