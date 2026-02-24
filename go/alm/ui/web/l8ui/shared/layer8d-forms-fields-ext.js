/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
/**
 * ERP Form Field Generation - Extended
 * Split from layer8d-forms-fields.js for maintainability.
 * Contains: inline table HTML, tags/multiselect interaction handlers.
 */
(function() {
    'use strict';

    const { escapeHtml, escapeAttr } = Layer8DUtils;
    const F = window.Layer8DFormsFields;

    // ========================================
    // INLINE TABLE (embedded child records)
    // ========================================

    function formatInlineTableCell(col, value) {
        if (value === null || value === undefined || value === '') return '-';
        if (col.type === 'money' && typeof value === 'object') {
            return Layer8DUtils.formatMoney(value);
        }
        if (col.type === 'date' && typeof value === 'number') {
            return Layer8DUtils.formatDate(value);
        }
        if (col.type === 'select' && col.options) {
            return col.options[value] || String(value);
        }
        if (col.type === 'checkbox') {
            return value ? 'Yes' : 'No';
        }
        return escapeHtml(String(value));
    }

    function generateInlineTableHtml(field, rows, readOnly) {
        const visibleCols = field.columns.filter(c => !c.hidden);
        const gridCols = readOnly
            ? visibleCols.map(() => '1fr').join(' ')
            : visibleCols.map(() => '1fr').join(' ') + ' 100px';

        let html = `<div class="form-group form-group-full-width">`;
        html += `<label>${escapeHtml(field.label)}</label>`;
        html += `<div class="form-inline-table${readOnly ? ' form-inline-table-readonly' : ''}" data-inline-table="${escapeAttr(field.key)}">`;

        html += `<div class="form-inline-table-header" style="grid-template-columns: ${gridCols}">`;
        visibleCols.forEach(col => {
            html += `<span>${escapeHtml(col.label)}</span>`;
        });
        if (!readOnly) html += '<span></span>';
        html += '</div>';

        html += '<div class="form-inline-table-body">';
        if (rows && rows.length > 0) {
            rows.forEach((row, idx) => {
                const clickClass = readOnly ? ' l8-clickable-row' : '';
                html += `<div class="form-inline-table-row${clickClass}" data-row-index="${idx}" style="grid-template-columns: ${gridCols}">`;
                visibleCols.forEach(col => {
                    html += `<span class="form-inline-table-cell">${formatInlineTableCell(col, row[col.key])}</span>`;
                });
                if (!readOnly) {
                    html += `<span class="form-inline-table-actions">`;
                    html += `<button type="button" class="form-inline-table-btn edit" data-action="edit-row" data-row-index="${idx}">Edit</button>`;
                    html += `<button type="button" class="form-inline-table-btn delete" data-action="delete-row" data-row-index="${idx}">Delete</button>`;
                    html += `</span>`;
                }
                html += '</div>';
            });
        } else {
            html += `<div class="form-inline-table-empty">No records</div>`;
        }
        html += '</div>';

        if (!readOnly) {
            html += `<div class="form-inline-table-footer">`;
            html += `<button type="button" class="form-inline-table-btn add" data-action="add-row">+ Add</button>`;
            html += `</div>`;
        }

        const jsonValue = escapeAttr(JSON.stringify(rows || []));
        html += `<input type="hidden" name="${escapeAttr(field.key)}" data-inline-table-data="${escapeAttr(field.key)}" value="${jsonValue}">`;
        html += '</div></div>';

        return html;
    }

    // ========================================
    // TAGS & MULTISELECT HANDLERS
    // ========================================

    function onTagKeydown(event, input) {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const val = input.value.trim();
        if (!val) return;
        const wrapper = input.closest('.l8-tags-wrapper');
        const hidden = wrapper.querySelector('input[data-tags-value]');
        const chips = wrapper.querySelector('.l8-tags-chips');
        let arr = [];
        try { arr = JSON.parse(hidden.value || '[]'); } catch (e) { arr = []; }
        if (arr.includes(val)) { input.value = ''; return; }
        arr.push(val);
        hidden.value = JSON.stringify(arr);
        const chip = document.createElement('span');
        chip.className = 'l8-tag-chip';
        chip.innerHTML = `${escapeHtml(val)}<span class="l8-tag-remove" onclick="Layer8DFormsFields.removeTag(this)">&times;</span>`;
        chips.appendChild(chip);
        input.value = '';
    }

    function removeTag(removeBtn) {
        const chip = removeBtn.parentElement;
        const wrapper = chip.closest('.l8-tags-wrapper');
        const hidden = wrapper.querySelector('input[data-tags-value]');
        const tagText = chip.firstChild.textContent;
        let arr = [];
        try { arr = JSON.parse(hidden.value || '[]'); } catch (e) { arr = []; }
        arr = arr.filter(t => t !== tagText);
        hidden.value = JSON.stringify(arr);
        chip.remove();
    }

    function toggleMultiselectDropdown(trigger) {
        const dropdown = trigger.nextElementSibling;
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }

    function onMultiselectChange(checkbox) {
        const wrapper = checkbox.closest('.l8-multiselect-wrapper');
        const hidden = wrapper.querySelector('input[data-multiselect-value]');
        const chips = wrapper.querySelector('.l8-multiselect-chips');
        const options = wrapper.querySelector('.l8-multiselect-dropdown');
        const checked = options.querySelectorAll('input[type="checkbox"]:checked');
        const fieldOptions = {};
        options.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            fieldOptions[cb.value] = cb.parentElement.textContent.trim();
        });
        const values = [];
        let chipsHtml = '';
        checked.forEach(cb => {
            const numVal = parseInt(cb.value, 10);
            values.push(isNaN(numVal) ? cb.value : numVal);
            const label = fieldOptions[cb.value] || cb.value;
            chipsHtml += `<span class="l8-tag-chip">${escapeHtml(label)}<span class="l8-tag-remove" onclick="Layer8DFormsFields.removeMultiselectValue(this, '${escapeAttr(cb.value)}')">&times;</span></span>`;
        });
        hidden.value = JSON.stringify(values);
        chips.innerHTML = chipsHtml;
    }

    function removeMultiselectValue(removeBtn, val) {
        const wrapper = removeBtn.closest('.l8-multiselect-wrapper');
        const options = wrapper.querySelector('.l8-multiselect-dropdown');
        const cb = options.querySelector(`input[value="${val}"]`);
        if (cb) { cb.checked = false; onMultiselectChange(cb); }
    }

    // ========================================
    // PERIOD TYPE CHANGE HANDLER
    // ========================================

    const PERIOD_MONTHS = [[1,'January'],[2,'February'],[3,'March'],[4,'April'],[5,'May'],[6,'June'],
                           [7,'July'],[8,'August'],[9,'September'],[10,'October'],[11,'November'],[12,'December']];
    const PERIOD_QUARTERS = [[13,'Q1'],[14,'Q2'],[15,'Q3'],[16,'Q4']];

    function onPeriodTypeChange(selectEl) {
        const group = selectEl.closest('.period-input-group');
        if (!group) return;
        const valueSelect = group.querySelector('.period-value-select');
        if (!valueSelect) return;
        const periodType = Number(selectEl.value);
        let options = periodType === 2 ? PERIOD_QUARTERS : periodType === 3 ? PERIOD_MONTHS : [];
        let html = '<option value="">--</option>';
        for (const [val, lbl] of options) {
            html += `<option value="${val}">${lbl}</option>`;
        }
        valueSelect.innerHTML = html;
        valueSelect.style.display = (periodType === 1 || periodType === 0) ? 'none' : '';
    }

    // Extend exports
    F.onPeriodTypeChange = onPeriodTypeChange;
    F.generateInlineTableHtml = generateInlineTableHtml;
    F.formatInlineTableCell = formatInlineTableCell;
    F.onTagKeydown = onTagKeydown;
    F.removeTag = removeTag;
    F.toggleMultiselectDropdown = toggleMultiselectDropdown;
    F.onMultiselectChange = onMultiselectChange;
    F.removeMultiselectValue = removeMultiselectValue;

})();
