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
// Layer8D Timeline
// Vertical event timeline for audit trails and event history.
// Renders chronologically sorted events with "Load More" pagination.

(function() {
    'use strict';

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str || '');
        return div.innerHTML;
    }

    function formatDate(ts) {
        if (!ts) return '';
        const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
        if (isNaN(d.getTime())) return String(ts);
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
            ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }

    class Layer8DTimeline {
        constructor(options) {
            this.containerId = options.containerId;
            this.columns = options.columns || [];
            this.dataSource = options.dataSource || null;
            this.viewConfig = options.viewConfig || {};
            this.onItemClick = options.onItemClick || null;
            this.onAdd = options.onAdd || null;
            this.primaryKey = options.primaryKey || 'id';
            this.addButtonText = options.addButtonText || 'Add';

            // Timeline config
            this.dateField = this.viewConfig.dateField || 'auditInfo.createdAt';
            this.actorField = this.viewConfig.actorField || 'auditInfo.createdBy';
            this.titleField = this.viewConfig.titleField
                || (Layer8DViewFactory.detectTitleField ? Layer8DViewFactory.detectTitleField(this.columns, this.primaryKey) : 'name');
            this.descriptionField = this.viewConfig.descriptionField || 'description';
            this.colorField = this.viewConfig.colorField || null;

            this.container = null;
            this.allItems = [];
            this.hasMore = false;
        }

        init() {
            this.container = document.getElementById(this.containerId);
            if (!this.container) {
                console.error('Timeline container not found:', this.containerId);
                return;
            }
            this.container.classList.add('layer8d-timeline-container');

            if (this.dataSource) {
                this.dataSource._onDataLoaded = (result) => {
                    this.allItems = result.items || [];
                    this.hasMore = this.allItems.length < result.totalCount;
                    this._render();
                };
                this.dataSource.fetchData(1);
            }
        }

        setData(items, total) {
            this.allItems = items || [];
            this.hasMore = this.allItems.length < (total || 0);
            this._render();
        }

        refresh() {
            if (this.dataSource) {
                this.dataSource.fetchData(1);
            } else {
                this._render();
            }
        }

        destroy() {
            if (this.container) {
                this.container.classList.remove('layer8d-timeline-container');
                this.container.innerHTML = '';
            }
        }

        _render() {
            if (!this.container) return;

            // Sort by date descending
            const sorted = [...this.allItems].sort((a, b) => {
                const da = this._getTimestamp(a);
                const db = this._getTimestamp(b);
                return db - da;
            });

            let html = '<div class="layer8d-timeline">';

            if (this.onAdd) {
                html += `<div class="layer8d-timeline-toolbar">
                    <button class="layer8d-btn layer8d-btn-primary layer8d-btn-small">${escapeHtml(this.addButtonText)}</button>
                </div>`;
            }

            if (sorted.length === 0) {
                html += '<div class="layer8d-timeline-empty">No events found</div>';
            } else {
                html += '<div class="layer8d-timeline-line">';
                sorted.forEach((item, i) => {
                    html += this._renderEvent(item, i);
                });
                html += '</div>';
            }

            if (this.hasMore) {
                html += '<div class="layer8d-timeline-load-more">' +
                    '<button class="layer8d-timeline-more-btn">Load More</button></div>';
            }

            html += '</div>';
            this.container.innerHTML = html;
            this._attachEvents();
        }

        _renderEvent(item, index) {
            const id = this._getNestedValue(item, this.primaryKey) || index;
            const date = formatDate(this._getNestedValue(item, this.dateField));
            const actor = this._getNestedValue(item, this.actorField);
            const title = this._getNestedValue(item, this.titleField) || 'Event';
            const desc = this._getNestedValue(item, this.descriptionField);
            const side = index % 2 === 0 ? 'left' : 'right';

            return `<div class="layer8d-timeline-event ${side}" data-id="${escapeHtml(String(id))}">
                <div class="layer8d-timeline-node"></div>
                <div class="layer8d-timeline-content">
                    <div class="layer8d-timeline-date">${escapeHtml(date)}</div>
                    <div class="layer8d-timeline-title">${escapeHtml(title)}</div>
                    ${desc ? `<div class="layer8d-timeline-desc">${escapeHtml(desc)}</div>` : ''}
                    ${actor ? `<div class="layer8d-timeline-actor">${escapeHtml(actor)}</div>` : ''}
                </div>
            </div>`;
        }

        _attachEvents() {
            if (!this.container) return;

            // Add button
            const addBtn = this.container.querySelector('.layer8d-timeline-toolbar .layer8d-btn');
            if (addBtn && this.onAdd) {
                addBtn.addEventListener('click', () => this.onAdd());
            }

            // Event click
            if (this.onItemClick) {
                this.container.querySelectorAll('.layer8d-timeline-event').forEach(el => {
                    el.addEventListener('click', () => {
                        const id = el.dataset.id;
                        const item = this.allItems.find(d =>
                            String(this._getNestedValue(d, this.primaryKey)) === id);
                        if (item) this.onItemClick(item, id);
                    });
                });
            }

            // Load more
            const moreBtn = this.container.querySelector('.layer8d-timeline-more-btn');
            if (moreBtn && this.dataSource) {
                moreBtn.addEventListener('click', () => {
                    const nextPage = this.dataSource.currentPage + 1;
                    this.dataSource.fetchData(nextPage).then(result => {
                        if (result && result.items) {
                            this.allItems = this.allItems.concat(result.items);
                            this.hasMore = this.allItems.length < result.totalCount;
                            this._render();
                        }
                    });
                });
            }
        }

        _getTimestamp(item) {
            const v = this._getNestedValue(item, this.dateField);
            if (!v) return 0;
            if (typeof v === 'number') return v;
            if (typeof v === 'string' && /^\d+$/.test(v)) return parseInt(v, 10);
            return new Date(v).getTime() / 1000 || 0;
        }

        _getNestedValue(obj, key) {
            if (!key) return '';
            const keys = key.split('.');
            let value = obj;
            for (const k of keys) {
                if (value === null || value === undefined) return '';
                value = value[k];
            }
            return value !== null && value !== undefined ? value : '';
        }
    }

    window.Layer8DTimeline = Layer8DTimeline;

    // Register with view factory
    if (window.Layer8DViewFactory) {
        Layer8DViewFactory.register('timeline', function(options) {
            const ds = new Layer8DDataSource({
                endpoint: options.endpoint,
                modelName: options.modelName,
                columns: options.columns,
                pageSize: options.viewConfig?.pageSize || 20
            });
            return new Layer8DTimeline({
                containerId: options.containerId,
                columns: options.columns,
                dataSource: ds,
                viewConfig: options.viewConfig || {},
                primaryKey: options.primaryKey,
                onItemClick: options.onRowClick,
                onAdd: options.onAdd,
                addButtonText: options.addButtonText
            });
        });
    }

})();
