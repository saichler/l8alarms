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
// Layer8M Chart - Mobile Chart Component
// Reuses desktop chart renderers (Layer8DChartBar, Line, Pie) with mobile data source.

(function() {
    'use strict';

    class Layer8MChart {
        constructor(containerId, config) {
            this.containerId = containerId;
            this.config = config || {};
            this.viewConfig = config.viewConfig || {};
            this.dataSource = config.dataSource || null;

            // Delegate to desktop chart core for rendering
            this._chart = new Layer8DChart({
                containerId: containerId,
                columns: config.columns || [],
                viewConfig: this.viewConfig,
                onItemClick: config.onCardClick || null
            });
        }

        init() {
            const container = document.getElementById(this.containerId);
            if (container) {
                container.classList.add('layer8m-chart-container');
            }

            if (this.dataSource) {
                this._chart.dataSource = this.dataSource;
                this._chart.init();
            } else if (this.config.endpoint && this.config.modelName) {
                const ds = new Layer8MDataSource({
                    endpoint: Layer8MConfig.resolveEndpoint(this.config.endpoint),
                    modelName: this.config.modelName,
                    columns: this.config.columns || [],
                    pageSize: this.viewConfig.pageSize || 100
                });
                this._chart.dataSource = ds;
                this._chart.init();
            }
        }

        setData(items, total) {
            this._chart.setData(items, total);
        }

        refresh() {
            this._chart.refresh();
        }

        destroy() {
            this._chart.destroy();
        }
    }

    window.Layer8MChart = Layer8MChart;

    // Register with mobile view factory
    if (window.Layer8MViewFactory) {
        Layer8MViewFactory.register('chart', function(options) {
            return new Layer8MChart(options.containerId, {
                endpoint: options.endpoint,
                modelName: options.modelName,
                columns: options.columns,
                viewConfig: options.viewConfig || {},
                onCardClick: options.onRowClick
            });
        });
    }

})();
