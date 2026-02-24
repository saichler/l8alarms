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
 * Layer8 Reference Factory - Generates reference registry entries from simple definitions.
 *
 * Usage:
 *   Layer8DReferenceRegistry.register({
 *       // Simple: displays single field
 *       ...Layer8RefFactory.simple('Employee', 'employeeId', 'name'),
 *
 *       // Person: displays "lastName, firstName"
 *       ...Layer8RefFactory.person('Employee', 'employeeId', 'lastName', 'firstName'),
 *
 *       // Coded: displays "code - name"
 *       ...Layer8RefFactory.coded('ScmWarehouse', 'warehouseId', 'code', 'name'),
 *
 *       // ID-only: displays the ID field itself
 *       ...Layer8RefFactory.idOnly('Timesheet', 'timesheetId'),
 *   });
 */
(function() {
    'use strict';

    window.Layer8RefFactory = {
        /**
         * Create a simple reference that displays a single field.
         * @param {string} model - The model name
         * @param {string} idColumn - The ID column name
         * @param {string} displayColumn - The column to display
         * @param {string} [displayLabel] - Optional label for display (defaults to displayColumn capitalized)
         * @returns {Object} - Object to spread into registry
         */
        simple: function(model, idColumn, displayColumn, displayLabel) {
            const result = {};
            result[model] = {
                idColumn: idColumn,
                displayColumn: displayColumn
            };
            if (displayLabel) {
                result[model].displayLabel = displayLabel;
            }
            return result;
        },

        /**
         * Create a person reference that displays "lastName, firstName".
         * @param {string} model - The model name
         * @param {string} idColumn - The ID column name
         * @param {string} lastNameField - The last name field (default 'lastName')
         * @param {string} firstNameField - The first name field (default 'firstName')
         * @returns {Object} - Object to spread into registry
         */
        person: function(model, idColumn, lastNameField, firstNameField) {
            lastNameField = lastNameField || 'lastName';
            firstNameField = firstNameField || 'firstName';

            const result = {};
            result[model] = {
                idColumn: idColumn,
                displayColumn: lastNameField,
                selectColumns: [idColumn, lastNameField, firstNameField],
                displayFormat: function(item) {
                    return item[lastNameField] + ', ' + item[firstNameField];
                },
                displayLabel: 'Name'
            };
            return result;
        },

        /**
         * Create a coded reference that displays "code - name".
         * @param {string} model - The model name
         * @param {string} idColumn - The ID column name
         * @param {string} codeField - The code field name (default 'code')
         * @param {string} nameField - The name field name (default 'name')
         * @returns {Object} - Object to spread into registry
         */
        coded: function(model, idColumn, codeField, nameField) {
            codeField = codeField || 'code';
            nameField = nameField || 'name';

            const result = {};
            result[model] = {
                idColumn: idColumn,
                displayColumn: nameField,
                selectColumns: [idColumn, codeField, nameField],
                displayFormat: function(item) {
                    return item[codeField] + ' - ' + item[nameField];
                },
                displayLabel: 'Code - Name'
            };
            return result;
        },

        /**
         * Create an ID-only reference (displays the ID itself).
         * @param {string} model - The model name
         * @param {string} idColumn - The ID column name
         * @returns {Object} - Object to spread into registry
         */
        idOnly: function(model, idColumn) {
            const result = {};
            result[model] = {
                idColumn: idColumn,
                displayColumn: idColumn
            };
            return result;
        },

        /**
         * Batch create simple references.
         * @param {Array<[string, string, string, string?]>} definitions - Array of [model, idColumn, displayColumn, displayLabel?]
         * @returns {Object} - Object to spread into registry
         */
        batch: function(definitions) {
            const result = {};
            definitions.forEach(def => {
                const [model, idColumn, displayColumn, displayLabel] = def;
                result[model] = {
                    idColumn: idColumn,
                    displayColumn: displayColumn
                };
                if (displayLabel) {
                    result[model].displayLabel = displayLabel;
                }
            });
            return result;
        },

        /**
         * Batch create person references.
         * @param {Array<[string, string, string?, string?]>} definitions - Array of [model, idColumn, lastNameField?, firstNameField?]
         * @returns {Object} - Object to spread into registry
         */
        batchPerson: function(definitions) {
            const result = {};
            definitions.forEach(def => {
                const [model, idColumn, lastNameField, firstNameField] = def;
                const ln = lastNameField || 'lastName';
                const fn = firstNameField || 'firstName';
                result[model] = {
                    idColumn: idColumn,
                    displayColumn: ln,
                    selectColumns: [idColumn, ln, fn],
                    displayFormat: function(item) {
                        return item[ln] + ', ' + item[fn];
                    },
                    displayLabel: 'Name'
                };
            });
            return result;
        },

        /**
         * Batch create ID-only references.
         * @param {Array<[string, string]>} definitions - Array of [model, idColumn]
         * @returns {Object} - Object to spread into registry
         */
        batchIdOnly: function(definitions) {
            const result = {};
            definitions.forEach(def => {
                const [model, idColumn] = def;
                result[model] = {
                    idColumn: idColumn,
                    displayColumn: idColumn
                };
            });
            return result;
        }
    };
})();
