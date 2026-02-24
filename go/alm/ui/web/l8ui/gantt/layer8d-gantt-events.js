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
// Layer8D Gantt Events
// Zoom controls, task click, and horizontal scroll handlers.

(function() {
    'use strict';

    window.Layer8DGanttEvents = {
        attach(gantt) {
            const container = gantt.container;
            if (!container) return;

            // Zoom buttons
            container.querySelectorAll('[data-zoom]').forEach(btn => {
                btn.addEventListener('click', () => {
                    gantt.setZoom(btn.dataset.zoom);
                });
            });

            // Add button
            const addBtn = container.querySelector('[data-action="add"]');
            if (addBtn && gantt.onAdd) {
                addBtn.addEventListener('click', () => gantt.onAdd());
            }

            // Bar click
            if (gantt.onItemClick) {
                container.querySelectorAll('.layer8d-gantt-bar-click').forEach(bar => {
                    bar.addEventListener('click', () => {
                        const id = bar.dataset.id;
                        const item = gantt.data.find(d => String(gantt._getItemId(d)) === id);
                        if (item) gantt.onItemClick(item, id);
                    });
                });
            }

            // Label click
            if (gantt.onItemClick) {
                container.querySelectorAll('.layer8d-gantt-label').forEach(label => {
                    label.addEventListener('click', () => {
                        const id = label.dataset.id;
                        const item = gantt.data.find(d => String(gantt._getItemId(d)) === id);
                        if (item) gantt.onItemClick(item, id);
                    });
                });
            }
        }
    };

})();
