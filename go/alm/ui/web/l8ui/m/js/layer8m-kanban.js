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
// Layer8M Kanban - Mobile Kanban Component
// Vertical stacked lanes for mobile (no drag-and-drop on mobile, tap to move).

(function() {
    'use strict';

    class Layer8MKanban {
        constructor(containerId, config) {
            this.containerId = containerId;
            this.config = config || {};
            this.viewConfig = config.viewConfig || {};

            // Reuse desktop kanban with vertical layout
            this._kanban = new Layer8DKanban({
                containerId: containerId,
                columns: config.columns || [],
                viewConfig: this.viewConfig,
                primaryKey: config.primaryKey || config.idField || 'id',
                onItemClick: config.onCardClick || null,
                onAdd: config.onAdd || null,
                addButtonText: config.addButtonText || 'Add'
            });
        }

        init() {
            const container = document.getElementById(this.containerId);
            if (container) {
                container.classList.add('layer8m-kanban-container');
            }

            if (this.config.endpoint && this.config.modelName) {
                const ds = new Layer8MDataSource({
                    endpoint: Layer8MConfig.resolveEndpoint(this.config.endpoint),
                    modelName: this.config.modelName,
                    columns: this.config.columns || [],
                    pageSize: this.viewConfig.pageSize || 200
                });
                this._kanban.dataSource = ds;
            }
            this._kanban.init();
        }

        setData(items) {
            this._kanban.setData(items);
        }

        refresh() {
            this._kanban.refresh();
        }

        destroy() {
            this._kanban.destroy();
        }
    }

    window.Layer8MKanban = Layer8MKanban;

    // Register with mobile view factory
    if (window.Layer8MViewFactory) {
        Layer8MViewFactory.register('kanban', function(options) {
            return new Layer8MKanban(options.containerId, {
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
