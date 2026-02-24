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
// Layer8D Gantt Core
// SVG horizontal timeline for project scheduling.
// Supports day/week/month/quarter/year zoom, task bars with progress, and dependency arrows.

(function() {
    'use strict';

    const ZOOM_LEVELS = {
        day: { label: 'Day', cellWidth: 40, format: 'd' },
        week: { label: 'Week', cellWidth: 80, format: 'W' },
        month: { label: 'Month', cellWidth: 120, format: 'MMM' },
        quarter: { label: 'Quarter', cellWidth: 160, format: 'Q' },
        year: { label: 'Year', cellWidth: 200, format: 'YYYY' }
    };

    const ROW_HEIGHT = 36;
    const HEADER_HEIGHT = 50;
    const LABEL_WIDTH = 200;

    class Layer8DGantt {
        constructor(options) {
            this.containerId = options.containerId;
            this.columns = options.columns || [];
            this.dataSource = options.dataSource || null;
            this.viewConfig = options.viewConfig || {};
            this.onItemClick = options.onItemClick || null;
            this.onAdd = options.onAdd || null;
            this.primaryKey = options.primaryKey || 'id';
            this.addButtonText = options.addButtonText || 'Add';

            // Gantt config
            this.startDateField = this.viewConfig.startDateField || 'startDate';
            this.endDateField = this.viewConfig.endDateField || 'endDate';
            this.titleField = this.viewConfig.titleField
                || (Layer8DViewFactory.detectTitleField ? Layer8DViewFactory.detectTitleField(this.columns, this.primaryKey) : 'name');
            this.progressField = this.viewConfig.progressField || 'percentComplete';
            this.dependencyField = this.viewConfig.dependencyField || null;
            this.zoom = this.viewConfig.defaultZoom || 'week';

            // Auto-detect date fields from columns if not explicitly configured
            if (!this.viewConfig.startDateField) {
                this._autoDetectDateFields();
            }

            this.container = null;
            this.data = [];
            this.dateRange = { start: null, end: null };
        }

        init() {
            this.container = document.getElementById(this.containerId);
            if (!this.container) {
                console.error('Gantt container not found:', this.containerId);
                return;
            }
            this.container.classList.add('layer8d-gantt-container');

            if (this.dataSource) {
                this.dataSource._onDataLoaded = (result) => {
                    this.setData(result.items, result.totalCount);
                };
                this.dataSource.pageSize = this.viewConfig.pageSize || 200;
                this.dataSource.fetchData(1);
            }
        }

        setData(items) {
            this.data = items || [];
            this._computeDateRange();
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
                this.container.classList.remove('layer8d-gantt-container');
                this.container.innerHTML = '';
            }
        }

        setZoom(level) {
            if (ZOOM_LEVELS[level]) {
                this.zoom = level;
                this._render();
            }
        }

        _autoDetectDateFields() {
            const cols = this.columns || [];

            // Gather date columns: type:'date' OR key matches date naming patterns
            const dateCols = cols.filter(c =>
                c.type === 'date' || /Date$|Start$|End$/.test(c.key)
            );
            if (dateCols.length === 0) return;

            // Find start/end by key patterns
            const startPat = /start|begin|from/i;
            const endPat = /end|due|until|required|expir/i;

            let startCol = dateCols.find(c => startPat.test(c.key));
            let endCol = dateCols.find(c => endPat.test(c.key));

            // If only one pattern matched, assign the other date col to the missing role
            if (!startCol && endCol && dateCols.length >= 2) {
                startCol = dateCols.find(c => c !== endCol);
            }
            if (startCol && !endCol && dateCols.length >= 2) {
                endCol = dateCols.find(c => c !== startCol);
            }

            // Fallback: first two date columns
            if (!startCol && !endCol) {
                if (dateCols.length >= 2) { startCol = dateCols[0]; endCol = dateCols[1]; }
                else if (dateCols.length === 1) { startCol = dateCols[0]; }
            }

            if (startCol) this.startDateField = startCol.key;
            if (endCol) {
                this.endDateField = endCol.key;
            } else if (startCol) {
                // Infer end from start: plannedStartDate → plannedEndDate
                const inferred = startCol.key.replace(/[Ss]tart/, m => m[0] === 'S' ? 'End' : 'end');
                if (inferred !== startCol.key) this.endDateField = inferred;
            }
        }

        _computeDateRange() {
            let minDate = Infinity;
            let maxDate = -Infinity;

            this.data.forEach(item => {
                const start = this._getTimestamp(item, this.startDateField);
                const end = this._getTimestamp(item, this.endDateField);
                if (start && start < minDate) minDate = start;
                if (end && end > maxDate) maxDate = end;
                if (start && !end && start > maxDate) maxDate = start;
            });

            if (minDate === Infinity) {
                const now = new Date();
                minDate = now.getTime() / 1000;
                maxDate = minDate + 30 * 86400;
            }

            // Add padding (7 days before/after)
            this.dateRange.start = new Date((minDate - 7 * 86400) * 1000);
            this.dateRange.end = new Date((maxDate + 7 * 86400) * 1000);

            // Align to start of day
            this.dateRange.start.setHours(0, 0, 0, 0);
            this.dateRange.end.setHours(23, 59, 59, 999);
        }

        _render() {
            if (!this.container) return;
            Layer8DGanttRender.render(this);
            Layer8DGanttEvents.attach(this);
        }

        _getTimestamp(item, field) {
            const v = this._getNestedValue(item, field);
            if (!v) return 0;
            if (typeof v === 'number') return v;
            if (typeof v === 'string' && /^\d+$/.test(v)) return parseInt(v, 10);
            return new Date(v).getTime() / 1000 || 0;
        }

        _getItemId(item) {
            return item[this.primaryKey] || item.id || '';
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

        getZoomConfig() {
            return ZOOM_LEVELS[this.zoom] || ZOOM_LEVELS.week;
        }

        getTotalDays() {
            const ms = this.dateRange.end.getTime() - this.dateRange.start.getTime();
            return Math.ceil(ms / 86400000);
        }
    }

    Layer8DGantt.ROW_HEIGHT = ROW_HEIGHT;
    Layer8DGantt.HEADER_HEIGHT = HEADER_HEIGHT;
    Layer8DGantt.LABEL_WIDTH = LABEL_WIDTH;
    Layer8DGantt.ZOOM_LEVELS = ZOOM_LEVELS;

    window.Layer8DGantt = Layer8DGantt;

    // Register with view factory
    if (window.Layer8DViewFactory) {
        Layer8DViewFactory.register('gantt', function(options) {
            const ds = new Layer8DDataSource({
                endpoint: options.endpoint,
                modelName: options.modelName,
                columns: options.columns,
                pageSize: options.viewConfig?.pageSize || 200
            });
            return new Layer8DGantt({
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
