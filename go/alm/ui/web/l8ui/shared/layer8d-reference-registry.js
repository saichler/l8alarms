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
 * Layer8D Reference Registry
 * Generic container for reference/lookup field configurations.
 * Projects register their model definitions via register().
 *
 * Usage:
 *   Layer8DReferenceRegistry.register({ Employee: { idColumn: 'employeeId', ... } });
 *   Layer8DReferenceRegistry['Employee'] // => { idColumn: 'employeeId', ... }
 */
(function() {
    'use strict';

    const registry = {};

    /**
     * Register model definitions into the registry.
     * @param {Object} models - Map of modelName -> config
     */
    function register(models) {
        for (const [name, config] of Object.entries(models)) {
            registry[name] = config;
            // Also expose as direct property for backward compatibility
            window.Layer8DReferenceRegistry[name] = config;
        }
    }

    /**
     * Get a model config by name.
     * @param {string} modelName
     * @returns {Object|undefined}
     */
    function get(modelName) {
        return registry[modelName];
    }

    window.Layer8DReferenceRegistry = { register, get };

})();
