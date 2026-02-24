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
// Layer8D Chart Line Renderer
// Renders line and area charts with multi-series support.

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

    window.Layer8DChartLine = {
        render(chart, w, h) {
            const pad = chart.getPadding();
            const svg = chart.svgEl;
            const data = chart.chartData;
            const plotW = w - pad.left - pad.right;
            const plotH = h - pad.top - pad.bottom;
            const isArea = chart.chartType === 'area';

            const maxVal = Math.max(...data.map(d => d.value), 1);
            const stepX = data.length > 1 ? plotW / (data.length - 1) : plotW / 2;

            // Grid lines
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

            // X-axis
            svg.appendChild(createEl('line', {
                x1: pad.left, y1: h - pad.bottom, x2: w - pad.right, y2: h - pad.bottom,
                stroke: Layer8DChart.DEFAULTS.gridColor
            }));

            // Build points
            const points = data.map((d, i) => ({
                x: pad.left + (data.length === 1 ? plotW / 2 : i * stepX),
                y: pad.top + plotH - (d.value / maxVal) * plotH,
                data: d
            }));

            if (points.length === 0) return;

            const pathStr = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            const color = chart.getColor(0);

            // Area fill
            if (isArea && points.length > 1) {
                const areaPath = pathStr +
                    ` L ${points[points.length - 1].x} ${h - pad.bottom}` +
                    ` L ${points[0].x} ${h - pad.bottom} Z`;
                svg.appendChild(createEl('path', {
                    d: areaPath, fill: color, opacity: '0.15', class: 'layer8d-chart-area'
                }));
            }

            // Line
            svg.appendChild(createEl('path', {
                d: pathStr, fill: 'none', stroke: color, 'stroke-width': 2.5,
                'stroke-linejoin': 'round', 'stroke-linecap': 'round',
                class: 'layer8d-chart-line'
            }));

            // Data points and labels
            points.forEach((p, i) => {
                const bgColor = Layer8DChart.readThemeColor('--layer8d-bg-white', '#ffffff');
                const circle = createEl('circle', {
                    cx: p.x, cy: p.y, r: 4,
                    fill: bgColor, stroke: color, 'stroke-width': 2,
                    class: 'layer8d-chart-point'
                });

                circle.addEventListener('mouseenter', (e) => {
                    circle.setAttribute('r', 6);
                    chart.showTooltip(e.pageX, e.pageY,
                        `<strong>${p.data.label}</strong><br>${this._formatNumber(p.data.value)}`);
                });
                circle.addEventListener('mouseleave', () => {
                    circle.setAttribute('r', 4);
                    chart.hideTooltip();
                });
                if (chart.onItemClick && p.data.items) {
                    circle.style.cursor = 'pointer';
                    circle.addEventListener('click', () => chart.onItemClick(p.data.items[0], p.data.label));
                }

                svg.appendChild(circle);

                // X-axis label
                if (data.length <= 20 || i % Math.ceil(data.length / 10) === 0) {
                    const label = createEl('text', {
                        x: p.x, y: h - pad.bottom + 16, 'text-anchor': 'middle',
                        fill: Layer8DChart.DEFAULTS.textColor, 'font-size': Layer8DChart.DEFAULTS.fontSize - 1
                    });
                    label.textContent = p.data.label.length > 8 ? p.data.label.substring(0, 7) + '...' : p.data.label;
                    svg.appendChild(label);
                }
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
