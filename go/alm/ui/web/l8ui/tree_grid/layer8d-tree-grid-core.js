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
// Layer8D Tree Grid Core
// Expandable hierarchical table for tree-structured data (chart of accounts, org chart, BOM).

(function() {
    'use strict';

    class Layer8DTreeGrid {
        constructor(options) {
            this.containerId = options.containerId;
            this.columns = options.columns || [];
            this.dataSource = options.dataSource || null;
            this.viewConfig = options.viewConfig || {};
            this.onItemClick = options.onItemClick || null;
            this.onAdd = options.onAdd || null;
            this.onEdit = options.onEdit || null;
            this.onDelete = options.onDelete || null;
            this.primaryKey = options.primaryKey || 'id';
            this.addButtonText = options.addButtonText || 'Add';

            // Tree config
            this.parentIdField = this.viewConfig.parentIdField || 'parentId';
            this.idField = this.viewConfig.idField || this.primaryKey;
            this.labelField = this.viewConfig.labelField
                || (Layer8DViewFactory.detectTitleField ? Layer8DViewFactory.detectTitleField(this.columns, this.primaryKey) : 'name');
            this.expandedByDefault = this.viewConfig.expandedByDefault !== false;

            this.container = null;
            this.data = [];
            this.tree = [];
            this.expandedNodes = {};
        }

        init() {
            this.container = document.getElementById(this.containerId);
            if (!this.container) {
                console.error('TreeGrid container not found:', this.containerId);
                return;
            }
            this.container.classList.add('layer8d-tree-grid-container');

            if (this.dataSource) {
                this.dataSource._onDataLoaded = (result) => {
                    this.setData(result.items, result.totalCount);
                };
                this.dataSource.pageSize = this.viewConfig.pageSize || 500;
                this.dataSource.fetchData(1);
            }
        }

        setData(items) {
            this.data = items || [];
            this._buildTree();
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
                this.container.classList.remove('layer8d-tree-grid-container');
                this.container.innerHTML = '';
            }
        }

        toggleNode(nodeId) {
            this.expandedNodes[nodeId] = !this.expandedNodes[nodeId];
            this._render();
        }

        expandAll() {
            this.data.forEach(item => {
                this.expandedNodes[this._getItemId(item)] = true;
            });
            this._render();
        }

        collapseAll() {
            this.expandedNodes = {};
            this._render();
        }

        _buildTree() {
            const map = {};
            const roots = [];

            // Build lookup map
            this.data.forEach(item => {
                const id = String(this._getItemId(item));
                map[id] = { item, children: [] };
                if (this.expandedByDefault) {
                    this.expandedNodes[id] = true;
                }
            });

            // Build parent-child relationships
            this.data.forEach(item => {
                const id = String(this._getItemId(item));
                const parentId = String(this._getNestedValue(item, this.parentIdField) || '');

                if (parentId && map[parentId]) {
                    map[parentId].children.push(map[id]);
                } else {
                    roots.push(map[id]);
                }
            });

            this.tree = roots;
        }

        _render() {
            if (!this.container) return;
            Layer8DTreeGridRender.render(this);
            Layer8DTreeGridEvents.attach(this);
        }

        _getItemId(item) {
            return item[this.idField] || item[this.primaryKey] || item.id || '';
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

        _hasChildren(nodeId) {
            const findNode = (nodes) => {
                for (const n of nodes) {
                    if (String(this._getItemId(n.item)) === String(nodeId)) {
                        return n.children.length > 0;
                    }
                    const found = findNode(n.children);
                    if (found !== null) return found;
                }
                return null;
            };
            return findNode(this.tree) || false;
        }
    }

    window.Layer8DTreeGrid = Layer8DTreeGrid;

    // Register with view factory
    if (window.Layer8DViewFactory) {
        Layer8DViewFactory.register('tree', function(options) {
            const ds = new Layer8DDataSource({
                endpoint: options.endpoint,
                modelName: options.modelName,
                columns: options.columns,
                pageSize: options.viewConfig?.pageSize || 500
            });
            return new Layer8DTreeGrid({
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
