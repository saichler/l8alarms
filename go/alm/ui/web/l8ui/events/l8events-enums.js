(function() {
    'use strict';

    const { createStatusRenderer, renderEnum } = Layer8DRenderers;

    const SEVERITY = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'Info' },
        { value: 2, label: 'Warning' },
        { value: 3, label: 'Minor' },
        { value: 4, label: 'Major' },
        { value: 5, label: 'Critical' }
    ]);

    const SEVERITY_CLASSES = {
        0: '',
        1: 'status-muted',
        2: 'status-info',
        3: 'status-warning',
        4: 'status-warning-high',
        5: 'status-error'
    };

    const ALARM_STATE = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'Active' },
        { value: 2, label: 'Acknowledged' },
        { value: 3, label: 'Cleared' },
        { value: 4, label: 'Suppressed' }
    ]);

    const ALARM_STATE_CLASSES = {
        0: '',
        1: 'status-error',
        2: 'status-info',
        3: 'status-success',
        4: 'status-muted'
    };

    const EVENT_STATE = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'New' },
        { value: 2, label: 'Processed' },
        { value: 3, label: 'Discarded' },
        { value: 4, label: 'Archived' }
    ]);

    const EVENT_STATE_CLASSES = {
        0: '',
        1: 'status-info',
        2: 'status-success',
        3: 'status-muted',
        4: 'status-muted'
    };

    const EVENT_CATEGORY = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'Audit' },
        { value: 2, label: 'System' },
        { value: 3, label: 'Monitoring' },
        { value: 4, label: 'Security' },
        { value: 5, label: 'Integration' },
        { value: 6, label: 'Custom' },
        { value: 7, label: 'Network' },
        { value: 8, label: 'Kubernetes' },
        { value: 9, label: 'Performance' },
        { value: 10, label: 'Syslog' },
        { value: 11, label: 'Trap' },
        { value: 12, label: 'Compute' },
        { value: 13, label: 'Storage' },
        { value: 14, label: 'Power' },
        { value: 15, label: 'GPU' },
        { value: 16, label: 'Topology' },
        { value: 17, label: 'Automation' }
    ]);

    const MAINTENANCE_STATUS = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'Scheduled' },
        { value: 2, label: 'Active' },
        { value: 3, label: 'Completed' },
        { value: 4, label: 'Cancelled' }
    ]);

    const MAINTENANCE_STATUS_CLASSES = {
        0: '',
        1: 'status-info',
        2: 'status-warning',
        3: 'status-success',
        4: 'status-muted'
    };

    const RECURRENCE_TYPE = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'None' },
        { value: 2, label: 'Daily' },
        { value: 3, label: 'Weekly' },
        { value: 4, label: 'Monthly' }
    ]);

    window.L8EventsEnums = {
        SEVERITY: SEVERITY,
        ALARM_STATE: ALARM_STATE,
        EVENT_STATE: EVENT_STATE,
        EVENT_CATEGORY: EVENT_CATEGORY,
        MAINTENANCE_STATUS: MAINTENANCE_STATUS,
        RECURRENCE_TYPE: RECURRENCE_TYPE,
        render: {
            severity: createStatusRenderer(SEVERITY.enum, SEVERITY_CLASSES),
            alarmState: createStatusRenderer(ALARM_STATE.enum, ALARM_STATE_CLASSES),
            eventState: createStatusRenderer(EVENT_STATE.enum, EVENT_STATE_CLASSES),
            eventCategory: (value) => renderEnum(value, EVENT_CATEGORY.enum),
            maintenanceStatus: createStatusRenderer(MAINTENANCE_STATUS.enum, MAINTENANCE_STATUS_CLASSES),
            recurrenceType: (value) => renderEnum(value, RECURRENCE_TYPE.enum)
        }
    };
})();
