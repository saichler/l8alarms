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
 * Layer8MUtils - Utility functions for ERP mobile app
 * Desktop Equivalent: erp-utils.js patterns
 */
(function() {
    'use strict';

    window.Layer8MUtils = {
        /**
         * Check if device supports touch
         */
        isTouchDevice() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        },

        /**
         * Debounce function
         */
        debounce(fn, delay = 300) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => fn.apply(this, args), delay);
            };
        },

        /**
         * Throttle function
         */
        throttle(fn, limit = 100) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    fn.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * Format date from Unix timestamp (seconds)
         */
        formatDate(timestamp) {
            if (!timestamp || timestamp === 0) return 'N/A';
            const date = new Date(timestamp * 1000);
            return date.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            });
        },

        /**
         * Format datetime from Unix timestamp
         */
        formatDateTime(timestamp) {
            if (!timestamp || timestamp === 0) return 'N/A';
            const date = new Date(timestamp * 1000);
            return date.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        /**
         * Format money (stored in cents)
         */
        formatMoney(value, currency = 'USD') {
            if (value == null) return '-';
            let cents = value;
            let currCode = currency;
            // Handle Money object {amount, currencyId}
            if (typeof value === 'object' && value !== null) {
                cents = value.amount;
                if (value.currencyId && window.Layer8DUtils && window.Layer8DUtils.getCurrencyCode) {
                    currCode = window.Layer8DUtils.getCurrencyCode(value.currencyId) || currency;
                } else if (value.currencyCode) {
                    currCode = value.currencyCode;
                }
            }
            if (cents == null) return '-';
            const dollars = cents / 100;
            try {
                return new Intl.NumberFormat('en-US', { style: 'currency', currency: currCode }).format(dollars);
            } catch (e) {
                return '$' + dollars.toFixed(2);
            }
        },

        /**
         * Format percentage (stored as decimal)
         */
        formatPercentage(decimal) {
            if (decimal == null) return '';
            return (decimal * 100).toFixed(2) + '%';
        },

        /**
         * Format phone number
         */
        formatPhone(phone) {
            if (!phone) return '';
            const cleaned = String(phone).replace(/\D/g, '');
            if (cleaned.length === 10) {
                return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
            }
            return phone;
        },

        /**
         * Format SSN (last 4 only)
         */
        formatSSN(ssn) {
            if (!ssn) return '';
            const cleaned = String(ssn).replace(/\D/g, '');
            if (cleaned.length >= 4) {
                return 'XXX-XX-' + cleaned.slice(-4);
            }
            return ssn;
        },

        /**
         * Escape HTML for safe rendering
         */
        escapeHtml(text) {
            if (text == null) return '';
            const div = document.createElement('div');
            div.textContent = String(text);
            return div.innerHTML;
        },

        /**
         * Escape attribute value
         */
        escapeAttr(text) {
            if (text == null) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        },

        /**
         * Format label from camelCase
         */
        formatLabel(camelCase) {
            if (!camelCase) return '';
            return camelCase
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .trim();
        },

        /**
         * Get nested object value by path
         */
        getNestedValue(obj, path) {
            if (!path) return '';
            const keys = path.split('.');
            let value = obj;
            for (const key of keys) {
                if (value == null) return '';
                value = value[key];
            }
            return value ?? '';
        },

        /**
         * Show toast notification
         */
        showToast(message, type = 'info', duration = 3000) {
            // Remove existing toasts
            document.querySelectorAll('.mobile-toast').forEach(t => t.remove());

            const toast = document.createElement('div');
            toast.className = `mobile-toast mobile-toast-${type}`;
            toast.textContent = message;

            document.body.appendChild(toast);

            // Trigger animation
            requestAnimationFrame(() => toast.classList.add('show'));

            // Auto remove
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        },

        showSuccess(message) {
            this.showToast(message, 'success');
        },

        showError(message) {
            this.showToast(message, 'error', 5000);
        },

        showInfo(message) {
            this.showToast(message, 'info');
        },

        /**
         * Show loading overlay
         */
        showLoading(container, message = 'Loading...') {
            const el = typeof container === 'string' ? document.getElementById(container) : container;
            if (!el) return;

            const loader = document.createElement('div');
            loader.className = 'mobile-loading-overlay';
            loader.innerHTML = `
                <div class="mobile-loading-spinner"></div>
                <span class="mobile-loading-text">${this.escapeHtml(message)}</span>
            `;
            el.style.position = 'relative';
            el.appendChild(loader);
        },

        /**
         * Hide loading overlay
         */
        hideLoading(container) {
            const el = typeof container === 'string' ? document.getElementById(container) : container;
            if (!el) return;
            const loader = el.querySelector('.mobile-loading-overlay');
            if (loader) loader.remove();
        },

        /**
         * Parse date string to Unix timestamp
         */
        parseDateToTimestamp(dateStr) {
            if (!dateStr) return 0;
            const date = new Date(dateStr);
            return Math.floor(date.getTime() / 1000);
        },

        /**
         * Match enum value (case-insensitive partial match)
         */
        matchEnumValue(input, enumValues) {
            const normalized = String(input).toLowerCase().trim();
            if (!normalized) return null;

            // Exact match
            if (enumValues[normalized] !== undefined) {
                return enumValues[normalized];
            }

            // Partial match
            for (const [key, value] of Object.entries(enumValues)) {
                if (key.toLowerCase().startsWith(normalized)) {
                    return value;
                }
            }

            return null;
        },

        /**
         * Status class mapping
         */
        getStatusClass(status) {
            if (status == null) return 'offline';
            const s = String(status).toLowerCase();

            if (s === 'active' || s === '1' || status === 1) return 'active';
            if (s === 'inactive' || s === '0' || status === 0) return 'inactive';
            if (s === 'pending' || s === '2' || status === 2) return 'pending';
            if (s === 'terminated' || s === '3' || status === 3) return 'terminated';

            return 'info';
        },

        /**
         * Format status label
         */
        formatStatus(status) {
            const statusMap = {
                0: 'Inactive',
                1: 'Active',
                2: 'Pending',
                3: 'Terminated'
            };
            if (typeof status === 'number') {
                return statusMap[status] || 'Unknown';
            }
            return status || 'Unknown';
        }
    };

})();
