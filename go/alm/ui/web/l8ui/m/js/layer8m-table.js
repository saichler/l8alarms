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
 * Layer8MTable - Card-based data display component with server-side pagination
 * Desktop Equivalent: edit_table/table.js
 */
(function() {
    'use strict';

    class Layer8MTable {
        constructor(containerId, config) {
            this.containerId = containerId;
            this.config = {
                columns: config.columns || [],
                data: config.data || [],
                endpoint: config.endpoint || null,
                modelName: config.modelName || null,
                rowsPerPage: config.rowsPerPage || 15,
                serverSide: config.serverSide !== false,
                totalCount: config.totalCount || 0,
                filterable: config.filterable !== false,
                filterDebounceMs: config.filterDebounceMs || 800,
                searchPlaceholder: config.searchPlaceholder || 'Search...',
                baseWhereClause: config.baseWhereClause || null,
                sortable: config.sortable !== false,
                defaultSort: config.defaultSort || null,
                statusField: config.statusField || null,
                getStatusClass: config.getStatusClass || Layer8MUtils.getStatusClass,
                emptyMessage: config.emptyMessage || 'No items found',
                emptyIcon: config.emptyIcon || '📭',
                loadingMessage: config.loadingMessage || 'Loading...',
                renderCard: config.renderCard || null,
                transformData: config.transformData || null,
                onDataLoaded: config.onDataLoaded || null,
                onCardClick: config.onCardClick || null,
                onError: config.onError || null,
                ...config
            };

            this.currentPage = 1;
            this.filteredData = [...this.config.data];
            this.sortColumn = this.config.defaultSort?.column || null;
            this.sortDirection = this.config.defaultSort?.direction || 'asc';
            this.filterColumn = null;
            this.filterValue = '';
            this.isInvalidFilter = false;
            this.isLoading = false;
            this.hasError = false;
            this.errorMessage = '';

            this.init();
        }

        init() {
            if (this.config.serverSide) {
                this.debouncedFilterHandler = Layer8MUtils.debounce(() => {
                    this.currentPage = 1;
                    this.fetchData(1);
                }, this.config.filterDebounceMs);
            }

            this.render();

            if (this.config.serverSide && this.config.endpoint && this.config.modelName) {
                this.fetchData(1);
            }
        }

        _matchEnumValue(input, enumValues) {
            const normalized = String(input).toLowerCase().trim();
            if (!normalized) return null;
            if (enumValues[normalized] !== undefined) return enumValues[normalized];
            for (const [key, value] of Object.entries(enumValues)) {
                if (key.toLowerCase().startsWith(normalized)) return value;
            }
            return null;
        }

        buildQuery(page, pageSize) {
            const pageIndex = page - 1;
            const filterConditions = [];
            let isInvalid = false;

            if (this.config.baseWhereClause) {
                filterConditions.push(this.config.baseWhereClause);
            }

            if (this.filterValue) {
                if (this.filterColumn) {
                    const column = this.config.columns.find(c => c.key === this.filterColumn);
                    if (column) {
                        const filterKey = column.filterKey || column.key;
                        let queryValue;

                        if (column.enumValues) {
                            const enumValue = this._matchEnumValue(this.filterValue, column.enumValues);
                            if (enumValue !== null) {
                                queryValue = enumValue;
                            } else {
                                isInvalid = true;
                            }
                        } else {
                            queryValue = `${this.filterValue}*`;
                        }

                        if (queryValue !== undefined) {
                            filterConditions.push(`${filterKey}=${queryValue}`);
                        }
                    }
                } else {
                    filterConditions.push(`Id=${this.filterValue}*`);
                }
            }

            let query = `select * from ${this.config.modelName}`;
            if (filterConditions.length > 0) {
                query += ` where ${filterConditions.join(' and ')}`;
            }
            query += ` limit ${pageSize} page ${pageIndex}`;

            if (this.sortColumn) {
                const column = this.config.columns.find(c => c.key === this.sortColumn);
                const sortKey = column?.sortKey || column?.filterKey || this.sortColumn;
                const desc = this.sortDirection === 'desc' ? ' descending' : '';
                query += ` sort-by ${sortKey}${desc}`;
            }

            return { query, isInvalid };
        }

        async fetchData(page) {
            if (!this.config.endpoint || !this.config.modelName) return;

            this.isLoading = true;
            this.hasError = false;
            this.render();

            const { query, isInvalid } = this.buildQuery(page, this.config.rowsPerPage);
            this.isInvalidFilter = isInvalid;

            try {
                const body = encodeURIComponent(JSON.stringify({ text: query }));
                const response = await Layer8MAuth.get(this.config.endpoint + '?body=' + body);

                let totalCount = this.config.totalCount;
                if (page === 1 && response.metadata?.keyCount?.counts) {
                    totalCount = response.metadata.keyCount.counts.Total || 0;
                }

                let items = response.list || [];
                if (this.config.transformData) {
                    items = items.map(item => this.config.transformData(item)).filter(item => item !== null);
                }

                this._updateServerData(items, totalCount);
                this.currentPage = page;

                if (this.config.onDataLoaded) {
                    this.config.onDataLoaded(response, items, totalCount);
                }
            } catch (error) {
                console.error('Layer8MTable fetch error:', error);
                this.hasError = true;
                this.errorMessage = error.message || 'Failed to load data';
                this.isLoading = false;
                this.render();

                if (this.config.onError) {
                    this.config.onError(error);
                }
            }
        }

        refresh() {
            if (this.config.serverSide) {
                this.fetchData(this.currentPage);
            } else {
                this.render();
            }
        }

        reset() {
            this.currentPage = 1;
            this.filterColumn = null;
            this.filterValue = '';
            this.sortColumn = this.config.defaultSort?.column || null;
            this.sortDirection = this.config.defaultSort?.direction || 'asc';

            if (this.config.serverSide) {
                this.fetchData(1);
            } else {
                this.filteredData = [...this.config.data];
                this.render();
            }
        }

        goToPage(page) {
            const totalCount = this.config.serverSide ? this.config.totalCount : this.filteredData.length;
            const totalPages = Math.ceil(totalCount / this.config.rowsPerPage);

            if (page >= 1 && page <= totalPages) {
                this.currentPage = page;
                if (this.config.serverSide) {
                    this.fetchData(page);
                } else {
                    this.render();
                }
            }
        }

        getStats() {
            const totalCount = this.config.serverSide ? this.config.totalCount : this.filteredData.length;
            const totalPages = Math.ceil(totalCount / this.config.rowsPerPage);
            const startIndex = (this.currentPage - 1) * this.config.rowsPerPage;
            const endIndex = Math.min(startIndex + this.config.rowsPerPage, totalCount);

            return { totalCount, totalPages, currentPage: this.currentPage, startIndex: startIndex + 1, endIndex, rowsPerPage: this.config.rowsPerPage };
        }

        setFilter(key, value) {
            this.filterColumn = key;
            this.filterValue = value;
            this.currentPage = 1;

            if (this.config.serverSide) {
                this.fetchData(1);
            } else {
                this._applyClientFilters();
            }
        }

        clearFilters() {
            this.filterColumn = null;
            this.filterValue = '';
            this.currentPage = 1;

            if (this.config.serverSide) {
                this.fetchData(1);
            } else {
                this.filteredData = [...this.config.data];
                this.render();
            }
        }

        setBaseWhereClause(whereClause) {
            this.config.baseWhereClause = whereClause;
            this.filterColumn = null;
            this.filterValue = '';
            this.currentPage = 1;
            this.fetchData(1);
        }

        sort(column) {
            if (this.sortColumn === column) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortColumn = column;
                this.sortDirection = 'asc';
            }

            this.currentPage = 1;

            if (this.config.serverSide) {
                this.fetchData(1);
            } else {
                this._applyClientSort();
            }
        }

        getData() {
            return this.config.serverSide ? this.config.data : this.filteredData;
        }

        setData(data) {
            this.config.data = Array.isArray(data) ? data : Object.values(data);
            if (this.config.transformData) {
                this.config.data = this.config.data.map(item => this.config.transformData(item)).filter(item => item !== null);
            }
            this.filteredData = [...this.config.data];
            if (!this.config.serverSide) this.currentPage = 1;
            this.render();
        }

        render() {
            const container = document.getElementById(this.containerId);
            if (!container) return;

            let html = '<div class="mobile-table-wrapper">';

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
            const opts = this.config.columns.map(col => `<option value="${col.key}" ${this.filterColumn === col.key ? 'selected' : ''}>${Layer8MUtils.escapeHtml(col.label)}</option>`).join('');
            return `<div class="mobile-table-filters"><div class="mobile-table-filter-row"><select class="mobile-table-column-select"><option value="">All Columns</option>${opts}</select><input type="text" class="mobile-table-search-input ${this.isInvalidFilter ? 'invalid' : ''}" placeholder="${Layer8MUtils.escapeHtml(this.config.searchPlaceholder)}" value="${Layer8MUtils.escapeHtml(this.filterValue)}"></div></div>`;
        }

        _renderCards(data) {
            return `
                <div class="mobile-table-cards">
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
            const cols = this.config.columns;
            const primaryCols = cols.filter(c => c.primary);
            const secondaryCols = cols.filter(c => c.secondary);
            const bodyCols = cols.filter(c => !c.primary && !c.secondary && !c.hidden);
            // Use col.render (matches desktop Layer8DTable) - render may return HTML, plain values get escaped
            const getValue = (col) => {
                if (col.render) return col.render(item, index);  // render output may contain HTML
                let v = Layer8MUtils.getNestedValue(item, col.key);
                if (col.formatter) v = col.formatter(v, item);
                return Layer8MUtils.escapeHtml(v);  // escape only plain values
            };
            let html = `<div class="mobile-table-card ${this.config.onCardClick ? 'clickable' : ''}" data-index="${index}"><div class="mobile-table-card-header"><div>`;
            primaryCols.forEach(col => { html += `<h4 class="mobile-table-card-title">${getValue(col)}</h4>`; });
            secondaryCols.forEach(col => { html += `<p class="mobile-table-card-subtitle">${getValue(col)}</p>`; });
            html += '</div>';
            if (this.config.statusField) {
                const sv = Layer8MUtils.getNestedValue(item, this.config.statusField);
                html += `<span class="status-badge status-${this.config.getStatusClass(sv)}">${Layer8MUtils.escapeHtml(Layer8MUtils.formatStatus(sv))}</span>`;
            }
            html += '</div>';
            if (bodyCols.length > 0) {
                html += '<div class="mobile-table-card-body">';
                bodyCols.forEach(col => { html += `<div class="mobile-table-card-row"><span class="mobile-table-card-label">${Layer8MUtils.escapeHtml(col.label)}</span><span class="mobile-table-card-value">${getValue(col)}</span></div>`; });
                html += '</div>';
            }
            return html + '</div>';
        }

        _renderPagination() {
            const s = this.getStats();
            if (s.totalPages <= 1) return '';
            const pages = this._getPageRange(s.currentPage, s.totalPages).map(p => p === '...' ? '<span class="mobile-table-pagination-ellipsis">...</span>' : `<button class="mobile-table-pagination-btn ${p === s.currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`).join('');
            return `<div class="mobile-table-pagination"><div class="mobile-table-pagination-info">Showing ${s.startIndex}-${s.endIndex} of ${s.totalCount}</div><div class="mobile-table-pagination-controls"><button class="mobile-table-pagination-btn ${s.currentPage === 1 ? 'disabled' : ''}" data-action="prev" ${s.currentPage === 1 ? 'disabled' : ''}>&#8249;</button>${pages}<button class="mobile-table-pagination-btn ${s.currentPage === s.totalPages ? 'disabled' : ''}" data-action="next" ${s.currentPage === s.totalPages ? 'disabled' : ''}>&#8250;</button></div></div>`;
        }

        _renderLoading() {
            return `<div class="mobile-table-loading"><div class="mobile-table-loading-spinner"></div><span>${Layer8MUtils.escapeHtml(this.config.loadingMessage)}</span></div>`;
        }

        _renderEmpty() {
            return `<div class="mobile-table-empty"><span class="mobile-table-empty-icon">${this.config.emptyIcon}</span><h4>No Results</h4><p>${Layer8MUtils.escapeHtml(this.config.emptyMessage)}</p></div>`;
        }

        _renderError() {
            return `<div class="mobile-table-error"><span>&#x26A0;</span><h4>Error Loading Data</h4><p>${Layer8MUtils.escapeHtml(this.errorMessage)}</p><button class="mobile-table-error-retry">Retry</button></div>`;
        }

        _attachEventListeners() {
            const container = document.getElementById(this.containerId);
            if (!container) return;

            const columnSelect = container.querySelector('.mobile-table-column-select');
            if (columnSelect) {
                columnSelect.addEventListener('change', (e) => {
                    this.filterColumn = e.target.value || null;
                    if (this.filterValue) {
                        this.currentPage = 1;
                        this.fetchData(1);
                    }
                });
            }

            const searchInput = container.querySelector('.mobile-table-search-input');
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

            container.querySelectorAll('.mobile-table-pagination-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action;
                    const page = btn.dataset.page;
                    const stats = this.getStats();

                    if (action === 'prev') this.goToPage(this.currentPage - 1);
                    else if (action === 'next') this.goToPage(this.currentPage + 1);
                    else if (page) this.goToPage(parseInt(page));
                });
            });

            if (this.config.onCardClick) {
                container.querySelectorAll('.mobile-table-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const index = parseInt(card.dataset.index);
                        const data = this._getPageData();
                        if (data[index]) this.config.onCardClick(data[index], index);
                    });
                });
            }

            const retryBtn = container.querySelector('.mobile-table-error-retry');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => this.fetchData(this.currentPage));
            }
        }

        _getPageData() {
            if (this.config.serverSide) return this.config.data;
            const startIndex = (this.currentPage - 1) * this.config.rowsPerPage;
            return this.filteredData.slice(startIndex, startIndex + this.config.rowsPerPage);
        }

        _updateServerData(newData, totalCount) {
            this.config.data = newData;
            this.config.totalCount = totalCount;
            this.isLoading = false;
            this.hasError = false;
            this.render();
        }

        _applyClientFilters() {
            this.filteredData = this.config.data.filter(item => {
                if (!this.filterValue) return true;
                if (this.filterColumn) {
                    const value = Layer8MUtils.getNestedValue(item, this.filterColumn);
                    return String(value).toLowerCase().includes(this.filterValue.toLowerCase());
                }
                return this.config.columns.some(col => {
                    const value = Layer8MUtils.getNestedValue(item, col.key);
                    return String(value).toLowerCase().includes(this.filterValue.toLowerCase());
                });
            });
            this.currentPage = 1;
            this.render();
        }

        _applyClientSort() {
            if (!this.sortColumn) return;
            const column = this.config.columns.find(c => c.key === this.sortColumn);
            const sortKey = column?.sortKey || this.sortColumn;

            this.filteredData.sort((a, b) => {
                let aVal = Layer8MUtils.getNestedValue(a, sortKey);
                let bVal = Layer8MUtils.getNestedValue(b, sortKey);
                if (!isNaN(aVal) && !isNaN(bVal)) { aVal = parseFloat(aVal); bVal = parseFloat(bVal); }
                if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
            this.render();
        }

        _getPageRange(current, total) {
            const range = [];
            const delta = 1;
            for (let i = 1; i <= total; i++) {
                if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
                    range.push(i);
                } else if (range[range.length - 1] !== '...') {
                    range.push('...');
                }
            }
            return range;
        }
    }

    window.Layer8MTable = Layer8MTable;
})();
