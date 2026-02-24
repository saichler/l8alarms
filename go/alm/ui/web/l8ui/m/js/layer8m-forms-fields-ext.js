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
/**
 * Layer8MForms Field Renderers - Extended Types
 * Split from layer8m-forms-fields.js for maintainability.
 * Adds specialized field renderers to Layer8MFormFields:
 * currency, percentage, phone, SSN, URL, rating, hours, EIN,
 * routingNumber, colorCode, inlineTable, _formatMobileCell
 */
(function() {
    'use strict';

    const F = window.Layer8MFormFields;

    F.renderCurrencyField = function(config, value, readonly) {
        const requiredAttr = config.required ? 'required' : '';
        const readonlyAttr = readonly ? 'readonly' : '';
        const displayValue = value ? (value / 100).toFixed(2) : '';

        return `
            <div class="mobile-form-field">
                <label class="mobile-form-label">${Layer8MUtils.escapeHtml(config.label)}${config.required ? ' *' : ''}</label>
                <div class="mobile-form-input-group">
                    <span class="mobile-form-input-prefix">$</span>
                    <input type="number"
                           name="${config.key}"
                           value="${displayValue}"
                           step="0.01"
                           min="0"
                           class="mobile-form-input with-prefix"
                           data-format="currency"
                           ${requiredAttr}
                           ${readonlyAttr}>
                </div>
            </div>
        `;
    };

    F.renderPercentageField = function(config, value, readonly) {
        const requiredAttr = config.required ? 'required' : '';
        const readonlyAttr = readonly ? 'readonly' : '';
        const displayValue = value ? (value * 100).toFixed(2) : '';

        return `
            <div class="mobile-form-field">
                <label class="mobile-form-label">${Layer8MUtils.escapeHtml(config.label)}${config.required ? ' *' : ''}</label>
                <div class="mobile-form-input-group">
                    <input type="number"
                           name="${config.key}"
                           value="${displayValue}"
                           step="0.01"
                           min="0"
                           max="100"
                           class="mobile-form-input with-suffix"
                           data-format="percentage"
                           ${requiredAttr}
                           ${readonlyAttr}>
                    <span class="mobile-form-input-suffix">%</span>
                </div>
            </div>
        `;
    };

    F.renderPhoneField = function(config, value, readonly) {
        const requiredAttr = config.required ? 'required' : '';
        const readonlyAttr = readonly ? 'readonly' : '';

        return `
            <div class="mobile-form-field">
                <label class="mobile-form-label">${Layer8MUtils.escapeHtml(config.label)}${config.required ? ' *' : ''}</label>
                <input type="tel"
                       name="${config.key}"
                       value="${Layer8MUtils.escapeAttr(value || '')}"
                       placeholder="(555) 555-5555"
                       class="mobile-form-input"
                       data-format="phone"
                       ${requiredAttr}
                       ${readonlyAttr}>
            </div>
        `;
    };

    F.renderSSNField = function(config, value, readonly) {
        const requiredAttr = config.required ? 'required' : '';
        const readonlyAttr = readonly ? 'readonly' : '';
        const displayValue = readonly && value ? Layer8MUtils.formatSSN(value) : (value || '');

        return `
            <div class="mobile-form-field">
                <label class="mobile-form-label">${Layer8MUtils.escapeHtml(config.label)}${config.required ? ' *' : ''}</label>
                <input type="${readonly ? 'text' : 'password'}"
                       name="${config.key}"
                       value="${Layer8MUtils.escapeAttr(displayValue)}"
                       placeholder="XXX-XX-XXXX"
                       class="mobile-form-input"
                       data-format="ssn"
                       maxlength="11"
                       ${requiredAttr}
                       ${readonlyAttr}>
            </div>
        `;
    };

    F.renderUrlField = function(config, value, readonly) {
        const requiredAttr = config.required ? 'required' : '';
        const readonlyAttr = readonly ? 'readonly' : '';

        return `
            <div class="mobile-form-field">
                <label class="mobile-form-label">${Layer8MUtils.escapeHtml(config.label)}${config.required ? ' *' : ''}</label>
                <input type="url"
                       name="${config.key}"
                       value="${Layer8MUtils.escapeAttr(value || '')}"
                       placeholder="https://..."
                       class="mobile-form-input"
                       data-format="url"
                       ${requiredAttr}
                       ${readonlyAttr}>
            </div>
        `;
    };

    F.renderRatingField = function(config, value, readonly) {
        const requiredAttr = config.required ? 'required' : '';
        const readonlyAttr = readonly ? 'readonly' : '';
        const min = config.min || 1;
        const max = config.max || 5;

        return `
            <div class="mobile-form-field">
                <label class="mobile-form-label">${Layer8MUtils.escapeHtml(config.label)}${config.required ? ' *' : ''}</label>
                <input type="number"
                       name="${config.key}"
                       value="${value || ''}"
                       min="${min}"
                       max="${max}"
                       class="mobile-form-input"
                       data-format="rating"
                       ${requiredAttr}
                       ${readonlyAttr}>
            </div>
        `;
    };

    F.renderHoursField = function(config, value, readonly) {
        const requiredAttr = config.required ? 'required' : '';
        const readonlyAttr = readonly ? 'readonly' : '';
        let displayValue = '';
        if (value) {
            const hours = Math.floor(value / 60);
            const mins = value % 60;
            displayValue = `${hours}:${mins.toString().padStart(2, '0')}`;
        }

        return `
            <div class="mobile-form-field">
                <label class="mobile-form-label">${Layer8MUtils.escapeHtml(config.label)}${config.required ? ' *' : ''}</label>
                <input type="text"
                       name="${config.key}"
                       value="${Layer8MUtils.escapeAttr(displayValue)}"
                       placeholder="HH:MM"
                       class="mobile-form-input"
                       data-format="hours"
                       ${requiredAttr}
                       ${readonlyAttr}>
            </div>
        `;
    };

    F.renderEinField = function(config, value, readonly) {
        const requiredAttr = config.required ? 'required' : '';
        const readonlyAttr = readonly ? 'readonly' : '';

        return `
            <div class="mobile-form-field">
                <label class="mobile-form-label">${Layer8MUtils.escapeHtml(config.label)}${config.required ? ' *' : ''}</label>
                <input type="text"
                       name="${config.key}"
                       value="${Layer8MUtils.escapeAttr(value || '')}"
                       placeholder="XX-XXXXXXX"
                       class="mobile-form-input"
                       data-format="ein"
                       maxlength="10"
                       ${requiredAttr}
                       ${readonlyAttr}>
            </div>
        `;
    };

    F.renderRoutingNumberField = function(config, value, readonly) {
        const requiredAttr = config.required ? 'required' : '';
        const readonlyAttr = readonly ? 'readonly' : '';

        return `
            <div class="mobile-form-field">
                <label class="mobile-form-label">${Layer8MUtils.escapeHtml(config.label)}${config.required ? ' *' : ''}</label>
                <input type="text"
                       name="${config.key}"
                       value="${Layer8MUtils.escapeAttr(value || '')}"
                       placeholder="9-digit routing number"
                       class="mobile-form-input"
                       data-format="routingNumber"
                       maxlength="9"
                       ${requiredAttr}
                       ${readonlyAttr}>
            </div>
        `;
    };

    F.renderColorCodeField = function(config, value, readonly) {
        const requiredAttr = config.required ? 'required' : '';
        const readonlyAttr = readonly ? 'readonly' : '';
        const colorValue = value || '#000000';

        return `
            <div class="mobile-form-field">
                <label class="mobile-form-label">${Layer8MUtils.escapeHtml(config.label)}${config.required ? ' *' : ''}</label>
                <div class="mobile-form-input-group">
                    <input type="color"
                           name="${config.key}"
                           value="${Layer8MUtils.escapeAttr(colorValue)}"
                           class="mobile-form-color-input"
                           data-format="colorCode"
                           ${requiredAttr}
                           ${readonlyAttr}>
                    <input type="text"
                           value="${Layer8MUtils.escapeAttr(colorValue)}"
                           class="mobile-form-input color-text-input"
                           placeholder="#RRGGBB"
                           maxlength="7"
                           ${readonlyAttr}>
                </div>
            </div>
        `;
    };

    F.renderInlineTableField = function(config, value, readonly) {
        const rows = Array.isArray(value) ? value : [];
        const visibleCols = (config.columns || []).filter(c => !c.hidden);
        const esc = Layer8MUtils.escapeHtml;
        const escA = Layer8MUtils.escapeAttr;

        let html = `<div class="mobile-form-field">`;
        html += `<label class="mobile-form-label">${esc(config.label)}</label>`;
        html += `<div class="mobile-form-inline-table" data-inline-table="${escA(config.key)}">`;

        if (rows.length > 0) {
            rows.forEach((row, idx) => {
                const titleCol = visibleCols[0];
                const titleValue = titleCol ? F._formatMobileCell(titleCol, row[titleCol.key]) : '-';
                const clickAttr = readonly ? ' onclick="Layer8MFormFields._onInlineRowClick(this)"' : '';

                html += `<div class="mobile-form-inline-card${readonly ? ' l8-clickable-row' : ''}" data-row-index="${idx}"${clickAttr}>`;
                html += `<div class="mobile-form-inline-card-header">`;
                html += `<span class="mobile-form-inline-card-title">${titleValue}</span>`;
                if (!readonly) {
                    html += `<div class="mobile-form-inline-card-actions">`;
                    html += `<button type="button" data-action="edit-row" data-row-index="${idx}">Edit</button>`;
                    html += `<button type="button" data-action="delete-row" data-row-index="${idx}">Delete</button>`;
                    html += `</div>`;
                }
                html += `</div>`;

                if (visibleCols.length > 1) {
                    html += `<div class="mobile-form-inline-card-body">`;
                    visibleCols.slice(1).forEach(col => {
                        html += `<div class="mobile-form-inline-card-row">`;
                        html += `<span class="mobile-form-inline-card-label">${esc(col.label)}</span>`;
                        html += `<span class="mobile-form-inline-card-value">${F._formatMobileCell(col, row[col.key])}</span>`;
                        html += `</div>`;
                    });
                    html += `</div>`;
                }
                html += `</div>`;
            });
        } else {
            html += `<div class="mobile-form-inline-empty">No records</div>`;
        }

        if (!readonly) {
            html += `<button type="button" class="mobile-form-inline-add" data-action="add-row">+ Add</button>`;
        }

        const jsonValue = escA(JSON.stringify(rows));
        html += `<input type="hidden" name="${escA(config.key)}" data-inline-table-data="${escA(config.key)}" value="${jsonValue}">`;
        html += `</div></div>`;
        return html;
    };

    F._formatMobileCell = function(col, value) {
        if (value === null || value === undefined || value === '') return '-';
        if (col.type === 'money' && typeof value === 'object') {
            return Layer8MUtils.formatMoney ? Layer8MUtils.formatMoney(value) : JSON.stringify(value);
        }
        if (col.type === 'date' && typeof value === 'number') {
            return Layer8MUtils.formatDate ? Layer8MUtils.formatDate(value) : String(value);
        }
        if (col.type === 'select' && col.options) {
            return col.options[value] || String(value);
        }
        if (col.type === 'checkbox') return value ? 'Yes' : 'No';
        return Layer8MUtils.escapeHtml(String(value));
    };

    F._onInlineRowClick = function(cardEl) {
        // Handled by event delegation in Layer8MForms.initInlineTableHandlers
    };

    F.renderTimeField = function(config, value, readonly) {
        const requiredAttr = config.required ? 'required' : '';
        const readonlyAttr = readonly ? 'readonly' : '';

        return `
            <div class="mobile-form-field">
                <label class="mobile-form-label">${Layer8MUtils.escapeHtml(config.label)}${config.required ? ' *' : ''}</label>
                <input type="time"
                       name="${config.key}"
                       value="${Layer8MUtils.escapeAttr(value || '')}"
                       class="mobile-form-input"
                       ${requiredAttr}
                       ${readonlyAttr}>
            </div>
        `;
    };

    F.renderTagsField = function(config, value, readonly) {
        const tags = Array.isArray(value) ? value : [];
        const esc = Layer8MUtils.escapeHtml;
        const escA = Layer8MUtils.escapeAttr;
        let chipsHtml = tags.map(t =>
            `<span class="l8-tag-chip">${esc(t)}${readonly ? '' : '<span class="l8-tag-remove" onclick="Layer8MFormFields.removeTag(this)">&times;</span>'}</span>`
        ).join('');

        let inputHtml = '';
        if (!readonly) {
            inputHtml = `<input type="text" class="l8-tags-input mobile-form-input" placeholder="Type and press Enter"
                onkeydown="Layer8MFormFields.onTagKeydown(event, this)">`;
        }

        return `
            <div class="mobile-form-field">
                <label class="mobile-form-label">${esc(config.label)}</label>
                <div class="l8-tags-wrapper">
                    <div class="l8-tags-chips">${chipsHtml}</div>
                    ${inputHtml}
                    <input type="hidden" name="${config.key}" data-tags-value="${escA(config.key)}" value="${escA(JSON.stringify(tags))}">
                </div>
            </div>
        `;
    };

    F.renderMultiselectField = function(config, value, readonly) {
        const msValues = Array.isArray(value) ? value : [];
        const options = config.options || {};
        const esc = Layer8MUtils.escapeHtml;
        const escA = Layer8MUtils.escapeAttr;

        let chipsHtml = msValues.map(v => {
            const label = options[v] || v;
            return `<span class="l8-tag-chip">${esc(String(label))}${readonly ? '' : `<span class="l8-tag-remove" onclick="Layer8MFormFields.removeMultiselectValue(this, '${escA(String(v))}')">&times;</span>`}</span>`;
        }).join('');

        let triggerAndDropdown = '';
        if (!readonly) {
            let optsHtml = Object.entries(options).map(([val, label]) => {
                const chk = msValues.includes(val) || msValues.includes(Number(val)) ? 'checked' : '';
                return `<label class="l8-multiselect-option"><input type="checkbox" value="${escA(val)}" ${chk} onchange="Layer8MFormFields.onMultiselectChange(this)">${esc(label)}</label>`;
            }).join('');
            triggerAndDropdown = `
                <div class="l8-multiselect-trigger" onclick="Layer8MFormFields.toggleMultiselectDropdown(this)">Select options...</div>
                <div class="l8-multiselect-dropdown" style="display:none">${optsHtml}</div>`;
        }

        return `
            <div class="mobile-form-field">
                <label class="mobile-form-label">${esc(config.label)}${config.required ? ' *' : ''}</label>
                <div class="l8-multiselect-wrapper">
                    <div class="l8-multiselect-chips">${chipsHtml}</div>
                    ${triggerAndDropdown}
                    <input type="hidden" name="${config.key}" data-multiselect-value="${escA(config.key)}" value="${escA(JSON.stringify(msValues))}">
                </div>
            </div>
        `;
    };

    // Tags & multiselect interaction handlers (called from inline onclick)
    F.onTagKeydown = function(event, input) {
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
        chip.innerHTML = `${Layer8MUtils.escapeHtml(val)}<span class="l8-tag-remove" onclick="Layer8MFormFields.removeTag(this)">&times;</span>`;
        chips.appendChild(chip);
        input.value = '';
    };

    F.removeTag = function(removeBtn) {
        const chip = removeBtn.parentElement;
        const wrapper = chip.closest('.l8-tags-wrapper');
        const hidden = wrapper.querySelector('input[data-tags-value]');
        const tagText = chip.firstChild.textContent;
        let arr = [];
        try { arr = JSON.parse(hidden.value || '[]'); } catch (e) { arr = []; }
        arr = arr.filter(t => t !== tagText);
        hidden.value = JSON.stringify(arr);
        chip.remove();
    };

    F.toggleMultiselectDropdown = function(trigger) {
        const dropdown = trigger.nextElementSibling;
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    };

    F.onMultiselectChange = function(checkbox) {
        const wrapper = checkbox.closest('.l8-multiselect-wrapper');
        const hidden = wrapper.querySelector('input[data-multiselect-value]');
        const chips = wrapper.querySelector('.l8-multiselect-chips');
        const dropdownEl = wrapper.querySelector('.l8-multiselect-dropdown');
        const checked = dropdownEl.querySelectorAll('input[type="checkbox"]:checked');
        const fieldOptions = {};
        dropdownEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            fieldOptions[cb.value] = cb.parentElement.textContent.trim();
        });
        const values = [];
        let chipsHtml = '';
        checked.forEach(cb => {
            const numVal = parseInt(cb.value, 10);
            values.push(isNaN(numVal) ? cb.value : numVal);
            const label = fieldOptions[cb.value] || cb.value;
            chipsHtml += `<span class="l8-tag-chip">${Layer8MUtils.escapeHtml(label)}<span class="l8-tag-remove" onclick="Layer8MFormFields.removeMultiselectValue(this, '${Layer8MUtils.escapeAttr(cb.value)}')">&times;</span></span>`;
        });
        hidden.value = JSON.stringify(values);
        chips.innerHTML = chipsHtml;
    };

    F.removeMultiselectValue = function(removeBtn, val) {
        const wrapper = removeBtn.closest('.l8-multiselect-wrapper');
        const dropdownEl = wrapper.querySelector('.l8-multiselect-dropdown');
        const cb = dropdownEl.querySelector(`input[value="${val}"]`);
        if (cb) { cb.checked = false; F.onMultiselectChange(cb); }
    };

    F.renderRichtextField = function(config, value, readonly) {
        const esc = Layer8MUtils.escapeHtml;
        const escA = Layer8MUtils.escapeAttr;
        const content = value || '';

        if (readonly) {
            return `
                <div class="mobile-form-field">
                    <label class="mobile-form-label">${esc(config.label)}</label>
                    <div class="l8-richtext-wrapper">
                        <div class="l8-richtext-editor" style="pointer-events:none;opacity:0.7"
                             data-field-key="${escA(config.key)}">${content}</div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="mobile-form-field">
                <label class="mobile-form-label">${esc(config.label)}${config.required ? ' *' : ''}</label>
                <div class="l8-richtext-wrapper">
                    <div class="l8-richtext-toolbar">
                        <button type="button" onclick="document.execCommand('bold')" title="Bold"><b>B</b></button>
                        <button type="button" onclick="document.execCommand('italic')" title="Italic"><i>I</i></button>
                        <button type="button" onclick="document.execCommand('insertUnorderedList')" title="Bullet List">&#8226;</button>
                        <button type="button" onclick="document.execCommand('insertOrderedList')" title="Numbered List">1.</button>
                    </div>
                    <div class="l8-richtext-editor" contenteditable="true"
                         data-field-key="${escA(config.key)}">${content}</div>
                    <input type="hidden" name="${config.key}" data-richtext-value="${escA(config.key)}" value="${escA(content)}">
                </div>
            </div>
        `;
    };

})();
