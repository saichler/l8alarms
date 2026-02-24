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
 * Layer8 Form Factory - Generates form field definitions.
 * Fields: text, textarea, number, checkbox, date, select, reference, money,
 *         email, phone, url, ssn, ein, percentage, color, inlineTable
 * Presets: basicEntity, person, dateRange, address, contact, audit
 */
(function() {
    'use strict';

    window.Layer8FormFactory = {
        /**
         * Create a text field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @param {boolean} [required] - Whether required
         * @returns {Array} - Single field in array format
         */
        text: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'text'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a textarea field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @param {boolean} [required] - Whether required
         * @returns {Array} - Single field in array format
         */
        textarea: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'textarea'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a number field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @param {boolean} [required] - Whether required
         * @returns {Array} - Single field in array format
         */
        number: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'number'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a checkbox field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @returns {Array} - Single field in array format
         */
        checkbox: function(key, label) {
            return [{
                key: key,
                label: label || this._toTitleCase(key),
                type: 'checkbox'
            }];
        },

        /**
         * Create a toggle switch field (boolean, styled as sliding switch).
         */
        toggle: function(key, label) {
            return [{
                key: key,
                label: label || this._toTitleCase(key),
                type: 'toggle'
            }];
        },

        /**
         * Create a slider/range field.
         * @param {number} [min=0] - Minimum value
         * @param {number} [max=100] - Maximum value
         * @param {number} [step=1] - Step increment
         */
        slider: function(key, label, min, max, step) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'slider',
                min: min !== undefined ? min : 0,
                max: max !== undefined ? max : 100,
                step: step !== undefined ? step : 1
            };
            return [field];
        },

        /**
         * Create a date field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @param {boolean} [required] - Whether required
         * @returns {Array} - Single field in array format
         */
        date: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'date'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a select field with options from an enum.
         * @param {string} key - The field key
         * @param {string} label - The label
         * @param {Object} options - The enum options object
         * @param {boolean} [required] - Whether required
         * @returns {Array} - Single field in array format
         */
        select: function(key, label, options, required) {
            const field = {
                key: key,
                label: label,
                type: 'select',
                options: options
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a reference field (lookup).
         * @param {string} key - The field key
         * @param {string} label - The label
         * @param {string} lookupModel - The model to lookup
         * @param {boolean} [required] - Whether required
         * @returns {Array} - Single field in array format
         */
        reference: function(key, label, lookupModel, required) {
            const field = {
                key: key,
                label: label,
                type: 'reference',
                lookupModel: lookupModel
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a URL field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @returns {Array} - Single field in array format
         */
        url: function(key, label) {
            return [{
                key: key,
                label: label || this._toTitleCase(key),
                type: 'url'
            }];
        },

        /**
         * Create an email field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @param {boolean} [required] - Whether required
         * @returns {Array} - Single field in array format
         */
        email: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'email'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a phone field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @returns {Array} - Single field in array format
         */
        phone: function(key, label) {
            return [{
                key: key,
                label: label || this._toTitleCase(key),
                type: 'phone'
            }];
        },

        /**
         * Create an SSN field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @returns {Array} - Single field in array format
         */
        ssn: function(key, label) {
            return [{
                key: key,
                label: label || 'SSN',
                type: 'ssn'
            }];
        },

        /**
         * Create an EIN field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @returns {Array} - Single field in array format
         */
        ein: function(key, label) {
            return [{
                key: key,
                label: label || 'EIN',
                type: 'ein'
            }];
        },

        /**
         * Create a money/currency field.
         * @param {string} key - The field key
         * @param {string} [label] - Optional label
         * @param {boolean} [required] - Whether required
         * @returns {Array} - Single field in array format
         */
        money: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'money'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a percentage field (renders as number).
         */
        percentage: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'number'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a rating field (renders as number).
         */
        rating: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'number'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a routing number field (renders as text).
         */
        routingNumber: function(key, label, required) {
            const field = {
                key: key,
                label: label || 'Routing Number',
                type: 'text'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a color code field (renders as text).
         */
        colorCode: function(key, label) {
            return [{
                key: key,
                label: label || 'Color Code',
                type: 'text'
            }];
        },

        /**
         * Create a datetime field (renders as text input for datetime values).
         */
        datetime: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'text'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a time-of-day field (native time picker, HH:MM).
         */
        time: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'time'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create an hours field (renders as number).
         */
        hours: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'number'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create an inline table field for embedded child records.
         * Each column follows the same field definition shape as regular form fields.
         * @param {string} key - The field key (matches the repeated field name in protobuf)
         * @param {string} label - The table label
         * @param {Array} columns - Array of column definitions ({key, label, type, ...})
         * @param {boolean} [required] - Whether at least one row is required
         * @returns {Array} - Single field in array format
         */
        /**
         * Create a rich text editor field (stores HTML string).
         */
        richtext: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'richtext'
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a tags/chips input field (stores []string).
         */
        tags: function(key, label) {
            return [{
                key: key,
                label: label || this._toTitleCase(key),
                type: 'tags'
            }];
        },

        /**
         * Create a multi-select dropdown with checkboxes (stores []int or []string).
         */
        multiselect: function(key, label, options, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'multiselect',
                options: options
            };
            if (required) field.required = true;
            return [field];
        },

        /**
         * Create a period field (L8Period: type + year + value cascading dropdowns).
         * @param {string} key - The field key (maps to L8Period nested object)
         * @param {string} [label] - Optional label
         * @param {boolean} [required] - Whether required
         * @returns {Array} - Single field in array format
         */
        period: function(key, label, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'period'
            };
            if (required) field.required = true;
            return [field];
        },

        inlineTable: function(key, label, columns, required) {
            const field = {
                key: key,
                label: label || this._toTitleCase(key),
                type: 'inlineTable',
                columns: columns
            };
            if (required) field.required = true;
            return [field];
        },

        // Presets (basicEntity, dateRange, address, contact, audit, person)
        // and utilities (section, form, _toTitleCase) are in layer8-form-factory-presets.js
    };
})();
