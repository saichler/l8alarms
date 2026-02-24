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
 * ERP Input Formatter - Masking Engine
 * Pattern matching and live formatting for masked inputs
 */
(function() {
    'use strict';

    const { utils } = Layer8DInputFormatter;

    // ========================================
    // MASK PATTERN ENGINE
    // ========================================

    /**
     * Apply a mask pattern to a value
     * Mask characters:
     *   # - digit (0-9)
     *   A - letter (a-z, A-Z)
     *   * - alphanumeric (digit or letter)
     *   Other characters are literal mask characters
     *
     * @param {string} value - Raw value (digits/letters only)
     * @param {string} mask - Mask pattern (e.g., '###-##-####')
     * @param {Object} options
     * @returns {string} - Formatted value
     */
    function applyMask(value, mask, options = {}) {
        if (!value || !mask) return value || '';

        const { partial = true } = options;
        let result = '';
        let valueIndex = 0;

        for (let i = 0; i < mask.length && valueIndex < value.length; i++) {
            const maskChar = mask[i];

            if (maskChar === '#') {
                // Digit expected
                if (/\d/.test(value[valueIndex])) {
                    result += value[valueIndex];
                    valueIndex++;
                } else {
                    valueIndex++; // Skip non-digit
                    i--; // Retry same mask position
                }
            } else if (maskChar === 'A') {
                // Letter expected
                if (/[a-zA-Z]/.test(value[valueIndex])) {
                    result += value[valueIndex];
                    valueIndex++;
                } else {
                    valueIndex++;
                    i--;
                }
            } else if (maskChar === '*') {
                // Alphanumeric expected
                if (/[a-zA-Z0-9]/.test(value[valueIndex])) {
                    result += value[valueIndex];
                    valueIndex++;
                } else {
                    valueIndex++;
                    i--;
                }
            } else {
                // Literal mask character
                result += maskChar;
            }
        }

        // If partial formatting is disabled, pad with placeholders
        if (!partial && result.length < mask.length) {
            // This would show placeholder characters, but typically we want partial
        }

        return result;
    }

    /**
     * Remove mask characters from a formatted value, keeping only raw input
     * @param {string} formattedValue
     * @param {string} mask
     * @returns {string}
     */
    function removeMask(formattedValue, mask) {
        if (!formattedValue || !mask) return formattedValue || '';

        let result = '';
        const maskChars = getMaskLiteralChars(mask);

        for (let i = 0; i < formattedValue.length; i++) {
            const char = formattedValue[i];
            if (!maskChars.includes(char)) {
                result += char;
            }
        }

        return result;
    }

    /**
     * Get all literal (non-placeholder) characters from a mask
     * @param {string} mask
     * @returns {string} - String of literal characters
     */
    function getMaskLiteralChars(mask) {
        let literals = '';
        for (let i = 0; i < mask.length; i++) {
            const char = mask[i];
            if (char !== '#' && char !== 'A' && char !== '*') {
                if (!literals.includes(char)) {
                    literals += char;
                }
            }
        }
        return literals;
    }

    /**
     * Get the expected raw value length from a mask
     * @param {string} mask
     * @returns {number}
     */
    function getMaskRawLength(mask) {
        let count = 0;
        for (let i = 0; i < mask.length; i++) {
            if ('#A*'.includes(mask[i])) {
                count++;
            }
        }
        return count;
    }

    /**
     * Check if a value matches a mask pattern completely
     * @param {string} value - Raw value
     * @param {string} mask
     * @returns {boolean}
     */
    function matchesMask(value, mask) {
        const rawLength = getMaskRawLength(mask);
        const digits = utils.extractDigits(value);
        return digits.length === rawLength;
    }

    // ========================================
    // LIVE FORMATTING HANDLER
    // ========================================

    /**
     * Create an input handler for mask-based formatting
     * @param {string} mask - The mask pattern
     * @param {Object} typeConfig - Type configuration with format/parse functions
     * @returns {Function} - Event handler
     */
    function createMaskHandler(mask, typeConfig) {
        const literals = getMaskLiteralChars(mask);

        return function(event) {
            const input = event.target;
            const oldValue = input.value;
            const oldPosition = utils.getCursorPosition(input);

            // Get raw value (digits only for most masks)
            let rawValue;
            if (typeConfig.extractRaw) {
                rawValue = typeConfig.extractRaw(oldValue);
            } else {
                rawValue = utils.extractDigits(oldValue);
            }

            // Apply mask
            const newValue = applyMask(rawValue, mask);

            // Only update if value changed
            if (newValue !== oldValue) {
                input.value = newValue;

                // Calculate and set new cursor position
                const newPosition = utils.calculateCursorPosition(
                    oldValue,
                    newValue,
                    oldPosition,
                    literals
                );
                utils.setCursorPosition(input, newPosition);
            }

            // Store raw value in data attribute
            input.dataset.rawValue = rawValue;
        };
    }

    /**
     * Create a keydown handler that improves UX for masked inputs
     * @param {string} mask
     * @returns {Function}
     */
    function createMaskKeydownHandler(mask) {
        const literals = getMaskLiteralChars(mask);

        return function(event) {
            const input = event.target;
            const position = utils.getCursorPosition(input);

            // Handle backspace - skip over literal characters
            if (event.key === 'Backspace' && position > 0) {
                const prevChar = input.value[position - 1];
                if (literals.includes(prevChar)) {
                    // Skip over literal character
                    event.preventDefault();
                    utils.setCursorPosition(input, position - 1);
                }
            }

            // Handle delete - skip over literal characters
            if (event.key === 'Delete') {
                const nextChar = input.value[position];
                if (nextChar && literals.includes(nextChar)) {
                    event.preventDefault();
                    utils.setCursorPosition(input, position + 1);
                }
            }
        };
    }

    // ========================================
    // NUMERIC INPUT HANDLING
    // ========================================

    /**
     * Create an input handler for currency formatting
     * @param {Object} options
     * @returns {Function}
     */
    function createCurrencyHandler(options = {}) {
        const {
            symbol = '$',
            decimals = 2,
            allowNegative = false
        } = options;

        return function(event) {
            const input = event.target;
            const oldValue = input.value;
            const oldPosition = utils.getCursorPosition(input);

            // Remove all formatting
            let rawValue = oldValue.replace(/[^0-9.\-]/g, '');

            // Handle multiple decimal points - keep only first
            const decimalIndex = rawValue.indexOf('.');
            if (decimalIndex !== -1) {
                rawValue = rawValue.substring(0, decimalIndex + 1) +
                           rawValue.substring(decimalIndex + 1).replace(/\./g, '');
            }

            // Handle negative sign
            if (!allowNegative) {
                rawValue = rawValue.replace(/-/g, '');
            } else {
                // Keep only leading negative
                const isNegative = rawValue.startsWith('-');
                rawValue = rawValue.replace(/-/g, '');
                if (isNegative) rawValue = '-' + rawValue;
            }

            // Limit decimal places during input
            const parts = rawValue.split('.');
            if (parts[1] && parts[1].length > decimals) {
                parts[1] = parts[1].substring(0, decimals);
                rawValue = parts.join('.');
            }

            // Format with commas
            let formattedValue = '';
            if (rawValue !== '' && rawValue !== '-') {
                const num = parseFloat(rawValue);
                if (!isNaN(num)) {
                    const formatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                    formattedValue = symbol + formatted;
                    if (parts[1] !== undefined) {
                        formattedValue += '.' + parts[1];
                    }
                } else {
                    formattedValue = rawValue;
                }
            }

            if (formattedValue !== oldValue) {
                input.value = formattedValue;

                // Adjust cursor position
                const newPosition = utils.calculateCursorPosition(
                    oldValue,
                    formattedValue,
                    oldPosition,
                    ',$' + symbol
                );
                utils.setCursorPosition(input, newPosition);
            }

            // Store cents value
            const cents = parseCurrencyToCents(formattedValue, decimals);
            input.dataset.rawValue = cents;
        };
    }

    /**
     * Parse currency string to cents
     * @param {string} value
     * @param {number} decimals
     * @returns {number}
     */
    function parseCurrencyToCents(value, decimals = 2) {
        if (!value) return 0;
        const cleaned = value.replace(/[^0-9.\-]/g, '');
        const num = parseFloat(cleaned);
        if (isNaN(num)) return 0;
        return Math.round(num * Math.pow(10, decimals));
    }

    /**
     * Create an input handler for percentage formatting
     * @param {Object} options
     * @returns {Function}
     */
    function createPercentageHandler(options = {}) {
        const {
            decimals = 2,
            min = 0,
            max = 100
        } = options;

        return function(event) {
            const input = event.target;
            const oldValue = input.value;
            const oldPosition = utils.getCursorPosition(input);

            // Remove % and other non-numeric chars
            let rawValue = oldValue.replace(/[^0-9.\-]/g, '');

            // Handle multiple decimal points
            const decimalIndex = rawValue.indexOf('.');
            if (decimalIndex !== -1) {
                rawValue = rawValue.substring(0, decimalIndex + 1) +
                           rawValue.substring(decimalIndex + 1).replace(/\./g, '');
            }

            // Limit decimal places
            const parts = rawValue.split('.');
            if (parts[1] && parts[1].length > decimals) {
                parts[1] = parts[1].substring(0, decimals);
                rawValue = parts.join('.');
            }

            // Format with % symbol
            let formattedValue = '';
            if (rawValue !== '' && rawValue !== '-') {
                formattedValue = rawValue + '%';
            }

            if (formattedValue !== oldValue) {
                input.value = formattedValue;

                // Position cursor before %
                const newPosition = Math.min(oldPosition, formattedValue.length - 1);
                utils.setCursorPosition(input, Math.max(0, newPosition));
            }

            // Store numeric value
            input.dataset.rawValue = rawValue;
        };
    }

    // ========================================
    // EXPORT
    // ========================================

    Layer8DInputFormatter.masks = {
        applyMask,
        removeMask,
        getMaskLiteralChars,
        getMaskRawLength,
        matchesMask,
        createMaskHandler,
        createMaskKeydownHandler,
        createCurrencyHandler,
        createPercentageHandler,
        parseCurrencyToCents
    };

})();
