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
 * ERP Notification Component
 * Standardized error/success/warning/info notification popups
 */
(function() {
    'use strict';

    // ========================================
    // CONFIGURATION
    // ========================================

    const DEFAULTS = {
        error: { title: 'Error', duration: 0, showClose: true },
        warning: { title: 'Warning', duration: 5000, showClose: true },
        success: { title: 'Success', duration: 3000, showClose: true },
        info: { title: 'Information', duration: 4000, showClose: true }
    };

    const ICONS = {
        error: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
        success: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>'
    };

    // ========================================
    // STATE
    // ========================================

    let container = null;
    let currentNotification = null;
    let autoCloseTimer = null;

    // ========================================
    // CONTAINER MANAGEMENT
    // ========================================

    function ensureContainer() {
        if (container && document.body.contains(container)) {
            return container;
        }
        container = document.createElement('div');
        container.className = 'layer8d-notification-container';
        document.body.appendChild(container);
        return container;
    }

    // ========================================
    // NOTIFICATION RENDERING
    // ========================================

    function createNotificationElement(config) {
        const el = document.createElement('div');
        el.className = `layer8d-notification layer8d-notification-${config.type}`;

        const detailsHtml = config.details && config.details.length > 0
            ? `<ul class="layer8d-notification-details">
                ${config.details.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
               </ul>`
            : '';

        const closeButtonHtml = config.showClose
            ? `<button class="layer8d-notification-close" aria-label="Close notification">${ICONS.close}</button>`
            : '';

        el.innerHTML = `
            <div class="layer8d-notification-header">
                <div class="layer8d-notification-icon">${ICONS[config.type]}</div>
                <h4 class="layer8d-notification-title">${escapeHtml(config.title)}</h4>
                ${closeButtonHtml}
            </div>
            <div class="layer8d-notification-body">
                <p class="layer8d-notification-message">${escapeHtml(config.message)}</p>
                ${detailsHtml}
            </div>
        `;

        return el;
    }

    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    // ========================================
    // EVENT HANDLERS
    // ========================================

    function setupEventHandlers(element, config) {
        // Close button click
        const closeBtn = element.querySelector('.layer8d-notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', close);
        }

        // Escape key
        document.addEventListener('keydown', handleKeyDown);

        // Auto-close timer
        if (config.duration > 0) {
            autoCloseTimer = setTimeout(close, config.duration);
        }
    }

    function handleKeyDown(e) {
        if (e.key === 'Escape' && currentNotification) {
            close();
        }
    }

    function cleanupEventHandlers() {
        document.removeEventListener('keydown', handleKeyDown);
        if (autoCloseTimer) {
            clearTimeout(autoCloseTimer);
            autoCloseTimer = null;
        }
    }

    // ========================================
    // PUBLIC API
    // ========================================

    /**
     * Show a notification with full configuration
     * @param {Object} config - Notification configuration
     * @param {string} config.type - 'error' | 'warning' | 'success' | 'info'
     * @param {string} [config.title] - Optional title (defaults based on type)
     * @param {string} config.message - Main message
     * @param {string[]} [config.details] - Optional list of details
     * @param {number} [config.duration] - Auto-close in ms (0 = manual only)
     * @param {boolean} [config.showClose] - Show close button (default: true)
     */
    function show(config) {
        // Close any existing notification
        if (currentNotification) {
            closeImmediate();
        }

        // Merge with defaults
        const typeDefaults = DEFAULTS[config.type] || DEFAULTS.info;
        const finalConfig = {
            type: config.type || 'info',
            title: config.title || typeDefaults.title,
            message: config.message || '',
            details: config.details || [],
            duration: config.duration !== undefined ? config.duration : typeDefaults.duration,
            showClose: config.showClose !== undefined ? config.showClose : typeDefaults.showClose
        };

        // Create and show notification
        ensureContainer();
        const element = createNotificationElement(finalConfig);
        container.appendChild(element);
        currentNotification = element;

        // Setup event handlers
        setupEventHandlers(element, finalConfig);
    }

    /**
     * Show an error notification
     * @param {string} message - Error message
     * @param {string[]} [details] - Optional list of details
     */
    function error(message, details) {
        show({
            type: 'error',
            message: message,
            details: details
        });
    }

    /**
     * Show a warning notification
     * @param {string} message - Warning message
     * @param {string[]} [details] - Optional list of details
     */
    function warning(message, details) {
        show({
            type: 'warning',
            message: message,
            details: details
        });
    }

    /**
     * Show a success notification
     * @param {string} message - Success message
     * @param {string[]} [details] - Optional list of details
     */
    function success(message, details) {
        show({
            type: 'success',
            message: message,
            details: details
        });
    }

    /**
     * Show an info notification
     * @param {string} message - Info message
     * @param {string[]} [details] - Optional list of details
     */
    function info(message, details) {
        show({
            type: 'info',
            message: message,
            details: details
        });
    }

    /**
     * Close the current notification with animation
     */
    function close() {
        if (!currentNotification) return;

        cleanupEventHandlers();
        currentNotification.classList.add('layer8d-notification-closing');

        // Wait for animation then remove
        setTimeout(() => {
            if (currentNotification && currentNotification.parentNode) {
                currentNotification.parentNode.removeChild(currentNotification);
            }
            currentNotification = null;
        }, 200);
    }

    /**
     * Close immediately without animation
     */
    function closeImmediate() {
        cleanupEventHandlers();
        if (currentNotification && currentNotification.parentNode) {
            currentNotification.parentNode.removeChild(currentNotification);
        }
        currentNotification = null;
    }

    // ========================================
    // EXPORT
    // ========================================

    window.Layer8DNotification = {
        show,
        error,
        warning,
        success,
        info,
        close
    };

})();
