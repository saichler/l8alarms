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
 * Layer8MRenderers - Shared rendering utilities for mobile HCM
 * Desktop Equivalent: shared/erp-renderers.js
 * REUSES Layer8MUtils formatting functions
 */
(function() {
    'use strict';

    window.Layer8MRenderers = {
        /**
         * Render enum value from map
         * @param {number|string} value - The enum value
         * @param {Object} enumMap - Map of value to label
         * @returns {string} The label or 'Unknown'
         */
        renderEnum(value, enumMap) {
            if (value === null || value === undefined) return '-';
            return enumMap[value] || 'Unknown';
        },

        /**
         * Create a status renderer with CSS class mapping
         * @param {Object} enumMap - Map of value to label
         * @param {Object} classMap - Map of value to CSS class
         * @returns {Function} Renderer function
         */
        createStatusRenderer(enumMap, classMap) {
            return function(value) {
                if (value === null || value === undefined) return '-';
                const label = enumMap[value] || 'Unknown';
                const cssClass = classMap[value] || 'mobile-status-default';
                return `<span class="status-badge ${cssClass}">${Layer8MUtils.escapeHtml(label)}</span>`;
            };
        },

        /**
         * Render boolean as Yes/No or custom text
         * @param {boolean|number} value - The value
         * @param {Object} opts - Options: trueText, falseText
         * @returns {string} Formatted text
         */
        renderBoolean(value, opts = {}) {
            const trueText = opts.trueText || 'Yes';
            const falseText = opts.falseText || 'No';
            if (value === null || value === undefined) return '-';
            return value ? trueText : falseText;
        },

        /**
         * Render date - delegates to Layer8MUtils
         */
        renderDate(timestamp) {
            return Layer8MUtils.formatDate(timestamp);
        },

        /**
         * Render datetime - delegates to Layer8MUtils
         */
        renderDateTime(timestamp) {
            return Layer8MUtils.formatDateTime(timestamp);
        },

        /**
         * Render money - delegates to Layer8MUtils
         */
        renderMoney(cents, currency) {
            return Layer8MUtils.formatMoney(cents, currency);
        },

        /**
         * Render percentage - delegates to Layer8MUtils
         */
        renderPercentage(decimal) {
            return Layer8MUtils.formatPercentage(decimal);
        },

        /**
         * Render phone - delegates to Layer8MUtils
         */
        renderPhone(phone) {
            return Layer8MUtils.formatPhone(phone);
        },

        /**
         * Render SSN (masked) - delegates to Layer8MUtils
         */
        renderSSN(ssn) {
            return Layer8MUtils.formatSSN(ssn);
        },

        /**
         * Render hours with unit
         * @param {number} hours - Hours value
         * @returns {string} Formatted hours
         */
        renderHours(hours) {
            if (hours === null || hours === undefined) return '-';
            return `${Number(hours).toFixed(2)} hrs`;
        },

        /**
         * Render time period (start - end dates)
         * @param {Object} period - Object with startDate and endDate timestamps
         * @returns {string} Formatted period
         */
        renderPeriod(period) {
            if (!period) return '-';
            const start = period.startDate ? Layer8MUtils.formatDate(period.startDate) : '?';
            const end = period.endDate ? Layer8MUtils.formatDate(period.endDate) : '?';
            return `${start} - ${end}`;
        },

        /**
         * Render an L8Period object as human-readable text.
         * Yearly: "2025"  Quarterly: "2025 / Q2"  Monthly: "2025 / February"
         */
        renderL8Period(value) {
            if (!value || typeof value !== 'object') return '-';
            const NAMES = {
                1: 'January', 2: 'February', 3: 'March', 4: 'April',
                5: 'May', 6: 'June', 7: 'July', 8: 'August',
                9: 'September', 10: 'October', 11: 'November', 12: 'December',
                13: 'Q1', 14: 'Q2', 15: 'Q3', 16: 'Q4'
            };
            const year = value.periodYear;
            if (!year) return '-';
            if (value.periodType === 1) return String(year); // Yearly
            const valName = NAMES[value.periodValue];
            return valName ? `${year} / ${valName}` : String(year);
        },

        /**
         * Render rating (e.g., 4/5)
         * @param {number} rating - Rating value
         * @param {number} maxRating - Maximum rating (default 5)
         * @returns {string} Formatted rating
         */
        renderRating(rating, maxRating = 5) {
            if (rating === null || rating === undefined) return '-';
            return `${rating}/${maxRating}`;
        },

        /**
         * Render progress percentage
         * @param {number} value - Progress value (0-100 or 0-1)
         * @returns {string} Formatted percentage
         */
        renderProgress(value) {
            if (value === null || value === undefined) return '-';
            // If value is decimal, convert to percentage
            const percent = value <= 1 ? value * 100 : value;
            return `${percent.toFixed(0)}%`;
        },

        /**
         * Render priority with color
         * @param {number} priority - Priority value
         * @param {Object} priorityMap - Map of value to label
         * @returns {string} Formatted priority with color
         */
        renderPriority(priority, priorityMap) {
            const priorityColors = {
                1: '#10b981',  // Low - green
                2: '#f59e0b',  // Medium - amber
                3: '#ef4444',  // High - red
                4: '#7c3aed'   // Critical - purple
            };
            const label = (priorityMap && priorityMap[priority]) || 'Unknown';
            const color = priorityColors[priority] || '#64748b';
            return `<span style="color: ${color}; font-weight: 500;">${Layer8MUtils.escapeHtml(label)}</span>`;
        },

        /**
         * Render risk level with color
         * @param {number} risk - Risk level value
         * @param {Object} riskMap - Map of value to label
         * @returns {string} Formatted risk with color
         */
        renderRisk(risk, riskMap) {
            return this.renderPriority(risk, riskMap);
        },

        /**
         * Render employee name
         * @param {Object} item - Item with firstName/lastName
         * @returns {string} Formatted name
         */
        renderEmployeeName(item) {
            if (!item) return '-';
            const name = `${item.firstName || ''} ${item.lastName || ''}`.trim();
            return Layer8MUtils.escapeHtml(name) || '-';
        },

        /**
         * Render minutes as human readable duration
         * @param {number} minutes - Duration in minutes
         * @returns {string} Formatted duration
         */
        renderMinutes(minutes) {
            if (minutes === null || minutes === undefined) return '-';
            if (minutes < 60) return `${minutes} min`;
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        },

        /**
         * Render a count (e.g., "3/5" for filled/total)
         * @param {number} filled - Filled count
         * @param {number} total - Total count
         * @returns {string} Formatted count
         */
        renderCount(filled, total) {
            const f = filled ?? 0;
            const t = total ?? 0;
            return `${f}/${t}`;
        },

        /**
         * Render file size in human-readable format
         * @param {number} bytes - File size in bytes
         * @returns {string} Formatted file size
         */
        renderFileSize(bytes) {
            if (bytes === null || bytes === undefined || bytes === 0) return '-';

            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            let unitIndex = 0;
            let size = bytes;

            while (size >= 1024 && unitIndex < units.length - 1) {
                size /= 1024;
                unitIndex++;
            }

            return size.toFixed(unitIndex === 0 ? 0 : 1) + ' ' + units[unitIndex];
        }
    };

})();
