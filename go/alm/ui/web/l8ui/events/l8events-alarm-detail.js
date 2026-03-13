(function() {
    'use strict';

    const enums = L8EventsEnums;

    window.L8EventsAlarmDetail = {
        render: function(container, alarm, options) {
            if (!container || !alarm) return;

            const opts = options || {};
            let html = '';

            html += L8EventsAlarmDetail._renderFields(alarm);

            if (opts.showStateHistory !== false && alarm.stateHistory && alarm.stateHistory.length > 0) {
                html += L8EventsAlarmDetail._renderStateHistory(alarm.stateHistory);
            }

            if (opts.showNotes !== false && alarm.notes && alarm.notes.length > 0) {
                html += L8EventsAlarmDetail._renderNotes(alarm.notes);
            }

            if (opts.onStateChange) {
                html += '<div class="l8events-detail-actions" id="l8events-state-actions"></div>';
            }

            container.innerHTML = html;

            if (opts.onStateChange) {
                const actionsContainer = container.querySelector('#l8events-state-actions');
                if (actionsContainer) {
                    L8EventsStateActions.render(actionsContainer, alarm, opts.onStateChange);
                }
            }
        },

        _renderFields: function(alarm) {
            const severityLabel = enums.SEVERITY.enum[alarm.severity] || 'Unknown';
            const stateLabel = enums.ALARM_STATE.enum[alarm.state] || 'Unknown';

            return `
                <div class="l8events-detail-section">
                    <h4>Alarm Information</h4>
                    <div class="l8events-detail-grid">
                        <div class="l8events-detail-field">
                            <label>Severity</label>
                            <span>${enums.render.severity(alarm.severity)}</span>
                        </div>
                        <div class="l8events-detail-field">
                            <label>State</label>
                            <span>${enums.render.alarmState(alarm.state)}</span>
                        </div>
                        <div class="l8events-detail-field">
                            <label>Name</label>
                            <span>${alarm.name || ''}</span>
                        </div>
                        <div class="l8events-detail-field">
                            <label>Source</label>
                            <span>${alarm.sourceName || alarm.sourceId || ''}</span>
                        </div>
                        <div class="l8events-detail-field">
                            <label>Occurrences</label>
                            <span>${alarm.occurrenceCount || 1}</span>
                        </div>
                    </div>
                </div>
            `;
        },

        _renderStateHistory: function(history) {
            let rows = '';
            for (let i = history.length - 1; i >= 0; i--) {
                const entry = history[i];
                const fromLabel = enums.ALARM_STATE.enum[entry.fromState] || '';
                const toLabel = enums.ALARM_STATE.enum[entry.toState] || '';
                const date = entry.changedAt ? new Date(entry.changedAt * 1000).toLocaleString() : '';

                rows += `
                    <div class="l8events-timeline-entry">
                        <div class="l8events-timeline-dot"></div>
                        <div class="l8events-timeline-content">
                            <span class="l8events-timeline-transition">${fromLabel} &rarr; ${toLabel}</span>
                            <span class="l8events-timeline-meta">${entry.changedBy || ''} ${date}</span>
                            ${entry.reason ? '<span class="l8events-timeline-reason">' + entry.reason + '</span>' : ''}
                        </div>
                    </div>
                `;
            }

            return `
                <div class="l8events-detail-section">
                    <h4>State History</h4>
                    <div class="l8events-timeline">${rows}</div>
                </div>
            `;
        },

        _renderNotes: function(notes) {
            let items = '';
            for (let i = notes.length - 1; i >= 0; i--) {
                const note = notes[i];
                const date = note.createdAt ? new Date(note.createdAt * 1000).toLocaleString() : '';
                items += `
                    <div class="l8events-note">
                        <div class="l8events-note-header">
                            <span class="l8events-note-author">${note.author || ''}</span>
                            <span class="l8events-note-date">${date}</span>
                        </div>
                        <div class="l8events-note-text">${note.text || ''}</div>
                    </div>
                `;
            }

            return `
                <div class="l8events-detail-section">
                    <h4>Notes</h4>
                    <div class="l8events-notes">${items}</div>
                </div>
            `;
        }
    };
})();
