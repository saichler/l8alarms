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
 * Layer8MDatePicker - Touch-friendly date picker for mobile
 * Provides native-feeling date selection experience
 */
(function() {
    'use strict';

    class Layer8MDatePicker {
        constructor(options = {}) {
            this.options = {
                value: null,
                minDate: null,
                maxDate: null,
                onSelect: null,
                title: 'Select Date',
                ...options
            };

            this.selectedDate = this.options.value ? new Date(this.options.value * 1000) : new Date();
            this.viewingMonth = new Date(this.selectedDate);
            this.popup = null;
            this.element = null;
        }

        show() {
            const content = this.render();

            this.popup = Layer8MPopup.show({
                title: this.options.title,
                content: content,
                size: 'small',
                showSave: false,
                onClose: () => {
                    this.popup = null;
                    this.element = null;
                }
            });

            this.element = this.popup.body;
            this.setupListeners();
        }

        render() {
            const monthYear = this.viewingMonth.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });

            return `
                <div class="mobile-datepicker">
                    <div class="datepicker-header">
                        <button type="button" class="datepicker-nav-btn prev-month">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <span class="datepicker-month-year">${monthYear}</span>
                        <button type="button" class="datepicker-nav-btn next-month">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </div>
                    <div class="datepicker-weekdays">
                        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                            .map(d => `<span class="weekday">${d}</span>`).join('')}
                    </div>
                    <div class="datepicker-days">
                        ${this.renderDays()}
                    </div>
                    <div class="datepicker-actions">
                        <button type="button" class="datepicker-action-btn today-btn">Today</button>
                        <button type="button" class="datepicker-action-btn clear-btn">Clear</button>
                    </div>
                </div>
            `;
        }

        renderDays() {
            const year = this.viewingMonth.getFullYear();
            const month = this.viewingMonth.getMonth();

            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startPadding = firstDay.getDay();
            const totalDays = lastDay.getDate();

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const selected = new Date(this.selectedDate);
            selected.setHours(0, 0, 0, 0);

            let html = '';

            // Previous month padding
            const prevMonth = new Date(year, month, 0);
            const prevDays = prevMonth.getDate();
            for (let i = startPadding - 1; i >= 0; i--) {
                const day = prevDays - i;
                html += `<button type="button" class="datepicker-day other-month" data-date="${year}-${month}-${day}">${day}</button>`;
            }

            // Current month days
            for (let day = 1; day <= totalDays; day++) {
                const date = new Date(year, month, day);
                date.setHours(0, 0, 0, 0);

                const isToday = date.getTime() === today.getTime();
                const isSelected = date.getTime() === selected.getTime();
                const isDisabled = this.isDateDisabled(date);

                const classes = ['datepicker-day'];
                if (isToday) classes.push('today');
                if (isSelected) classes.push('selected');
                if (isDisabled) classes.push('disabled');

                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                html += `<button type="button" class="${classes.join(' ')}" data-date="${dateStr}" ${isDisabled ? 'disabled' : ''}>${day}</button>`;
            }

            // Next month padding
            const remaining = 42 - (startPadding + totalDays);
            for (let day = 1; day <= remaining; day++) {
                html += `<button type="button" class="datepicker-day other-month" data-date="${year}-${month + 2}-${day}">${day}</button>`;
            }

            return html;
        }

        isDateDisabled(date) {
            if (this.options.minDate) {
                const min = new Date(this.options.minDate * 1000);
                min.setHours(0, 0, 0, 0);
                if (date < min) return true;
            }
            if (this.options.maxDate) {
                const max = new Date(this.options.maxDate * 1000);
                max.setHours(0, 0, 0, 0);
                if (date > max) return true;
            }
            return false;
        }

        setupListeners() {
            if (!this.element) return;

            // Month navigation
            this.element.querySelector('.prev-month')?.addEventListener('click', () => {
                this.viewingMonth.setMonth(this.viewingMonth.getMonth() - 1);
                this.updateCalendar();
            });

            this.element.querySelector('.next-month')?.addEventListener('click', () => {
                this.viewingMonth.setMonth(this.viewingMonth.getMonth() + 1);
                this.updateCalendar();
            });

            // Day selection
            this.element.querySelectorAll('.datepicker-day:not(.other-month):not(.disabled)').forEach(btn => {
                btn.addEventListener('click', () => {
                    const dateStr = btn.dataset.date;
                    if (dateStr) {
                        this.selectDate(dateStr);
                    }
                });
            });

            // Today button
            this.element.querySelector('.today-btn')?.addEventListener('click', () => {
                const today = new Date();
                const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                this.selectDate(dateStr);
            });

            // Clear button
            this.element.querySelector('.clear-btn')?.addEventListener('click', () => {
                if (this.options.onSelect) {
                    this.options.onSelect(null, '');
                }
                Layer8MPopup.close();
            });
        }

        selectDate(dateStr) {
            const [year, month, day] = dateStr.split('-').map(Number);
            const date = new Date(year, month - 1, day, 12, 0, 0);

            // Convert to Unix timestamp
            const timestamp = Math.floor(date.getTime() / 1000);

            if (this.options.onSelect) {
                this.options.onSelect(timestamp, dateStr);
            }

            Layer8MPopup.close();
        }

        updateCalendar() {
            if (!this.element) return;

            const monthYear = this.viewingMonth.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });

            this.element.querySelector('.datepicker-month-year').textContent = monthYear;
            this.element.querySelector('.datepicker-days').innerHTML = this.renderDays();

            // Rebind day click listeners
            this.element.querySelectorAll('.datepicker-day:not(.other-month):not(.disabled)').forEach(btn => {
                btn.addEventListener('click', () => {
                    const dateStr = btn.dataset.date;
                    if (dateStr) {
                        this.selectDate(dateStr);
                    }
                });
            });
        }

        static show(options) {
            const picker = new Layer8MDatePicker(options);
            picker.show();
            return picker;
        }
    }

    // Export
    window.Layer8MDatePicker = Layer8MDatePicker;

})();
