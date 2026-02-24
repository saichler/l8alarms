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
 * ERP Input Formatter - Entry Point
 * Module verification and public API export
 */
(function() {
    'use strict';

    // Verify all modules are loaded
    const requiredModules = ['utils', 'masks', 'types', 'getType', 'attach', 'detach'];
    const missing = requiredModules.filter(mod => !Layer8DInputFormatter[mod]);

    if (missing.length > 0) {
        console.error('Layer8DInputFormatter: Missing required modules:', missing.join(', '));
        console.error('Ensure input-formatter-*.js files are loaded in correct order.');
        return;
    }

    // ========================================
    // AUTO-ATTACH HELPER
    // ========================================

    /**
     * Auto-attach formatters to inputs within a container based on data attributes
     * @param {HTMLElement} container
     */
    function attachAll(container) {
        if (!container) return;

        // Find inputs with data-format attribute
        const inputs = container.querySelectorAll('[data-format]');

        inputs.forEach(input => {
            const type = input.dataset.format;
            if (!Layer8DInputFormatter.hasType(type)) {
                console.warn(`Layer8DInputFormatter: Unknown format type "${type}" on input`);
                return;
            }

            // Parse options from data attributes
            const options = {};

            // Common options
            if (input.dataset.formatMin !== undefined) {
                options.min = parseFloat(input.dataset.formatMin);
            }
            if (input.dataset.formatMax !== undefined) {
                options.max = parseFloat(input.dataset.formatMax);
            }
            if (input.dataset.formatDecimals !== undefined) {
                options.decimals = parseInt(input.dataset.formatDecimals, 10);
            }
            if (input.dataset.formatSymbol !== undefined) {
                options.symbol = input.dataset.formatSymbol;
            }
            if (input.dataset.formatValidateOnBlur !== undefined) {
                options.validateOnBlur = input.dataset.formatValidateOnBlur !== 'false';
            }

            Layer8DInputFormatter.attach(input, type, options);
        });
    }

    /**
     * Detach all formatters from inputs within a container
     * @param {HTMLElement} container
     */
    function detachAll(container) {
        if (!container) return;

        const inputs = container.querySelectorAll('.formatted-input');
        inputs.forEach(input => {
            Layer8DInputFormatter.detach(input);
        });
    }

    // ========================================
    // COLLECT FORMATTED DATA
    // ========================================

    /**
     * Collect raw values from all formatted inputs in a container
     * @param {HTMLElement} container
     * @returns {Object} - Map of input name/id to raw value
     */
    function collectValues(container) {
        const values = {};
        const inputs = container.querySelectorAll('.formatted-input');

        inputs.forEach(input => {
            const key = input.name || input.id;
            if (key) {
                values[key] = Layer8DInputFormatter.getValue(input);
            }
        });

        return values;
    }

    // ========================================
    // PUBLIC API
    // ========================================

    // Add convenience methods to the public API
    Object.assign(Layer8DInputFormatter, {
        attachAll,
        detachAll,
        collectValues,

        // Version info
        version: '1.0.0'
    });

    // Log successful initialization
    console.log('Layer8DInputFormatter initialized successfully');

})();
