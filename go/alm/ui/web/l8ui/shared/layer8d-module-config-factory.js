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
 * Layer8 Module Config Factory
 *
 * Factory for creating ERP module configurations with minimal boilerplate.
 * Each module config defines: modules (with services), submodules, and renderStatus.
 *
 * Usage:
 *   Layer8ModuleConfigFactory.create({
 *       namespace: 'Bi',
 *       modules: {
 *           'reporting': { label: 'Reporting', icon: '📊', services: [...] }
 *       },
 *       submodules: ['BiReporting', 'BiDashboards']
 *   });
 */
(function() {
    'use strict';

    window.Layer8ModuleConfigFactory = {
        /**
         * Create a module configuration
         * @param {Object} config - Configuration object
         * @param {string} config.namespace - Global namespace name (e.g., 'Bi', 'Crm', 'Mfg')
         * @param {Object} config.modules - Module definitions { key: { label, icon, services[] } }
         * @param {Array} config.submodules - Submodule namespace names for service registry
         * @returns {Object} The created namespace object
         */
        create: function(config) {
            if (!config.namespace || !config.modules || !config.submodules) {
                console.error('Layer8ModuleConfigFactory.create: namespace, modules, and submodules are required');
                return null;
            }

            // Create or get existing namespace
            const ns = window[config.namespace] = window[config.namespace] || {};

            // Set modules configuration
            ns.modules = config.modules;

            // Set submodules array
            ns.submodules = config.submodules;

            // Always delegate renderStatus to shared utility
            ns.renderStatus = Layer8DUtils.renderStatus;

            return ns;
        },

        /**
         * Helper to create a service entry
         * @param {string} key - Service key (e.g., 'reports')
         * @param {string} label - Display label (e.g., 'Reports')
         * @param {string} icon - Emoji icon (e.g., '📋')
         * @param {string} endpoint - API endpoint (e.g., '/35/BiReport')
         * @param {string} model - Model name (e.g., 'BiReport')
         * @param {string} [viewType] - View type (e.g., 'table', 'chart', 'kanban')
         * @param {Object} [viewConfig] - View-type-specific configuration
         * @returns {Object} Service configuration object
         */
        service: function(key, label, icon, endpoint, model, viewType, viewConfig, alternateViews) {
            const svc = { key: key, label: label, icon: icon, endpoint: endpoint, model: model };
            if (viewType) svc.viewType = viewType;
            if (viewConfig) svc.viewConfig = viewConfig;
            if (alternateViews) svc.alternateViews = alternateViews;
            return svc;
        },

        /**
         * Helper to create a module entry
         * @param {string} label - Module display label
         * @param {string} icon - Emoji icon
         * @param {Array} services - Array of service configurations
         * @returns {Object} Module configuration object
         */
        module: function(label, icon, services) {
            return { label: label, icon: icon, services: services };
        }
    };
})();
