/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
/**
 * Layer8MNav - Data Loading and Registry Lookup
 * Handles service data loading, column/form definitions
 */
(function() {
    'use strict';

    // Set active table callback
    const setActiveTable = (table) => { window._Layer8MNavActiveTable = table; };

    window.Layer8MNavData = {
        /**
         * Load service data into a view (table, chart, kanban, etc.)
         */
        loadServiceData(serviceConfig) {
            const container = document.getElementById('service-table-container');
            if (!container) return;

            const formDef = this.getServiceFormDef(serviceConfig);
            const columns = this.getServiceColumns(serviceConfig);
            const transformData = this.getServiceTransformData(serviceConfig);
            const viewType = serviceConfig.viewType || 'table';
            const primaryKey = serviceConfig.idField || 'id';

            // Build view options
            const viewOptions = {
                containerId: 'service-table-container',
                endpoint: serviceConfig.endpoint,
                modelName: serviceConfig.model,
                columns: columns,
                pageSize: 15,
                primaryKey: primaryKey,
                viewConfig: serviceConfig.viewConfig || {},
                getItemId: (item) => item[primaryKey] || item.id
            };

            if (transformData) {
                viewOptions.transformData = transformData;
            }

            if (!serviceConfig.readOnly) {
                viewOptions.statusField = 'status';
                viewOptions.addButtonText = `Add ${serviceConfig.label.replace(/s$/, '')}`;
                viewOptions.onAdd = () => Layer8MNavCrud.openServiceForm(serviceConfig, formDef, null);
                viewOptions.onEdit = (id, item) => Layer8MNavCrud.openServiceForm(serviceConfig, formDef, item);
                viewOptions.onDelete = (id, item) => Layer8MNavCrud.deleteServiceRecord(serviceConfig, id, item);
                viewOptions.onRowClick = (item, id) => Layer8MNavCrud.showRecordDetails(serviceConfig, formDef, item);
            }

            // Determine available view types (mirror desktop auto-detection)
            const allViewTypes = serviceConfig.supportedViews
                ? serviceConfig.supportedViews.slice() : ['table'];
            const hasDate = columns.some(c => c.type === 'date');
            const hasMoney = columns.some(c => c.type === 'money');
            if (hasDate && hasMoney && allViewTypes.indexOf('chart') === -1) {
                allViewTypes.push('chart');
            }

            // Create view via factory
            let currentView = Layer8MViewFactory.create(viewType, viewOptions);

            // Render view switcher if multiple views available
            const switcherSlot = document.getElementById('service-view-switcher');
            if (allViewTypes.length > 1 && switcherSlot && typeof Layer8ViewSwitcher !== 'undefined') {
                const switcherKey = serviceConfig.model || serviceConfig.key;
                switcherSlot.innerHTML = Layer8ViewSwitcher.render(switcherKey, allViewTypes, viewType);
                Layer8ViewSwitcher.attach(switcherSlot, function(newType) {
                    if (currentView && typeof currentView.destroy === 'function') {
                        currentView.destroy();
                    }
                    container.innerHTML = '';
                    currentView = Layer8MViewFactory.create(newType, viewOptions);
                    if (currentView && currentView.init) currentView.init();
                    setActiveTable(currentView);
                });
            }

            if (currentView && currentView.init) currentView.init();
            setActiveTable(currentView);
        },

        /**
         * Get columns for a service from registered mobile module registries
         */
        getServiceColumns(serviceConfig) {
            if (serviceConfig.model) {
                // Try all registered mobile module registries
                const registries = [
                    window.MobileHCM, window.MobileFIN, window.MobileSCM,
                    window.MobileSales, window.MobileMfg, window.MobileCrm,
                    window.MobileBi, window.MobileDoc, window.MobileComp,
                    window.MobilePrj, window.MobileEcom, window.MobileSYS
                ];
                for (const reg of registries) {
                    if (reg && reg.getColumns) {
                        const columns = reg.getColumns(serviceConfig.model);
                        if (columns) return columns;
                    }
                }
            }

            // Fallback to defaults
            return [
                { key: serviceConfig.idField, label: 'ID', sortKey: serviceConfig.idField },
                { key: 'name', label: 'Name', sortKey: 'name' },
                { key: 'status', label: 'Status', sortKey: 'status', render: (item) => Layer8MRenderers.renderBoolean(item.status) }
            ];
        },

        /**
         * Get transform data function for a service from registered registries
         */
        getServiceTransformData(serviceConfig) {
            if (serviceConfig.model) {
                const registries = [
                    window.MobileHCM, window.MobileFIN, window.MobileSCM,
                    window.MobileSales, window.MobileMfg, window.MobileCrm,
                    window.MobileBi, window.MobileDoc, window.MobileComp,
                    window.MobilePrj, window.MobileEcom, window.MobileSYS
                ];
                for (const reg of registries) {
                    if (reg && reg.getTransformData) {
                        const transform = reg.getTransformData(serviceConfig.model);
                        if (transform) return transform;
                    }
                }
            }
            return null;
        },

        /**
         * Get form definition for a service from registered mobile module registries
         */
        getServiceFormDef(serviceConfig) {
            if (serviceConfig.model) {
                // Try all registered mobile module registries
                const registries = [
                    window.MobileHCM, window.MobileFIN, window.MobileSCM,
                    window.MobileSales, window.MobileMfg, window.MobileCrm,
                    window.MobileBi, window.MobileDoc, window.MobileComp,
                    window.MobilePrj, window.MobileEcom, window.MobileSYS
                ];
                for (const reg of registries) {
                    if (reg && reg.getFormDef) {
                        const formDef = reg.getFormDef(serviceConfig.model);
                        if (formDef) return formDef;
                    }
                }
            }

            // Fallback to generic form
            return {
                title: serviceConfig.label,
                sections: [
                    {
                        title: 'Basic Information',
                        fields: [
                            { key: 'name', label: 'Name', type: 'text', required: true },
                            { key: 'description', label: 'Description', type: 'textarea' },
                            { key: 'status', label: 'Status', type: 'select', options: { 1: 'Active', 0: 'Inactive' } }
                        ]
                    }
                ]
            };
        }
    };

})();
