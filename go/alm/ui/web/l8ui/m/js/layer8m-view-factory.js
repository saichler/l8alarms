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
// Layer8M View Factory
// Mobile registry of view type constructors.
// Default viewType is 'table' (Layer8MTable/Layer8MEditTable).

(function() {
    'use strict';

    const _viewTypes = {};

    window.Layer8MViewFactory = {
        register(type, factoryFn) {
            _viewTypes[type] = factoryFn;
        },

        create(type, options) {
            const factory = _viewTypes[type];
            if (!factory) {
                console.warn(`Unknown mobile view type "${type}", falling back to table`);
                return _viewTypes['table'] ? _viewTypes['table'](options) : null;
            }
            return factory(options);
        },

        has(type) {
            return !!_viewTypes[type];
        },

        getTypes() {
            return Object.keys(_viewTypes);
        }
    };

    // Auto-register 'table' view type (Layer8MEditTable)
    Layer8MViewFactory.register('table', function(options) {
        return new Layer8MEditTable(options.containerId, {
            endpoint: Layer8MConfig.resolveEndpoint(options.endpoint),
            modelName: options.modelName,
            columns: options.columns,
            rowsPerPage: options.pageSize || 15,
            statusField: options.statusField || 'status',
            addButtonText: options.addButtonText,
            onAdd: options.onAdd,
            onEdit: options.onEdit,
            onDelete: options.onDelete,
            onRowClick: options.onRowClick,
            transformData: options.transformData,
            onDataLoaded: options.onDataLoaded
        });
    });

})();
