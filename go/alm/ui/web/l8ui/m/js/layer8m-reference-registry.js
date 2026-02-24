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
 * Mobile Reference Registry
 * Central configuration for all reference/lookup fields.
 * Generic container - projects register their model definitions via register().
 */
(function() {
    'use strict';

    // Create the registry
    window.Layer8MReferenceRegistry = {};

    /**
     * Register model configurations from a module registry
     * @param {Object} registry - Object containing model configurations
     */
    Layer8MReferenceRegistry.register = function(registry) {
        if (!registry) return;
        Object.keys(registry).forEach(function(key) {
            window.Layer8MReferenceRegistry[key] = registry[key];
        });
    };

    /**
     * Get configuration for a model
     * @param {string} modelName - The model name (e.g., 'Employee')
     * @returns {Object|null} Configuration object or null
     */
    Layer8MReferenceRegistry.get = function(modelName) {
        return this[modelName] || null;
    };

    /**
     * Check if a model is registered
     * @param {string} modelName - The model name
     * @returns {boolean} True if model exists
     */
    Layer8MReferenceRegistry.has = function(modelName) {
        return this.hasOwnProperty(modelName) && typeof this[modelName] === 'object';
    };

    /**
     * Get all registered model names
     * @returns {string[]} Array of model names
     */
    Layer8MReferenceRegistry.getModelNames = function() {
        return Object.keys(this).filter(function(key) {
            return typeof window.Layer8MReferenceRegistry[key] === 'object';
        });
    };

})();
