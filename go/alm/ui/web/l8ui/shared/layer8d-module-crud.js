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
// ERP Module CRUD
// Generic CRUD operations attached to any module namespace

(function() {
    'use strict';

    const { escapeHtml, formatDate, formatMoney } = Layer8DUtils;

    // Attach all CRUD operations to a module namespace
    function attach(moduleNS, parentModule, formsNSName) {
        // Lazy resolver for forms namespace
        function getFormsNS() {
            return window[formsNSName];
        }

        // Open add modal
        moduleNS._openAddModal = function(service) {
            const formDef = Layer8DServiceRegistry.getFormDef(parentModule, service.model);
            const formsNS = getFormsNS();

            if (!formDef || !formsNS) {
                Layer8DNotification.warning(`Add ${service.label} - Form not yet configured`);
                return;
            }

            const serviceConfig = {
                endpoint: Layer8DConfig.resolveEndpoint(service.endpoint),
                primaryKey: Layer8DServiceRegistry.getPrimaryKey(parentModule, service.model),
                modelName: service.model
            };

            formsNS.openAddForm(serviceConfig, formDef, () => {
                moduleNS.refreshCurrentTable();
            });
        };

        // Open edit modal
        moduleNS._openEditModal = function(service, id) {
            const formDef = Layer8DServiceRegistry.getFormDef(parentModule, service.model);
            const formsNS = getFormsNS();

            if (!formDef || !formsNS) {
                Layer8DNotification.warning(`Edit ${service.label} - Form not yet configured`);
                return;
            }

            const serviceConfig = {
                endpoint: Layer8DConfig.resolveEndpoint(service.endpoint),
                primaryKey: Layer8DServiceRegistry.getPrimaryKey(parentModule, service.model),
                modelName: service.model
            };

            formsNS.openEditForm(serviceConfig, formDef, id, () => {
                moduleNS.refreshCurrentTable();
            });
        };

        // Confirm delete
        moduleNS._confirmDeleteItem = function(service, id) {
            const serviceConfig = {
                endpoint: Layer8DConfig.resolveEndpoint(service.endpoint),
                primaryKey: Layer8DServiceRegistry.getPrimaryKey(parentModule, service.model),
                modelName: service.model
            };

            const formsNS = getFormsNS();
            if (formsNS) {
                formsNS.confirmDelete(serviceConfig, id, () => {
                    moduleNS.refreshCurrentTable();
                });
            } else if (confirm(`Are you sure you want to delete this ${service.label.replace(/s$/, '')}?`)) {
                moduleNS._deleteItem(service, id);
            }
        };

        // Delete item
        moduleNS._deleteItem = async function(service, id) {
            try {
                const primaryKey = Layer8DServiceRegistry.getPrimaryKey(parentModule, service.model);
                const query = {
                    text: `select * from ${service.model} where ${primaryKey}=${id}`
                };

                const response = await fetch(Layer8DConfig.resolveEndpoint(service.endpoint), {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {})
                    },
                    body: JSON.stringify(query)
                });

                if (!response.ok) {
                    throw new Error('Delete failed');
                }

                const tableId = `${moduleNS._state.currentModule}-${service.key}-table`;
                if (moduleNS._state.serviceTables[tableId]) {
                    moduleNS._state.serviceTables[tableId].fetchData(1, moduleNS._state.serviceTables[tableId].pageSize);
                }
            } catch (error) {
                console.error('Delete error:', error);
                Layer8DNotification.error('Failed to delete item');
            }
        };

        // Show details modal
        moduleNS._showDetailsModal = function(service, item, itemId) {
            const formDef = Layer8DServiceRegistry.getFormDef(parentModule, service.model);
            const formsNS = getFormsNS();

            if (!formDef || !formsNS) {
                Layer8DNotification.error('Details view not available');
                return;
            }

            const title = `${service.label.replace(/s$/, '')} Details`;
            let content = formsNS.generateFormHtml(formDef, item, { readOnly: true });

            Layer8DPopup.show({
                title: title,
                content: content,
                size: 'large',
                showFooter: false,
                onShow: (body) => {
                    if (typeof Layer8DFormsPickers !== 'undefined') {
                        Layer8DFormsPickers.setFormContext(formDef, service);
                        Layer8DFormsPickers.attachDatePickers(body);
                        Layer8DFormsPickers.attachInlineTableHandlers(body);
                    } else if (typeof Layer8DForms !== 'undefined') {
                        if (Layer8DForms.setFormContext) Layer8DForms.setFormContext(formDef, service);
                        if (Layer8DForms.attachDatePickers) Layer8DForms.attachDatePickers(body);
                    }
                    body.querySelectorAll('input, select, textarea').forEach(el => {
                        el.disabled = true;
                    });
                }
            });
        };

        // Get display value for a field in details view
        moduleNS._getFieldDisplayValue = function(item, field) {
            let value = item[field.key];

            if (field.key && field.key.includes('.')) {
                const keys = field.key.split('.');
                value = item;
                for (const k of keys) {
                    if (value === null || value === undefined) break;
                    value = value[k];
                }
            }

            if (value === null || value === undefined || value === '') {
                return '<span class="detail-empty">-</span>';
            }

            if (field.render) {
                return field.render(item);
            }

            if (field.type === 'date' && typeof value === 'number') {
                return escapeHtml(formatDate(value));
            }

            if (field.type === 'money') {
                return escapeHtml(formatMoney(value));
            }

            if (field.type === 'currency' && typeof value === 'number') {
                return escapeHtml(formatMoney(value));
            }

            if (field.type === 'boolean') {
                return value ? '<span class="detail-value status-online">Yes</span>' : '<span class="detail-value status-offline">No</span>';
            }

            if (field.enumLabels && field.enumLabels[value] !== undefined) {
                return escapeHtml(field.enumLabels[value]);
            }

            return escapeHtml(String(value));
        };

        // Format field label from camelCase key
        moduleNS._formatFieldLabel = function(key) {
            return key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .replace(/Id$/, ' ID')
                .trim();
        };

        // Format field value for display
        moduleNS._formatFieldValue = function(key, value) {
            if (value === null || value === undefined || value === '') {
                return '<span class="detail-empty">-</span>';
            }

            if ((key.toLowerCase().includes('date') || key.toLowerCase().includes('time') || key.toLowerCase().endsWith('at'))
                && typeof value === 'number' && value > 1000000000 && value < 2000000000) {
                return escapeHtml(formatDate(value));
            }

            if (typeof value === 'boolean') {
                return value ? '<span class="detail-value status-online">Yes</span>' : '<span class="detail-value status-offline">No</span>';
            }

            if (Array.isArray(value)) {
                if (value.length === 0) return '<span class="detail-empty">-</span>';
                return escapeHtml(value.join(', '));
            }

            if (typeof value === 'object') {
                // Handle Money objects { amount, currencyId }
                if ('amount' in value && 'currencyId' in value) {
                    return escapeHtml(formatMoney(value));
                }
                return '<span class="detail-empty">[Object]</span>';
            }

            return escapeHtml(String(value));
        };
    }

    window.Layer8DModuleCRUD = {
        attach
    };

})();
