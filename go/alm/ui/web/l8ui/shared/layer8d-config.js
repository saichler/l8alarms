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
 * ERP Application Configuration
 * Loads and provides access to app-level configuration settings
 */
(function() {
    'use strict';

    // Default configuration
    const DEFAULT_CONFIG = {
        dateFormat: 'mm/dd/yyyy',
        apiPrefix: '/erp'
    };

    // Current configuration (starts with defaults)
    let currentConfig = { ...DEFAULT_CONFIG };
    let configLoaded = false;

    /**
     * Load configuration from login.json
     * @returns {Promise<void>}
     */
    async function load() {
        if (configLoaded) return;

        try {
            const response = await fetch('login.json');
            if (!response.ok) {
                console.warn('Could not load login.json, using default config');
                configLoaded = true;
                return;
            }

            const data = await response.json();

            // Extract app config section
            if (data.app) {
                currentConfig = { ...DEFAULT_CONFIG, ...data.app };
            }

            configLoaded = true;
            console.log('App config loaded:', currentConfig);
        } catch (error) {
            console.warn('Error loading app config, using defaults:', error);
            configLoaded = true;
        }
    }

    /**
     * Get the configured date format
     * @returns {string} Date format string (e.g., 'mm/dd/yyyy')
     */
    function getDateFormat() {
        return currentConfig.dateFormat || DEFAULT_CONFIG.dateFormat;
    }

    /**
     * Get the configured API prefix
     * @returns {string} API prefix (e.g., '/erp')
     */
    function getApiPrefix() {
        return currentConfig.apiPrefix || DEFAULT_CONFIG.apiPrefix;
    }

    /**
     * Resolve a relative endpoint path to a full API endpoint
     * @param {string} path - Relative path (e.g., '/30/Employee')
     * @returns {string} Full endpoint (e.g., '/erp/30/Employee')
     */
    function resolveEndpoint(path) {
        return getApiPrefix() + path;
    }

    /**
     * Get all configuration
     * @returns {object} Current configuration object
     */
    function getConfig() {
        return { ...currentConfig };
    }

    /**
     * Check if configuration has been loaded
     * @returns {boolean}
     */
    function isLoaded() {
        return configLoaded;
    }

    // Export
    window.Layer8DConfig = {
        load,
        getDateFormat,
        getApiPrefix,
        resolveEndpoint,
        getConfig,
        isLoaded
    };

})();
