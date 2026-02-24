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
// ERP Service Registry
// Central registry for sub-module lookups and service table initialization

(function() {
    'use strict';

    // Internal registry: { Module1: ['SubMod1', 'SubMod2', ...], Module2: [...] }
    const _registry = {};

    // Default columns when no sub-module provides a configuration
    const DEFAULT_COLUMNS = [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'status', label: 'Status' }
    ];

    // Register a sub-module namespace for a parent module
    function register(parentModule, submoduleName) {
        if (!_registry[parentModule]) {
            _registry[parentModule] = [];
        }
        if (_registry[parentModule].indexOf(submoduleName) === -1) {
            _registry[parentModule].push(submoduleName);
        }
    }

    // Look up a property from any registered sub-module
    function lookup(parentModule, property, modelName) {
        const submodules = _registry[parentModule] || [];
        for (const nsName of submodules) {
            const mod = window[nsName];
            if (mod && mod[property] && mod[property][modelName]) {
                return mod[property][modelName];
            }
        }
        return null;
    }

    // Get columns for a model, with default fallback
    function getColumns(parentModule, modelName) {
        return lookup(parentModule, 'columns', modelName) || DEFAULT_COLUMNS;
    }

    // Get form definition for a model
    function getFormDef(parentModule, modelName) {
        return lookup(parentModule, 'forms', modelName);
    }

    // Get details config for a model
    function getDetailsConfig(parentModule, modelName) {
        return lookup(parentModule, 'detailsConfig', modelName);
    }

    // Get primary key for a model, with 'id' as default
    function getPrimaryKey(parentModule, modelName) {
        return lookup(parentModule, 'primaryKeys', modelName) || 'id';
    }

    // Initialize a service view for a module (table, chart, kanban, etc.)
    function initializeServiceTable(moduleNS, parentModule, moduleKey, service, tableId) {
        const containerId = `${moduleKey}-${service.key}-table-container`;
        const container = document.getElementById(containerId);

        if (!container) {
            console.warn(`Container not found: ${containerId}`);
            return;
        }

        const columns = getColumns(parentModule, service.model);
        const primaryKey = getPrimaryKey(parentModule, service.model);
        const viewType = service.viewType || 'table';

        const viewOptions = {
            containerId: containerId,
            endpoint: Layer8DConfig.resolveEndpoint(service.endpoint),
            modelName: service.model,
            columns: columns,
            primaryKey: primaryKey,
            pageSize: 10,
            onAdd: () => moduleNS._openAddModal(service),
            onEdit: (id) => moduleNS._openEditModal(service, id),
            onDelete: (id) => moduleNS._confirmDeleteItem(service, id),
            onRowClick: (item, id) => moduleNS._showDetailsModal(service, item, id),
            addButtonText: `Add ${service.label.replace(/s$/, '')}`,
            viewConfig: service.viewConfig || {}
        };

        const switcherKey = `${moduleKey}-${service.key}`;
        const allViewTypes = service.supportedViews ? service.supportedViews.slice() : ['table'];
        const hasDate = columns.some(c => c.type === 'date');
        const hasMoney = columns.some(c => c.type === 'money');
        if (hasDate && hasMoney && allViewTypes.indexOf('chart') === -1) {
            allViewTypes.push('chart');
        }
        const view = (allViewTypes.length > 1 && Layer8DViewFactory.createWithSwitcher)
            ? Layer8DViewFactory.createWithSwitcher(viewType, viewOptions, allViewTypes, switcherKey, function(newView) {
                moduleNS._state.serviceTables[tableId] = newView;
            })
            : Layer8DViewFactory.create(viewType, viewOptions);

        if (view) {
            view.init();
            moduleNS._state.serviceTables[tableId] = view;
        }
    }

    // Get list of registered parent module names
    function getRegisteredModules() {
        return Object.keys(_registry);
    }

    window.Layer8DServiceRegistry = {
        register,
        lookup,
        getColumns,
        getFormDef,
        getDetailsConfig,
        getPrimaryKey,
        getRegisteredModules,
        initializeServiceTable
    };

})();
