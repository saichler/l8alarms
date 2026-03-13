(function() {
    'use strict';

    var ACTIONS_BY_STATE = {
        1: [ // ACTIVE
            { state: 2, label: 'Acknowledge', className: 'l8events-action-acknowledge' },
            { state: 3, label: 'Clear', className: 'l8events-action-clear' },
            { state: 4, label: 'Suppress', className: 'l8events-action-suppress' }
        ],
        2: [ // ACKNOWLEDGED
            { state: 3, label: 'Clear', className: 'l8events-action-clear' },
            { state: 4, label: 'Suppress', className: 'l8events-action-suppress' }
        ],
        4: [ // SUPPRESSED
            { state: 1, label: 'Reactivate', className: 'l8events-action-reactivate' },
            { state: 2, label: 'Acknowledge', className: 'l8events-action-acknowledge' },
            { state: 3, label: 'Clear', className: 'l8events-action-clear' }
        ]
        // 3 (CLEARED) — terminal, no actions
    };

    window.L8EventsStateActions = {
        render: function(container, alarm, onAction) {
            if (!container || !alarm) return;

            var actions = L8EventsStateActions.getAvailableActions(alarm.state);
            if (actions.length === 0) {
                container.innerHTML = '<span class="l8events-no-actions">No actions available</span>';
                return;
            }

            var html = '<div class="l8events-state-actions">';
            for (var i = 0; i < actions.length; i++) {
                var action = actions[i];
                html += '<button type="button" class="layer8d-btn layer8d-btn-small ' +
                    action.className + '" data-state="' + action.state + '">' +
                    action.label + '</button>';
            }
            html += '</div>';

            container.innerHTML = html;

            var buttons = container.querySelectorAll('[data-state]');
            for (var j = 0; j < buttons.length; j++) {
                buttons[j].addEventListener('click', function() {
                    var newState = parseInt(this.getAttribute('data-state'), 10);
                    if (onAction) {
                        onAction(alarm.alarmId, newState, '');
                    }
                });
            }
        },

        getAvailableActions: function(currentState) {
            return ACTIONS_BY_STATE[currentState] || [];
        }
    };
})();
