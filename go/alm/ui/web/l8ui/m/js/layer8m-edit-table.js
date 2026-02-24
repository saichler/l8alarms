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
 * Layer8MEditTable - Card-based data display with CRUD operations
 * Desktop Equivalent: edit_table/table.js (Layer8DTable)
 */
(function() {
    'use strict';

    class Layer8MEditTable extends Layer8MTable {
        constructor(containerId, config) {
            super(containerId, {
                ...config,
                onCardClick: config.onCardClick || ((item) => {
                    if (config.onEdit) config.onEdit(this.config.getItemId(item), item);
                })
            });

            this.config.onAdd = config.onAdd || null;
            this.config.addButtonText = config.addButtonText || 'Add';
            this.config.onEdit = config.onEdit || null;
            this.config.onDelete = config.onDelete || null;
            this.config.onRowClick = config.onRowClick || null;
            this.config.getItemId = config.getItemId || this._defaultGetItemId.bind(this);
        }

        _defaultGetItemId(item) {
            const refConfig = Layer8MConfig.getReferenceConfig(this.config.modelName);
            if (refConfig && refConfig.idColumn) {
                return item[refConfig.idColumn];
            }
            return item.id || item.Id || '';
        }

        render() {
            const container = document.getElementById(this.containerId);
            if (!container) return;

            let html = '<div class="mobile-edit-table-wrapper">';

            if (this.config.filterable) {
                html += this._renderFilters();
            }

            if (this.isLoading) {
                html += this._renderLoading();
            } else if (this.hasError) {
                html += this._renderError();
            } else {
                const data = this._getPageData();
                if (data.length === 0) {
                    html += this._renderEmpty();
                } else {
                    html += this._renderPagination();
                    html += this._renderCards(data);
                }
            }

            html += '</div>';

            container.innerHTML = html;
            this._attachEventListeners();
        }

        _renderFilters() {
            const invalidClass = this.isInvalidFilter ? 'invalid' : '';

            let html = `
                <div class="mobile-edit-table-filters">
                    <div class="mobile-edit-table-filter-row">
                        <select class="mobile-edit-table-column-select">
                            <option value="">All Columns</option>
                            ${this.config.columns.map(col => `
                                <option value="${col.key}" ${this.filterColumn === col.key ? 'selected' : ''}>
                                    ${Layer8MUtils.escapeHtml(col.label)}
                                </option>
                            `).join('')}
                        </select>
                        <input type="text"
                               class="mobile-edit-table-search-input ${invalidClass}"
                               placeholder="Filter..."
                               value="${Layer8MUtils.escapeHtml(this.filterValue)}">
                    </div>`;

            // Sort row (dropdown + direction button)
            if (this.config.sortable) {
                const sortableColumns = this.config.columns.filter(col => col.sortKey || col.filterKey);
                if (sortableColumns.length > 0) {
                    const directionIcon = this.sortDirection === 'asc' ? '&#9650;' : '&#9660;';
                    const directionTitle = this.sortDirection === 'asc' ? 'Ascending (click to change)' : 'Descending (click to change)';
                    const disabled = !this.sortColumn ? 'disabled' : '';

                    html += `
                    <div class="mobile-edit-table-sort-row">
                        <select class="mobile-edit-table-sort-select">
                            <option value="">No Sorting</option>
                            ${sortableColumns.map(col => `
                                <option value="${col.key}" ${this.sortColumn === col.key ? 'selected' : ''}>
                                    ${Layer8MUtils.escapeHtml(col.label)}
                                </option>
                            `).join('')}
                        </select>
                        <button class="mobile-edit-table-sort-direction-btn" ${disabled} title="${directionTitle}">
                            ${directionIcon}
                        </button>
                    </div>`;
                }
            }

            html += '</div>';
            return html;
        }

        _renderPagination() {
            const stats = this.getStats();

            let html = '<div class="mobile-edit-table-pagination">';
            html += '<div class="mobile-edit-table-pagination-header">';
            html += `<div class="mobile-edit-table-pagination-info">Showing ${stats.startIndex}-${stats.endIndex} of ${stats.totalCount}</div>`;

            if (this.config.onAdd) {
                html += `<button class="mobile-edit-table-add-btn" data-action="add">+ ${Layer8MUtils.escapeHtml(this.config.addButtonText)}</button>`;
            }

            html += '</div>';

            if (stats.totalPages > 1) {
                html += '<div class="mobile-edit-table-pagination-controls">';
                html += `<button class="mobile-edit-table-pagination-btn ${stats.currentPage === 1 ? 'disabled' : ''}" data-action="prev" ${stats.currentPage === 1 ? 'disabled' : ''}>&#8249;</button>`;

                const pageRange = this._getPageRange(stats.currentPage, stats.totalPages);
                pageRange.forEach(page => {
                    if (page === '...') {
                        html += '<span class="mobile-edit-table-pagination-ellipsis">...</span>';
                    } else {
                        html += `<button class="mobile-edit-table-pagination-btn ${page === stats.currentPage ? 'active' : ''}" data-page="${page}">${page}</button>`;
                    }
                });

                html += `<button class="mobile-edit-table-pagination-btn ${stats.currentPage === stats.totalPages ? 'disabled' : ''}" data-action="next" ${stats.currentPage === stats.totalPages ? 'disabled' : ''}>&#8250;</button>`;
                html += '</div>';
            }

            html += '</div>';
            return html;
        }

        _renderCards(data) {
            return `
                <div class="mobile-edit-table-cards">
                    ${data.map((item, index) => {
                        if (this.config.renderCard) {
                            return this.config.renderCard(item, index, this);
                        }
                        return this._renderDefaultCard(item, index);
                    }).join('')}
                </div>
            `;
        }

        _renderDefaultCard(item, index) {
            const primaryCols = this.config.columns.filter(c => c.primary);
            const secondaryCols = this.config.columns.filter(c => c.secondary);
            const bodyCols = this.config.columns.filter(c => !c.primary && !c.secondary && !c.hidden);
            const itemId = this.config.getItemId(item);

            // Get value using col.render (matches desktop Layer8DTable) - render may return HTML
            const getValue = (col) => {
                if (col.render) return col.render(item, index);  // render gets (item, index) like desktop
                let v = Layer8MUtils.getNestedValue(item, col.key);
                if (col.formatter) v = col.formatter(v, item);
                return Layer8MUtils.escapeHtml(v);  // escape only plain values, not render output
            };

            let html = `<div class="mobile-edit-table-card" data-index="${index}" data-id="${Layer8MUtils.escapeAttr(itemId)}">`;
            html += '<div class="mobile-edit-table-card-header">';
            html += '<div class="mobile-edit-table-card-info">';

            primaryCols.forEach(col => {
                html += `<h4 class="mobile-edit-table-card-title">${getValue(col)}</h4>`;
            });

            secondaryCols.forEach(col => {
                html += `<p class="mobile-edit-table-card-subtitle">${getValue(col)}</p>`;
            });

            html += '</div>';

            if (this.config.statusField) {
                const statusValue = Layer8MUtils.getNestedValue(item, this.config.statusField);
                const statusClass = this.config.getStatusClass(statusValue);
                html += `<span class="status-badge status-${statusClass}">${Layer8MUtils.escapeHtml(Layer8MUtils.formatStatus(statusValue))}</span>`;
            }

            html += '</div>';

            if (bodyCols.length > 0) {
                html += '<div class="mobile-edit-table-card-body">';
                bodyCols.forEach(col => {
                    html += `
                        <div class="mobile-edit-table-card-row">
                            <span class="mobile-edit-table-card-label">${Layer8MUtils.escapeHtml(col.label)}</span>
                            <span class="mobile-edit-table-card-value">${getValue(col)}</span>
                        </div>
                    `;
                });
                html += '</div>';
            }

            html += this._renderCardActions(item, itemId);
            html += '</div>';
            return html;
        }

        _renderCardActions(item, itemId) {
            const hasActions = this.config.onEdit || this.config.onDelete;
            if (!hasActions) return '';

            let html = '<div class="mobile-edit-table-card-actions">';

            if (this.config.onEdit) {
                html += `<button class="mobile-edit-table-action-btn edit" data-action="edit" data-id="${Layer8MUtils.escapeAttr(itemId)}">Edit</button>`;
            }

            if (this.config.onDelete) {
                html += `<button class="mobile-edit-table-action-btn delete" data-action="delete" data-id="${Layer8MUtils.escapeAttr(itemId)}">Delete</button>`;
            }

            html += '</div>';
            return html;
        }

        _renderEmpty() {
            let html = '<div class="mobile-edit-table-empty">';

            if (this.config.onAdd) {
                html += `<button class="mobile-edit-table-add-btn large" data-action="add">+ ${Layer8MUtils.escapeHtml(this.config.addButtonText)}</button>`;
            }

            html += `
                <span class="mobile-edit-table-empty-icon">${this.config.emptyIcon}</span>
                <h4>No Results</h4>
                <p>${Layer8MUtils.escapeHtml(this.config.emptyMessage)}</p>
            </div>`;

            return html;
        }

        _renderLoading() {
            return `<div class="mobile-edit-table-loading"><div class="mobile-edit-table-loading-spinner"></div><span>${Layer8MUtils.escapeHtml(this.config.loadingMessage)}</span></div>`;
        }

        _renderError() {
            return `<div class="mobile-edit-table-error"><span>&#x26A0;</span><h4>Error Loading Data</h4><p>${Layer8MUtils.escapeHtml(this.errorMessage)}</p><button class="mobile-edit-table-error-retry">Retry</button></div>`;
        }

        _attachEventListeners() {
            const container = document.getElementById(this.containerId);
            if (!container) return;

            const columnSelect = container.querySelector('.mobile-edit-table-column-select');
            if (columnSelect) {
                columnSelect.addEventListener('change', (e) => {
                    this.filterColumn = e.target.value || null;
                    if (this.filterValue) {
                        this.currentPage = 1;
                        this.fetchData(1);
                    }
                });
            }

            const searchInput = container.querySelector('.mobile-edit-table-search-input');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filterValue = e.target.value;
                    if (this.config.serverSide) {
                        this.debouncedFilterHandler();
                    } else {
                        this._applyClientFilters();
                    }
                });
            }

            container.querySelectorAll('.mobile-edit-table-pagination-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action;
                    const page = btn.dataset.page;
                    const stats = this.getStats();

                    if (action === 'prev') this.goToPage(this.currentPage - 1);
                    else if (action === 'next') this.goToPage(this.currentPage + 1);
                    else if (page) this.goToPage(parseInt(page));
                });
            });

            container.querySelectorAll('[data-action="add"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.config.onAdd) this.config.onAdd();
                });
            });

            container.querySelectorAll('[data-action="edit"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const item = this._findItemById(id);
                    if (this.config.onEdit) this.config.onEdit(id, item);
                });
            });

            container.querySelectorAll('[data-action="delete"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const item = this._findItemById(id);
                    if (this.config.onDelete) this.config.onDelete(id, item);
                });
            });

            // Card click handler for onRowClick (opens details view)
            if (this.config.onRowClick) {
                container.querySelectorAll('.mobile-edit-table-card').forEach(card => {
                    card.addEventListener('click', (e) => {
                        // Don't trigger if clicking action buttons
                        if (e.target.closest('.mobile-edit-table-card-actions')) return;
                        if (e.target.closest('[data-action]')) return;

                        const id = card.dataset.id;
                        const item = this._findItemById(id);
                        if (item) this.config.onRowClick(item, id);
                    });
                });
            }

            const retryBtn = container.querySelector('.mobile-edit-table-error-retry');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => this.fetchData(this.currentPage));
            }

            // Sort column dropdown change
            const sortSelect = container.querySelector('.mobile-edit-table-sort-select');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    const column = e.target.value || null;
                    if (column) {
                        this.sortColumn = column;
                        if (!this.sortDirection) this.sortDirection = 'asc';
                    } else {
                        this.sortColumn = null;
                    }
                    this.currentPage = 1;
                    if (this.config.serverSide) {
                        this.fetchData(1);
                    } else {
                        if (this.sortColumn) {
                            this._applyClientSort();
                        } else {
                            this.filteredData = [...this.config.data];
                            this.render();
                        }
                    }
                });
            }

            // Sort direction button click
            const sortDirectionBtn = container.querySelector('.mobile-edit-table-sort-direction-btn');
            if (sortDirectionBtn) {
                sortDirectionBtn.addEventListener('click', () => {
                    if (!this.sortColumn) return;
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                    this.currentPage = 1;
                    if (this.config.serverSide) {
                        this.fetchData(1);
                    } else {
                        this._applyClientSort();
                    }
                });
            }
        }

        _findItemById(id) {
            return this.config.data.find(item => String(this.config.getItemId(item)) === String(id));
        }
    }

    window.Layer8MEditTable = Layer8MEditTable;
})();
