/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
/**
 * ERP Form Data Handling
 * Handles form data collection, validation, and CRUD operations
 */
(function() {
    'use strict';

    const { parseDateToTimestamp } = Layer8DUtils;

    function sanitizeServerError(text) {
        if (!text) return 'Unknown error';
        const match = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s+(.+)$/i);
        return match ? match[1] : text;
    }

    function setNestedValue(obj, key, value) {
        if (!key.includes('.')) { obj[key] = value; return; }
        const parts = key.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {};
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
    }

    function getNestedValue(obj, key) {
        if (!key.includes('.')) return obj[key];
        return key.split('.').reduce((o, k) => o && o[k], obj);
    }

    // ========================================
    // FORM DATA HANDLING
    // ========================================

    function collectFormData(formDef) {
        // Scope to topmost popup body to avoid picking up a stacked parent form
        // when a child row editor is open on top
        let form = null;
        if (typeof Layer8DPopup !== 'undefined') {
            const body = Layer8DPopup.getBody();
            if (body) {
                form = body.querySelector('#layer8d-edit-form');
            }
        }
        if (!form) {
            form = document.getElementById('layer8d-edit-form');
        }
        if (!form) return null;

        const data = {};

        formDef.sections.forEach(section => {
            section.fields.forEach(field => {
                // Money fields use compound sub-elements (fieldKey.__amount, fieldKey.__currencyId)
                // Inline tables use a hidden input with data-inline-table-data attribute
                // so form.elements[field.key] won't find a match — skip the guard for them
                const element = form.elements[field.key];
                if (!element && field.type !== 'money' && field.type !== 'period' && field.type !== 'inlineTable' && field.type !== 'tags' && field.type !== 'multiselect' && field.type !== 'richtext') return;

                let value;
                switch (field.type) {
                    case 'checkbox':
                    case 'toggle':
                        value = element.checked;
                        break;
                    case 'number':
                    case 'slider':
                        value = element.value ? parseFloat(element.value) : null;
                        break;
                    case 'date':
                        const dateVal = (element.value || '').trim().toLowerCase();
                        if (dateVal === 'current' || dateVal === 'n/a' || element.dataset.isZero === 'true') {
                            value = 0;
                        } else if (dateVal === '') {
                            value = null;
                        } else {
                            value = parseDateToTimestamp(element.value);
                        }
                        break;
                    case 'select':
                        if (element.value) {
                            const numVal = parseInt(element.value, 10);
                            value = isNaN(numVal) ? element.value : numVal;
                        } else {
                            value = null;
                        }
                        break;
                    case 'reference':
                        const refId = element.dataset.refId;
                        if (refId) {
                            const numRefId = parseInt(refId, 10);
                            value = isNaN(numRefId) ? refId : numRefId;
                        } else {
                            value = null;
                        }
                        break;

                    // String formatted types
                    case 'ssn':
                    case 'phone':
                    case 'routingNumber':
                    case 'ein':
                    case 'email':
                    case 'url':
                    case 'colorCode':
                        if (typeof Layer8DInputFormatter !== 'undefined') {
                            value = Layer8DInputFormatter.getValue(element);
                        } else {
                            value = element.dataset.rawValue || element.value || null;
                        }
                        break;

                    case 'currency':
                        if (typeof Layer8DInputFormatter !== 'undefined') {
                            const cents = Layer8DInputFormatter.getValue(element);
                            value = cents !== null && cents !== '' ? parseInt(cents, 10) : null;
                        } else if (element.dataset.rawValue) {
                            value = parseInt(element.dataset.rawValue, 10);
                            if (isNaN(value)) value = null;
                        } else {
                            value = null;
                        }
                        break;

                    case 'money': {
                        const amountEl = form.elements[field.key + '.__amount'];
                        const currencyEl = form.querySelector(`select[name="${field.key}.__currencyId"]`);
                        let cents = null;
                        if (amountEl) {
                            if (typeof Layer8DInputFormatter !== 'undefined') {
                                const raw = Layer8DInputFormatter.getValue(amountEl);
                                cents = raw !== null && raw !== '' ? parseInt(raw, 10) : null;
                            } else if (amountEl.dataset.rawValue) {
                                cents = parseInt(amountEl.dataset.rawValue, 10);
                                if (isNaN(cents)) cents = null;
                            }
                        }
                        const currId = currencyEl ? currencyEl.value : '';
                        value = cents != null ? { amount: cents, currencyId: currId } : null;
                        break;
                    }

                    case 'period': {
                        const ptEl = form.querySelector(`select[name="${field.key}.__periodType"]`);
                        const pyEl = form.querySelector(`select[name="${field.key}.__periodYear"]`);
                        const pvEl = form.querySelector(`select[name="${field.key}.__periodValue"]`);
                        const pt = ptEl ? parseInt(ptEl.value, 10) : 0;
                        const py = pyEl ? parseInt(pyEl.value, 10) : 0;
                        const pv = pvEl ? parseInt(pvEl.value, 10) : 0;
                        value = pt ? { periodType: pt, periodYear: py, periodValue: pv } : null;
                        break;
                    }

                    case 'inlineTable': {
                        const hiddenInput = form.querySelector(`input[data-inline-table-data="${field.key}"]`);
                        if (hiddenInput && hiddenInput.value) {
                            try { value = JSON.parse(hiddenInput.value); } catch (e) { value = []; }
                        } else {
                            value = [];
                        }
                        break;
                    }

                    case 'tags': {
                        const tagsHidden = form.querySelector(`input[data-tags-value="${field.key}"]`);
                        if (tagsHidden && tagsHidden.value) {
                            try { value = JSON.parse(tagsHidden.value); } catch (e) { value = []; }
                        } else {
                            value = [];
                        }
                        break;
                    }

                    case 'multiselect': {
                        const msHidden = form.querySelector(`input[data-multiselect-value="${field.key}"]`);
                        if (msHidden && msHidden.value) {
                            try { value = JSON.parse(msHidden.value); } catch (e) { value = []; }
                        } else {
                            value = [];
                        }
                        break;
                    }

                    case 'time':
                        value = element.value || null;
                        break;

                    case 'richtext': {
                        const rtEditor = form.querySelector(`.l8-richtext-editor[data-field-key="${field.key}"]`);
                        if (rtEditor) {
                            let html = rtEditor.innerHTML || '';
                            html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
                            html = html.replace(/\s*on\w+\s*=\s*(['"])[^'"]*\1/gi, '');
                            value = html.trim() || null;
                        } else {
                            value = null;
                        }
                        break;
                    }

                    case 'percentage':
                        if (typeof Layer8DInputFormatter !== 'undefined') {
                            const pct = Layer8DInputFormatter.getValue(element);
                            value = pct !== null && pct !== '' ? parseFloat(pct) : null;
                        } else if (element.dataset.rawValue) {
                            value = parseFloat(element.dataset.rawValue);
                            if (isNaN(value)) value = null;
                        } else {
                            value = null;
                        }
                        break;

                    case 'rating':
                        if (typeof Layer8DInputFormatter !== 'undefined') {
                            const rating = Layer8DInputFormatter.getValue(element);
                            value = rating !== null && rating !== '' ? parseInt(rating, 10) : null;
                        } else {
                            value = element.value ? parseInt(element.value, 10) : null;
                            if (isNaN(value)) value = null;
                        }
                        break;

                    case 'hours':
                        if (typeof Layer8DInputFormatter !== 'undefined') {
                            const minutes = Layer8DInputFormatter.getValue(element);
                            value = minutes !== null && minutes !== '' ? parseInt(minutes, 10) : null;
                        } else {
                            value = element.value || null;
                        }
                        break;

                    default:
                        value = element.value || null;
                }

                if (value !== null && value !== '') {
                    setNestedValue(data, field.key, value);
                }
            });
        });

        return data;
    }

    function validateFormData(formDef, data) {
        const errors = [];

        formDef.sections.forEach(section => {
            section.fields.forEach(field => {
                if (field.required) {
                    const value = getNestedValue(data, field.key);
                    if (value === null || value === undefined || value === '') {
                        errors.push({ field: field.key, message: `${field.label} is required` });
                    }
                }
            });
        });

        return errors;
    }

    // ========================================
    // CRUD OPERATIONS
    // ========================================

    async function fetchRecord(endpoint, primaryKey, id, modelName) {
        const query = encodeURIComponent(JSON.stringify({
            text: `select * from ${modelName} where ${primaryKey}=${id}`
        }));

        const response = await fetch(`${endpoint}?body=${query}`, {
            method: 'GET',
            headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}
        });

        if (!response.ok) throw new Error('Failed to fetch record');

        const result = await response.json();
        return result.list && result.list.length > 0 ? result.list[0] : null;
    }

    async function saveRecord(endpoint, data, isEdit = false) {
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {})
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(sanitizeServerError(errorText) || 'Failed to save record');
        }
        return await response.json();
    }

    async function deleteRecord(endpoint, id, primaryKey, modelName) {
        const query = {
            text: `select * from ${modelName} where ${primaryKey}=${id}`
        };

        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {})
            },
            body: JSON.stringify(query)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(sanitizeServerError(errorText) || 'Failed to delete record');
        }
        return true;
    }

    // Export
    window.Layer8DFormsData = {
        collectFormData,
        validateFormData,
        fetchRecord,
        saveRecord,
        deleteRecord
    };

})();
