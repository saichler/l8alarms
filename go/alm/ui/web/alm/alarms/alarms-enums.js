/*
Layer 8 Alarms - Enum Definitions using Layer8EnumFactory
*/

(function() {
    'use strict';

    const factory = window.Layer8EnumFactory;
    const { createStatusRenderer, renderEnum } = Layer8DRenderers;

    window.AlmAlarms = window.AlmAlarms || {};

    // ============================================================================
    // ENUM DEFINITIONS
    // ============================================================================

    // AlarmSeverity: 0=Unspecified, 1=Info, 2=Warning, 3=Minor, 4=Major, 5=Critical
    const ALARM_SEVERITY = factory.create([
        ['Unspecified', null, ''],
        ['Info', 'info', 'layer8d-status-info'],
        ['Warning', 'warning', 'layer8d-status-pending'],
        ['Minor', 'minor', 'layer8d-status-pending'],
        ['Major', 'major', 'layer8d-status-terminated'],
        ['Critical', 'critical', 'layer8d-status-terminated']
    ]);

    // AlarmState: 0=Unspecified, 1=Active, 2=Acknowledged, 3=Cleared, 4=Suppressed
    const ALARM_STATE = factory.create([
        ['Unspecified', null, ''],
        ['Active', 'active', 'layer8d-status-active'],
        ['Acknowledged', 'acknowledged', 'layer8d-status-pending'],
        ['Cleared', 'cleared', 'layer8d-status-inactive'],
        ['Suppressed', 'suppressed', 'layer8d-status-inactive']
    ]);

    // AlarmDefinitionStatus: 0=Unspecified, 1=Draft, 2=Active, 3=Disabled
    const ALARM_DEFINITION_STATUS = factory.create([
        ['Unspecified', null, ''],
        ['Draft', 'draft', 'layer8d-status-pending'],
        ['Active', 'active', 'layer8d-status-active'],
        ['Disabled', 'disabled', 'layer8d-status-inactive']
    ]);

    // EventType: 0=Unspecified, 1=Trap, 2=Syslog, 3=Threshold, 4=StateChange,
    //            5=Heartbeat, 6=Configuration, 7=Custom
    const EVENT_TYPE = factory.simple([
        'Unspecified', 'Trap', 'Syslog', 'Threshold', 'State Change',
        'Heartbeat', 'Configuration', 'Custom'
    ]);

    // ============================================================================
    // EXPORT ENUMS
    // ============================================================================

    AlmAlarms.enums = {
        ALARM_SEVERITY: ALARM_SEVERITY.enum,
        ALARM_SEVERITY_CLASSES: ALARM_SEVERITY.classes,
        ALARM_STATE: ALARM_STATE.enum,
        ALARM_STATE_CLASSES: ALARM_STATE.classes,
        ALARM_DEFINITION_STATUS: ALARM_DEFINITION_STATUS.enum,
        ALARM_DEFINITION_STATUS_CLASSES: ALARM_DEFINITION_STATUS.classes,
        EVENT_TYPE: EVENT_TYPE.enum
    };

    // ============================================================================
    // RENDERERS
    // ============================================================================

    AlmAlarms.render = {
        severity: createStatusRenderer(ALARM_SEVERITY.enum, ALARM_SEVERITY.classes),
        state: createStatusRenderer(ALARM_STATE.enum, ALARM_STATE.classes),
        definitionStatus: createStatusRenderer(ALARM_DEFINITION_STATUS.enum, ALARM_DEFINITION_STATUS.classes),
        eventType: (v) => renderEnum(v, EVENT_TYPE.enum)
    };

})();
