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
// Layer8D Kanban Render
// Lane and card rendering for the kanban board.

(function() {
    'use strict';

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str || '');
        return div.innerHTML;
    }

    window.Layer8DKanbanRender = {
        render(kanban) {
            const container = kanban.container;
            if (!container) return;

            let html = '<div class="layer8d-kanban-board">';

            // Add button
            if (kanban.onAdd) {
                html += `<div class="layer8d-kanban-toolbar">
                    <button class="layer8d-btn layer8d-btn-primary layer8d-btn-small" data-action="add">${escapeHtml(kanban.addButtonText)}</button>
                </div>`;
            }

            html += '<div class="layer8d-kanban-lanes">';

            const laneKeys = Object.keys(kanban.lanes);
            laneKeys.forEach(key => {
                const lane = kanban.lanes[key];
                const fallbackColor = (typeof Layer8DChart !== 'undefined')
                    ? Layer8DChart.readThemeColor('--layer8d-text-muted', '#718096') : '#718096';
                const color = lane.config.color || fallbackColor;
                const label = lane.config.label || key;

                html += `<div class="layer8d-kanban-lane" data-lane="${escapeHtml(key)}">
                    <div class="layer8d-kanban-lane-header" style="border-top-color: ${color}">
                        <span class="layer8d-kanban-lane-title">${escapeHtml(label)}</span>
                        <span class="layer8d-kanban-lane-count">${lane.items.length}</span>
                    </div>
                    <div class="layer8d-kanban-lane-body" data-lane="${escapeHtml(key)}">`;

                lane.items.forEach(item => {
                    html += this._renderCard(kanban, item);
                });

                html += `</div></div>`;
            });

            html += '</div></div>';
            container.innerHTML = html;
        },

        _renderCard(kanban, item) {
            const id = kanban._getItemId(item);
            const title = kanban._getNestedValue(item, kanban.cardTitle) || 'Untitled';
            const subtitle = kanban.cardSubtitle
                ? kanban._getNestedValue(item, kanban.cardSubtitle)
                : '';

            let fieldsHtml = '';
            if (kanban.cardFields.length > 0) {
                fieldsHtml = '<div class="layer8d-kanban-card-fields">';
                kanban.cardFields.forEach(f => {
                    const col = kanban.columns.find(c => c.key === f);
                    const label = col ? col.label : f;
                    let value;
                    if (col && col.render) {
                        value = col.render(item);
                    } else {
                        value = escapeHtml(kanban._getNestedValue(item, f));
                    }
                    fieldsHtml += `<div class="layer8d-kanban-card-field">
                        <span class="layer8d-kanban-field-label">${escapeHtml(label)}</span>
                        <span class="layer8d-kanban-field-value">${value}</span>
                    </div>`;
                });
                fieldsHtml += '</div>';
            }

            return `<div class="layer8d-kanban-card" draggable="true" data-id="${escapeHtml(id)}">
                <div class="layer8d-kanban-card-title">${escapeHtml(title)}</div>
                ${subtitle ? `<div class="layer8d-kanban-card-subtitle">${escapeHtml(subtitle)}</div>` : ''}
                ${fieldsHtml}
            </div>`;
        }
    };

})();
