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
 * ERP Date Picker - Calendar Rendering
 */
(function() {
    'use strict';

    const internal = Layer8DDatePicker._internal;
    const MONTHS = internal.MONTHS;
    const DAYS_SUNDAY_START = internal.DAYS_SUNDAY_START;
    const DAYS_MONDAY_START = internal.DAYS_MONDAY_START;

    /**
     * Create the date picker DOM element
     */
    internal.createPickerElement = function(options) {
        const picker = document.createElement('div');
        picker.className = 'layer8d-datepicker hidden';
        picker.innerHTML = `
            <div class="layer8d-datepicker-header">
                <div class="layer8d-datepicker-nav">
                    <button type="button" class="layer8d-datepicker-nav-btn prev-month" title="Previous Month">&lt;</button>
                </div>
                <div class="layer8d-datepicker-title">
                    <select class="layer8d-datepicker-month-select"></select>
                    <select class="layer8d-datepicker-year-select"></select>
                </div>
                <div class="layer8d-datepicker-nav">
                    <button type="button" class="layer8d-datepicker-nav-btn next-month" title="Next Month">&gt;</button>
                </div>
            </div>
            <div class="layer8d-datepicker-calendar">
                <div class="layer8d-datepicker-weekdays"></div>
                <div class="layer8d-datepicker-days"></div>
            </div>
            <div class="layer8d-datepicker-footer">
                <button type="button" class="layer8d-datepicker-clear-btn">Clear</button>
                <button type="button" class="layer8d-datepicker-current-btn">Current</button>
                <button type="button" class="layer8d-datepicker-today-btn">Today</button>
            </div>
        `;

        // Populate month select
        const monthSelect = picker.querySelector('.layer8d-datepicker-month-select');
        MONTHS.forEach((month, idx) => {
            const option = document.createElement('option');
            option.value = idx;
            option.textContent = month;
            monthSelect.appendChild(option);
        });

        // Populate year select
        const yearSelect = picker.querySelector('.layer8d-datepicker-year-select');
        const currentYear = new Date().getFullYear();
        for (let y = currentYear - 100; y <= currentYear + 20; y++) {
            const option = document.createElement('option');
            option.value = y;
            option.textContent = y;
            yearSelect.appendChild(option);
        }

        // Populate weekday headers
        const weekdaysEl = picker.querySelector('.layer8d-datepicker-weekdays');
        const days = options.firstDayOfWeek === 1 ? DAYS_MONDAY_START : DAYS_SUNDAY_START;
        days.forEach(day => {
            const dayEl = document.createElement('div');
            dayEl.className = 'layer8d-datepicker-weekday';
            dayEl.textContent = day;
            weekdaysEl.appendChild(dayEl);
        });

        // Hide footer if no today button requested
        if (options.showTodayButton === false) {
            picker.querySelector('.layer8d-datepicker-footer').style.display = 'none';
        }

        return picker;
    };

    /**
     * Create a day button element
     */
    internal.createDayButton = function(day, year, month, state) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'layer8d-datepicker-day';
        btn.textContent = day;
        btn.dataset.year = year;
        btn.dataset.month = month;
        btn.dataset.day = day;

        if (state.isOtherMonth) btn.classList.add('other-month');
        if (state.isToday) btn.classList.add('today');
        if (state.isSelected) btn.classList.add('selected');
        if (state.isDisabled) {
            btn.classList.add('disabled');
            btn.disabled = true;
        }

        return btn;
    };

    /**
     * Render the calendar for a specific month/year
     */
    internal.renderCalendar = function(picker, year, month, selectedTimestamp, options) {
        const daysContainer = picker.querySelector('.layer8d-datepicker-days');
        daysContainer.innerHTML = '';

        const firstDayOfWeek = options.firstDayOfWeek || 0;
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();

        // Calculate starting day
        let startDay = firstDayOfMonth.getDay() - firstDayOfWeek;
        if (startDay < 0) startDay += 7;

        // Get today's date
        const today = new Date();
        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth();
        const todayDate = today.getDate();

        // Selected date
        let selectedDate = null;
        if (selectedTimestamp) {
            selectedDate = new Date(selectedTimestamp * 1000);
        }

        // Previous month days
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevMonthYear = month === 0 ? year - 1 : year;
        const daysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();

        // Render previous month's trailing days
        for (let i = startDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const btn = internal.createDayButton(day, prevMonthYear, prevMonth, {
                isOtherMonth: true,
                isToday: false,
                isSelected: false,
                isDisabled: internal.isDateDisabled(new Date(prevMonthYear, prevMonth, day), options)
            });
            daysContainer.appendChild(btn);
        }

        // Render current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = year === todayYear && month === todayMonth && day === todayDate;
            const isSelected = selectedDate &&
                year === selectedDate.getFullYear() &&
                month === selectedDate.getMonth() &&
                day === selectedDate.getDate();

            const btn = internal.createDayButton(day, year, month, {
                isOtherMonth: false,
                isToday,
                isSelected,
                isDisabled: internal.isDateDisabled(new Date(year, month, day), options)
            });
            daysContainer.appendChild(btn);
        }

        // Fill remaining days from next month
        const totalCells = startDay + daysInMonth;
        const remainingCells = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextMonthYear = month === 11 ? year + 1 : year;

        for (let day = 1; day <= remainingCells; day++) {
            const btn = internal.createDayButton(day, nextMonthYear, nextMonth, {
                isOtherMonth: true,
                isToday: false,
                isSelected: false,
                isDisabled: internal.isDateDisabled(new Date(nextMonthYear, nextMonth, day), options)
            });
            daysContainer.appendChild(btn);
        }

        // Update selects
        picker.querySelector('.layer8d-datepicker-month-select').value = month;
        picker.querySelector('.layer8d-datepicker-year-select').value = year;
    };

})();
