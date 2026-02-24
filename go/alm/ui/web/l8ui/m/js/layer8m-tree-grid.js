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
// Layer8M Tree Grid - Mobile nested card view for hierarchical data.

(function() {
    'use strict';

    class Layer8MTreeGrid {
        constructor(containerId, config) {
            this.containerId = containerId;
            this.config = config || {};

            this._treeGrid = new Layer8DTreeGrid({
                containerId: containerId,
                columns: config.columns || [],
                viewConfig: config.viewConfig || {},
                primaryKey: config.primaryKey || config.idField || 'id',
                onItemClick: config.onCardClick || null,
                onAdd: config.onAdd || null,
                addButtonText: config.addButtonText || 'Add'
            });
        }

        init() {
            const container = document.getElementById(this.containerId);
            if (container) {
                container.classList.add('layer8m-tree-grid-container');
            }

            if (this.config.endpoint && this.config.modelName) {
                const ds = new Layer8MDataSource({
                    endpoint: Layer8MConfig.resolveEndpoint(this.config.endpoint),
                    modelName: this.config.modelName,
                    columns: this.config.columns || [],
                    pageSize: (this.config.viewConfig || {}).pageSize || 500
                });
                this._treeGrid.dataSource = ds;
            }
            this._treeGrid.init();
        }

        setData(items) { this._treeGrid.setData(items); }
        refresh() { this._treeGrid.refresh(); }
        destroy() { this._treeGrid.destroy(); }
    }

    window.Layer8MTreeGrid = Layer8MTreeGrid;

    if (window.Layer8MViewFactory) {
        Layer8MViewFactory.register('tree', function(options) {
            return new Layer8MTreeGrid(options.containerId, {
                endpoint: options.endpoint,
                modelName: options.modelName,
                columns: options.columns,
                viewConfig: options.viewConfig || {},
                primaryKey: options.primaryKey,
                onCardClick: options.onRowClick,
                onAdd: options.onAdd,
                addButtonText: options.addButtonText
            });
        });
    }

})();
