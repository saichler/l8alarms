/*
Layer 8 Alarms - Detail Popup via shared l8ui/events components

Replaces the generic form-based Alarm detail popup with
L8EventsAlarmDetail.render(), which auto-mounts L8EventsStateActions for
Acknowledge/Clear transition buttons. Alarm has no PUT endpoint at all (see
AlarmService.go) — state transitions go through PATCH here, never a
whole-record save.

Wraps the popup body in the same .probler-popup-tabs/.probler-popup-tab-content
shell generateFormHtml() would have produced, so alarms-correlation-tree.js's
existing "Correlation" tab injection (which looks for that exact structure,
loads after this file, and wraps Alm._showDetailsModal a second time) keeps
working unmodified.

Loads after alm-init.js (so Alm._showDetailsModal exists) and before
alarms-correlation-tree.js (so that file's wrap sees this one).
*/

(function() {
    'use strict';

    if (typeof Alm === 'undefined' || typeof L8EventsAlarmDetail === 'undefined') return;

    // Backend PATCH scope (protect_fields.go's protectPatchFields) only ever
    // allows State -> ACKNOWLEDGED or CLEARED — never SUPPRESSED, never ACTIVE
    // ("Reactivate"). L8EventsStateActions is a shared, unforked l8ui
    // component (l8ui-no-project-specific-code.md), so the restriction is
    // applied here by filtering its result rather than editing the component.
    var origGetAvailableActions = L8EventsStateActions.getAvailableActions;
    L8EventsStateActions.getAvailableActions = function(currentState) {
        return origGetAvailableActions(currentState).filter(function(action) {
            return action.label !== 'Reactivate' && action.label !== 'Suppress';
        });
    };

    var origShowDetails = Alm._showDetailsModal;

    Alm._showDetailsModal = async function(service, item, itemId) {
        if (service.model !== 'Alarm') {
            return origShowDetails.call(Alm, service, item, itemId);
        }

        var data = item;
        if (itemId && typeof Layer8DFormsData !== 'undefined') {
            try {
                var freshRecord = await Layer8DFormsData.fetchRecord(
                    Layer8DConfig.resolveEndpoint(service.endpoint), 'alarmId', itemId, 'Alarm');
                if (freshRecord) data = freshRecord;
            } catch (e) {
                // Fall back to table row data
            }
        }

        var content =
            '<div class="probler-popup-tabs">' +
                '<div class="probler-popup-tab active" data-tab="details">Details</div>' +
            '</div>' +
            '<div class="probler-popup-tab-content">' +
                '<div class="probler-popup-tab-pane active" data-pane="details" id="alm-alarm-detail-pane"></div>' +
            '</div>';

        Layer8DPopup.show({
            title: 'Alarm Details',
            content: content,
            size: 'large',
            showFooter: false,
            onShow: function(body) {
                var pane = body.querySelector('#alm-alarm-detail-pane');
                if (!pane) return;
                L8EventsAlarmDetail.render(pane, data, {
                    showStateHistory: true,
                    showNotes: true,
                    onStateChange: function(alarmId, newState) {
                        patchAlarmState(service, alarmId, newState);
                    }
                });
            }
        });
    };

    async function patchAlarmState(service, alarmId, newState) {
        var username = sessionStorage.getItem('currentUser') || 'Admin';
        var patch = { alarm_id: alarmId, state: newState };
        if (newState === 2) patch.acknowledged_by = username; // ACKNOWLEDGED
        if (newState === 3) patch.cleared_by = username;       // CLEARED

        try {
            var resp = await fetch(Layer8DConfig.resolveEndpoint(service.endpoint), {
                method: 'PATCH',
                headers: Object.assign(
                    { 'Content-Type': 'application/json' },
                    typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}
                ),
                body: JSON.stringify(patch)
            });
            if (!resp.ok) throw new Error('PATCH failed with status ' + resp.status);

            Layer8DNotification.success('Alarm updated');
            Layer8DPopup.close();

            var tableId = Alm._state.currentModule + '-' + service.key + '-table';
            var table = Alm._state.serviceTables[tableId];
            if (table) table.fetchData(1, table.pageSize);
        } catch (e) {
            Layer8DNotification.error('Failed to update alarm', [e.message]);
        }
    }
})();
