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
 * ERP Date Picker - Core API Functions
 */
(function() {
    'use strict';

    const internal = Layer8DDatePicker._internal;

    /**
     * Attach date picker to an input element
     */
    Layer8DDatePicker.attach = function(inputElement, options = {}) {
        if (internal.attachedInputs.has(inputElement)) {
            return; // Already attached
        }

        const config = {
            minDate: options.minDate || null,
            maxDate: options.maxDate || null,
            onChange: options.onChange || null,
            showTodayButton: options.showTodayButton !== false,
            firstDayOfWeek: options.firstDayOfWeek || 0
        };

        internal.attachedInputs.set(inputElement, config);

        // Update placeholder based on configured format
        if (typeof Layer8DUtils !== 'undefined' && Layer8DUtils.getDateInputPlaceholder) {
            inputElement.placeholder = Layer8DUtils.getDateInputPlaceholder();
        }

        // Handle input click
        inputElement.addEventListener('click', (e) => {
            e.stopPropagation();
            Layer8DDatePicker.open(inputElement);
        });

        // Handle input focus
        inputElement.addEventListener('focus', () => {
            Layer8DDatePicker.open(inputElement);
        });

        // Handle manual input
        inputElement.addEventListener('change', () => {
            if (internal.currentPicker && internal.currentInput === inputElement) {
                const timestamp = Layer8DDatePicker.getDate(inputElement);
                if (timestamp) {
                    const date = new Date(timestamp * 1000);
                    internal.renderCalendar(internal.currentPicker, date.getFullYear(), date.getMonth(), timestamp, config);
                }
            }
        });

        // Handle keyboard navigation
        inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                Layer8DDatePicker.close();
            } else if (e.key === 'Enter' && internal.currentPicker) {
                e.preventDefault();
                Layer8DDatePicker.close();
            }
        });
    };

    /**
     * Open the date picker for an input
     */
    Layer8DDatePicker.open = function(inputElement) {
        const config = internal.attachedInputs.get(inputElement);
        if (!config) return;

        // Don't reopen if already open for this input
        if (internal.currentPicker && internal.currentInput === inputElement) {
            return;
        }

        // Close any existing picker
        Layer8DDatePicker.close();

        // Create overlay and picker
        const overlay = internal.createOverlay();
        const picker = internal.createPickerElement(config);
        overlay.appendChild(picker);
        document.body.appendChild(overlay);

        internal.currentOverlay = overlay;
        internal.currentPicker = picker;
        internal.currentInput = inputElement;

        // Get initial date from input or use today
        let timestamp = Layer8DDatePicker.getDate(inputElement);
        let displayDate;
        let selectedTimestamp = timestamp;

        if (timestamp === 0) {
            // Zero means "Current/N/A" - show today's month but don't select any date
            displayDate = new Date();
            selectedTimestamp = null; // Don't highlight any date
        } else if (timestamp) {
            displayDate = new Date(timestamp * 1000);
        } else {
            displayDate = new Date();
            selectedTimestamp = null;
        }

        // Update the "Current" button text based on the input's zeroLabel
        const zeroLabel = inputElement.dataset.zeroLabel || 'Current';
        const currentBtn = picker.querySelector('.layer8d-datepicker-current-btn');
        if (currentBtn) {
            currentBtn.textContent = zeroLabel;
        }

        // Render calendar
        internal.renderCalendar(picker, displayDate.getFullYear(), displayDate.getMonth(), selectedTimestamp, config);

        // Event handlers
        setupPickerEvents(picker, inputElement, config, zeroLabel);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                Layer8DDatePicker.close();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', internal.handleEscapeKey);
    };

    /**
     * Setup event handlers for the picker
     */
    function setupPickerEvents(picker, inputElement, config, zeroLabel) {
        // Day click
        picker.querySelector('.layer8d-datepicker-days').addEventListener('click', (e) => {
            const dayBtn = e.target.closest('.layer8d-datepicker-day');
            if (dayBtn && !dayBtn.disabled) {
                const year = parseInt(dayBtn.dataset.year, 10);
                const month = parseInt(dayBtn.dataset.month, 10);
                const day = parseInt(dayBtn.dataset.day, 10);

                const date = new Date(year, month, day);
                const timestamp = Math.floor(date.getTime() / 1000);

                // Remove zero flag since we're setting an actual date
                delete inputElement.dataset.isZero;
                Layer8DDatePicker.setDate(inputElement, timestamp);

                if (config.onChange) {
                    config.onChange(timestamp, inputElement.value);
                }

                Layer8DDatePicker.close();
            }
        });

        // Previous month
        picker.querySelector('.prev-month').addEventListener('click', () => {
            const monthSelect = picker.querySelector('.layer8d-datepicker-month-select');
            const yearSelect = picker.querySelector('.layer8d-datepicker-year-select');
            let month = parseInt(monthSelect.value, 10);
            let year = parseInt(yearSelect.value, 10);

            month--;
            if (month < 0) {
                month = 11;
                year--;
            }

            const timestamp = Layer8DDatePicker.getDate(inputElement);
            internal.renderCalendar(picker, year, month, timestamp, config);
        });

        // Next month
        picker.querySelector('.next-month').addEventListener('click', () => {
            const monthSelect = picker.querySelector('.layer8d-datepicker-month-select');
            const yearSelect = picker.querySelector('.layer8d-datepicker-year-select');
            let month = parseInt(monthSelect.value, 10);
            let year = parseInt(yearSelect.value, 10);

            month++;
            if (month > 11) {
                month = 0;
                year++;
            }

            const timestamp = Layer8DDatePicker.getDate(inputElement);
            internal.renderCalendar(picker, year, month, timestamp, config);
        });

        // Month select change
        picker.querySelector('.layer8d-datepicker-month-select').addEventListener('change', (e) => {
            const month = parseInt(e.target.value, 10);
            const year = parseInt(picker.querySelector('.layer8d-datepicker-year-select').value, 10);
            const timestamp = Layer8DDatePicker.getDate(inputElement);
            internal.renderCalendar(picker, year, month, timestamp, config);
        });

        // Year select change
        picker.querySelector('.layer8d-datepicker-year-select').addEventListener('change', (e) => {
            const year = parseInt(e.target.value, 10);
            const month = parseInt(picker.querySelector('.layer8d-datepicker-month-select').value, 10);
            const timestamp = Layer8DDatePicker.getDate(inputElement);
            internal.renderCalendar(picker, year, month, timestamp, config);
        });

        // Today button
        picker.querySelector('.layer8d-datepicker-today-btn').addEventListener('click', () => {
            const today = new Date();
            const timestamp = Math.floor(today.getTime() / 1000);

            // Remove zero flag since we're setting an actual date
            delete inputElement.dataset.isZero;
            Layer8DDatePicker.setDate(inputElement, timestamp);

            if (config.onChange) {
                config.onChange(timestamp, inputElement.value);
            }

            Layer8DDatePicker.close();
        });

        // Clear button
        picker.querySelector('.layer8d-datepicker-clear-btn').addEventListener('click', () => {
            inputElement.value = '';
            delete inputElement.dataset.isZero;

            if (config.onChange) {
                config.onChange(null, '');
            }

            Layer8DDatePicker.close();
        });

        // Current/N/A button - sets value to 0
        picker.querySelector('.layer8d-datepicker-current-btn').addEventListener('click', () => {
            Layer8DDatePicker.setDate(inputElement, 0);

            if (config.onChange) {
                config.onChange(0, inputElement.value);
            }

            Layer8DDatePicker.close();
        });
    }

    /**
     * Close any open date picker
     */
    Layer8DDatePicker.close = function() {
        document.removeEventListener('keydown', internal.handleEscapeKey);

        if (internal.currentOverlay) {
            internal.currentOverlay.remove();
            internal.currentOverlay = null;
        }
        internal.currentPicker = null;
        internal.currentInput = null;
    };

    /**
     * Set date on an input element
     * @param {HTMLInputElement} inputElement
     * @param {number|null} timestamp - Unix timestamp in seconds (0 = "Current"/"N/A")
     */
    Layer8DDatePicker.setDate = function(inputElement, timestamp) {
        // Handle zero value (Current/N/A)
        if (timestamp === 0) {
            const zeroLabel = inputElement.dataset.zeroLabel || 'Current';
            inputElement.value = zeroLabel;
            inputElement.dataset.isZero = 'true';
            return;
        }

        // Clear the zero flag
        delete inputElement.dataset.isZero;

        if (typeof Layer8DUtils !== 'undefined' && Layer8DUtils.formatDate) {
            inputElement.value = Layer8DUtils.formatDate(timestamp);
        } else {
            // Fallback to ISO format
            const date = new Date(timestamp * 1000);
            inputElement.value = date.toISOString().split('T')[0];
        }
    };

    /**
     * Get date from an input element
     * @param {HTMLInputElement} inputElement
     * @returns {number|null} Unix timestamp in seconds (0 = "Current"/"N/A", null = empty)
     */
    Layer8DDatePicker.getDate = function(inputElement) {
        const value = (inputElement.value || '').trim();
        if (!value) return null;

        // Check for "Current" or "N/A" values which represent 0
        const lowerValue = value.toLowerCase();
        if (lowerValue === 'current' || lowerValue === 'n/a') {
            return 0;
        }

        if (typeof Layer8DUtils !== 'undefined' && Layer8DUtils.parseDateToTimestamp) {
            return Layer8DUtils.parseDateToTimestamp(value);
        }

        // Fallback parsing
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : Math.floor(date.getTime() / 1000);
    };

    /**
     * Detach date picker from an input element
     */
    Layer8DDatePicker.detach = function(inputElement) {
        if (internal.currentInput === inputElement) {
            Layer8DDatePicker.close();
        }
        internal.attachedInputs.delete(inputElement);
    };

})();
