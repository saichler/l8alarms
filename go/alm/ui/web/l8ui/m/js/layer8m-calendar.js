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
// Layer8M Calendar - Mobile calendar (compact list-by-day).

(function() {
    'use strict';

    class Layer8MCalendar {
        constructor(containerId, config) {
            this.containerId = containerId;
            this.config = config || {};

            this._calendar = new Layer8DCalendar({
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
                container.classList.add('layer8m-calendar-container');
            }

            if (this.config.endpoint && this.config.modelName) {
                const ds = new Layer8MDataSource({
                    endpoint: Layer8MConfig.resolveEndpoint(this.config.endpoint),
                    modelName: this.config.modelName,
                    columns: this.config.columns || [],
                    pageSize: (this.config.viewConfig || {}).pageSize || 200
                });
                this._calendar.dataSource = ds;
            }
            this._calendar.init();
        }

        setData(items) { this._calendar.setData(items); }
        refresh() { this._calendar.refresh(); }
        destroy() { this._calendar.destroy(); }
    }

    window.Layer8MCalendar = Layer8MCalendar;

    if (window.Layer8MViewFactory) {
        Layer8MViewFactory.register('calendar', function(options) {
            return new Layer8MCalendar(options.containerId, {
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
