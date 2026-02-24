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
 * ERP Input Formatter - Utilities
 * Shared utilities, validation helpers, and namespace initialization
 */
(function() {
    'use strict';

    // Initialize namespace
    window.Layer8DInputFormatter = window.Layer8DInputFormatter || {};

    // WeakMap to store formatter data for attached inputs
    const attachedInputs = new WeakMap();

    // ========================================
    // CURSOR POSITION MANAGEMENT
    // ========================================

    /**
     * Get cursor position in an input element
     * @param {HTMLInputElement} input
     * @returns {number}
     */
    function getCursorPosition(input) {
        if (input.selectionStart !== undefined) {
            return input.selectionStart;
        }
        return 0;
    }

    /**
     * Set cursor position in an input element
     * @param {HTMLInputElement} input
     * @param {number} position
     */
    function setCursorPosition(input, position) {
        if (input.setSelectionRange) {
            // Ensure position is within bounds
            const maxPos = (input.value || '').length;
            position = Math.min(Math.max(0, position), maxPos);
            requestAnimationFrame(() => {
                input.setSelectionRange(position, position);
            });
        }
    }

    /**
     * Calculate new cursor position after formatting
     * @param {string} oldValue - Value before formatting
     * @param {string} newValue - Value after formatting
     * @param {number} oldPosition - Cursor position before formatting
     * @param {string} maskChars - Characters that are part of the mask (e.g., '-', '(', ')')
     * @returns {number} - New cursor position
     */
    function calculateCursorPosition(oldValue, newValue, oldPosition, maskChars = '') {
        // Count how many non-mask characters are before the cursor in old value
        let rawCharsBefore = 0;
        for (let i = 0; i < oldPosition && i < oldValue.length; i++) {
            if (!maskChars.includes(oldValue[i])) {
                rawCharsBefore++;
            }
        }

        // Find the position in new value where we have the same number of non-mask chars
        let newPosition = 0;
        let rawCharsCount = 0;
        for (let i = 0; i < newValue.length; i++) {
            if (!maskChars.includes(newValue[i])) {
                rawCharsCount++;
            }
            if (rawCharsCount >= rawCharsBefore) {
                newPosition = i + 1;
                break;
            }
            newPosition = i + 1;
        }

        return newPosition;
    }

    // ========================================
    // INPUT DATA MANAGEMENT
    // ========================================

    /**
     * Store formatter data for an input
     * @param {HTMLInputElement} input
     * @param {Object} data
     */
    function setInputData(input, data) {
        attachedInputs.set(input, data);
    }

    /**
     * Get formatter data for an input
     * @param {HTMLInputElement} input
     * @returns {Object|null}
     */
    function getInputData(input) {
        return attachedInputs.get(input) || null;
    }

    /**
     * Check if an input has a formatter attached
     * @param {HTMLInputElement} input
     * @returns {boolean}
     */
    function hasFormatter(input) {
        return attachedInputs.has(input);
    }

    /**
     * Remove formatter data for an input
     * @param {HTMLInputElement} input
     */
    function removeInputData(input) {
        attachedInputs.delete(input);
    }

    // ========================================
    // COMMON VALIDATION HELPERS
    // ========================================

    /**
     * Check if a value contains only digits
     * @param {string} value
     * @returns {boolean}
     */
    function isDigitsOnly(value) {
        return /^\d*$/.test(value);
    }

    /**
     * Extract only digits from a string
     * @param {string} value
     * @returns {string}
     */
    function extractDigits(value) {
        if (value === null || value === undefined) return '';
        return String(value).replace(/\D/g, '');
    }

    /**
     * Extract only numeric characters (digits, decimal point, minus sign)
     * @param {string} value
     * @returns {string}
     */
    function extractNumeric(value) {
        if (value === null || value === undefined) return '';
        return String(value).replace(/[^\d.\-]/g, '');
    }

    /**
     * Format a number with thousand separators
     * @param {number|string} value
     * @param {number} decimals - Number of decimal places
     * @returns {string}
     */
    function formatWithCommas(value, decimals = 0) {
        const num = parseFloat(value);
        if (isNaN(num)) return '';

        const parts = num.toFixed(decimals).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }

    /**
     * Remove formatting characters from a value
     * @param {string} value
     * @param {string[]} chars - Characters to remove
     * @returns {string}
     */
    function stripChars(value, chars) {
        if (!value) return '';
        let result = value;
        chars.forEach(char => {
            result = result.split(char).join('');
        });
        return result;
    }

    /**
     * Validate email format
     * @param {string} value
     * @returns {boolean}
     */
    function isValidEmail(value) {
        if (!value) return true; // Empty is valid (required check is separate)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
    }

    /**
     * Validate URL format
     * @param {string} value
     * @returns {boolean}
     */
    function isValidUrl(value) {
        if (!value) return true;
        try {
            // Add protocol if missing
            const urlToTest = value.match(/^https?:\/\//) ? value : `https://${value}`;
            new URL(urlToTest);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate hex color code
     * @param {string} value
     * @returns {boolean}
     */
    function isValidHexColor(value) {
        if (!value) return true;
        return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
    }

    /**
     * Check if value is within a numeric range
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {boolean}
     */
    function isInRange(value, min, max) {
        const num = parseFloat(value);
        if (isNaN(num)) return false;
        return num >= min && num <= max;
    }

    // ========================================
    // ERROR MESSAGE HELPERS
    // ========================================

    /**
     * Create an error message element
     * @param {string} message
     * @returns {HTMLElement}
     */
    function createErrorElement(message) {
        const el = document.createElement('div');
        el.className = 'formatted-input-error';
        el.textContent = message;
        return el;
    }

    /**
     * Show error message for an input
     * @param {HTMLInputElement} input
     * @param {string} message
     */
    function showError(input, message) {
        // Add invalid class
        input.classList.add('invalid');

        // Find or create wrapper
        const wrapper = input.closest('.formatted-input-wrapper') || input.parentElement;
        if (!wrapper) return;

        // Remove existing error
        const existing = wrapper.querySelector('.formatted-input-error');
        if (existing) {
            existing.textContent = message;
            return;
        }

        // Add new error element
        wrapper.appendChild(createErrorElement(message));
    }

    /**
     * Clear error message for an input
     * @param {HTMLInputElement} input
     */
    function clearError(input) {
        input.classList.remove('invalid');

        const wrapper = input.closest('.formatted-input-wrapper') || input.parentElement;
        if (!wrapper) return;

        const error = wrapper.querySelector('.formatted-input-error');
        if (error) {
            error.remove();
        }
    }

    // ========================================
    // DEBOUNCE UTILITY
    // ========================================

    /**
     * Debounce a function
     * @param {Function} fn
     * @param {number} delay
     * @returns {Function}
     */
    function debounce(fn, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // ========================================
    // EXPORT UTILITIES
    // ========================================

    Layer8DInputFormatter.utils = {
        // Cursor management
        getCursorPosition,
        setCursorPosition,
        calculateCursorPosition,

        // Input data management
        setInputData,
        getInputData,
        hasFormatter,
        removeInputData,

        // Validation helpers
        isDigitsOnly,
        extractDigits,
        extractNumeric,
        formatWithCommas,
        stripChars,
        isValidEmail,
        isValidUrl,
        isValidHexColor,
        isInRange,

        // Error handling
        createErrorElement,
        showError,
        clearError,

        // Utilities
        debounce
    };

})();
