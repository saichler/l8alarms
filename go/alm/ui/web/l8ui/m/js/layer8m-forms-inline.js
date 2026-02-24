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
 * Layer8MForms - Inline Table Handlers
 * Split from layer8m-forms.js for maintainability.
 * Adds inline table event handling, row editor, child detail, and rerender
 * methods to Layer8MForms.
 */
(function() {
    'use strict';

    const M = window.Layer8MForms;

    M.initInlineTableHandlers = function(container, formDef) {
        if (!formDef || !formDef.sections) return;

        container.querySelectorAll('.mobile-form-inline-table').forEach(table => {
            const fieldKey = table.dataset.inlineTable;
            const hiddenInput = table.querySelector(`input[data-inline-table-data="${fieldKey}"]`);
            const isReadOnly = table.querySelector('.l8-clickable-row') !== null;

            let fieldDef = null;
            for (const section of formDef.sections) {
                for (const field of section.fields) {
                    if (field.key === fieldKey) { fieldDef = field; break; }
                }
                if (fieldDef) break;
            }
            if (!fieldDef || !fieldDef.columns) return;

            function getRows() {
                try { return JSON.parse(hiddenInput.value || '[]'); } catch (e) { return []; }
            }

            table.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                const card = e.target.closest('.mobile-form-inline-card');

                if (btn) {
                    const action = btn.dataset.action;
                    const rowIndex = parseInt(btn.dataset.rowIndex, 10);

                    if (action === 'add-row') {
                        M._openMobileRowEditor(fieldDef, -1, {}, (newRow) => {
                            const rows = getRows();
                            rows.push(newRow);
                            hiddenInput.value = JSON.stringify(rows);
                            M._rerenderMobileTable(table, fieldDef, rows, false);
                        });
                    } else if (action === 'edit-row') {
                        e.stopPropagation();
                        const rows = getRows();
                        M._openMobileRowEditor(fieldDef, rowIndex, rows[rowIndex] || {}, (updated) => {
                            const rows = getRows();
                            rows[rowIndex] = updated;
                            hiddenInput.value = JSON.stringify(rows);
                            M._rerenderMobileTable(table, fieldDef, rows, false);
                        });
                    } else if (action === 'delete-row') {
                        e.stopPropagation();
                        if (confirm('Delete this row?')) {
                            const rows = getRows();
                            rows.splice(rowIndex, 1);
                            hiddenInput.value = JSON.stringify(rows);
                            M._rerenderMobileTable(table, fieldDef, rows, false);
                        }
                    }
                } else if (card && isReadOnly) {
                    const rowIndex = parseInt(card.dataset.rowIndex, 10);
                    const rows = getRows();
                    if (rows[rowIndex]) {
                        M._showMobileChildDetail(fieldDef, rows[rowIndex]);
                    }
                }
            });
        });
    };

    M._openMobileRowEditor = function(fieldDef, rowIndex, rowData, onSave) {
        const miniFormDef = {
            sections: [{ title: fieldDef.label, fields: fieldDef.columns.filter(c => !c.hidden) }]
        };
        const content = M.renderForm(miniFormDef, rowData);

        Layer8MPopup.show({
            title: rowIndex >= 0 ? `Edit ${fieldDef.label}` : `Add ${fieldDef.label}`,
            content: content,
            size: 'large',
            saveButtonText: rowIndex >= 0 ? 'Update' : 'Add',
            onShow: (popup) => { M.initFormFields(popup.body); },
            onSave: (popup) => {
                const data = M.getFormData(popup.body);
                fieldDef.columns.forEach(col => {
                    if (col.hidden && rowData[col.key] !== undefined) data[col.key] = rowData[col.key];
                });
                onSave(data);
                Layer8MPopup.close();
            }
        });
    };

    M._showMobileChildDetail = function(fieldDef, rowData) {
        const miniFormDef = {
            sections: [{ title: 'Details', fields: fieldDef.columns.filter(c => !c.hidden) }]
        };
        const content = M.renderForm(miniFormDef, rowData, true);

        Layer8MPopup.show({
            title: `${fieldDef.label} Details`,
            content: content,
            size: 'large',
            showFooter: false,
            onShow: (popup) => {
                popup.body.querySelectorAll('input, select, textarea').forEach(el => { el.disabled = true; });
            }
        });
    };

    M._rerenderMobileTable = function(tableEl, fieldDef, rows, isReadOnly) {
        tableEl.querySelectorAll('.mobile-form-inline-card, .mobile-form-inline-empty').forEach(el => el.remove());

        const addBtn = tableEl.querySelector('.mobile-form-inline-add');
        const F = Layer8MFormFields;
        const visibleCols = fieldDef.columns.filter(c => !c.hidden);

        if (rows.length > 0) {
            rows.forEach((row, idx) => {
                const card = document.createElement('div');
                card.className = 'mobile-form-inline-card';
                card.dataset.rowIndex = idx;

                const titleCol = visibleCols[0];
                const titleVal = titleCol ? F._formatMobileCell(titleCol, row[titleCol.key]) : '-';

                let cardHtml = `<div class="mobile-form-inline-card-header">`;
                cardHtml += `<span class="mobile-form-inline-card-title">${titleVal}</span>`;
                if (!isReadOnly) {
                    cardHtml += `<div class="mobile-form-inline-card-actions">`;
                    cardHtml += `<button type="button" data-action="edit-row" data-row-index="${idx}">Edit</button>`;
                    cardHtml += `<button type="button" data-action="delete-row" data-row-index="${idx}">Delete</button>`;
                    cardHtml += `</div>`;
                }
                cardHtml += `</div>`;
                if (visibleCols.length > 1) {
                    cardHtml += `<div class="mobile-form-inline-card-body">`;
                    visibleCols.slice(1).forEach(col => {
                        cardHtml += `<div class="mobile-form-inline-card-row">`;
                        cardHtml += `<span class="mobile-form-inline-card-label">${Layer8MUtils.escapeHtml(col.label)}</span>`;
                        cardHtml += `<span class="mobile-form-inline-card-value">${F._formatMobileCell(col, row[col.key])}</span>`;
                        cardHtml += `</div>`;
                    });
                    cardHtml += `</div>`;
                }
                card.innerHTML = cardHtml;
                if (addBtn) tableEl.insertBefore(card, addBtn);
                else tableEl.appendChild(card);
            });
        } else {
            const empty = document.createElement('div');
            empty.className = 'mobile-form-inline-empty';
            empty.textContent = 'No records';
            if (addBtn) tableEl.insertBefore(empty, addBtn);
            else tableEl.appendChild(empty);
        }
    };

})();
