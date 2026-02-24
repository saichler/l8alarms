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
// Layer8D View Factory
// Registry of view type constructors. Creates the appropriate view component
// based on the service's viewType configuration.
// Default viewType is 'table' (Layer8DTable).

(function() {
    'use strict';

    // Internal registry: { viewType: factoryFn }
    const _viewTypes = {};

    window.Layer8DViewFactory = {
        /**
         * Register a view type constructor
         * @param {string} type - view type name (e.g., 'table', 'chart', 'kanban')
         * @param {Function} factoryFn - function(options) that returns a view instance
         */
        register(type, factoryFn) {
            _viewTypes[type] = factoryFn;
        },

        /**
         * Create a view instance for the given type
         * @param {string} type - view type name
         * @param {Object} options - view configuration
         * @returns {Object} view instance with init(), refresh(), destroy() methods
         */
        create(type, options) {
            const factory = _viewTypes[type];
            if (!factory) {
                console.warn(`Unknown view type "${type}", falling back to table`);
                return _viewTypes['table'] ? _viewTypes['table'](options) : null;
            }
            return factory(options);
        },

        /**
         * Check if a view type is registered
         */
        has(type) {
            return !!_viewTypes[type];
        },

        /**
         * Get list of registered view types
         */
        getTypes() {
            return Object.keys(_viewTypes);
        },

        /**
         * Detect a suitable title/label field from columns.
         * Skips the primary key and any lane/status field, then searches for
         * common title patterns (name, title, subject, number, code, description).
         * Falls back to the first non-PK column.
         * @param {Array} columns - column definitions
         * @param {string} primaryKey - primary key field name
         * @param {string} [excludeField] - additional field to skip (e.g. laneField)
         * @returns {string} best-guess title field key
         */
        detectTitleField(columns, primaryKey, excludeField) {
            const cols = columns || [];
            const pk = primaryKey || 'id';
            const candidates = cols.filter(c => c.key !== pk && (!excludeField || c.key !== excludeField));
            if (candidates.length === 0) return 'name';
            const patterns = [/name$/i, /title$/i, /subject$/i, /number$/i, /code$/i, /description$/i];
            for (const p of patterns) {
                const match = candidates.find(c => p.test(c.key));
                if (match) return match.key;
            }
            return candidates[0].key;
        },

        /**
         * Create a view and attach a view type dropdown.
         * @param {string} type - default view type
         * @param {Object} options - view options
         * @param {string[]} viewTypes - all registered view types
         * @param {string} serviceKey - unique key for the switcher
         * @param {Function} onViewSwitch - callback(newView) when user switches
         * @returns {Object} view instance
         */
        createWithSwitcher(type, options, viewTypes, serviceKey, onViewSwitch) {
            let currentView = this.create(type, options);

            // Render dropdown and wire up switching
            if (typeof Layer8ViewSwitcher !== 'undefined' && viewTypes.length > 1) {
                const slotId = serviceKey + '-view-switcher';
                const slot = document.getElementById(slotId);
                if (slot) {
                    slot.innerHTML = Layer8ViewSwitcher.render(serviceKey, viewTypes, type);
                    Layer8ViewSwitcher.attach(slot, function(newType) {
                        if (currentView && typeof currentView.destroy === 'function') {
                            currentView.destroy();
                        }
                        const container = document.getElementById(options.containerId);
                        if (container) container.innerHTML = '';
                        currentView = Layer8DViewFactory.create(newType, Object.assign({}, options));
                        if (currentView) currentView.init();
                        if (onViewSwitch) onViewSwitch(currentView);
                    });
                }
            }

            return currentView;
        }
    };

    // Auto-register 'table' view type (Layer8DTable)
    Layer8DViewFactory.register('table', function(options) {
        const table = new Layer8DTable({
            containerId: options.containerId,
            endpoint: options.endpoint,
            modelName: options.modelName,
            serverSide: true,
            columns: options.columns,
            primaryKey: options.primaryKey,
            pageSize: options.pageSize || 10,
            baseWhereClause: options.baseWhereClause || null,
            onAdd: options.onAdd,
            onEdit: options.onEdit,
            onDelete: options.onDelete,
            onRowClick: options.onRowClick,
            addButtonText: options.addButtonText
        });
        return table;
    });

})();
