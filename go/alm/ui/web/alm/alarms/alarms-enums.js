/*
Layer 8 Alarms - Enum Definitions
Uses shared L8EventsEnums for severity/state, keeps alarm-specific enums local.
*/

(function() {
    'use strict';

    const factory = window.Layer8EnumFactory;
    const { createStatusRenderer } = Layer8DRenderers;

    window.AlmAlarms = window.AlmAlarms || {};

    // ============================================================================
    // SHARED ENUMS (from l8events)
    // ============================================================================

    const ALARM_SEVERITY = L8EventsEnums.SEVERITY;
    const ALARM_STATE = L8EventsEnums.ALARM_STATE;

    // ============================================================================
    // ALARM-SPECIFIC ENUMS
    // ============================================================================

    // AlarmDefinitionStatus: 0=Unspecified, 1=Draft, 2=Active, 3=Disabled
    const ALARM_DEFINITION_STATUS = factory.create([
        ['Unspecified', null, ''],
        ['Draft', 'draft', 'layer8d-status-pending'],
        ['Active', 'active', 'layer8d-status-active'],
        ['Disabled', 'disabled', 'layer8d-status-inactive']
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
        ALARM_DEFINITION_STATUS_CLASSES: ALARM_DEFINITION_STATUS.classes
    };

    // ============================================================================
    // RENDERERS
    // ============================================================================

    AlmAlarms.render = {
        severity: L8EventsEnums.render.severity,
        state: L8EventsEnums.render.alarmState,
        definitionStatus: createStatusRenderer(ALARM_DEFINITION_STATUS.enum, ALARM_DEFINITION_STATUS.classes)
    };

})();
