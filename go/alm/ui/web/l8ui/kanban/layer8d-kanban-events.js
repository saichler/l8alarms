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
// Layer8D Kanban Events
// HTML5 drag-and-drop, card click, and add button handlers.

(function() {
    'use strict';

    let draggedCard = null;
    let draggedId = null;

    window.Layer8DKanbanEvents = {
        attach(kanban) {
            const container = kanban.container;
            if (!container) return;

            // Add button
            const addBtn = container.querySelector('[data-action="add"]');
            if (addBtn && kanban.onAdd) {
                addBtn.addEventListener('click', () => kanban.onAdd());
            }

            // Card click
            container.querySelectorAll('.layer8d-kanban-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.defaultPrevented) return;
                    const id = card.dataset.id;
                    const item = kanban.data.find(d => String(kanban._getItemId(d)) === id);
                    if (item && kanban.onItemClick) {
                        kanban.onItemClick(item, id);
                    }
                });
            });

            // Drag start
            container.querySelectorAll('.layer8d-kanban-card').forEach(card => {
                card.addEventListener('dragstart', (e) => {
                    draggedCard = card;
                    draggedId = card.dataset.id;
                    card.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', draggedId);
                });

                card.addEventListener('dragend', () => {
                    if (draggedCard) {
                        draggedCard.classList.remove('dragging');
                    }
                    draggedCard = null;
                    draggedId = null;
                    container.querySelectorAll('.layer8d-kanban-lane-body').forEach(lb => {
                        lb.classList.remove('drag-over');
                    });
                });
            });

            // Drop zones (lane bodies)
            container.querySelectorAll('.layer8d-kanban-lane-body').forEach(laneBody => {
                laneBody.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    laneBody.classList.add('drag-over');
                });

                laneBody.addEventListener('dragleave', () => {
                    laneBody.classList.remove('drag-over');
                });

                laneBody.addEventListener('drop', (e) => {
                    e.preventDefault();
                    laneBody.classList.remove('drag-over');

                    const newLane = laneBody.dataset.lane;
                    if (!draggedId || !newLane) return;

                    const item = kanban.data.find(d => String(kanban._getItemId(d)) === draggedId);
                    if (!item) return;

                    const oldLane = String(kanban._getNestedValue(item, kanban.laneField));
                    if (oldLane === newLane) return;

                    // Update the item's lane field locally
                    this._setNestedValue(item, kanban.laneField, this._parseLaneValue(newLane, kanban));

                    // Notify parent for server-side update
                    if (kanban.onItemUpdate) {
                        kanban.onItemUpdate(item, kanban.laneField, newLane, oldLane);
                    }

                    // Re-group and re-render
                    kanban._groupByLanes();
                    kanban._render();
                });
            });
        },

        _setNestedValue(obj, key, value) {
            const keys = key.split('.');
            let target = obj;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!target[keys[i]]) target[keys[i]] = {};
                target = target[keys[i]];
            }
            target[keys[keys.length - 1]] = value;
        },

        _parseLaneValue(value, kanban) {
            // If lane values use numeric values, parse as number
            const laneConfig = kanban.laneValues.find(lv => String(lv.value) === value);
            if (laneConfig && typeof laneConfig.value === 'number') {
                return laneConfig.value;
            }
            return value;
        }
    };

})();
