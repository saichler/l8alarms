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
// Layer8D Chart Pie Renderer
// Renders pie and donut charts with labels and legend.

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

    function polarToCartesian(cx, cy, r, angle) {
        const rad = (angle - 90) * Math.PI / 180;
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    }

    function arcPath(cx, cy, r, startAngle, endAngle) {
        const start = polarToCartesian(cx, cy, r, endAngle);
        const end = polarToCartesian(cx, cy, r, startAngle);
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;
        return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
    }

    window.Layer8DChartPie = {
        render(chart, w, h) {
            const svg = chart.svgEl;
            const data = chart.chartData;
            const isDonut = chart.chartType === 'donut';

            const total = data.reduce((sum, d) => sum + d.value, 0);
            if (total === 0) return;

            const legendW = Math.min(180, w * 0.3);
            const chartW = w - legendW;
            const cx = chartW / 2;
            const cy = h / 2;
            const r = Math.min(chartW, h) / 2 - 20;
            const innerR = isDonut ? r * 0.55 : 0;

            let startAngle = 0;

            data.forEach((d, i) => {
                const sliceAngle = (d.value / total) * 360;
                const endAngle = startAngle + sliceAngle;
                const color = chart.getColor(i);

                let pathD;
                if (sliceAngle >= 359.99) {
                    // Full circle
                    if (isDonut) {
                        const o = polarToCartesian(cx, cy, r, 0);
                        const o2 = polarToCartesian(cx, cy, r, 180);
                        const i1 = polarToCartesian(cx, cy, innerR, 0);
                        const i2 = polarToCartesian(cx, cy, innerR, 180);
                        pathD = `M ${o.x} ${o.y} A ${r} ${r} 0 1 0 ${o2.x} ${o2.y} A ${r} ${r} 0 1 0 ${o.x} ${o.y} ` +
                                `M ${i1.x} ${i1.y} A ${innerR} ${innerR} 0 1 1 ${i2.x} ${i2.y} A ${innerR} ${innerR} 0 1 1 ${i1.x} ${i1.y} Z`;
                    } else {
                        pathD = `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
                    }
                } else {
                    const outerStart = polarToCartesian(cx, cy, r, startAngle - 90);
                    const outerEnd = polarToCartesian(cx, cy, r, endAngle - 90);
                    const largeArc = sliceAngle > 180 ? 1 : 0;

                    if (isDonut) {
                        const innerStart = polarToCartesian(cx, cy, innerR, endAngle - 90);
                        const innerEnd = polarToCartesian(cx, cy, innerR, startAngle - 90);
                        pathD = `M ${outerStart.x} ${outerStart.y} ` +
                                `A ${r} ${r} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} ` +
                                `L ${innerStart.x} ${innerStart.y} ` +
                                `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y} Z`;
                    } else {
                        pathD = `M ${cx} ${cy} L ${outerStart.x} ${outerStart.y} ` +
                                `A ${r} ${r} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} Z`;
                    }
                }

                const slice = createEl('path', {
                    d: pathD, fill: color, class: 'layer8d-chart-slice'
                });

                const pct = ((d.value / total) * 100).toFixed(1);
                slice.addEventListener('mouseenter', (e) => {
                    slice.setAttribute('opacity', '0.85');
                    chart.showTooltip(e.pageX, e.pageY,
                        `<strong>${d.label}</strong><br>${d.value} (${pct}%)`);
                });
                slice.addEventListener('mouseleave', () => {
                    slice.setAttribute('opacity', '1');
                    chart.hideTooltip();
                });
                if (chart.onItemClick && d.items) {
                    slice.style.cursor = 'pointer';
                    slice.addEventListener('click', () => chart.onItemClick(d.items[0], d.label));
                }

                svg.appendChild(slice);

                // Label on larger slices
                if (sliceAngle > 20 && !isDonut) {
                    const midAngle = startAngle + sliceAngle / 2 - 90;
                    const labelR = r * 0.65;
                    const lp = polarToCartesian(cx, cy, labelR, midAngle + 90);
                    const txt = createEl('text', {
                        x: lp.x, y: lp.y, 'text-anchor': 'middle', 'dominant-baseline': 'central',
                        fill: '#fff', 'font-size': Layer8DChart.DEFAULTS.fontSize - 1, 'font-weight': 'bold'
                    });
                    txt.textContent = pct + '%';
                    svg.appendChild(txt);
                }

                startAngle = endAngle;
            });

            // Donut center text
            if (isDonut) {
                const centerText = createEl('text', {
                    x: cx, y: cy - 8, 'text-anchor': 'middle',
                    fill: Layer8DChart.DEFAULTS.textColor, 'font-size': 14, 'font-weight': 'bold'
                });
                centerText.textContent = total;
                svg.appendChild(centerText);

                const subText = createEl('text', {
                    x: cx, y: cy + 12, 'text-anchor': 'middle',
                    fill: Layer8DChart.DEFAULTS.textColor, 'font-size': 11
                });
                subText.textContent = 'Total';
                svg.appendChild(subText);
            }

            // Legend
            this._renderLegend(chart, svg, data, total, chartW, h, legendW);
        },

        _renderLegend(chart, svg, data, total, startX, h, legendW) {
            const itemH = 22;
            const maxItems = Math.floor((h - 20) / itemH);
            const items = data.slice(0, maxItems);
            const startY = Math.max(10, (h - items.length * itemH) / 2);

            items.forEach((d, i) => {
                const y = startY + i * itemH;
                const color = chart.getColor(i);
                const pct = ((d.value / total) * 100).toFixed(0);

                svg.appendChild(createEl('rect', {
                    x: startX + 10, y: y, width: 12, height: 12, rx: 2, fill: color
                }));

                const label = createEl('text', {
                    x: startX + 28, y: y + 10,
                    fill: Layer8DChart.DEFAULTS.textColor, 'font-size': Layer8DChart.DEFAULTS.fontSize - 1
                });
                const maxLabelLen = Math.floor((legendW - 50) / 6);
                const displayLabel = d.label.length > maxLabelLen
                    ? d.label.substring(0, maxLabelLen - 1) + '...'
                    : d.label;
                label.textContent = `${displayLabel} (${pct}%)`;
                svg.appendChild(label);
            });
        }
    };

})();
