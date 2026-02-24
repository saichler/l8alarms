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
 * Layer8MConfig - Centralized configuration for Layer8 mobile apps
 * Generic config loader and module registry.
 * Projects register their module data via registerModules() and registerReferences().
 */
(function() {
    'use strict';

    // Private state
    let _config = null;
    let _loaded = false;
    let _loading = false;
    let _loadPromise = null;

    // Default configuration
    const DEFAULT_CONFIG = {
        app: {
            apiPrefix: '/erp'
        },
        api: {
            typeCode: 30
        },
        dateFormat: 'mm/dd/yyyy'
    };

    // Registered module configurations (populated by project via registerModules)
    const _modules = {};

    // Reference registry for mobile picker (populated by project via registerReferences)
    const _references = {};

    // Public API
    window.Layer8MConfig = {
        /**
         * Load configuration from server
         */
        async load() {
            if (_loading && _loadPromise) return _loadPromise;
            if (_loaded) return true;

            _loading = true;
            _loadPromise = this._doLoad();

            try {
                return await _loadPromise;
            } finally {
                _loading = false;
            }
        },

        async _doLoad() {
            try {
                const response = await fetch('/login.json?t=' + Date.now());
                if (!response.ok) throw new Error('Failed to load config');
                _config = await response.json();
                _loaded = true;
                return true;
            } catch (error) {
                console.warn('Layer8MConfig: Using defaults:', error.message);
                _config = DEFAULT_CONFIG;
                _loaded = true;
                return false;
            }
        },

        isLoaded() { return _loaded; },

        getApiPrefix() {
            return _config?.app?.apiPrefix || DEFAULT_CONFIG.app.apiPrefix;
        },

        resolveEndpoint(path) {
            return this.getApiPrefix() + path;
        },

        getTypeCode() {
            return _config?.api?.typeCode || DEFAULT_CONFIG.api.typeCode;
        },

        getDateFormat() {
            return _config?.dateFormat || DEFAULT_CONFIG.dateFormat;
        },

        /**
         * Register module configurations (called by project-specific files)
         * @param {Object} modules - Map of moduleKey -> { label, icon, services[] }
         */
        registerModules(modules) {
            Object.assign(_modules, modules);
        },

        /**
         * Register reference configurations for mobile picker
         * @param {Object} refs - Map of modelName -> reference config
         */
        registerReferences(refs) {
            Object.assign(_references, refs);
        },

        /**
         * Get all registered modules
         */
        getModules() {
            return _modules;
        },

        /**
         * Get a specific module
         */
        getModule(moduleKey) {
            return _modules[moduleKey] || null;
        },

        /**
         * Get a specific service by module and service key
         */
        getService(moduleKey, serviceKey) {
            const module = _modules[moduleKey];
            if (!module) return null;
            return module.services.find(s => s.key === serviceKey) || null;
        },

        /**
         * Find service by model name
         */
        getServiceByModel(modelName) {
            for (const moduleKey of Object.keys(_modules)) {
                const module = _modules[moduleKey];
                const service = module.services.find(s => s.model === modelName);
                if (service) return { module: moduleKey, ...service };
            }
            return null;
        },

        /**
         * Get reference registry for a model
         */
        getReferenceConfig(modelName) {
            return _references[modelName] || null;
        },

        /**
         * Get all flat services list
         */
        getAllServices() {
            const services = [];
            for (const moduleKey of Object.keys(_modules)) {
                const module = _modules[moduleKey];
                for (const service of module.services) {
                    services.push({ module: moduleKey, moduleLabel: module.label, ...service });
                }
            }
            return services;
        },

        /**
         * Get full config object
         */
        getConfig() {
            return _config || DEFAULT_CONFIG;
        }
    };

})();
