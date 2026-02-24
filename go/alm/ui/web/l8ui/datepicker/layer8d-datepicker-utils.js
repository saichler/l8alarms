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
 * ERP Date Picker - Utility Functions and Constants
 */
(function() {
    'use strict';

    // Create namespace
    window.Layer8DDatePicker = window.Layer8DDatePicker || {};
    Layer8DDatePicker._internal = {};

    // Month names for display
    Layer8DDatePicker._internal.MONTHS = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Day abbreviations
    Layer8DDatePicker._internal.DAYS_SUNDAY_START = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    Layer8DDatePicker._internal.DAYS_MONDAY_START = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

    // Store attached pickers
    Layer8DDatePicker._internal.attachedInputs = new WeakMap();
    Layer8DDatePicker._internal.currentOverlay = null;
    Layer8DDatePicker._internal.currentPicker = null;
    Layer8DDatePicker._internal.currentInput = null;

    /**
     * Check if a date is disabled based on min/max options
     */
    Layer8DDatePicker._internal.isDateDisabled = function(date, options) {
        if (options.minDate) {
            const min = new Date(options.minDate * 1000);
            min.setHours(0, 0, 0, 0);
            if (date < min) return true;
        }
        if (options.maxDate) {
            const max = new Date(options.maxDate * 1000);
            max.setHours(23, 59, 59, 999);
            if (date > max) return true;
        }
        return false;
    };

    /**
     * Create the overlay element
     */
    Layer8DDatePicker._internal.createOverlay = function() {
        const overlay = document.createElement('div');
        overlay.className = 'layer8d-datepicker-overlay';
        return overlay;
    };

    /**
     * Handle Escape key to close picker
     */
    Layer8DDatePicker._internal.handleEscapeKey = function(e) {
        if (e.key === 'Escape') {
            Layer8DDatePicker.close();
        }
    };

})();
