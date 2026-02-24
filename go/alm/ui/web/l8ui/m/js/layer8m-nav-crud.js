/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
/**
 * Layer8MNav - CRUD Operations
 * Handles record details, forms, and delete operations
 */
(function() {
    'use strict';

    // Get the active table from the main module
    const getActiveTable = () => window._Layer8MNavActiveTable;

    window.Layer8MNavCrud = {
        /**
         * Show record details modal (read-only)
         * Desktop Equivalent: hcm-crud.js _showDetailsModal()
         * IMPORTANT: Uses same form as edit, then disables all fields (matches desktop exactly)
         */
        async showRecordDetails(serviceConfig, formDef, item) {
            // Show loading state first
            Layer8MPopup.show({
                title: `${serviceConfig.label.replace(/s$/, '')} Details`,
                content: '<div style="text-align:center;padding:40px;color:#718096;">Loading...</div>',
                size: 'large',
                showFooter: false
            });

            // Fetch fresh data from server (matches desktop behavior)
            const recordId = item[serviceConfig.idField];
            const freshRecord = await this.fetchRecord(serviceConfig, recordId);
            Layer8MPopup.close();

            if (!freshRecord) {
                Layer8MUtils.showError('Record not found');
                return;
            }

            // Generate form with readOnly flag for inline tables
            const content = Layer8MForms.renderForm(formDef, freshRecord, true);

            Layer8MPopup.show({
                title: `${serviceConfig.label.replace(/s$/, '')} Details`,
                content: content,
                size: 'large',
                showFooter: true,
                saveButtonText: 'Edit',
                showCancelButton: true,
                cancelButtonText: 'Close',
                onShow: (popup) => {
                    // Initialize form fields (date pickers, reference pickers, inline tables)
                    Layer8MForms.initFormFields(popup.body, formDef);
                    // Disable all form inputs - matches desktop hcm-crud.js:123-125
                    popup.body.querySelectorAll('input, select, textarea').forEach(el => {
                        el.disabled = true;
                    });
                },
                onSave: (popup) => {
                    Layer8MPopup.close();
                    this.openServiceForm(serviceConfig, formDef, freshRecord);
                }
            });
        },

        /** Fetch a single record by ID - Desktop Equivalent: erp-forms.js fetchRecord() */
        async fetchRecord(serviceConfig, id) {
            const query = `select * from ${serviceConfig.model} where ${serviceConfig.idField}=${id}`;
            try {
                const response = await Layer8MAuth.get(`${Layer8MConfig.resolveEndpoint(serviceConfig.endpoint)}?body=${encodeURIComponent(JSON.stringify({ text: query }))}`);
                return (response && response.list && response.list.length > 0) ? response.list[0] : null;
            } catch (error) {
                console.error('Failed to fetch record:', error);
                return null;
            }
        },

        /**
         * Open form for add/edit
         * Desktop Equivalent: erp-forms.js openAddForm() and openEditForm()
         */
        async openServiceForm(serviceConfig, formDef, item) {
            const isEdit = !!item;
            const title = isEdit ? `Edit ${serviceConfig.label.replace(/s$/, '')}` : `Add ${serviceConfig.label.replace(/s$/, '')}`;

            // For edit mode, fetch fresh data from server (matches desktop behavior)
            let recordData = item || {};
            if (isEdit && item[serviceConfig.idField]) {
                // Show loading popup
                Layer8MPopup.show({
                    title: title,
                    content: '<div style="text-align:center;padding:40px;color:#718096;">Loading...</div>',
                    size: 'large',
                    showFooter: false
                });

                const freshRecord = await this.fetchRecord(serviceConfig, item[serviceConfig.idField]);
                Layer8MPopup.close();

                if (!freshRecord) {
                    Layer8MUtils.showError('Record not found');
                    return;
                }
                recordData = freshRecord;
            }

            const content = Layer8MForms.renderForm(formDef, recordData);

            Layer8MPopup.show({
                title: title,
                content: content,
                size: 'large',
                saveButtonText: isEdit ? 'Update' : 'Create',
                onShow: (popup) => {
                    Layer8MForms.initFormFields(popup.body, formDef);
                },
                onSave: async (popup) => {
                    const body = popup.body;
                    const errors = Layer8MForms.validateForm(body);

                    if (errors.length > 0) {
                        Layer8MForms.showErrors(body, errors);
                        return;
                    }

                    const data = Layer8MForms.getFormData(body);

                    if (isEdit) {
                        data[serviceConfig.idField] = recordData[serviceConfig.idField];
                    }

                    try {
                        if (isEdit) {
                            await Layer8MAuth.put(Layer8MConfig.resolveEndpoint(serviceConfig.endpoint), data);
                            Layer8MUtils.showSuccess(`${serviceConfig.label.replace(/s$/, '')} updated`);
                        } else {
                            await Layer8MAuth.post(Layer8MConfig.resolveEndpoint(serviceConfig.endpoint), data);
                            Layer8MUtils.showSuccess(`${serviceConfig.label.replace(/s$/, '')} created`);
                        }

                        Layer8MPopup.close();
                        const activeTable = getActiveTable();
                        if (activeTable) activeTable.refresh();
                    } catch (error) {
                        Layer8MUtils.showError(error.message || `Failed to save ${serviceConfig.label.replace(/s$/, '').toLowerCase()}`);
                    }
                }
            });
        },

        /**
         * Delete service record
         * Desktop Equivalent: erp-forms.js deleteRecord()
         */
        async deleteServiceRecord(serviceConfig, id, item) {
            const name = this.getRecordDisplayName(item);
            const confirmed = await Layer8MConfirm.confirmDelete(name);

            if (confirmed) {
                try {
                    // Build L8Query for delete scope
                    const primaryKey = serviceConfig.idField;
                    const query = {
                        text: `select * from ${serviceConfig.model} where ${primaryKey}=${id}`
                    };
                    await Layer8MAuth.delete(Layer8MConfig.resolveEndpoint(serviceConfig.endpoint), query);
                    Layer8MUtils.showSuccess(`${serviceConfig.label.replace(/s$/, '')} deleted`);
                    const activeTable = getActiveTable();
                    if (activeTable) activeTable.refresh();
                } catch (error) {
                    Layer8MUtils.showError(error.message || `Failed to delete ${serviceConfig.label.replace(/s$/, '').toLowerCase()}`);
                }
            }
        },

        /**
         * Get display name for a record
         */
        getRecordDisplayName(item) {
            // Try common name fields
            if (item.name) return item.name;
            if (item.lastName && item.firstName) return `${item.lastName}, ${item.firstName}`;
            if (item.title) return item.title;
            if (item.code) return item.code;
            if (item.description) return item.description.substring(0, 50);
            return 'this record';
        }
    };

})();
