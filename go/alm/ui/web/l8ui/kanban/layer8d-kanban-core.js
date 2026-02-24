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
// Layer8D Kanban Core
// Kanban board with configurable lanes grouped by a data field.
// Uses Layer8DDataSource for data fetching.

(function() {
    'use strict';

    class Layer8DKanban {
        constructor(options) {
            this.containerId = options.containerId;
            this.columns = options.columns || [];
            this.dataSource = options.dataSource || null;
            this.viewConfig = options.viewConfig || {};
            this.onItemClick = options.onItemClick || null;
            this.onAdd = options.onAdd || null;
            this.onEdit = options.onEdit || null;
            this.onDelete = options.onDelete || null;
            this.onItemUpdate = options.onItemUpdate || null;
            this.primaryKey = options.primaryKey || 'id';
            this.addButtonText = options.addButtonText || 'Add';

            // Kanban config
            this.laneField = this.viewConfig.laneField || 'status';
            this.laneValues = this.viewConfig.laneValues || [];
            this.cardTitle = this.viewConfig.cardTitle
                || (Layer8DViewFactory.detectTitleField ? Layer8DViewFactory.detectTitleField(this.columns, this.primaryKey, this.laneField) : 'name');
            this.cardSubtitle = this.viewConfig.cardSubtitle || null;
            this.cardFields = this.viewConfig.cardFields || [];

            this.container = null;
            this.data = [];
            this.lanes = {};
        }

        init() {
            this.container = document.getElementById(this.containerId);
            if (!this.container) {
                console.error('Kanban container not found:', this.containerId);
                return;
            }
            this.container.classList.add('layer8d-kanban-container');

            if (this.dataSource) {
                this.dataSource._onDataLoaded = (result) => {
                    this.setData(result.items, result.totalCount);
                };
                this.dataSource.pageSize = this.viewConfig.pageSize || 200;
                this.dataSource.fetchData(1);
            }
        }

        setData(items) {
            this.data = items || [];
            this._groupByLanes();
            this._render();
        }

        refresh() {
            if (this.dataSource) {
                this.dataSource.fetchData(1);
            } else {
                this._render();
            }
        }

        destroy() {
            if (this.container) {
                this.container.classList.remove('layer8d-kanban-container');
                this.container.innerHTML = '';
            }
        }

        _groupByLanes() {
            this.lanes = {};

            // Initialize lanes from configured values
            if (this.laneValues.length > 0) {
                this.laneValues.forEach(lv => {
                    const key = String(lv.value !== undefined ? lv.value : lv.label);
                    this.lanes[key] = { config: lv, items: [] };
                });
            }

            // Group items
            this.data.forEach(item => {
                const val = String(this._getNestedValue(item, this.laneField) || 'Unknown');
                if (!this.lanes[val]) {
                    this.lanes[val] = { config: { value: val, label: val, color: '#6b7280' }, items: [] };
                }
                this.lanes[val].items.push(item);
            });
        }

        _render() {
            if (!this.container) return;
            Layer8DKanbanRender.render(this);
            Layer8DKanbanEvents.attach(this);
        }

        _getItemId(item) {
            return item[this.primaryKey] || item.id || '';
        }

        _getNestedValue(obj, key) {
            if (!key) return '';
            const keys = key.split('.');
            let value = obj;
            for (const k of keys) {
                if (value === null || value === undefined) return '';
                value = value[k];
            }
            return value !== null && value !== undefined ? value : '';
        }
    }

    window.Layer8DKanban = Layer8DKanban;

    // Register with view factory
    if (window.Layer8DViewFactory) {
        Layer8DViewFactory.register('kanban', function(options) {
            const ds = new Layer8DDataSource({
                endpoint: options.endpoint,
                modelName: options.modelName,
                columns: options.columns,
                pageSize: options.viewConfig?.pageSize || 200
            });
            return new Layer8DKanban({
                containerId: options.containerId,
                columns: options.columns,
                dataSource: ds,
                viewConfig: options.viewConfig || {},
                primaryKey: options.primaryKey,
                onItemClick: options.onRowClick,
                onAdd: options.onAdd,
                onEdit: options.onEdit,
                onDelete: options.onDelete,
                addButtonText: options.addButtonText
            });
        });
    }

})();
