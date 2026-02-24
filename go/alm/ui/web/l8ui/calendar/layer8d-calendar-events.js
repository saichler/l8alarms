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
// Layer8D Calendar Events
// Navigation, view toggle, and event click handlers.

(function() {
    'use strict';

    window.Layer8DCalendarEvents = {
        attach(cal) {
            const container = cal.container;
            if (!container) return;

            // Prev/Next buttons
            container.querySelectorAll('[data-action="prev"]').forEach(btn => {
                btn.addEventListener('click', () => cal.prevMonth());
            });
            container.querySelectorAll('[data-action="next"]').forEach(btn => {
                btn.addEventListener('click', () => cal.nextMonth());
            });

            // Today button
            container.querySelectorAll('[data-action="today"]').forEach(btn => {
                btn.addEventListener('click', () => cal.today());
            });

            // View mode toggles
            container.querySelectorAll('[data-view]').forEach(btn => {
                btn.addEventListener('click', () => {
                    cal.setViewMode(btn.dataset.view);
                });
            });

            // Add button
            const addBtn = container.querySelector('[data-action="add"]');
            if (addBtn && cal.onAdd) {
                addBtn.addEventListener('click', () => cal.onAdd());
            }

            // Event click
            if (cal.onItemClick) {
                container.querySelectorAll('.layer8d-calendar-event').forEach(el => {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const id = el.dataset.id;
                        const item = cal.data.find(d => String(cal._getItemId(d)) === id);
                        if (item) cal.onItemClick(item, id);
                    });
                });
            }
        }
    };

})();
