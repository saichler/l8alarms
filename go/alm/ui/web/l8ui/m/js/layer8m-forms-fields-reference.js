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
 * Layer8MForms Field Renderers - Reference & Money Fields
 * Split from layer8m-forms-fields.js for maintainability.
 * Adds renderReferenceField and renderMoneyField to Layer8MFormFields.
 */
(function() {
    'use strict';

    const F = window.Layer8MFormFields;

    /**
     * Build a reference input HTML string for a given config and value.
     * Shared by renderReferenceField and renderMoneyField.
     */
    function buildReferenceInput(config, refId, displayValue, readonly) {
        let refConfig = config.referenceConfig || {};
        if (config.lookupModel && window.Layer8MReferenceRegistry) {
            const registryConfig = Layer8MReferenceRegistry.get(config.lookupModel);
            if (registryConfig) {
                refConfig = {
                    modelName: config.lookupModel,
                    idColumn: registryConfig.idColumn,
                    displayColumn: registryConfig.displayColumn,
                    selectColumns: registryConfig.selectColumns,
                    displayLabel: registryConfig.displayLabel,
                    ...config.referenceConfig,
                    title: config.referenceConfig?.title || `Select ${config.label}`
                };
            }
        }

        const serializableConfig = {
            modelName: refConfig.modelName || config.lookupModel,
            idColumn: refConfig.idColumn,
            displayColumn: refConfig.displayColumn,
            selectColumns: refConfig.selectColumns,
            baseWhereClause: refConfig.baseWhereClause,
            title: refConfig.title,
            displayLabel: refConfig.displayLabel,
            placeholder: refConfig.placeholder
        };

        if (refId && !displayValue) {
            displayValue = `ID: ${refId}`;
        }

        const requiredAttr = config.required ? 'required' : '';

        if (readonly) {
            return `<input type="text"
                       name="${config.key}"
                       value="${Layer8MUtils.escapeAttr(displayValue || 'N/A')}"
                       data-ref-id="${Layer8MUtils.escapeAttr(String(refId))}"
                       class="mobile-form-input reference-input"
                       readonly disabled>`;
        }

        return `<input type="text"
                   id="field-${config.key}"
                   name="${config.key}"
                   value="${Layer8MUtils.escapeAttr(displayValue)}"
                   data-ref-id="${Layer8MUtils.escapeAttr(String(refId))}"
                   data-ref-config='${Layer8MUtils.escapeAttr(JSON.stringify(serializableConfig))}'
                   data-field-key="${Layer8MUtils.escapeAttr(config.key)}"
                   data-lookup-model="${Layer8MUtils.escapeAttr(config.lookupModel || refConfig.modelName || '')}"
                   class="mobile-form-input reference-input"
                   ${requiredAttr}
                   readonly
                   placeholder="Click to select...">`;
    }

    /**
     * Render reference field - MATCHES DESKTOP erp-forms.js EXACTLY
     */
    F.renderReferenceField = function(config, value, readonly) {
        const refId = value?.id || value || '';
        const displayValue = value?.display || '';
        const inputHtml = buildReferenceInput(config, refId, displayValue, readonly);

        return `
            <div class="mobile-form-field">
                <label class="mobile-form-label">${Layer8MUtils.escapeHtml(config.label)}${!readonly && config.required ? ' *' : ''}</label>
                ${inputHtml}
            </div>
        `;
    };

    /**
     * Render money field - Currency <select> dropdown + amount input
     * Matches desktop layer8d-forms-fields.js money case
     */
    F.renderMoneyField = function(config, value, readonly) {
        const moneyObj = (typeof value === 'object' && value !== null) ? value : {};
        const amountValue = moneyObj.amount !== undefined ? moneyObj.amount : value;
        const currencyId = moneyObj.currencyId || '';

        // Currency <select> dropdown
        const currencies = (window.Layer8DUtils && Layer8DUtils.getCurrencyList)
            ? Layer8DUtils.getCurrencyList() : [];
        const selectedCurrency = currencies.find(c => c.currencyId === currencyId);
        const currSymbol = selectedCurrency ? (selectedCurrency.symbol || '$') : '$';

        let selectHtml = `<select name="${config.key}.__currencyId" class="mobile-money-currency-select" data-previous-currency-id="${Layer8MUtils.escapeAttr(currencyId)}" onchange="Layer8MFormFields.onMoneyCurrencyChange(this)"${readonly ? ' disabled' : ''}>`;
        selectHtml += '<option value="">--</option>';
        for (const c of currencies) {
            const sel = c.currencyId === currencyId ? ' selected' : '';
            selectHtml += `<option value="${Layer8MUtils.escapeAttr(c.currencyId)}" data-symbol="${Layer8MUtils.escapeAttr(c.symbol || '$')}"${sel}>${Layer8MUtils.escapeHtml(c.code)}</option>`;
        }
        selectHtml += '</select>';

        const displayAmount = amountValue ? (amountValue / 100).toFixed(2) : '';
        const requiredAttr = config.required ? 'required' : '';
        const readonlyAttr = readonly ? 'readonly' : '';

        const amountHtml = `<div class="mobile-form-input-group">
                    <span class="mobile-form-input-prefix mobile-money-symbol">${Layer8MUtils.escapeHtml(currSymbol)}</span>
                    <input type="number"
                           name="${config.key}.__amount"
                           value="${displayAmount}"
                           data-format="currency"
                           step="0.01" min="0"
                           class="mobile-form-input with-prefix mobile-money-amount"
                           ${requiredAttr} ${readonlyAttr}>
                </div>`;

        return `
            <div class="mobile-form-field">
                <label class="mobile-form-label">${Layer8MUtils.escapeHtml(config.label)}${config.required ? ' *' : ''}</label>
                <div class="mobile-money-input-group">
                    ${selectHtml}
                    ${amountHtml}
                </div>
            </div>
        `;
    };

    // ========================================
    // PERIOD FIELD
    // ========================================

    const PERIOD_MONTHS = [
        [1, 'January'], [2, 'February'], [3, 'March'], [4, 'April'],
        [5, 'May'], [6, 'June'], [7, 'July'], [8, 'August'],
        [9, 'September'], [10, 'October'], [11, 'November'], [12, 'December']
    ];
    const PERIOD_QUARTERS = [[13, 'Q1'], [14, 'Q2'], [15, 'Q3'], [16, 'Q4']];

    F.renderPeriodField = function(config, value, readonly) {
        const periodObj = (typeof value === 'object' && value !== null) ? value : {};
        const periodType = periodObj.periodType || 0;
        const periodYear = periodObj.periodYear || new Date().getFullYear();
        const periodValue = periodObj.periodValue || 0;
        const disabled = readonly ? ' disabled' : '';
        const reqAttr = config.required ? ' required' : '';

        // Period Type
        const typeOptions = [['', '-- Select --'], ['1', 'Yearly'], ['2', 'Quarterly'], ['3', 'Monthly']];
        let typeHtml = `<select name="${config.key}.__periodType" class="mobile-form-select period-type-select" onchange="Layer8MFormFields.onPeriodTypeChange(this)"${disabled}${reqAttr}>`;
        for (const [val, lbl] of typeOptions) {
            typeHtml += `<option value="${val}"${String(periodType) === val ? ' selected' : ''}>${lbl}</option>`;
        }
        typeHtml += '</select>';

        // Year
        let yearHtml = `<select name="${config.key}.__periodYear" class="mobile-form-select period-year-select"${disabled}>`;
        for (let y = 2050; y >= 1970; y--) {
            yearHtml += `<option value="${y}"${y === periodYear ? ' selected' : ''}>${y}</option>`;
        }
        yearHtml += '</select>';

        // Period Value
        const hidden = (Number(periodType) === 1);
        let options = [];
        if (Number(periodType) === 2) options = PERIOD_QUARTERS;
        else if (Number(periodType) === 3) options = PERIOD_MONTHS;
        let valHtml = `<select name="${config.key}.__periodValue" class="mobile-form-select period-value-select"${hidden ? ' style="display:none"' : ''}${disabled}>`;
        valHtml += '<option value="">--</option>';
        for (const [val, lbl] of options) {
            valHtml += `<option value="${val}"${Number(periodValue) === val ? ' selected' : ''}>${lbl}</option>`;
        }
        valHtml += '</select>';

        return `
            <div class="mobile-form-field">
                <label class="mobile-form-label">${Layer8MUtils.escapeHtml(config.label)}${config.required ? ' *' : ''}</label>
                <div class="period-input-group">${typeHtml}${yearHtml}${valHtml}</div>
            </div>
        `;
    };

    F.onPeriodTypeChange = function(selectEl) {
        const group = selectEl.closest('.period-input-group');
        if (!group) return;
        const valueSelect = group.querySelector('.period-value-select');
        if (!valueSelect) return;

        const periodType = Number(selectEl.value);
        let options = [];
        if (periodType === 2) options = PERIOD_QUARTERS;
        else if (periodType === 3) options = PERIOD_MONTHS;

        let html = '<option value="">--</option>';
        for (const [val, lbl] of options) {
            html += `<option value="${val}">${lbl}</option>`;
        }
        valueSelect.innerHTML = html;
        valueSelect.style.display = (periodType === 1 || periodType === 0) ? 'none' : '';
    };

    /**
     * Handle currency dropdown change on mobile — convert amount using exchange rate
     */
    F.onMoneyCurrencyChange = function(selectEl) {
        const selectedOption = selectEl.options[selectEl.selectedIndex];
        const newCurrencyId = selectedOption ? selectedOption.value : '';
        const oldCurrencyId = selectEl.dataset.previousCurrencyId || '';

        const group = selectEl.closest('.mobile-money-input-group');
        if (!group) return;
        const amountInput = group.querySelector('.mobile-money-amount');
        if (!amountInput) return;

        // Update currency symbol
        const symbolEl = group.querySelector('.mobile-money-symbol');
        if (symbolEl) {
            const newSymbol = selectedOption ? (selectedOption.dataset.symbol || '$') : '$';
            symbolEl.textContent = newSymbol;
        }

        if (oldCurrencyId && newCurrencyId && oldCurrencyId !== newCurrencyId) {
            const displayAmount = parseFloat(amountInput.value);
            if (!isNaN(displayAmount) && displayAmount !== 0) {
                const cents = Math.round(displayAmount * 100);
                const converted = Layer8DUtils.convertAmount(cents, oldCurrencyId, newCurrencyId);
                if (converted !== null) {
                    amountInput.value = (converted / 100).toFixed(2);
                }
            }
        }

        selectEl.dataset.previousCurrencyId = newCurrencyId;
    };

})();
