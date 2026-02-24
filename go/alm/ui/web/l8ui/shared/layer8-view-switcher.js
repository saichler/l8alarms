/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
You may obtain a copy of the License at:

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
// Layer8 View Switcher
// Small icon button with floating dropdown for switching between view types.
// Always defaults to table view on navigation. Shared by desktop and mobile.

(function() {
    'use strict';

    const VIEW_LABELS = {
        table: 'Table View',
        chart: 'Chart View',
        kanban: 'Kanban Board',
        timeline: 'Timeline',
        calendar: 'Calendar',
        tree: 'Tree Grid',
        gantt: 'Gantt Chart',
        wizard: 'Wizard'
    };

    // SVG icon for the toggle button (grid/view icon)
    const VIEW_ICON = '<svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>';

    function closeAllMenus() {
        document.querySelectorAll('.l8-view-menu.open').forEach(m => m.classList.remove('open'));
    }

    // Close on outside click
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.l8-view-switcher')) {
            closeAllMenus();
        }
    });

    window.Layer8ViewSwitcher = {
        /**
         * Render an icon button with floating dropdown menu
         * @param {string} serviceKey - unique key for the switcher
         * @param {string[]} viewTypes - registered view types
         * @param {string} activeType - currently selected view type
         * @returns {string} HTML string
         */
        render(serviceKey, viewTypes, activeType) {
            if (!viewTypes || viewTypes.length < 2) return '';
            const items = viewTypes.map(type => {
                const active = type === activeType ? ' active' : '';
                const label = VIEW_LABELS[type] || type;
                const check = type === activeType ? '<span class="l8-view-menu-check">&#10003;</span>' : '<span class="l8-view-menu-check"></span>';
                return `<div class="l8-view-menu-item${active}" data-view-type="${type}">${check}${label}</div>`;
            }).join('');
            return `<div class="l8-view-switcher" data-service-key="${serviceKey}">
                <button class="l8-view-toggle" type="button" title="Switch view">${VIEW_ICON}</button>
                <div class="l8-view-menu">${items}</div>
            </div>`;
        },

        /**
         * Attach click handlers to a rendered switcher
         * @param {HTMLElement} container - parent element containing the switcher
         * @param {Function} onSwitch - callback(newViewType)
         */
        attach(container, onSwitch) {
            const switcher = container.querySelector('.l8-view-switcher');
            if (!switcher) return;
            const toggle = switcher.querySelector('.l8-view-toggle');
            const menu = switcher.querySelector('.l8-view-menu');
            if (!toggle || !menu) return;

            toggle.addEventListener('click', function(e) {
                e.stopPropagation();
                closeAllMenus();
                menu.classList.toggle('open');
            });

            menu.addEventListener('click', function(e) {
                const item = e.target.closest('.l8-view-menu-item');
                if (!item) return;
                const newType = item.getAttribute('data-view-type');
                const serviceKey = switcher.getAttribute('data-service-key');
                // Update active state
                menu.querySelectorAll('.l8-view-menu-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                menu.querySelectorAll('.l8-view-menu-check').forEach(c => c.textContent = '');
                item.querySelector('.l8-view-menu-check').textContent = '\u2713';
                menu.classList.remove('open');
                // No persistence — always default to table on navigation
                if (onSwitch) onSwitch(newType);
            });
        }
    };

})();
