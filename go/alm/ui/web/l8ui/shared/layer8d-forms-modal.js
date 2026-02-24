/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
/**
 * ERP Form Modal Helpers
 * Handles add, edit, view, and delete modal operations
 */
(function() {
    'use strict';

    // ========================================
    // MODAL HELPERS
    // ========================================

    function openAddForm(serviceConfig, formDef, onSuccess) {
        if (typeof Layer8DPopup === 'undefined') {
            Layer8DNotification.error('Form component not available');
            return;
        }

        const title = `Add ${formDef.title}`;
        const content = Layer8DFormsFields.generateFormHtml(formDef, {});

        Layer8DFormsPickers.updateFormContext({
            formDef: formDef,
            serviceConfig: serviceConfig,
            isEdit: false,
            recordId: null,
            onSuccess: onSuccess
        });

        Layer8DPopup.show({
            title: title,
            content: content,
            size: 'large',
            showFooter: true,
            saveButtonText: 'Save',
            cancelButtonText: 'Cancel',
            onSave: handleFormSave,
            onShow: (body) => {
                Layer8DFormsPickers.attachDatePickers(body);
                Layer8DFormsPickers.attachInlineTableHandlers(body);
            }
        });
    }

    async function openEditForm(serviceConfig, formDef, recordId, onSuccess) {
        if (typeof Layer8DPopup === 'undefined') {
            Layer8DNotification.error('Form component not available');
            return;
        }

        Layer8DPopup.show({
            title: `Edit ${formDef.title}`,
            content: '<div style="text-align: center; padding: 40px; color: #718096;">Loading...</div>',
            size: 'large',
            showFooter: false
        });

        try {
            const record = await Layer8DFormsData.fetchRecord(
                serviceConfig.endpoint,
                serviceConfig.primaryKey,
                recordId,
                serviceConfig.modelName
            );

            if (!record) {
                Layer8DPopup.close();
                Layer8DNotification.error('Record not found');
                return;
            }

            const content = Layer8DFormsFields.generateFormHtml(formDef, record);

            Layer8DFormsPickers.updateFormContext({
                formDef: formDef,
                serviceConfig: serviceConfig,
                isEdit: true,
                recordId: recordId,
                onSuccess: onSuccess
            });

            Layer8DPopup.close();
            Layer8DPopup.show({
                title: `Edit ${formDef.title}`,
                content: content,
                size: 'large',
                showFooter: true,
                saveButtonText: 'Save',
                cancelButtonText: 'Cancel',
                onSave: handleFormSave,
                onShow: (body) => {
                    Layer8DFormsPickers.attachDatePickers(body);
                    Layer8DFormsPickers.attachInlineTableHandlers(body);
                }
            });

        } catch (error) {
            Layer8DPopup.close();
            Layer8DNotification.error('Error loading record', [error.message]);
        }
    }

    async function handleFormSave() {
        const ctx = Layer8DFormsPickers.getFormContext();
        if (!ctx) return;

        const { formDef, serviceConfig, isEdit, recordId, onSuccess } = ctx;

        const data = Layer8DFormsData.collectFormData(formDef);
        const errors = Layer8DFormsData.validateFormData(formDef, data);

        if (errors.length > 0) {
            Layer8DNotification.error('Validation failed', errors.map(e => e.message));
            return;
        }

        if (isEdit && recordId) {
            data[serviceConfig.primaryKey] = recordId;
        }

        try {
            await Layer8DFormsData.saveRecord(serviceConfig.endpoint, data, isEdit);
            Layer8DPopup.close();
            Layer8DFormsPickers.clearFormContext();
            if (onSuccess) onSuccess();
        } catch (error) {
            Layer8DNotification.error('Error saving', [error.message]);
        }
    }

    function openViewForm(serviceConfig, formDef, data) {
        if (typeof Layer8DPopup === 'undefined') {
            Layer8DNotification.error('View component not available');
            return;
        }

        const title = `${formDef.title} Details`;
        const content = Layer8DFormsFields.generateFormHtml(formDef, data);

        Layer8DFormsPickers.setFormContext(formDef, serviceConfig);

        Layer8DPopup.show({
            title: title,
            content: content,
            size: 'large',
            showFooter: false,
            onShow: (body) => {
                Layer8DFormsPickers.attachDatePickers(body);
                body.querySelectorAll('input, select, textarea').forEach(el => {
                    el.disabled = true;
                });
            }
        });
    }

    function confirmDelete(serviceConfig, recordId, onSuccess) {
        if (typeof Layer8DPopup === 'undefined') {
            if (confirm('Are you sure you want to delete this record?')) {
                Layer8DFormsData.deleteRecord(serviceConfig.endpoint, recordId, serviceConfig.primaryKey, serviceConfig.modelName)
                    .then(() => { if (onSuccess) onSuccess(); })
                    .catch(error => { Layer8DNotification.error('Error deleting', [error.message]); });
            }
            return;
        }

        Layer8DPopup.show({
            title: 'Confirm Delete',
            content: `
                <div class="delete-message">
                    <p>Are you sure you want to delete this record?</p>
                    <p style="color: var(--layer8d-error); font-weight: 600;">This action cannot be undone.</p>
                </div>
            `,
            size: 'small',
            showFooter: true,
            saveButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            onSave: async () => {
                try {
                    await Layer8DFormsData.deleteRecord(serviceConfig.endpoint, recordId, serviceConfig.primaryKey, serviceConfig.modelName);
                    Layer8DPopup.close();
                    if (onSuccess) onSuccess();
                } catch (error) {
                    Layer8DNotification.error('Error deleting', [error.message]);
                }
            }
        });
    }

    // Export
    window.Layer8DFormsModal = {
        openAddForm,
        openEditForm,
        openViewForm,
        confirmDelete,
        handleFormSave
    };

})();
