/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
/**
 * ERP Form Field Generation
 * Handles HTML generation for form fields
 */
(function() {
    'use strict';

    const { escapeHtml, escapeAttr, formatDateForInput } = Layer8DUtils;

    /**
     * Determine the appropriate zero-value label for a date field
     */
    function getDateZeroLabel(fieldKey) {
        const lowerKey = (fieldKey || '').toLowerCase();
        if (lowerKey.includes('end') || lowerKey.includes('expir') || lowerKey.includes('termination')) {
            return 'N/A';
        }
        return 'Current';
    }

    function getNestedValue(obj, key) {
        if (!key.includes('.')) return obj[key];
        return key.split('.').reduce((o, k) => o && o[k], obj);
    }

    // Formatted field types that use Layer8DInputFormatter
    const FORMATTED_TYPES = ['ssn', 'phone', 'currency', 'percentage', 'routingNumber', 'ein', 'email', 'url', 'colorCode', 'rating', 'hours'];

    function generateFormHtml(formDef, data = {}, options = {}) {
        const sections = formDef.sections;
        const readOnly = options.readOnly || false;
        let html = '<form id="layer8d-edit-form">';

        // Tabs header
        html += '<div class="probler-popup-tabs">';
        sections.forEach((section, idx) => {
            const activeClass = idx === 0 ? ' active' : '';
            html += `<div class="probler-popup-tab${activeClass}" data-tab="tab-${idx}">${escapeHtml(section.title)}</div>`;
        });
        html += '</div>';

        // Tab content
        html += '<div class="probler-popup-tab-content">';
        sections.forEach((section, idx) => {
            const activeClass = idx === 0 ? ' active' : '';
            html += `<div class="probler-popup-tab-pane${activeClass}" data-pane="tab-${idx}">`;
            html += '<div class="detail-grid"><div class="detail-section detail-full-width">';

            const fields = section.fields;
            for (let i = 0; i < fields.length; i++) {
                const field1 = fields[i];

                // Inline tables always span full width
                if (field1.type === 'inlineTable') {
                    html += Layer8DFormsFields.generateInlineTableHtml(field1, data[field1.key] || [], readOnly);
                    continue;
                }

                const field2 = fields[i + 1];
                if (field2 && field2.type !== 'inlineTable') {
                    html += '<div class="form-row">';
                    html += generateFieldHtml(field1, getNestedValue(data, field1.key));
                    html += generateFieldHtml(field2, getNestedValue(data, field2.key));
                    html += '</div>';
                    i++; // skip field2 since we consumed it
                } else {
                    html += generateFieldHtml(field1, getNestedValue(data, field1.key));
                }
            }

            html += '</div></div></div>';
        });
        html += '</div></form>';

        return html;
    }

    function generateFieldHtml(field, value) {
        const required = field.required ? 'required' : '';
        const requiredMark = field.required ? ' <span style="color: var(--layer8d-error);">*</span>' : '';

        let inputHtml = '';

        switch (field.type) {
            case 'text':
                inputHtml = `<input type="text" id="field-${field.key}" name="${field.key}" value="${escapeAttr(value || '')}" ${required}>`;
                break;

            case 'number':
                inputHtml = `<input type="number" id="field-${field.key}" name="${field.key}" value="${escapeAttr(value || '')}" ${required}>`;
                break;

            case 'money': {
                const moneyObj = (typeof value === 'object' && value !== null) ? value : {};
                const amountValue = moneyObj.amount !== undefined ? moneyObj.amount : value;
                const currencyId = moneyObj.currencyId || '';

                // Currency <select> dropdown — on change, re-attach formatter with new symbol
                const currencies = Layer8DUtils.getCurrencyList();
                const selectedCurrency = currencies.find(c => c.currencyId === currencyId);
                const currSymbol = selectedCurrency ? selectedCurrency.symbol : '$';

                let selectHtml = `<select name="${field.key}.__currencyId" class="money-currency-select" data-previous-currency-id="${escapeAttr(currencyId)}" onchange="Layer8DFormsFields.onCurrencyChange(this)">`;
                selectHtml += '<option value="">--</option>';
                for (const c of currencies) {
                    const sel = c.currencyId === currencyId ? ' selected' : '';
                    selectHtml += `<option value="${escapeAttr(c.currencyId)}" data-symbol="${escapeAttr(c.symbol || '$')}"${sel}>${escapeHtml(c.code)}</option>`;
                }
                selectHtml += '</select>';

                // Amount formatted input with correct initial symbol
                const amountField = { ...field, key: field.key + '.__amount', type: 'currency', symbol: currSymbol };
                const amountHtml = generateFormattedInput(amountField, amountValue);

                inputHtml = `<div class="money-input-group">${selectHtml}${amountHtml}</div>`;
                break;
            }

            // Formatted input types
            case 'ssn':
            case 'phone':
            case 'currency':
            case 'percentage':
            case 'routingNumber':
            case 'ein':
            case 'email':
            case 'url':
            case 'colorCode':
            case 'rating':
            case 'hours':
                inputHtml = generateFormattedInput(field, value);
                break;

            case 'date':
                inputHtml = generateDateInput(field, value);
                break;

            case 'textarea':
                inputHtml = `<textarea id="field-${field.key}" name="${field.key}" rows="3" ${required}>${escapeHtml(value || '')}</textarea>`;
                break;

            case 'select':
                inputHtml = generateSelectHtml(field, value);
                break;

            case 'checkbox':
                const checked = value ? 'checked' : '';
                return `
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="field-${field.key}" name="${field.key}" ${checked} style="width: auto;">
                            <span>${escapeHtml(field.label)}</span>
                        </label>
                    </div>
                `;

            case 'toggle': {
                const togChecked = value ? 'checked' : '';
                return `
                    <div class="form-group">
                        <label class="l8-toggle-label">
                            <input type="checkbox" id="field-${field.key}" name="${field.key}" ${togChecked} class="l8-toggle-input">
                            <span class="l8-toggle-track"><span class="l8-toggle-thumb"></span></span>
                            <span>${escapeHtml(field.label)}</span>
                        </label>
                    </div>
                `;
            }

            case 'slider': {
                const sliderMin = field.min !== undefined ? field.min : 0;
                const sliderMax = field.max !== undefined ? field.max : 100;
                const sliderStep = field.step !== undefined ? field.step : 1;
                const sliderVal = value !== null && value !== undefined ? value : sliderMin;
                inputHtml = `<div class="l8-slider-wrapper">
                    <input type="range" id="field-${field.key}" name="${field.key}"
                        value="${escapeAttr(String(sliderVal))}" min="${sliderMin}" max="${sliderMax}" step="${sliderStep}"
                        class="l8-slider" oninput="this.nextElementSibling.textContent=this.value" ${required}>
                    <span class="l8-slider-value">${escapeHtml(String(sliderVal))}</span>
                </div>`;
                break;
            }

            case 'time':
                inputHtml = `<input type="time" id="field-${field.key}" name="${field.key}" value="${escapeAttr(value || '')}" ${required}>`;
                break;

            case 'tags': {
                const tagsArr = Array.isArray(value) ? value : [];
                let chipsHtml = tagsArr.map(t =>
                    `<span class="l8-tag-chip">${escapeHtml(t)}<span class="l8-tag-remove" onclick="Layer8DFormsFields.removeTag(this)">&times;</span></span>`
                ).join('');
                inputHtml = `<div class="l8-tags-wrapper">
                    <div class="l8-tags-chips">${chipsHtml}</div>
                    <input type="text" class="l8-tags-input" placeholder="Type and press Enter"
                           onkeydown="Layer8DFormsFields.onTagKeydown(event, this)">
                    <input type="hidden" name="${field.key}" data-tags-value="${escapeAttr(field.key)}" value="${escapeAttr(JSON.stringify(tagsArr))}">
                </div>`;
                break;
            }

            case 'multiselect': {
                const msValues = Array.isArray(value) ? value : [];
                const msOptions = field.options || {};
                let msChipsHtml = msValues.map(v => {
                    const label = msOptions[v] || v;
                    return `<span class="l8-tag-chip">${escapeHtml(String(label))}<span class="l8-tag-remove" onclick="Layer8DFormsFields.removeMultiselectValue(this, '${escapeAttr(String(v))}')">&times;</span></span>`;
                }).join('');
                let msOptsHtml = Object.entries(msOptions).map(([val, label]) => {
                    const chk = msValues.includes(val) || msValues.includes(Number(val)) ? 'checked' : '';
                    return `<label class="l8-multiselect-option"><input type="checkbox" value="${escapeAttr(val)}" ${chk} onchange="Layer8DFormsFields.onMultiselectChange(this)">${escapeHtml(label)}</label>`;
                }).join('');
                inputHtml = `<div class="l8-multiselect-wrapper">
                    <div class="l8-multiselect-chips">${msChipsHtml}</div>
                    <div class="l8-multiselect-trigger" onclick="Layer8DFormsFields.toggleMultiselectDropdown(this)">Select options...</div>
                    <div class="l8-multiselect-dropdown" style="display:none">${msOptsHtml}</div>
                    <input type="hidden" name="${field.key}" data-multiselect-value="${escapeAttr(field.key)}" value="${escapeAttr(JSON.stringify(msValues))}">
                </div>`;
                break;
            }

            case 'lookup':
                inputHtml = `<input type="text" id="field-${field.key}" name="${field.key}" value="${escapeAttr(value || '')}" ${required} placeholder="Enter ${field.lookupModel} ID">`;
                break;

            case 'richtext': {
                const rtContent = value || '';
                inputHtml = `<div class="l8-richtext-wrapper">
                    <div class="l8-richtext-toolbar">
                        <button type="button" onclick="document.execCommand('bold')" title="Bold"><b>B</b></button>
                        <button type="button" onclick="document.execCommand('italic')" title="Italic"><i>I</i></button>
                        <button type="button" onclick="document.execCommand('insertUnorderedList')" title="Bullet List">&#8226;</button>
                        <button type="button" onclick="document.execCommand('insertOrderedList')" title="Numbered List">1.</button>
                    </div>
                    <div class="l8-richtext-editor" contenteditable="true"
                         data-field-key="${escapeAttr(field.key)}">${rtContent}</div>
                    <input type="hidden" name="${field.key}" data-richtext-value="${escapeAttr(field.key)}" value="${escapeAttr(rtContent)}">
                </div>`;
                break;
            }

            case 'period': {
                const periodObj = (typeof value === 'object' && value !== null) ? value : {};
                const periodType = periodObj.periodType || 0;
                const periodYear = periodObj.periodYear || new Date().getFullYear();
                const periodValue = periodObj.periodValue || 0;

                // Period Type select
                const typeOptions = [['', '-- Select --'], ['1', 'Yearly'], ['2', 'Quarterly'], ['3', 'Monthly']];
                let typeHtml = `<select name="${field.key}.__periodType" class="period-type-select" onchange="Layer8DFormsFields.onPeriodTypeChange(this)" ${field.required ? 'required' : ''}>`;
                for (const [val, lbl] of typeOptions) {
                    typeHtml += `<option value="${val}"${String(periodType) === val ? ' selected' : ''}>${lbl}</option>`;
                }
                typeHtml += '</select>';

                // Year select (2050 down to 1970)
                let yearHtml = `<select name="${field.key}.__periodYear" class="period-year-select">`;
                for (let y = 2050; y >= 1970; y--) {
                    yearHtml += `<option value="${y}"${y === periodYear ? ' selected' : ''}>${y}</option>`;
                }
                yearHtml += '</select>';

                // Period Value select (content depends on type)
                let valHtml = generatePeriodValueSelect(field.key, periodType, periodValue);

                inputHtml = `<div class="period-input-group">${typeHtml}${yearHtml}${valHtml}</div>`;
                break;
            }

            case 'reference':
                inputHtml = generateReferenceInput(field, value);
                break;

            default:
                inputHtml = `<input type="text" id="field-${field.key}" name="${field.key}" value="${escapeAttr(value || '')}" ${required}>`;
        }

        return `
            <div class="form-group">
                <label for="field-${field.key}">${escapeHtml(field.label)}${requiredMark}</label>
                ${inputHtml}
            </div>
        `;
    }

    function generateDateInput(field, value) {
        const required = field.required ? 'required' : '';
        const zeroLabel = getDateZeroLabel(field.key);
        const isZeroOrMissing = value === 0 || value === null || value === undefined;
        const dateValue = isZeroOrMissing
            ? zeroLabel
            : formatDateForInput(value, { zeroLabel });
        const datePlaceholder = typeof Layer8DUtils !== 'undefined' && Layer8DUtils.getDateInputPlaceholder
            ? Layer8DUtils.getDateInputPlaceholder()
            : 'MM/DD/YYYY';

        return `<div class="date-input-wrapper">
            <input type="text" id="field-${field.key}" name="${field.key}" value="${escapeAttr(dateValue)}" ${required} placeholder="${datePlaceholder}" class="date-input" data-zero-label="${escapeAttr(zeroLabel)}" ${isZeroOrMissing ? 'data-is-zero="true"' : ''}>
            <button type="button" class="date-picker-trigger" data-for="field-${field.key}" title="Open calendar">&#x1F4C5;</button>
        </div>`;
    }

    function generateSelectHtml(field, selectedValue) {
        let html = `<select id="field-${field.key}" name="${field.key}" ${field.required ? 'required' : ''}>`;
        html += '<option value="">-- Select --</option>';

        for (const [val, label] of Object.entries(field.options)) {
            const selected = String(selectedValue) === String(val) ? 'selected' : '';
            html += `<option value="${escapeAttr(val)}" ${selected}>${escapeHtml(label)}</option>`;
        }

        html += '</select>';
        return html;
    }

    function generateFormattedInput(field, value) {
        const type = field.type;
        const required = field.required ? 'required' : '';

        let dataAttrs = `data-format="${escapeAttr(type)}"`;

        if (field.min !== undefined) {
            dataAttrs += ` data-format-min="${escapeAttr(String(field.min))}"`;
        }
        if (field.max !== undefined) {
            dataAttrs += ` data-format-max="${escapeAttr(String(field.max))}"`;
        }
        if (field.decimals !== undefined) {
            dataAttrs += ` data-format-decimals="${escapeAttr(String(field.decimals))}"`;
        }
        if (field.symbol !== undefined) {
            dataAttrs += ` data-format-symbol="${escapeAttr(field.symbol)}"`;
        }

        let displayValue = '';
        if (value !== null && value !== undefined && value !== '') {
            if (typeof Layer8DInputFormatter !== 'undefined' && Layer8DInputFormatter.getType) {
                const typeConfig = Layer8DInputFormatter.getType(type);
                if (typeConfig && typeConfig.format) {
                    displayValue = typeConfig.format(value, field);
                } else {
                    displayValue = value;
                }
            } else {
                displayValue = value;
            }
        }

        const rawValue = value !== null && value !== undefined ? value : '';

        return `<div class="formatted-input-wrapper" data-formatter="${escapeAttr(type)}">
            <input type="text"
                id="field-${field.key}"
                name="${field.key}"
                value="${escapeAttr(String(displayValue))}"
                data-raw-value="${escapeAttr(String(rawValue))}"
                ${dataAttrs}
                ${required}
                class="formatted-input formatted-input-${escapeAttr(type)}">
        </div>`;
    }

    function generateReferenceInput(field, value) {
        const required = field.required ? 'required' : '';
        const refId = value?.id || value || '';
        const displayValue = value?.display || (refId ? `ID: ${refId}` : '');

        let refConfig = field.referenceConfig || {};
        if (field.lookupModel && typeof Layer8DReferenceRegistry !== 'undefined') {
            const registryConfig = Layer8DReferenceRegistry[field.lookupModel];
            if (registryConfig) {
                refConfig = {
                    modelName: field.lookupModel,
                    idColumn: registryConfig.idColumn,
                    displayColumn: registryConfig.displayColumn,
                    selectColumns: registryConfig.selectColumns,
                    displayLabel: registryConfig.displayLabel,
                    ...field.referenceConfig,
                    title: field.referenceConfig?.title || `Select ${field.label}`
                };
            }
        }

        const serializableConfig = {
            modelName: refConfig.modelName,
            idColumn: refConfig.idColumn,
            displayColumn: refConfig.displayColumn,
            selectColumns: refConfig.selectColumns,
            baseWhereClause: refConfig.baseWhereClause,
            title: refConfig.title,
            displayLabel: refConfig.displayLabel,
            placeholder: refConfig.placeholder
        };

        return `<input type="text" id="field-${field.key}" name="${field.key}"
            value="${escapeAttr(displayValue)}"
            data-ref-id="${escapeAttr(String(refId))}"
            data-ref-config='${escapeAttr(JSON.stringify(serializableConfig))}'
            data-field-key="${escapeAttr(field.key)}"
            data-lookup-model="${escapeAttr(field.lookupModel || refConfig.modelName || '')}"
            class="reference-input"
            ${required}
            readonly
            placeholder="Click to select...">`;
    }

    /**
     * Handle currency dropdown change — re-attach formatter with new symbol
     */
    function onCurrencyChange(selectEl) {
        const selectedOption = selectEl.options[selectEl.selectedIndex];
        const newCurrencyId = selectedOption ? selectedOption.value : '';
        const symbol = (selectedOption && selectedOption.dataset.symbol) || '$';
        const group = selectEl.closest('.money-input-group');
        if (!group) return;
        const amountInput = group.querySelector('.formatted-input');
        if (!amountInput) return;

        const oldCurrencyId = selectEl.dataset.previousCurrencyId || '';

        // Get current raw value (in cents) before detaching
        let rawValue = typeof Layer8DInputFormatter !== 'undefined'
            ? Layer8DInputFormatter.getValue(amountInput)
            : amountInput.dataset.rawValue;

        // Convert amount if we have both currencies and a valid amount
        if (oldCurrencyId && newCurrencyId && oldCurrencyId !== newCurrencyId
            && rawValue !== null && rawValue !== undefined && rawValue !== '') {
            const cents = parseInt(rawValue, 10);
            if (!isNaN(cents) && cents !== 0) {
                const converted = Layer8DUtils.convertAmount(cents, oldCurrencyId, newCurrencyId);
                if (converted !== null) {
                    rawValue = converted;
                }
            }
        }

        selectEl.dataset.previousCurrencyId = newCurrencyId;

        // Detach old formatter and re-attach with new symbol
        if (typeof Layer8DInputFormatter !== 'undefined') {
            Layer8DInputFormatter.detach(amountInput);
            amountInput.dataset.format = 'currency';
            amountInput.dataset.formatSymbol = symbol;
            Layer8DInputFormatter.attach(amountInput, 'currency', { symbol });
            if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
                Layer8DInputFormatter.setValue(amountInput, rawValue);
            }
        }
    }

    // ========================================
    // PERIOD FIELD HELPERS (onPeriodTypeChange in layer8d-forms-fields-ext.js)
    // ========================================

    function generatePeriodValueSelect(fieldKey, periodType, selectedValue) {
        const months = [[1,'January'],[2,'February'],[3,'March'],[4,'April'],[5,'May'],[6,'June'],
                        [7,'July'],[8,'August'],[9,'September'],[10,'October'],[11,'November'],[12,'December']];
        const quarters = [[13,'Q1'],[14,'Q2'],[15,'Q3'],[16,'Q4']];
        const hidden = (Number(periodType) === 1);
        let options = Number(periodType) === 2 ? quarters : Number(periodType) === 3 ? months : [];

        let html = `<select name="${fieldKey}.__periodValue" class="period-value-select"${hidden ? ' style="display:none"' : ''}>`;
        html += '<option value="">--</option>';
        for (const [val, lbl] of options) {
            html += `<option value="${val}"${Number(selectedValue) === val ? ' selected' : ''}>${lbl}</option>`;
        }
        html += '</select>';
        return html;
    }

    // Inline table HTML, tags/multiselect & period handlers are in layer8d-forms-fields-ext.js

    // Export (extended by layer8d-forms-fields-ext.js)
    window.Layer8DFormsFields = {
        generateFormHtml,
        generateFieldHtml,
        generateSelectHtml,
        generateFormattedInput,
        generateReferenceInput,
        generateDateInput,
        getDateZeroLabel,
        onCurrencyChange,
        FORMATTED_TYPES
    };

})();
