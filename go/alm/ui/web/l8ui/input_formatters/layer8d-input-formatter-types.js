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
 * ERP Input Formatter - Type Definitions
 * Defines formatting rules for each field type
 *
 * Split files:
 * - layer8d-input-formatter-types-validators.js: SSN, Phone, Routing, EIN, Email, URL, Color
 */
(function() {
    'use strict';

    const { utils } = Layer8DInputFormatter;

    // Import validator types
    const validatorTypes = window.Layer8DInputFormatterValidators || {};

    // ========================================
    // NUMERIC TYPE DEFINITIONS
    // ========================================

    const NUMERIC_TYPES = {

        // ----------------------------------------
        // Currency: $X,XXX.XX (stored in cents)
        // ----------------------------------------
        currency: {
            symbol: '$',
            decimals: 2,

            format(cents, options = {}) {
                if (cents === null || cents === undefined || cents === '') return '';
                const { symbol = this.symbol, decimals = this.decimals } = options;

                const dollars = Number(cents) / Math.pow(10, decimals);
                if (isNaN(dollars)) return '';

                const formatted = utils.formatWithCommas(dollars, decimals);
                return symbol + formatted;
            },

            parse(formatted) {
                if (!formatted) return null;
                const cleaned = formatted.replace(/[^0-9.\-]/g, '');
                const num = parseFloat(cleaned);
                if (isNaN(num)) return null;
                return Math.round(num * Math.pow(10, this.decimals));
            },

            validate(cents, options = {}) {
                const errors = [];

                if (cents === null || cents === undefined || cents === '') {
                    return { valid: true, errors: [] };
                }

                const num = Number(cents);
                if (isNaN(num)) {
                    errors.push('Invalid currency value');
                }

                if (options.min !== undefined && num < options.min) {
                    errors.push(`Amount must be at least ${this.format(options.min)}`);
                }

                if (options.max !== undefined && num > options.max) {
                    errors.push(`Amount cannot exceed ${this.format(options.max)}`);
                }

                return { valid: errors.length === 0, errors };
            },

            formatDisplay(value, currencyCode) {
                return this.format(value, { symbol: currencyCode || this.symbol });
            }
        },

        // ----------------------------------------
        // Percentage: XX.XX%
        // ----------------------------------------
        percentage: {
            decimals: 2,

            format(value, options = {}) {
                if (value === null || value === undefined || value === '') return '';
                const { decimals = this.decimals } = options;

                const num = parseFloat(value);
                if (isNaN(num)) return '';

                return num.toFixed(decimals) + '%';
            },

            parse(formatted) {
                if (!formatted) return null;
                const cleaned = formatted.replace(/[^0-9.\-]/g, '');
                const num = parseFloat(cleaned);
                return isNaN(num) ? null : num;
            },

            validate(value, options = {}) {
                const errors = [];
                const { min = 0, max = 100 } = options;

                if (value === null || value === undefined || value === '') {
                    return { valid: true, errors: [] };
                }

                const num = parseFloat(value);
                if (isNaN(num)) {
                    errors.push('Invalid percentage value');
                    return { valid: false, errors };
                }

                if (num < min) {
                    errors.push(`Percentage must be at least ${min}%`);
                }

                if (num > max) {
                    errors.push(`Percentage cannot exceed ${max}%`);
                }

                return { valid: errors.length === 0, errors };
            },

            formatDisplay(value, decimals) {
                return this.format(value, { decimals: decimals || this.decimals });
            }
        },

        // ----------------------------------------
        // Rating (1-5)
        // ----------------------------------------
        rating: {
            min: 1,
            max: 5,

            format(raw) {
                if (raw === null || raw === undefined || raw === '') return '';
                const num = parseInt(raw, 10);
                if (isNaN(num)) return '';
                return String(Math.min(Math.max(num, this.min), this.max));
            },

            parse(formatted) {
                const num = parseInt(formatted, 10);
                return isNaN(num) ? null : num;
            },

            validate(value, options = {}) {
                const errors = [];
                const min = options.min || this.min;
                const max = options.max || this.max;

                if (value === null || value === undefined || value === '') {
                    return { valid: true, errors: [] };
                }

                const num = parseInt(value, 10);
                if (isNaN(num)) {
                    errors.push('Invalid rating value');
                    return { valid: false, errors };
                }

                if (num < min || num > max) {
                    errors.push(`Rating must be between ${min} and ${max}`);
                }

                return { valid: errors.length === 0, errors };
            },

            formatDisplay(value) {
                return this.format(value);
            }
        },

        // ----------------------------------------
        // Hours (duration in HH:MM format)
        // ----------------------------------------
        hours: {
            format(raw) {
                if (raw === null || raw === undefined || raw === '') return '';

                if (typeof raw === 'number' || !isNaN(raw)) {
                    const totalMinutes = parseInt(raw, 10);
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    return `${hours}:${String(minutes).padStart(2, '0')}`;
                }

                return raw;
            },

            parse(formatted) {
                if (!formatted) return null;

                const match = formatted.match(/^(\d+):(\d{2})$/);
                if (match) {
                    const hours = parseInt(match[1], 10);
                    const minutes = parseInt(match[2], 10);
                    return hours * 60 + minutes;
                }

                const num = parseFloat(formatted);
                return isNaN(num) ? null : Math.round(num * 60);
            },

            validate(value) {
                const errors = [];

                if (value === null || value === undefined || value === '') {
                    return { valid: true, errors: [] };
                }

                if (typeof value === 'string' && value.includes(':')) {
                    const match = value.match(/^(\d+):(\d{2})$/);
                    if (!match) {
                        errors.push('Invalid time format (use HH:MM)');
                    } else {
                        const minutes = parseInt(match[2], 10);
                        if (minutes > 59) {
                            errors.push('Minutes must be 0-59');
                        }
                    }
                }

                return { valid: errors.length === 0, errors };
            },

            formatDisplay(value) {
                return this.format(value);
            }
        }
    };

    // ========================================
    // MERGE ALL TYPES
    // ========================================

    const FORMATTER_TYPES = {
        ...validatorTypes,
        ...NUMERIC_TYPES
    };

    // ========================================
    // TYPE REGISTRY HELPERS
    // ========================================

    function getType(typeName) {
        return FORMATTER_TYPES[typeName] || null;
    }

    function hasType(typeName) {
        return typeName in FORMATTER_TYPES;
    }

    function registerType(typeName, config) {
        if (FORMATTER_TYPES[typeName]) {
            console.warn(`Overwriting existing formatter type: ${typeName}`);
        }
        FORMATTER_TYPES[typeName] = config;
    }

    function getTypeNames() {
        return Object.keys(FORMATTER_TYPES);
    }

    // ========================================
    // EXPORT
    // ========================================

    Layer8DInputFormatter.types = FORMATTER_TYPES;
    Layer8DInputFormatter.getType = getType;
    Layer8DInputFormatter.hasType = hasType;
    Layer8DInputFormatter.registerType = registerType;
    Layer8DInputFormatter.getTypeNames = getTypeNames;

})();
