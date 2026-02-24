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
 * Layer8MReferencePicker - Lookup field picker for mobile
 * Desktop Equivalent: reference_picker/reference-picker-*.js
 * Uses L8Query format exactly as desktop Layer8DReferencePicker.
 */
(function() {
    'use strict';

    class Layer8MReferencePicker {
        constructor(options = {}) {
            this.options = {
                endpoint: '', modelName: '', idColumn: 'id', displayColumn: 'name',
                displayFormat: null, selectColumns: null, displayLabel: null,
                baseWhereClause: null, filterColumn: null, sortColumn: null,
                pageSize: 15, filterDebounceMs: 300, onChange: null,
                placeholder: 'Search...', emptyMessage: 'No results found',
                title: 'Select', currentValue: null, ...options
            };
            if (!this.options.selectColumns) {
                this.options.selectColumns = [this.options.idColumn, this.options.displayColumn];
            }
            if (!this.options.filterColumn) this.options.filterColumn = this.options.displayColumn;
            if (!this.options.sortColumn) this.options.sortColumn = this.options.displayColumn;

            this.popup = null;
            this.element = null;
            this.data = [];
            this.page = 0;
            this.totalItems = 0;
            this.sortDirection = 'asc';
            this.filterValue = '';
            this.isLoading = false;
            this.searchTimeout = null;
            this.selectedId = this.options.currentValue;
            this.selectedDisplay = null;
            this.selectedItem = null;
        }

        show() {
            this.popup = Layer8MPopup.show({
                title: this.options.title,
                content: this.render(),
                size: 'large',
                showFooter: true,
                saveButtonText: 'Select',
                showCancelButton: true,
                cancelButtonText: 'Clear',
                onSave: () => this.confirmSelection(),
                onCancel: () => this.clearSelection(),
                onClose: () => { this.popup = null; this.element = null; }
            });
            this.element = this.popup.body;
            this.setupListeners();
            this.loadData();
        }

        render() {
            const label = this.options.displayLabel || this.options.displayColumn;
            return `
                <div class="mobile-reference-picker">
                    <div class="reference-search">
                        <input type="text" class="reference-search-input"
                               placeholder="${Layer8MUtils.escapeAttr(this.options.placeholder)}"
                               autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                        <span class="reference-search-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </span>
                    </div>
                    <div class="reference-sort-header">
                        <button type="button" class="reference-sort-btn">
                            <span class="sort-label">${Layer8MUtils.escapeHtml(label)}</span>
                            <span class="sort-indicator">&#9650;</span>
                        </button>
                    </div>
                    <div class="reference-list"><div class="reference-loading">Loading...</div></div>
                    <div class="reference-pagination"><span class="reference-page-info"></span></div>
                </div>`;
        }

        setupListeners() {
            if (!this.element) return;
            const searchInput = this.element.querySelector('.reference-search-input');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(this.searchTimeout);
                    this.searchTimeout = setTimeout(() => {
                        this.filterValue = e.target.value;
                        this.page = 0;
                        this.loadData();
                    }, this.options.filterDebounceMs);
                });
                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        clearTimeout(this.searchTimeout);
                        this.filterValue = searchInput.value;
                        this.page = 0;
                        this.loadData();
                    }
                });
            }
            const sortBtn = this.element.querySelector('.reference-sort-btn');
            if (sortBtn) {
                sortBtn.addEventListener('click', () => {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                    this.page = 0;
                    this.updateSortIndicator();
                    this.loadData();
                });
            }
        }

        buildQuery() {
            const columns = this.options.selectColumns.join(',');
            let query = `select ${columns} from ${this.options.modelName}`;
            const conditions = [];
            if (this.options.baseWhereClause) conditions.push(this.options.baseWhereClause);
            if (this.filterValue && this.filterValue.trim()) {
                conditions.push(`${this.options.filterColumn}=${this.filterValue.trim()}*`);
            }
            if (conditions.length > 0) query += ` where ${conditions.join(' and ')}`;
            query += ` limit ${this.options.pageSize} page ${this.page}`;
            query += ` sort-by ${this.options.sortColumn}${this.sortDirection === 'desc' ? ' descending' : ''}`;
            return query;
        }

        async loadData() {
            if (this.isLoading) return;
            this.isLoading = true;
            this.showLoading();
            try {
                const body = encodeURIComponent(JSON.stringify({ text: this.buildQuery() }));
                const response = await Layer8MAuth.get(`${this.options.endpoint}?body=${body}`);
                if (response) {
                    this.data = response.list || [];
                    this.totalItems = response.metadata?.keyCount?.counts?.Total || this.data.length;
                } else {
                    this.data = [];
                    this.totalItems = 0;
                }
                this.renderList();
                this.renderPagination();
            } catch (error) {
                console.error('Failed to load reference data:', error);
                Layer8MUtils.showError('Failed to load data');
                this.data = [];
                this.totalItems = 0;
                this.renderList();
            } finally {
                this.isLoading = false;
            }
        }

        showLoading() {
            const list = this.element?.querySelector('.reference-list');
            if (list) list.innerHTML = '<div class="reference-loading">Loading...</div>';
        }

        updateSortIndicator() {
            const indicator = this.element?.querySelector('.sort-indicator');
            if (indicator) indicator.innerHTML = this.sortDirection === 'asc' ? '&#9650;' : '&#9660;';
        }

        renderList() {
            const list = this.element?.querySelector('.reference-list');
            if (!list) return;
            if (this.data.length === 0) {
                list.innerHTML = `<div class="reference-empty">
                    <p>${Layer8MUtils.escapeHtml(this.options.emptyMessage)}</p>
                    ${this.filterValue ? '<p class="hint">Try a different search</p>' : ''}
                </div>`;
                return;
            }
            const html = this.data.map((item, index) => {
                const id = item[this.options.idColumn];
                const display = this.getDisplayValue(item);
                const isSelected = String(id) === String(this.selectedId);
                return `<div class="reference-item ${isSelected ? 'selected' : ''}"
                         data-id="${Layer8MUtils.escapeAttr(String(id))}"
                         data-display="${Layer8MUtils.escapeAttr(String(display))}"
                         data-index="${index}" tabindex="0">
                        <span class="reference-radio">${isSelected ? '&#9679;' : '&#9675;'}</span>
                        <span class="reference-label">${Layer8MUtils.escapeHtml(String(display))}</span>
                    </div>`;
            }).join('');
            list.innerHTML = html;
            list.querySelectorAll('.reference-item').forEach(item => {
                item.addEventListener('click', () => this.selectItem(item));
            });
        }

        renderPagination() {
            const pageInfo = this.element?.querySelector('.reference-page-info');
            if (!pageInfo) return;
            const totalPages = Math.ceil(this.totalItems / this.options.pageSize) || 1;
            const start = this.totalItems === 0 ? 0 : (this.page * this.options.pageSize) + 1;
            const end = Math.min((this.page + 1) * this.options.pageSize, this.totalItems);
            let html = '';
            if (this.totalItems > 0) {
                html += `<span>${start}-${end} of ${this.totalItems}</span>`;
                if (totalPages > 1) {
                    html += `<button type="button" class="reference-page-btn" data-action="prev" ${this.page === 0 ? 'disabled' : ''}>&#9664;</button>
                        <span>Page ${this.page + 1} of ${totalPages}</span>
                        <button type="button" class="reference-page-btn" data-action="next" ${this.page >= totalPages - 1 ? 'disabled' : ''}>&#9654;</button>`;
                }
            } else {
                html = 'No results';
            }
            pageInfo.innerHTML = html;
            pageInfo.querySelectorAll('.reference-page-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.dataset.action === 'prev' && this.page > 0) { this.page--; this.loadData(); }
                    else if (btn.dataset.action === 'next' && this.page < totalPages - 1) { this.page++; this.loadData(); }
                });
            });
        }

        getDisplayValue(item) {
            return this.options.displayFormat ? this.options.displayFormat(item) : (item[this.options.displayColumn] || '');
        }

        selectItem(itemEl) {
            this.selectedId = itemEl.dataset.id;
            this.selectedDisplay = itemEl.dataset.display;
            this.selectedItem = this.data[parseInt(itemEl.dataset.index, 10)] || null;
            this.element.querySelectorAll('.reference-item').forEach(el => {
                el.classList.remove('selected');
                el.querySelector('.reference-radio').innerHTML = '&#9675;';
            });
            itemEl.classList.add('selected');
            itemEl.querySelector('.reference-radio').innerHTML = '&#9679;';
        }

        confirmSelection() {
            if (this.selectedId !== null && this.selectedId !== undefined && this.options.onChange) {
                this.options.onChange(this.selectedId, this.selectedDisplay, this.selectedItem);
            }
            Layer8MPopup.close();
        }

        clearSelection() {
            this.selectedId = null;
            this.selectedDisplay = null;
            this.selectedItem = null;
            if (this.options.onChange) this.options.onChange(null, '', null);
            Layer8MPopup.close();
        }

        // Static Methods
        static show(options) {
            const picker = new Layer8MReferencePicker(options);
            picker.show();
            return picker;
        }

        static getModelConfig(modelName) {
            if (window.Layer8MReferenceRegistry && Layer8MReferenceRegistry.has(modelName)) {
                const config = Layer8MReferenceRegistry.get(modelName);
                return {
                    idColumn: config.idColumn,
                    displayColumn: config.displayColumn,
                    selectColumns: config.selectColumns || [config.idColumn, config.displayColumn],
                    displayFormat: config.displayFormat || null,
                    displayLabel: config.displayLabel || null
                };
            }
            return { idColumn: 'id', displayColumn: 'name', selectColumns: ['id', 'name'], displayFormat: null, displayLabel: null };
        }

        static getEndpointForModel(modelName) {
            if (typeof LAYER8M_NAV_CONFIG === 'undefined') return null;
            for (const moduleKey in LAYER8M_NAV_CONFIG) {
                const mod = LAYER8M_NAV_CONFIG[moduleKey];
                if (!mod || !mod.services) continue;
                for (const subModuleKey in mod.services) {
                    for (const service of mod.services[subModuleKey]) {
                        if (service.model === modelName) return Layer8MConfig.resolveEndpoint(service.endpoint);
                    }
                }
            }
            return null;
        }

        static getValue(inputElement) { return inputElement.dataset.refId || null; }

        static getItem(inputElement) {
            if (inputElement.dataset.refItem) {
                try { return JSON.parse(inputElement.dataset.refItem); } catch (e) { return null; }
            }
            return null;
        }

        static setValue(inputElement, id, displayValue, item = null) {
            if (id === null || id === undefined) {
                inputElement.value = '';
                delete inputElement.dataset.refId;
                delete inputElement.dataset.refItem;
            } else {
                inputElement.value = displayValue || '';
                inputElement.dataset.refId = id;
                if (item) inputElement.dataset.refItem = JSON.stringify(item);
            }
        }

        static async fetchDisplayValue(config, idValue) {
            if (!config.endpoint || !idValue) return null;
            const columns = config.selectColumns || [config.idColumn, config.displayColumn];
            const query = `select ${columns.join(',')} from ${config.modelName} where ${config.idColumn}=${idValue}`;
            try {
                const body = encodeURIComponent(JSON.stringify({ text: query }));
                const response = await Layer8MAuth.get(`${config.endpoint}?body=${body}`);
                const items = response?.list || [];
                if (items.length > 0) {
                    const item = items[0];
                    const displayValue = config.displayFormat ? config.displayFormat(item) : item[config.displayColumn];
                    return { displayValue, item };
                }
                return null;
            } catch (error) {
                console.error('Error fetching reference display value:', error);
                return null;
            }
        }
    }

    window.Layer8MReferencePicker = Layer8MReferencePicker;
})();
