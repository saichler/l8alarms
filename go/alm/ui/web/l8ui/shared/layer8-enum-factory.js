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
 * Layer8 Enum Factory - Generates enum objects from simple array definitions.
 *
 * Usage:
 *   const STATUS = Layer8EnumFactory.create([
 *       ['Unspecified', null, ''],
 *       ['Active', 'active', 'layer8d-status-active'],
 *       ['Inactive', 'inactive', 'layer8d-status-inactive'],
 *   ]);
 *   // Returns: { enum: {0: 'Unspecified', 1: 'Active', ...}, values: {'active': 1, ...}, classes: {1: 'layer8d-status-active', ...} }
 *
 * For enums without classes:
 *   const TYPE = Layer8EnumFactory.simple([
 *       'Unspecified', 'Full-Time', 'Part-Time', 'Contract'
 *   ]);
 *   // Returns: { enum: {0: 'Unspecified', 1: 'Full-Time', ...} }
 *
 * For enums with custom value keys:
 *   const TYPE = Layer8EnumFactory.withValues([
 *       ['Unspecified', null],
 *       ['Full-Time', 'full-time'],
 *       ['Full-Time', 'fulltime'],  // alias
 *       ['Part-Time', 'part-time'],
 *   ]);
 */
(function() {
    'use strict';

    window.Layer8EnumFactory = {
        /**
         * Create a full enum with values and classes mappings.
         * @param {Array<[string, string|null, string]>} definitions - Array of [label, valueKey, cssClass]
         * @returns {{enum: Object, values: Object, classes: Object}}
         */
        create: function(definitions) {
            const enumObj = {};
            const values = {};
            const classes = {};

            definitions.forEach((def, index) => {
                const [label, valueKey, cssClass] = def;
                enumObj[index] = label;

                if (valueKey !== null && valueKey !== undefined) {
                    values[valueKey] = index;
                }

                if (cssClass) {
                    classes[index] = cssClass;
                }
            });

            return {
                enum: enumObj,
                values: values,
                classes: classes
            };
        },

        /**
         * Create a simple enum without values or classes.
         * @param {Array<string>} labels - Array of labels
         * @returns {{enum: Object}}
         */
        simple: function(labels) {
            const enumObj = {};
            labels.forEach((label, index) => {
                enumObj[index] = label;
            });
            return { enum: enumObj };
        },

        /**
         * Create an enum with values but no classes.
         * @param {Array<[string, string|null]>} definitions - Array of [label, valueKey]
         * @returns {{enum: Object, values: Object}}
         */
        withValues: function(definitions) {
            const enumObj = {};
            const values = {};
            let currentIndex = 0;
            let lastLabel = null;

            definitions.forEach((def) => {
                const [label, valueKey] = def;

                // If this is a new label, increment the index
                if (label !== lastLabel) {
                    if (lastLabel !== null) {
                        currentIndex++;
                    }
                    enumObj[currentIndex] = label;
                    lastLabel = label;
                }

                // Map the valueKey to the current index
                if (valueKey !== null && valueKey !== undefined) {
                    values[valueKey] = currentIndex;
                }
            });

            return {
                enum: enumObj,
                values: values
            };
        },

        /**
         * Create a status enum with standard classes.
         * @param {Array<[string, string|null, string]>} definitions - Array of [label, valueKey, statusType]
         *        statusType can be: 'active', 'inactive', 'pending', 'terminated', 'warning', 'info'
         * @returns {{enum: Object, values: Object, classes: Object}}
         */
        status: function(definitions) {
            const statusClasses = {
                'active': 'layer8d-status-active',
                'inactive': 'layer8d-status-inactive',
                'pending': 'layer8d-status-pending',
                'terminated': 'layer8d-status-terminated',
                'warning': 'layer8d-status-warning',
                'info': 'layer8d-status-info'
            };

            const mapped = definitions.map(def => {
                const [label, valueKey, statusType] = def;
                const cssClass = statusClasses[statusType] || '';
                return [label, valueKey, cssClass];
            });

            return this.create(mapped);
        }
    };
})();
