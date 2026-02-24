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
// Layer 8 Ecosystem - Layer8DTable Rendering
// Methods for rendering the table, headers, rows, and pagination

// Render the complete table component
Layer8DTable.prototype.render = function() {
    if (!this.container) return;

    // Save focus state before re-render
    const activeElement = document.activeElement;
    let focusedColumn = null;
    let cursorPosition = null;
    if (activeElement && activeElement.classList.contains('l8-filter-input')) {
        focusedColumn = activeElement.dataset.column;
        cursorPosition = activeElement.selectionStart;
    }

    const totalItems = this.getTotalItems();
    const totalPages = this.getTotalPages();
    const paginatedData = this.getPaginatedData();
    const startItem = totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    const endItem = Math.min(this.currentPage * this.pageSize, totalItems);

    let html = `
        <div class="l8-table-wrapper">
            ${this.renderPagination(totalPages, startItem, endItem, totalItems)}
            <div class="l8-table-container">
                <table id="${this.tableId}" class="l8-table">
                    <thead>
                        <tr class="l8-table-header-row">
                            ${this.renderHeaders()}
                        </tr>
                        ${this.renderFilterRow()}
                    </thead>
                    <tbody>
                        ${this.renderBody(paginatedData)}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();

    // Restore focus after re-render
    if (focusedColumn) {
        const input = this.container.querySelector(`.l8-filter-input[data-column="${focusedColumn}"]`);
        if (input) {
            input.focus();
            if (cursorPosition !== null) {
                input.setSelectionRange(cursorPosition, cursorPosition);
            }
        }
    }
};

// Render pagination controls (above table)
Layer8DTable.prototype.renderPagination = function(totalPages, startItem, endItem, totalItems) {
    const addButton = this.onAdd ?
        `<button class="l8-btn l8-btn-primary" data-action="add">${Layer8DUtils.escapeHtml(this.addButtonText)}</button>` : '';

    if (totalItems === 0) {
        return `<div class="l8-pagination"><div class="l8-pagination-info"></div><div class="l8-pagination-controls">${addButton}</div></div>`;
    }

    return `
        <div class="l8-pagination">
            <div class="l8-pagination-info">
                <span>Showing ${startItem}-${endItem} of ${totalItems}</span>
            </div>
            <div class="l8-pagination-controls">
                <div class="l8-page-size">
                    <label>Show:</label>
                    <select class="l8-page-size-select" data-action="pageSize">
                        ${this.pageSizeOptions.map(size =>
                            `<option value="${size}" ${size === this.pageSize ? 'selected' : ''}>${size}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="l8-page-nav">
                    <button class="l8-page-btn" data-action="first" ${this.currentPage === 1 ? 'disabled' : ''}>
                        &laquo;
                    </button>
                    <button class="l8-page-btn" data-action="prev" ${this.currentPage === 1 ? 'disabled' : ''}>
                        &lsaquo;
                    </button>
                    <span class="l8-page-current">
                        Page ${this.currentPage} of ${totalPages || 1}
                    </span>
                    <button class="l8-page-btn" data-action="next" ${this.currentPage >= totalPages ? 'disabled' : ''}>
                        &rsaquo;
                    </button>
                    <button class="l8-page-btn" data-action="last" ${this.currentPage >= totalPages ? 'disabled' : ''}>
                        &raquo;
                    </button>
                </div>
                ${this.onAdd ? `<button class="l8-btn l8-btn-primary" data-action="add">${Layer8DUtils.escapeHtml(this.addButtonText)}</button>` : ''}
            </div>
        </div>
    `;
};

// Render table headers
Layer8DTable.prototype.renderHeaders = function() {
    let headers = this.columns.map(col => {
        const sortableClass = this.sortable ? 'sortable' : '';
        let sortIndicator = '';
        if (this.sortable) {
            const icon = this.sortColumn === col.key
                ? (this.sortDirection === 'asc' ? '▲' : '▼')
                : '⇅';
            sortIndicator = `<span class="l8-sort-indicator">${icon}</span>`;
        }
        return `<th class="${sortableClass}" data-column="${col.key}">
            <div class="l8-table-header-content">
                <span>${Layer8DUtils.escapeHtml(col.label)}</span>
                ${sortIndicator}
            </div>
        </th>`;
    }).join('');

    if (this.showActions && (this.onEdit || this.onDelete || this.onToggleState)) {
        headers += '<th>Actions</th>';
    }

    return headers;
};

// Render filter row
Layer8DTable.prototype.renderFilterRow = function() {
    if (!this.filterable) return '';

    let filterCells = this.columns.map(col => {
        const filterValue = this.filters[col.key] || '';
        return `<th class="l8-table-filter">
            <input type="text" class="l8-filter-input" data-column="${col.key}"
                   value="${Layer8DUtils.escapeAttr(filterValue)}" placeholder="Filter...">
        </th>`;
    }).join('');

    if (this.showActions && (this.onEdit || this.onDelete || this.onToggleState)) {
        filterCells += '<th class="l8-table-filter"></th>';
    }

    return `<tr class="l8-table-filter-row">${filterCells}</tr>`;
};

// Render table body
Layer8DTable.prototype.renderBody = function(data) {
    if (data.length === 0) {
        const colSpan = this.columns.length + (this.showActions ? 1 : 0);
        return `
            <tr>
                <td colspan="${colSpan}" class="l8-empty-state">
                    <p>${Layer8DUtils.escapeHtml(this.emptyMessage)}</p>
                </td>
            </tr>
        `;
    }

    return data.map((item, index) => this.renderRow(item, index)).join('');
};

// Render a single row
Layer8DTable.prototype.renderRow = function(item, index) {
    let cells = this.columns.map(col => {
        let value;
        if (col.render) {
            value = col.render(item, index);
        } else if (col.key) {
            value = this.getNestedValue(item, col.key);
            value = Layer8DUtils.escapeHtml(value);
        } else {
            value = '';
        }
        return `<td>${value}</td>`;
    }).join('');

    if (this.showActions && (this.onEdit || this.onDelete || this.onToggleState)) {
        const itemId = this.getItemId(item);
        let toggleBtn = '';
        if (this.onToggleState && this.getItemState) {
            const isUp = this.getItemState(item);
            const emoji = isUp ? '⏹️' : '▶️';
            const title = isUp ? 'Stop' : 'Start';
            toggleBtn = `<button class="l8-btn l8-btn-toggle l8-btn-small" data-action="toggle" data-id="${Layer8DUtils.escapeAttr(itemId)}" title="${title}">${emoji}</button>`;
        }
        cells += `
            <td>
                <div class="l8-action-btns">
                    ${toggleBtn}
                    ${this.onEdit ? `<button class="l8-btn l8-btn-small" data-action="edit" data-id="${Layer8DUtils.escapeAttr(itemId)}">Edit</button>` : ''}
                    ${this.onDelete ? `<button class="l8-btn l8-btn-danger l8-btn-small" data-action="delete" data-id="${Layer8DUtils.escapeAttr(itemId)}">Delete</button>` : ''}
                </div>
            </td>
        `;
    }

    // Add row click support - store row index for data retrieval
    const rowClass = this.onRowClick ? 'l8-clickable-row' : '';
    return `<tr class="${rowClass}" data-row-index="${index}">${cells}</tr>`;
};
