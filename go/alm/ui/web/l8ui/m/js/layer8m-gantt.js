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
// Layer8M Gantt - Mobile gantt chart with simplified horizontal scroll and touch.

(function() {
    'use strict';

    class Layer8MGantt {
        constructor(containerId, config) {
            this.containerId = containerId;
            this.config = config || {};

            this._gantt = new Layer8DGantt({
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
                container.classList.add('layer8m-gantt-container');
            }

            if (this.config.endpoint && this.config.modelName) {
                const ds = new Layer8MDataSource({
                    endpoint: Layer8MConfig.resolveEndpoint(this.config.endpoint),
                    modelName: this.config.modelName,
                    columns: this.config.columns || [],
                    pageSize: (this.config.viewConfig || {}).pageSize || 200
                });
                this._gantt.dataSource = ds;
            }
            this._gantt.init();
        }

        setData(items) { this._gantt.setData(items); }
        refresh() { this._gantt.refresh(); }
        destroy() { this._gantt.destroy(); }
    }

    window.Layer8MGantt = Layer8MGantt;

    if (window.Layer8MViewFactory) {
        Layer8MViewFactory.register('gantt', function(options) {
            return new Layer8MGantt(options.containerId, {
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
