/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
/**
 * ERP Form Pickers Integration
 * Handles date pickers and reference pickers
 */
(function() {
    'use strict';

    // Store current form context for save handler
    let currentFormContext = null;

    // ========================================
    // DATE PICKER INTEGRATION
    // ========================================

    /**
     * Attach date pickers to all date inputs in a container
     */
    function attachDatePickers(container) {
        if (typeof Layer8DDatePicker === 'undefined') return;

        const dateInputs = container.querySelectorAll('input.date-input');
        dateInputs.forEach(input => {
            Layer8DDatePicker.attach(input);
        });

        const triggers = container.querySelectorAll('.date-picker-trigger');
        triggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const inputId = trigger.dataset.for;
                const input = container.querySelector(`#${inputId}`);
                if (input) {
                    Layer8DDatePicker.open(input);
                }
            });
        });

        attachInputFormatters(container);
        attachReferencePickers(container);
    }

    /**
     * Attach input formatters to all formatted inputs in a container
     */
    function attachInputFormatters(container) {
        if (typeof Layer8DInputFormatter === 'undefined') return;
        Layer8DInputFormatter.attachAll(container);
    }

    // ========================================
    // REFERENCE PICKER INTEGRATION
    // ========================================

    /**
     * Find field definition from form definition by key
     */
    function findFieldDef(formDef, fieldKey) {
        if (!formDef || !formDef.sections) return null;
        for (const section of formDef.sections) {
            for (const field of section.fields) {
                if (field.key === fieldKey) {
                    return field;
                }
            }
        }
        return null;
    }

    /**
     * Look up endpoint for a model from module configs
     */
    function getEndpointForModel(modelName) {
        const namespaces = typeof Layer8DServiceRegistry !== 'undefined'
            ? Layer8DServiceRegistry.getRegisteredModules()
            : [];
        for (const ns of namespaces) {
            const mod = window[ns];
            if (!mod || !mod.modules) continue;
            for (const moduleKey in mod.modules) {
                const module = mod.modules[moduleKey];
                if (module.services) {
                    for (const service of module.services) {
                        if (service.model === modelName) {
                            return Layer8DConfig.resolveEndpoint(service.endpoint);
                        }
                    }
                }
            }
        }
        return null;
    }

    /**
     * Fetch display value for a reference field by ID
     */
    async function fetchReferenceDisplayValue(config, idValue) {
        if (!config.endpoint || !idValue) {
            return null;
        }

        const columns = config.selectColumns || [config.idColumn, config.displayColumn];
        const query = `select ${columns.join(',')} from ${config.modelName} where ${config.idColumn}=${idValue}`;

        try {
            const body = encodeURIComponent(JSON.stringify({ text: query }));
            const response = await fetch(config.endpoint + '?body=' + body, {
                method: 'GET',
                headers: typeof getAuthHeaders === 'function'
                    ? getAuthHeaders()
                    : { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            const items = data.list || [];

            if (items.length > 0) {
                const item = items[0];
                const displayValue = config.displayFormat
                    ? config.displayFormat(item)
                    : item[config.displayColumn];
                return { displayValue, item };
            }
            return null;
        } catch (error) {
            console.error('Error fetching reference display value:', error);
            return null;
        }
    }

    /**
     * Attach reference pickers to all reference inputs in a container
     */
    function attachReferencePickers(container) {
        if (typeof Layer8DReferencePicker === 'undefined') {
            return;
        }

        const refInputs = container.querySelectorAll('input.reference-input');
        refInputs.forEach(async input => {
            let config = {};
            try {
                config = JSON.parse(input.dataset.refConfig || '{}');
            } catch (e) {
                console.warn('Invalid reference config for', input.name);
                return;
            }

            if (!config.modelName || !config.idColumn || !config.displayColumn) {
                console.warn('Reference input missing required config:', input.name);
                return;
            }

            if (!config.endpoint) {
                config.endpoint = getEndpointForModel(config.modelName);
                if (!config.endpoint) {
                    return;
                }
            }

            // Get displayFormat from registry
            const lookupModel = input.dataset.lookupModel || config.modelName;
            if (lookupModel && typeof Layer8DReferenceRegistry !== 'undefined') {
                const registryConfig = Layer8DReferenceRegistry[lookupModel];
                if (registryConfig) {
                    if (registryConfig.displayFormat && !config.displayFormat) {
                        config.displayFormat = registryConfig.displayFormat;
                    }
                    if (registryConfig.selectColumns && !config.selectColumns) {
                        config.selectColumns = registryConfig.selectColumns;
                    }
                }
            }

            // Get from field definition
            const fieldKey = input.dataset.fieldKey || input.name;
            if (currentFormContext && currentFormContext.formDef) {
                const fieldDef = findFieldDef(currentFormContext.formDef, fieldKey);
                if (fieldDef && fieldDef.referenceConfig) {
                    if (fieldDef.referenceConfig.displayFormat) {
                        config.displayFormat = fieldDef.referenceConfig.displayFormat;
                    }
                    if (fieldDef.referenceConfig.selectColumns) {
                        config.selectColumns = fieldDef.referenceConfig.selectColumns;
                    }
                }
            }

            Layer8DReferencePicker.attach(input, config);

            // Fetch display value if ID exists
            const refId = input.dataset.refId;
            if (refId && refId !== '' && refId !== 'undefined') {
                const result = await fetchReferenceDisplayValue(config, refId);
                if (result) {
                    input.value = result.displayValue;
                    if (result.item) {
                        input.dataset.refItem = JSON.stringify(result.item);
                    }
                }
            }
        });
    }

    // ========================================
    // INLINE TABLE HANDLERS
    // ========================================

    /**
     * Attach event handlers for inline table add/edit/delete and row click
     */
    function attachInlineTableHandlers(container) {
        container.querySelectorAll('.form-inline-table').forEach(table => {
            const fieldKey = table.dataset.inlineTable;
            const hiddenInput = table.querySelector(`input[data-inline-table-data="${fieldKey}"]`);
            const isReadOnly = table.classList.contains('form-inline-table-readonly');

            // Find the field definition from the current form context
            const formCtx = currentFormContext;
            let fieldDef = null;
            if (formCtx && formCtx.formDef) {
                fieldDef = findFieldDef(formCtx.formDef, fieldKey);
            }
            if (!fieldDef || !fieldDef.columns) return;

            function getRows() {
                try { return JSON.parse(hiddenInput.value || '[]'); } catch (e) { return []; }
            }

            function setRows(rows) {
                hiddenInput.value = JSON.stringify(rows);
                rerenderTable(table, fieldDef, rows, isReadOnly);
            }

            // Delegate all button/row click events
            table.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                const clickedRow = e.target.closest('.form-inline-table-row');

                if (btn) {
                    const action = btn.dataset.action;
                    const rowIndex = parseInt(btn.dataset.rowIndex, 10);

                    if (action === 'add-row') {
                        openRowEditor(fieldDef, -1, {}, (newRow) => {
                            const rows = getRows();
                            rows.push(newRow);
                            setRows(rows);
                        });
                    } else if (action === 'edit-row') {
                        e.stopPropagation();
                        const rows = getRows();
                        openRowEditor(fieldDef, rowIndex, rows[rowIndex] || {}, (updatedRow) => {
                            const rows = getRows();
                            rows[rowIndex] = updatedRow;
                            setRows(rows);
                        });
                    } else if (action === 'delete-row') {
                        e.stopPropagation();
                        if (confirm('Delete this row?')) {
                            const rows = getRows();
                            rows.splice(rowIndex, 1);
                            setRows(rows);
                        }
                    }
                } else if (clickedRow && isReadOnly) {
                    // Read-only row click — show child detail popup
                    const rowIndex = parseInt(clickedRow.dataset.rowIndex, 10);
                    const rows = getRows();
                    if (rows[rowIndex]) {
                        showChildDetail(fieldDef, rows[rowIndex]);
                    }
                }
            });
        });
    }

    /**
     * Re-render table body after add/edit/delete
     */
    function rerenderTable(tableEl, fieldDef, rows, isReadOnly) {
        const body = tableEl.querySelector('.form-inline-table-body');
        if (!body) return;
        const visibleCols = fieldDef.columns.filter(c => !c.hidden);
        const gridCols = isReadOnly
            ? visibleCols.map(() => '1fr').join(' ')
            : visibleCols.map(() => '1fr').join(' ') + ' 100px';

        let html = '';
        if (rows.length > 0) {
            rows.forEach((row, idx) => {
                const clickClass = isReadOnly ? ' l8-clickable-row' : '';
                html += `<div class="form-inline-table-row${clickClass}" data-row-index="${idx}" style="grid-template-columns: ${gridCols}">`;
                visibleCols.forEach(col => {
                    html += `<span class="form-inline-table-cell">${Layer8DFormsFields.formatInlineTableCell ? Layer8DFormsFields.formatInlineTableCell(col, row[col.key]) : (row[col.key] || '-')}</span>`;
                });
                if (!isReadOnly) {
                    html += `<span class="form-inline-table-actions">`;
                    html += `<button type="button" class="form-inline-table-btn edit" data-action="edit-row" data-row-index="${idx}">Edit</button>`;
                    html += `<button type="button" class="form-inline-table-btn delete" data-action="delete-row" data-row-index="${idx}">Delete</button>`;
                    html += `</span>`;
                }
                html += '</div>';
            });
        } else {
            html = '<div class="form-inline-table-empty">No records</div>';
        }
        body.innerHTML = html;
    }

    /**
     * Open a row editor sub-form popup (for add or edit)
     */
    function openRowEditor(fieldDef, rowIndex, rowData, onSave) {
        const miniFormDef = {
            title: fieldDef.label,
            sections: [{
                title: rowIndex >= 0 ? 'Edit' : 'Add',
                fields: fieldDef.columns.filter(col => !col.hidden)
            }]
        };

        const html = Layer8DFormsFields.generateFormHtml(miniFormDef, rowData || {});

        Layer8DPopup.show({
            title: rowIndex >= 0 ? `Edit ${fieldDef.label}` : `Add ${fieldDef.label}`,
            content: html,
            size: 'large',
            showFooter: true,
            saveButtonText: rowIndex >= 0 ? 'Update' : 'Add',
            onShow: (body) => {
                attachDatePickers(body);
            },
            onSave: () => {
                const data = Layer8DFormsData.collectFormData(miniFormDef);
                if (!data) return;
                // Preserve hidden fields from original row
                fieldDef.columns.forEach(col => {
                    if (col.hidden && rowData[col.key] !== undefined) {
                        data[col.key] = rowData[col.key];
                    }
                });
                onSave(data);
                Layer8DPopup.close();
            }
        });
    }

    /**
     * Show child detail popup (read-only) when clicking a row in detail mode
     */
    function showChildDetail(fieldDef, rowData) {
        const miniFormDef = {
            title: fieldDef.label,
            sections: [{
                title: 'Details',
                fields: fieldDef.columns.filter(col => !col.hidden)
            }]
        };

        const html = Layer8DFormsFields.generateFormHtml(miniFormDef, rowData);

        Layer8DPopup.show({
            title: `${fieldDef.label} Details`,
            content: html,
            size: 'large',
            showFooter: false,
            onShow: (body) => {
                attachDatePickers(body);
                body.querySelectorAll('input, select, textarea').forEach(el => {
                    el.disabled = true;
                });
            }
        });
    }

    // ========================================
    // FORM CONTEXT MANAGEMENT
    // ========================================

    function setFormContext(formDef, serviceConfig) {
        currentFormContext = {
            formDef: formDef,
            serviceConfig: serviceConfig || null,
            isEdit: false,
            recordId: null,
            onSuccess: null
        };
    }

    function getFormContext() {
        return currentFormContext;
    }

    function updateFormContext(updates) {
        if (currentFormContext) {
            Object.assign(currentFormContext, updates);
        } else {
            currentFormContext = Object.assign({}, updates);
        }
    }

    function clearFormContext() {
        currentFormContext = null;
    }

    // Export
    window.Layer8DFormsPickers = {
        attachDatePickers,
        attachInputFormatters,
        attachReferencePickers,
        attachInlineTableHandlers,
        fetchReferenceDisplayValue,
        getEndpointForModel,
        findFieldDef,
        setFormContext,
        getFormContext,
        updateFormContext,
        clearFormContext
    };

})();
