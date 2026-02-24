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
// Layer8D Chart Core
// Base chart class with shared SVG utilities, axes, grid, tooltips, and resize handling.
// Subclasses (bar, line, pie) implement specific rendering.

(function() {
    'use strict';

    function _readThemeColor(varName, fallback) {
        return getComputedStyle(document.documentElement)
            .getPropertyValue(varName).trim() || fallback;
    }

    let _themePalette = null;
    function _getThemePalette() {
        if (!_themePalette) {
            _themePalette = [
                _readThemeColor('--layer8d-primary', '#0ea5e9'),
                _readThemeColor('--layer8d-success', '#22c55e'),
                _readThemeColor('--layer8d-warning', '#f59e0b'),
                _readThemeColor('--layer8d-error', '#ef4444'),
                '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'
            ];
        }
        return _themePalette;
    }

    const CHART_DEFAULTS = {
        width: 600,
        height: 400,
        padding: { top: 30, right: 30, bottom: 50, left: 60 },
        get colors() { return _getThemePalette(); },
        get gridColor() { return _readThemeColor('--layer8d-border', '#e2e8f0'); },
        get textColor() { return _readThemeColor('--layer8d-text-muted', '#718096'); },
        fontSize: 12,
        animationDuration: 300
    };

    class Layer8DChart {
        constructor(options) {
            this.containerId = options.containerId;
            this.columns = options.columns || [];
            this.dataSource = options.dataSource || null;
            this.viewConfig = options.viewConfig || {};
            this.onItemClick = options.onItemClick || null;
            this.onAdd = options.onAdd || null;

            // Chart settings
            this.chartType = this.viewConfig.chartType || 'bar';
            this.categoryField = this.viewConfig.categoryField || null;
            this.valueField = this.viewConfig.valueField || null;
            this.aggregation = this.viewConfig.aggregation || 'count';
            this.seriesField = this.viewConfig.seriesField || null;
            this.title = this.viewConfig.title || '';

            if (!this.categoryField && !this.valueField) {
                this._autoDetectFields();
            }

            this.container = null;
            this.svgEl = null;
            this.tooltipEl = null;
            this.data = [];
            this.chartData = [];
            this._resizeObserver = null;
        }

        init() {
            this.container = document.getElementById(this.containerId);
            if (!this.container) {
                console.error('Chart container not found:', this.containerId);
                return;
            }
            this.container.classList.add('layer8d-chart-container');
            this._setupTooltip();
            this._setupResizeObserver();

            if (this.dataSource) {
                this.dataSource._onDataLoaded = (result) => {
                    this.setData(result.items, result.totalCount);
                    if (result.metadata) this._handleMetadata(result.metadata);
                };
                this.dataSource.fetchData(1);
            }
        }

        setData(items, total) {
            this.data = items || [];
            this.chartData = this._aggregateData(this.data);
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
            if (this._resizeObserver) {
                this._resizeObserver.disconnect();
                this._resizeObserver = null;
            }
            if (this.tooltipEl && this.tooltipEl.parentNode) {
                this.tooltipEl.parentNode.removeChild(this.tooltipEl);
            }
            if (this.container) {
                this.container.classList.remove('layer8d-chart-container');
                this.container.innerHTML = '';
            }
        }

        // Aggregate raw data into chart-ready format
        _aggregateData(items) {
            if (!this.categoryField) {
                return items.map((item, i) => ({
                    label: String(i),
                    value: this._getValue(item),
                    item: item
                }));
            }

            // Detect L8Period objects and normalize
            if (items.length > 0) {
                const firstVal = this._getNestedValue(items[0], this.categoryField);
                if (firstVal && typeof firstVal === 'object' && firstVal.periodType !== undefined) {
                    return this._normalizePeriodData(items);
                }
                // Detect Unix timestamps (date columns) and normalize to year/quarter
                const numVal = typeof firstVal === 'number' ? firstVal
                    : (typeof firstVal === 'string' && /^\d+$/.test(firstVal)) ? parseInt(firstVal, 10) : 0;
                if (numVal > 946684800) {
                    return this._normalizeDateData(items);
                }
            }

            const groups = {};
            items.forEach(item => {
                const key = this._getNestedValue(item, this.categoryField);
                const label = String(key === undefined || key === null ? 'Unknown' : key);
                if (!groups[label]) {
                    groups[label] = { label, values: [], items: [] };
                }
                groups[label].values.push(this._getValue(item));
                groups[label].items.push(item);
            });

            return Object.values(groups).map(g => ({
                label: g.label,
                value: this._aggregate(g.values),
                count: g.items.length,
                items: g.items
            }));
        }

        // Convert L8Period objects to labeled, sorted chart groups
        _normalizePeriodData(items) {
            const PERIOD_NAMES = {
                1:'January', 2:'February', 3:'March', 4:'April',
                5:'May', 6:'June', 7:'July', 8:'August',
                9:'September', 10:'October', 11:'November', 12:'December',
                13:'Q1', 14:'Q2', 15:'Q3', 16:'Q4'
            };

            // Build sort key + display label for each period
            const periodKey = (p) => {
                if (!p || typeof p !== 'object') return { key: '0', label: 'Unknown' };
                const year = p.periodYear || 0;
                const type = p.periodType || 0;
                if (type === 1) return { key: year + '-00', label: String(year) };
                const val = p.periodValue || 0;
                const name = PERIOD_NAMES[val];
                const pad = String(val).padStart(2, '0');
                return {
                    key: year + '-' + pad,
                    label: name ? year + ' / ' + name : String(year)
                };
            };

            const groups = {};
            items.forEach(item => {
                const p = this._getNestedValue(item, this.categoryField);
                const { key, label } = periodKey(p);
                if (!groups[key]) {
                    groups[key] = { key, label, values: [], items: [] };
                }
                groups[key].values.push(this._getValue(item));
                groups[key].items.push(item);
            });

            return Object.values(groups)
                .sort((a, b) => a.key.localeCompare(b.key))
                .map(g => ({
                    label: g.label,
                    value: this._aggregate(g.values),
                    count: g.items.length,
                    items: g.items
                }));
        }

        // Convert Unix timestamps to year/quarter groups
        _normalizeDateData(items) {
            const groups = {};
            items.forEach(item => {
                let ts = this._getNestedValue(item, this.categoryField);
                if (!ts) return;
                if (typeof ts === 'string' && /^\d+$/.test(ts)) ts = parseInt(ts, 10);
                if (typeof ts !== 'number') return;
                const d = new Date(ts * 1000);
                const year = d.getFullYear();
                const q = Math.ceil((d.getMonth() + 1) / 3);
                const key = year + '-Q' + q;
                const label = year + ' / Q' + q;
                if (!groups[key]) {
                    groups[key] = { key, label, values: [], items: [] };
                }
                groups[key].values.push(this._getValue(item));
                groups[key].items.push(item);
            });

            return Object.values(groups)
                .sort((a, b) => a.key.localeCompare(b.key))
                .map(g => ({
                    label: g.label,
                    value: this._aggregate(g.values),
                    count: g.items.length,
                    items: g.items
                }));
        }

        _getValue(item) {
            if (!this.valueField || this.aggregation === 'count') return 1;
            const v = this._getNestedValue(item, this.valueField);
            if (v && typeof v === 'object' && v.amount !== undefined) {
                return typeof v.amount === 'number' ? v.amount : parseFloat(v.amount) || 0;
            }
            return typeof v === 'number' ? v : parseFloat(v) || 0;
        }

        _aggregate(values) {
            if (this.aggregation === 'count') return values.length;
            if (this.aggregation === 'sum') return values.reduce((a, b) => a + b, 0);
            if (this.aggregation === 'avg') return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            if (this.aggregation === 'min') return Math.min(...values);
            if (this.aggregation === 'max') return Math.max(...values);
            return values.length;
        }

        _handleMetadata(metadata) {
            if (metadata?.keyCount?.counts && this.aggregation === 'count' && !this.categoryField) {
                const counts = metadata.keyCount.counts;
                const entries = Object.entries(counts)
                    .filter(([k]) => k !== 'Total')
                    .map(([label, value]) => ({ label, value }));
                if (entries.length > 0) {
                    this.chartData = entries;
                    this._render();
                }
            }
        }

        _autoDetectFields() {
            const cols = this.columns || [];
            const pk = cols.length > 0 ? cols[0].key : '';
            const candidates = cols.filter(c => c.key !== pk);

            // 1. Priority: period columns (L8Period)
            const periodCol = candidates.find(c => c.type === 'period');
            if (periodCol) {
                this.categoryField = periodCol.key;
            }

            // 2. Date columns when money columns also exist (money-over-time chart)
            if (!this.categoryField) {
                const hasMoney = candidates.some(c => c.type === 'money');
                if (hasMoney) {
                    const dateCol = candidates.find(c => c.type === 'date');
                    if (dateCol) {
                        this.categoryField = dateCol.key;
                    }
                }
            }

            // 3. Status/type/category/health patterns
            if (!this.categoryField) {
                const exact = [/^status$/i, /^type$/i, /^category$/i, /^health$/i];
                const suffix = [/Status$/, /Type$/, /Category$/, /Health$/];
                for (const p of exact) {
                    const m = candidates.find(c => p.test(c.key));
                    if (m) { this.categoryField = m.key; break; }
                }
                if (!this.categoryField) {
                    for (const p of suffix) {
                        const m = candidates.find(c => p.test(c.key));
                        if (m) { this.categoryField = m.key; break; }
                    }
                }
            }
            if (!this.categoryField && typeof Layer8DViewFactory !== 'undefined') {
                this.categoryField = Layer8DViewFactory.detectTitleField(cols, pk);
            }

            // Detect valueField
            const valPat = [/Amount$/, /Value$/, /Price$/, /Cost$/, /Total$/,
                            /Count$/, /Percent$/, /Rate$/, /Quantity$/];
            for (const p of valPat) {
                const m = candidates.find(c => p.test(c.key));
                if (m) { this.valueField = m.key; break; }
            }

            if (this.valueField) {
                this.aggregation = 'sum';
            }
        }

        _render() {
            if (!this.container) return;
            const rect = this.container.getBoundingClientRect();
            const w = rect.width || CHART_DEFAULTS.width;
            const h = Math.max(300, Math.min(w * 0.6, CHART_DEFAULTS.height));

            this.container.innerHTML = '';
            if (this.title) {
                const titleEl = document.createElement('div');
                titleEl.className = 'layer8d-chart-title';
                titleEl.textContent = this.title;
                this.container.appendChild(titleEl);
            }

            this._renderControls();

            this.svgEl = this._createSvg(w, h);
            this.container.appendChild(this.svgEl);

            if (this.chartData.length === 0) {
                this._renderEmpty(w, h);
                return;
            }

            // Dispatch to chart type renderer
            switch (this.chartType) {
                case 'bar':
                    Layer8DChartBar.render(this, w, h);
                    break;
                case 'line':
                case 'area':
                    Layer8DChartLine.render(this, w, h);
                    break;
                case 'pie':
                case 'donut':
                    Layer8DChartPie.render(this, w, h);
                    break;
                default:
                    Layer8DChartBar.render(this, w, h);
            }
        }

        _renderControls() {
            const types = [
                { key: 'bar', label: 'Bar', icon: '<rect x="1" y="8" width="3" height="6"/><rect x="5.5" y="4" width="3" height="10"/><rect x="10" y="6" width="3" height="8"/>' },
                { key: 'line', label: 'Line', icon: '<polyline points="1,12 5,5 9,9 13,2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="5" r="1.2"/><circle cx="9" cy="9" r="1.2"/><circle cx="13" cy="2" r="1.2"/>' },
                { key: 'pie', label: 'Pie', icon: '<path d="M7,1 A6,6 0 1,1 1.3,10 L7,7 Z"/><path d="M7,1 L7,7 L1.3,10 A6,6 0 0,1 7,1" opacity="0.5"/>' }
            ];
            const controls = document.createElement('div');
            controls.className = 'layer8d-chart-controls';
            types.forEach(t => {
                const btn = document.createElement('button');
                btn.className = 'layer8d-chart-type-btn' + (this.chartType === t.key ? ' active' : '');
                btn.innerHTML = `<svg viewBox="0 0 14 14" fill="currentColor">${t.icon}</svg>${t.label}`;
                btn.addEventListener('click', () => {
                    if (this.chartType !== t.key) {
                        this.chartType = t.key;
                        this._render();
                    }
                });
                controls.appendChild(btn);
            });
            this.container.appendChild(controls);
        }

        // SVG helper methods
        _createSvg(w, h) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', w);
            svg.setAttribute('height', h);
            svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
            svg.classList.add('layer8d-chart-svg');
            return svg;
        }

        _renderEmpty(w, h) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', w / 2);
            text.setAttribute('y', h / 2);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', CHART_DEFAULTS.textColor);
            text.textContent = 'No data available';
            this.svgEl.appendChild(text);
        }

        _setupTooltip() {
            this.tooltipEl = document.createElement('div');
            this.tooltipEl.className = 'layer8d-chart-tooltip';
            document.body.appendChild(this.tooltipEl);
        }

        showTooltip(x, y, html) {
            if (!this.tooltipEl) return;
            this.tooltipEl.innerHTML = html;
            this.tooltipEl.style.left = x + 'px';
            this.tooltipEl.style.top = (y - 10) + 'px';
            this.tooltipEl.classList.add('visible');
        }

        hideTooltip() {
            if (this.tooltipEl) {
                this.tooltipEl.classList.remove('visible');
            }
        }

        _setupResizeObserver() {
            if (typeof ResizeObserver === 'undefined') return;
            let timeout;
            this._resizeObserver = new ResizeObserver(() => {
                clearTimeout(timeout);
                timeout = setTimeout(() => this._render(), 200);
            });
            this._resizeObserver.observe(this.container);
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

        getColor(index) {
            const colors = this.viewConfig.colors || CHART_DEFAULTS.colors;
            return colors[index % colors.length];
        }

        getPadding() {
            return this.viewConfig.padding || CHART_DEFAULTS.padding;
        }
    }

    // Static defaults accessible by sub-renderers
    Layer8DChart.DEFAULTS = CHART_DEFAULTS;
    Layer8DChart.readThemeColor = _readThemeColor;
    Layer8DChart.getThemePalette = _getThemePalette;

    window.Layer8DChart = Layer8DChart;

    // Register with view factory
    if (window.Layer8DViewFactory) {
        Layer8DViewFactory.register('chart', function(options) {
            const ds = new Layer8DDataSource({
                endpoint: options.endpoint,
                modelName: options.modelName,
                columns: options.columns,
                pageSize: options.viewConfig?.pageSize || 100
            });
            const chart = new Layer8DChart({
                containerId: options.containerId,
                columns: options.columns,
                dataSource: ds,
                viewConfig: options.viewConfig || {},
                onItemClick: options.onRowClick,
                onAdd: options.onAdd
            });
            return chart;
        });
    }

})();
