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
// Layer8D Widget
// Enhanced KPI card with embedded mini-chart, sparkline, and trend arrow.

(function() {
    'use strict';

    const NS = 'http://www.w3.org/2000/svg';

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str || '');
        return div.innerHTML;
    }

    function formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return String(num);
    }

    window.Layer8DWidget = {
        /**
         * Render an enhanced KPI card
         * @param {Object} kpi - KPI configuration
         * @param {number} value - Current value
         * @param {Object} [opts] - Extra options (trend, sparkline data, chart config)
         * @returns {string} HTML string for the widget
         */
        render(kpi, value, opts) {
            opts = opts || {};
            const trendHtml = this._renderTrend(opts.trend, opts.trendValue);
            const sparklineHtml = opts.sparklineData ? this._renderSparkline(opts.sparklineData, opts.sparklineColor) : '';
            const miniChartHtml = opts.miniChart ? this._renderMiniChart(opts.miniChart) : '';
            const iconSvg = kpi.iconSvg || '';

            return `<div class="layer8d-widget" onclick="${kpi.onClick || ''}">
                <div class="layer8d-widget-header">
                    ${iconSvg ? `<div class="layer8d-widget-icon ${kpi.icon || ''}">${iconSvg}</div>` : ''}
                    <div class="layer8d-widget-info">
                        <div class="layer8d-widget-value">${escapeHtml(formatNumber(value))}</div>
                        <div class="layer8d-widget-label">${escapeHtml(kpi.label)}</div>
                    </div>
                    ${trendHtml}
                </div>
                ${sparklineHtml}
                ${miniChartHtml}
            </div>`;
        },

        /**
         * Render a trend arrow indicator
         */
        _renderTrend(direction, value) {
            if (!direction) return '';
            const isUp = direction === 'up';
            const _read = typeof Layer8DChart !== 'undefined' ? Layer8DChart.readThemeColor : (n, f) => f;
            const color = isUp ? _read('--layer8d-success', '#22c55e') : _read('--layer8d-error', '#ef4444');
            const arrow = isUp ? '&#9650;' : '&#9660;';
            const label = value ? `${value}%` : '';

            return `<div class="layer8d-widget-trend" style="color:${color}">
                <span class="layer8d-widget-trend-arrow">${arrow}</span>
                ${label ? `<span class="layer8d-widget-trend-value">${escapeHtml(label)}</span>` : ''}
            </div>`;
        },

        /**
         * Render an SVG sparkline from data points
         */
        _renderSparkline(data, color) {
            if (!data || data.length < 2) return '';
            if (!color) {
                const _read = typeof Layer8DChart !== 'undefined' ? Layer8DChart.readThemeColor : (n, f) => f;
                color = _read('--layer8d-primary', '#0ea5e9');
            }

            const w = 120;
            const h = 30;
            const max = Math.max(...data);
            const min = Math.min(...data);
            const range = max - min || 1;
            const stepX = w / (data.length - 1);

            const points = data.map((v, i) => {
                const x = i * stepX;
                const y = h - ((v - min) / range) * (h - 4) - 2;
                return `${x},${y}`;
            }).join(' ');

            return `<div class="layer8d-widget-sparkline">
                <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
                    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>
                </svg>
            </div>`;
        },

        /**
         * Render a mini bar chart from category data
         */
        _renderMiniChart(config) {
            if (!config || !config.data) return '';

            const data = config.data;
            const colors = config.colors || (typeof Layer8DChart !== 'undefined' ? Layer8DChart.getThemePalette() : ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']);
            const max = Math.max(...data.map(d => d.value));
            const barW = 100 / data.length;

            let barsHtml = '';
            data.forEach((d, i) => {
                const pct = max > 0 ? (d.value / max) * 100 : 0;
                const color = colors[i % colors.length];
                barsHtml += `<div class="layer8d-widget-minibar" style="width:${barW}%;height:${pct}%;background:${color}" title="${escapeHtml(d.label)}: ${d.value}"></div>`;
            });

            return `<div class="layer8d-widget-minichart">${barsHtml}</div>`;
        },

        /**
         * Render enhanced stats grid using widget format
         */
        renderEnhancedStatsGrid(kpis, iconMap) {
            return kpis.map(kpi => {
                const iconSvg = iconMap[kpi.icon] || '';
                return this.render({
                    label: kpi.label,
                    icon: kpi.icon,
                    iconSvg: iconSvg,
                    onClick: `DashboardStats.navigateToSection('${kpi.section}')`
                }, 0, {});
            }).join('');
        }
    };

})();
