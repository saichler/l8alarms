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
// Layer8D Chart Bar Renderer
// Renders vertical and horizontal bar charts with optional stacking/grouping.

(function() {
    'use strict';

    const NS = 'http://www.w3.org/2000/svg';

    function createEl(tag, attrs) {
        const el = document.createElementNS(NS, tag);
        for (const [k, v] of Object.entries(attrs)) {
            el.setAttribute(k, v);
        }
        return el;
    }

    window.Layer8DChartBar = {
        render(chart, w, h) {
            const pad = chart.getPadding();
            const data = chart.chartData;
            const horizontal = chart.viewConfig.horizontal === true;

            if (horizontal) {
                this._renderHorizontal(chart, w, h, pad, data);
            } else {
                this._renderVertical(chart, w, h, pad, data);
            }
        },

        _renderVertical(chart, w, h, pad, data) {
            const svg = chart.svgEl;
            const plotW = w - pad.left - pad.right;
            const plotH = h - pad.top - pad.bottom;
            const maxVal = Math.max(...data.map(d => d.value), 1);
            const barW = Math.max(8, Math.min(60, (plotW / data.length) * 0.7));
            const gap = (plotW - barW * data.length) / (data.length + 1);

            // Y-axis grid lines
            const ticks = this._getTicks(maxVal);
            ticks.forEach(tick => {
                const y = pad.top + plotH - (tick / maxVal) * plotH;
                svg.appendChild(createEl('line', {
                    x1: pad.left, y1: y, x2: w - pad.right, y2: y,
                    stroke: Layer8DChart.DEFAULTS.gridColor, 'stroke-dasharray': '3,3'
                }));
                const label = createEl('text', {
                    x: pad.left - 8, y: y + 4, 'text-anchor': 'end',
                    fill: Layer8DChart.DEFAULTS.textColor, 'font-size': Layer8DChart.DEFAULTS.fontSize - 1
                });
                label.textContent = this._formatNumber(tick);
                svg.appendChild(label);
            });

            // X-axis line
            svg.appendChild(createEl('line', {
                x1: pad.left, y1: h - pad.bottom, x2: w - pad.right, y2: h - pad.bottom,
                stroke: Layer8DChart.DEFAULTS.gridColor
            }));

            // Bars
            data.forEach((d, i) => {
                const x = pad.left + gap + i * (barW + gap);
                const barH = (d.value / maxVal) * plotH;
                const y = pad.top + plotH - barH;
                const color = chart.getColor(i);

                const rect = createEl('rect', {
                    x: x, y: y, width: barW, height: barH,
                    fill: color, rx: 3, class: 'layer8d-chart-bar'
                });

                rect.addEventListener('mouseenter', (e) => {
                    rect.setAttribute('opacity', '0.8');
                    chart.showTooltip(e.pageX, e.pageY,
                        `<strong>${d.label}</strong><br>${this._formatNumber(d.value)}`);
                });
                rect.addEventListener('mouseleave', () => {
                    rect.setAttribute('opacity', '1');
                    chart.hideTooltip();
                });
                if (chart.onItemClick && d.items) {
                    rect.style.cursor = 'pointer';
                    rect.addEventListener('click', () => chart.onItemClick(d.items[0], d.label));
                }

                svg.appendChild(rect);

                // X-axis label
                const label = createEl('text', {
                    x: x + barW / 2, y: h - pad.bottom + 16, 'text-anchor': 'middle',
                    fill: Layer8DChart.DEFAULTS.textColor, 'font-size': Layer8DChart.DEFAULTS.fontSize - 1
                });
                label.textContent = d.label.length > 10 ? d.label.substring(0, 9) + '...' : d.label;
                svg.appendChild(label);
            });
        },

        _renderHorizontal(chart, w, h, pad, data) {
            const svg = chart.svgEl;
            const plotW = w - pad.left - pad.right;
            const plotH = h - pad.top - pad.bottom;
            const maxVal = Math.max(...data.map(d => d.value), 1);
            const barH = Math.max(8, Math.min(40, (plotH / data.length) * 0.7));
            const gap = (plotH - barH * data.length) / (data.length + 1);

            // X-axis grid lines
            const ticks = this._getTicks(maxVal);
            ticks.forEach(tick => {
                const x = pad.left + (tick / maxVal) * plotW;
                svg.appendChild(createEl('line', {
                    x1: x, y1: pad.top, x2: x, y2: h - pad.bottom,
                    stroke: Layer8DChart.DEFAULTS.gridColor, 'stroke-dasharray': '3,3'
                }));
                const label = createEl('text', {
                    x: x, y: h - pad.bottom + 16, 'text-anchor': 'middle',
                    fill: Layer8DChart.DEFAULTS.textColor, 'font-size': Layer8DChart.DEFAULTS.fontSize - 1
                });
                label.textContent = this._formatNumber(tick);
                svg.appendChild(label);
            });

            // Y-axis line
            svg.appendChild(createEl('line', {
                x1: pad.left, y1: pad.top, x2: pad.left, y2: h - pad.bottom,
                stroke: Layer8DChart.DEFAULTS.gridColor
            }));

            // Bars
            data.forEach((d, i) => {
                const y = pad.top + gap + i * (barH + gap);
                const bw = (d.value / maxVal) * plotW;
                const color = chart.getColor(i);

                const rect = createEl('rect', {
                    x: pad.left, y: y, width: bw, height: barH,
                    fill: color, rx: 3, class: 'layer8d-chart-bar'
                });

                rect.addEventListener('mouseenter', (e) => {
                    rect.setAttribute('opacity', '0.8');
                    chart.showTooltip(e.pageX, e.pageY,
                        `<strong>${d.label}</strong><br>${this._formatNumber(d.value)}`);
                });
                rect.addEventListener('mouseleave', () => {
                    rect.setAttribute('opacity', '1');
                    chart.hideTooltip();
                });

                svg.appendChild(rect);

                // Y-axis label
                const label = createEl('text', {
                    x: pad.left - 8, y: y + barH / 2 + 4, 'text-anchor': 'end',
                    fill: Layer8DChart.DEFAULTS.textColor, 'font-size': Layer8DChart.DEFAULTS.fontSize - 1
                });
                label.textContent = d.label.length > 12 ? d.label.substring(0, 11) + '...' : d.label;
                svg.appendChild(label);
            });
        },

        _getTicks(maxVal) {
            const count = 5;
            const step = Math.ceil(maxVal / count);
            const ticks = [];
            for (let i = step; i <= maxVal; i += step) {
                ticks.push(i);
            }
            if (ticks.length === 0) ticks.push(maxVal);
            return ticks;
        },

        _formatNumber(n) {
            if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
            if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
            return String(Math.round(n * 100) / 100);
        }
    };

})();
