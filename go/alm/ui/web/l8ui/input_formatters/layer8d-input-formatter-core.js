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
 * ERP Input Formatter - Core API
 * Main functions for attaching/detaching formatters to inputs
 */
(function() {
    'use strict';

    const { utils, masks, getType, hasType } = Layer8DInputFormatter;

    // ========================================
    // ATTACH FORMATTER
    // ========================================

    /**
     * Attach a formatter to an input element
     * @param {HTMLInputElement} input - The input element
     * @param {string} type - Formatter type (ssn, phone, currency, etc.)
     * @param {Object} options - Additional options for the formatter
     * @returns {boolean} - Success status
     */
    function attach(input, type, options = {}) {
        if (!input || !(input instanceof HTMLElement)) {
            console.error('Layer8DInputFormatter.attach: Invalid input element');
            return false;
        }

        if (!hasType(type)) {
            console.error(`Layer8DInputFormatter.attach: Unknown type "${type}"`);
            return false;
        }

        // Don't attach twice
        if (utils.hasFormatter(input)) {
            console.warn('Layer8DInputFormatter.attach: Input already has a formatter attached');
            return false;
        }

        const typeConfig = getType(type);
        const handlers = createEventHandlers(input, type, typeConfig, options);

        // Store formatter data
        utils.setInputData(input, {
            type,
            options,
            typeConfig,
            handlers
        });

        // Add event listeners
        Object.entries(handlers).forEach(([event, handler]) => {
            input.addEventListener(event, handler);
        });

        // Add CSS classes
        input.classList.add('formatted-input', `formatted-input-${type}`);

        // Set placeholder if available
        if (typeConfig.placeholder && !input.placeholder) {
            input.placeholder = typeConfig.placeholder;
        }

        // Format initial value
        if (input.value) {
            formatInputValue(input, typeConfig, options);
        }

        return true;
    }

    /**
     * Create event handlers for a formatter type
     * @param {HTMLInputElement} input
     * @param {string} type
     * @param {Object} typeConfig
     * @param {Object} options
     * @returns {Object} - Map of event name to handler
     */
    function createEventHandlers(input, type, typeConfig, options) {
        const handlers = {};

        // Determine which handler to use based on type
        if (typeConfig.mask) {
            // Mask-based formatter (SSN, phone, EIN, etc.)
            handlers.input = masks.createMaskHandler(typeConfig.mask, typeConfig);
            handlers.keydown = masks.createMaskKeydownHandler(typeConfig.mask);
        } else if (type === 'currency') {
            handlers.input = masks.createCurrencyHandler({
                symbol: options.symbol || typeConfig.symbol,
                decimals: options.decimals !== undefined ? options.decimals : typeConfig.decimals,
                allowNegative: options.allowNegative || false
            });
            handlers.blur = createBlurHandler(typeConfig, options);
        } else if (type === 'percentage') {
            handlers.input = masks.createPercentageHandler({
                decimals: options.decimals !== undefined ? options.decimals : typeConfig.decimals,
                min: options.min,
                max: options.max
            });
            handlers.blur = createBlurHandler(typeConfig, options);
        } else {
            // Generic input handler for email, url, etc.
            handlers.input = createGenericInputHandler(typeConfig, options);
            handlers.blur = createBlurHandler(typeConfig, options);
        }

        // Add focus handler for all types
        handlers.focus = createFocusHandler(typeConfig, options);

        return handlers;
    }

    /**
     * Create a generic input handler
     * @param {Object} typeConfig
     * @param {Object} options
     * @returns {Function}
     */
    function createGenericInputHandler(typeConfig, options) {
        return function(event) {
            const input = event.target;
            // For non-masked types, just store raw value
            input.dataset.rawValue = typeConfig.parse
                ? typeConfig.parse(input.value)
                : input.value;
        };
    }

    /**
     * Create a focus handler
     * @param {Object} typeConfig
     * @param {Object} options
     * @returns {Function}
     */
    function createFocusHandler(typeConfig, options) {
        return function(event) {
            const input = event.target;
            // Clear any error styling on focus
            utils.clearError(input);
        };
    }

    /**
     * Create a blur handler for formatting and validation
     * @param {Object} typeConfig
     * @param {Object} options
     * @returns {Function}
     */
    function createBlurHandler(typeConfig, options) {
        return function(event) {
            const input = event.target;

            // Get raw value
            let rawValue = input.dataset.rawValue;
            if (rawValue === undefined || rawValue === null) {
                rawValue = typeConfig.parse ? typeConfig.parse(input.value) : input.value;
            }

            // Format the value
            if (typeConfig.format && rawValue !== '' && rawValue !== null) {
                const formatted = typeConfig.format(rawValue, options);
                if (formatted !== input.value) {
                    input.value = formatted;
                }
            }

            // Validate if needed
            if (options.validateOnBlur !== false && typeConfig.validate) {
                const result = typeConfig.validate(rawValue, options);
                if (!result.valid) {
                    utils.showError(input, result.errors[0]);
                } else {
                    utils.clearError(input);
                }
            }
        };
    }

    /**
     * Format the current input value
     * @param {HTMLInputElement} input
     * @param {Object} typeConfig
     */
    function formatInputValue(input, typeConfig, options = {}) {
        const raw = typeConfig.parse ? typeConfig.parse(input.value) : input.value;
        if (raw !== null && raw !== '') {
            const formatted = typeConfig.format(raw, options);
            input.value = formatted;
            input.dataset.rawValue = raw;
        }
    }

    // ========================================
    // DETACH FORMATTER
    // ========================================

    /**
     * Detach a formatter from an input element
     * @param {HTMLInputElement} input
     * @returns {boolean} - Success status
     */
    function detach(input) {
        if (!input) return false;

        const data = utils.getInputData(input);
        if (!data) return false;

        // Remove event listeners
        if (data.handlers) {
            Object.entries(data.handlers).forEach(([event, handler]) => {
                input.removeEventListener(event, handler);
            });
        }

        // Remove CSS classes
        input.classList.remove('formatted-input', `formatted-input-${data.type}`);

        // Clear error styling
        utils.clearError(input);

        // Remove data
        utils.removeInputData(input);

        // Remove data attributes
        delete input.dataset.rawValue;

        return true;
    }

    // ========================================
    // GET/SET VALUE
    // ========================================

    /**
     * Get the raw (parsed) value of a formatted input
     * @param {HTMLInputElement} input
     * @returns {*} - Raw value
     */
    function getValue(input) {
        if (!input) return null;

        const data = utils.getInputData(input);
        if (!data) {
            // Not a formatted input, return raw value
            return input.value;
        }

        // Try to get from data attribute first (more reliable)
        if (input.dataset.rawValue !== undefined) {
            const rawValue = input.dataset.rawValue;
            // Convert to number if appropriate
            if (data.type === 'currency' || data.type === 'rating') {
                const num = parseInt(rawValue, 10);
                return isNaN(num) ? rawValue : num;
            }
            if (data.type === 'percentage') {
                const num = parseFloat(rawValue);
                return isNaN(num) ? rawValue : num;
            }
            return rawValue;
        }

        // Parse from displayed value
        const typeConfig = data.typeConfig;
        if (typeConfig && typeConfig.parse) {
            return typeConfig.parse(input.value);
        }

        return input.value;
    }

    /**
     * Set the value of a formatted input programmatically
     * @param {HTMLInputElement} input
     * @param {*} value - Raw value to set
     * @returns {boolean} - Success status
     */
    function setValue(input, value) {
        if (!input) return false;

        const data = utils.getInputData(input);

        if (!data) {
            // Not a formatted input, just set value
            input.value = value || '';
            return true;
        }

        const typeConfig = data.typeConfig;

        // Store raw value
        input.dataset.rawValue = value !== null && value !== undefined ? String(value) : '';

        // Format and display
        if (typeConfig && typeConfig.format) {
            input.value = typeConfig.format(value, data.options);
        } else {
            input.value = value || '';
        }

        return true;
    }

    // ========================================
    // VALIDATION
    // ========================================

    /**
     * Validate a formatted input
     * @param {HTMLInputElement} input
     * @returns {Object} - { valid: boolean, errors: string[] }
     */
    function validate(input) {
        if (!input) {
            return { valid: false, errors: ['Invalid input element'] };
        }

        const data = utils.getInputData(input);
        if (!data) {
            // Not a formatted input
            return { valid: true, errors: [] };
        }

        const typeConfig = data.typeConfig;
        if (!typeConfig || !typeConfig.validate) {
            return { valid: true, errors: [] };
        }

        const rawValue = getValue(input);
        const result = typeConfig.validate(rawValue, data.options);

        // Update error display
        if (!result.valid) {
            utils.showError(input, result.errors[0]);
        } else {
            utils.clearError(input);
        }

        return result;
    }

    /**
     * Validate all formatted inputs within a container
     * @param {HTMLElement} container
     * @returns {Object} - { valid: boolean, errors: { field: string, errors: string[] }[] }
     */
    function validateAll(container) {
        const inputs = container.querySelectorAll('.formatted-input');
        const allErrors = [];
        let allValid = true;

        inputs.forEach(input => {
            const result = validate(input);
            if (!result.valid) {
                allValid = false;
                allErrors.push({
                    field: input.name || input.id,
                    errors: result.errors
                });
            }
        });

        return { valid: allValid, errors: allErrors };
    }

    // ========================================
    // DISPLAY FORMATTERS (for tables/views)
    // ========================================

    /**
     * Display formatters for use in tables and read-only views
     */
    const format = {
        ssn(value, masked = true) {
            const type = getType('ssn');
            return type ? type.formatDisplay(value, masked) : value;
        },

        phone(value) {
            const type = getType('phone');
            return type ? type.formatDisplay(value) : value;
        },

        currency(value, currency) {
            const type = getType('currency');
            return type ? type.formatDisplay(value, currency) : value;
        },

        percentage(value, decimals) {
            const type = getType('percentage');
            return type ? type.formatDisplay(value, decimals) : value;
        },

        ein(value) {
            const type = getType('ein');
            return type ? type.formatDisplay(value) : value;
        },

        routingNumber(value) {
            const type = getType('routingNumber');
            return type ? type.formatDisplay(value) : value;
        },

        email(value) {
            const type = getType('email');
            return type ? type.formatDisplay(value) : value;
        },

        url(value) {
            const type = getType('url');
            return type ? type.formatDisplay(value) : value;
        },

        colorCode(value) {
            const type = getType('colorCode');
            return type ? type.formatDisplay(value) : value;
        },

        rating(value) {
            const type = getType('rating');
            return type ? type.formatDisplay(value) : value;
        },

        hours(value) {
            const type = getType('hours');
            return type ? type.formatDisplay(value) : value;
        }
    };

    // ========================================
    // EXPORT CORE API
    // ========================================

    Object.assign(Layer8DInputFormatter, {
        attach,
        detach,
        getValue,
        setValue,
        validate,
        validateAll,
        format
    });

})();
