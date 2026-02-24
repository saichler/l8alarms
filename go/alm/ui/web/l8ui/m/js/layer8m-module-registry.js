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
 * Mobile Module Registry Factory
 * Creates a unified registry for looking up model definitions across sub-modules.
 * Eliminates duplication across all *-index.js files.
 *
 * Usage:
 *   window.MobileHCM = Layer8MModuleRegistry.create('MobileHCM', {
 *       'Core HR': MobileCoreHR,
 *       'Payroll': MobilePayroll
 *   });
 */
(function() {
    'use strict';

    function findModule(modules, modelName) {
        for (let i = 0; i < modules.length; i++) {
            if (modules[i].columns && modules[i].columns[modelName]) {
                return modules[i];
            }
        }
        return null;
    }

    window.Layer8MModuleRegistry = {
        create: function(exportName, moduleMap) {
            const entries = Object.entries(moduleMap);
            const modules = entries.map(function(e) { return e[1]; });

            var registry = {
                getFormDef: function(modelName) {
                    var mod = findModule(modules, modelName);
                    return (mod && mod.forms && mod.forms[modelName]) ? mod.forms[modelName] : null;
                },
                getColumns: function(modelName) {
                    var mod = findModule(modules, modelName);
                    return (mod && mod.columns && mod.columns[modelName]) ? mod.columns[modelName] : null;
                },
                getEnums: function(modelName) {
                    var mod = findModule(modules, modelName);
                    return (mod && mod.enums) ? mod.enums : null;
                },
                getPrimaryKey: function(modelName) {
                    var mod = findModule(modules, modelName);
                    return (mod && mod.primaryKeys && mod.primaryKeys[modelName]) ? mod.primaryKeys[modelName] : null;
                },
                getRender: function(modelName) {
                    var mod = findModule(modules, modelName);
                    return (mod && mod.render) ? mod.render : null;
                },
                getAllModels: function() {
                    var models = [];
                    for (var i = 0; i < modules.length; i++) {
                        if (modules[i].columns) {
                            models.push.apply(models, Object.keys(modules[i].columns));
                        }
                    }
                    return models;
                },
                hasModel: function(modelName) {
                    return findModule(modules, modelName) !== null;
                },
                getModuleName: function(modelName) {
                    var mod = findModule(modules, modelName);
                    if (!mod) return null;
                    for (var i = 0; i < entries.length; i++) {
                        if (entries[i][1] === mod) return entries[i][0];
                    }
                    return null;
                },
                modules: {}
            };

            for (var i = 0; i < entries.length; i++) {
                var key = entries[i][0].replace(/[^a-zA-Z0-9]/g, '');
                registry.modules[key] = entries[i][1];
            }

            window[exportName] = registry;
            return registry;
        }
    };
})();
