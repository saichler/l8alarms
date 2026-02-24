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
// Layer8D Calendar Render
// 7-column grid month view, event pills, and week view rendering.

(function() {
    'use strict';

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str || '');
        return div.innerHTML;
    }

    function _getColors() {
        if (typeof Layer8DChart !== 'undefined') return Layer8DChart.getThemePalette();
        return ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    }

    window.Layer8DCalendarRender = {
        render(cal) {
            const container = cal.container;
            if (!container) return;

            let html = '<div class="layer8d-calendar">';
            html += this._renderHeader(cal);

            if (cal.viewMode === 'week') {
                html += this._renderWeek(cal);
            } else {
                html += this._renderMonth(cal);
            }

            html += '</div>';
            container.innerHTML = html;
        },

        _renderHeader(cal) {
            return `<div class="layer8d-calendar-header">
                <div class="layer8d-calendar-nav">
                    <button class="layer8d-calendar-nav-btn" data-action="prev">&lsaquo;</button>
                    <span class="layer8d-calendar-title">${cal.getMonthName()} ${cal.getYear()}</span>
                    <button class="layer8d-calendar-nav-btn" data-action="next">&rsaquo;</button>
                </div>
                <div class="layer8d-calendar-controls">
                    <button class="layer8d-calendar-btn" data-action="today">Today</button>
                    <button class="layer8d-calendar-btn ${cal.viewMode === 'month' ? 'active' : ''}" data-view="month">Month</button>
                    <button class="layer8d-calendar-btn ${cal.viewMode === 'week' ? 'active' : ''}" data-view="week">Week</button>
                    ${cal.onAdd ? `<button class="layer8d-btn layer8d-btn-primary layer8d-btn-small layer8d-calendar-add-btn" data-action="add">${escapeHtml(cal.addButtonText)}</button>` : ''}
                </div>
            </div>`;
        },

        _renderMonth(cal) {
            const year = cal.currentDate.getFullYear();
            const month = cal.currentDate.getMonth();
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const today = new Date();

            let html = '<div class="layer8d-calendar-grid">';

            // Day headers
            Layer8DCalendar.DAY_NAMES.forEach(d => {
                html += `<div class="layer8d-calendar-day-header">${d}</div>`;
            });

            // Leading empty cells
            for (let i = 0; i < firstDay; i++) {
                html += '<div class="layer8d-calendar-day empty"></div>';
            }

            // Day cells
            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, month, d);
                const isToday = date.toDateString() === today.toDateString();
                const events = cal.getEventsForDate(date);
                const maxShow = 3;

                html += `<div class="layer8d-calendar-day ${isToday ? 'today' : ''}" data-date="${year}-${month + 1}-${d}">
                    <div class="layer8d-calendar-day-num ${isToday ? 'today' : ''}">${d}</div>
                    <div class="layer8d-calendar-day-events">`;

                events.slice(0, maxShow).forEach((item, i) => {
                    const title = cal._getNestedValue(item, cal.titleField) || 'Event';
                    const color = _getColors()[i % _getColors().length];
                    const id = cal._getItemId(item);
                    html += `<div class="layer8d-calendar-event" style="background:${color}" data-id="${escapeHtml(String(id))}">${escapeHtml(title)}</div>`;
                });

                if (events.length > maxShow) {
                    html += `<div class="layer8d-calendar-more">+${events.length - maxShow} more</div>`;
                }

                html += '</div></div>';
            }

            // Trailing empty cells
            const totalCells = firstDay + daysInMonth;
            const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
            for (let i = 0; i < remaining; i++) {
                html += '<div class="layer8d-calendar-day empty"></div>';
            }

            html += '</div>';
            return html;
        },

        _renderWeek(cal) {
            const current = new Date(cal.currentDate);
            const dayOfWeek = current.getDay();
            const weekStart = new Date(current);
            weekStart.setDate(current.getDate() - dayOfWeek);
            const today = new Date();

            let html = '<div class="layer8d-calendar-week">';

            for (let i = 0; i < 7; i++) {
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + i);
                const isToday = date.toDateString() === today.toDateString();
                const events = cal.getEventsForDate(date);
                const dayLabel = Layer8DCalendar.DAY_NAMES[i];
                const dateStr = date.getDate();

                html += `<div class="layer8d-calendar-week-day ${isToday ? 'today' : ''}">
                    <div class="layer8d-calendar-week-header">
                        <span class="layer8d-calendar-week-label">${dayLabel}</span>
                        <span class="layer8d-calendar-week-date ${isToday ? 'today' : ''}">${dateStr}</span>
                    </div>
                    <div class="layer8d-calendar-week-events">`;

                events.forEach((item, j) => {
                    const title = cal._getNestedValue(item, cal.titleField) || 'Event';
                    const color = _getColors()[j % _getColors().length];
                    const id = cal._getItemId(item);
                    html += `<div class="layer8d-calendar-event" style="background:${color}" data-id="${escapeHtml(String(id))}">${escapeHtml(title)}</div>`;
                });

                html += '</div></div>';
            }

            html += '</div>';
            return html;
        }
    };

})();
