/*
Layer 8 Alarms - Archive Column Definitions
Table column configurations for ArchivedAlarm
*/

(function() {
    'use strict';

    window.AlmArchive = window.AlmArchive || {};

    const col = Layer8ColumnFactory;
    const render = AlmArchive.render;

    AlmArchive.columns = {
        ArchivedAlarm: [
            ...col.id('alarmId'),
            ...col.col('name', 'Name'),
            ...col.status('severity', 'Severity', null, render.severity),
            ...col.status('state', 'State', null, render.state),
            ...col.col('nodeName', 'Node'),
            ...col.datetime('firstOccurrence', 'First Occurrence'),
            ...col.datetime('archivedAt', 'Archived At'),
            ...col.col('archivedBy', 'Archived By')
        ]
    };

})();
