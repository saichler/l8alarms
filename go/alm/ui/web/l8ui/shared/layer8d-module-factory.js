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
// ERP Module Factory
// Bootstraps a complete module with all shared functionality

(function() {
    'use strict';

    // Bootstrap a complete module
    function create(options) {
        const ns = options.namespace;
        const moduleNS = window[ns];

        if (!moduleNS) {
            console.error(`${ns} namespace not found. Ensure ${ns.toLowerCase()}-config.js is loaded.`);
            return;
        }

        // 1. Register sub-modules in the service registry
        if (moduleNS.submodules) {
            moduleNS.submodules.forEach(sub => Layer8DServiceRegistry.register(ns, sub));
        }

        // 2. Create forms facade (delegates all calls to Layer8DForms)
        const formsNSName = ns + 'Forms';
        window[formsNSName] = {
            generateFormHtml: Layer8DForms.generateFormHtml,
            collectFormData:  Layer8DForms.collectFormData,
            validateFormData: Layer8DForms.validateFormData,
            saveRecord:       Layer8DForms.saveRecord,
            fetchRecord:      Layer8DForms.fetchRecord,
            deleteRecord:     Layer8DForms.deleteRecord,
            openAddForm:      Layer8DForms.openAddForm,
            openEditForm:     Layer8DForms.openEditForm,
            confirmDelete:    Layer8DForms.confirmDelete
        };

        // 3. Attach navigation
        Layer8DModuleNavigation.attach(moduleNS, ns, {
            defaultModule: options.defaultModule,
            defaultService: options.defaultService,
            sectionSelector: options.sectionSelector,
            initializerName: options.initializerName
        });

        // 4. Attach CRUD operations
        Layer8DModuleCRUD.attach(moduleNS, ns, formsNSName);

        // 5. Attach service lookup convenience methods
        moduleNS.getServiceColumns = function(modelName) {
            return Layer8DServiceRegistry.getColumns(ns, modelName);
        };
        moduleNS.getServiceFormDef = function(modelName) {
            return Layer8DServiceRegistry.getFormDef(ns, modelName);
        };
        moduleNS.getServiceDetailsConfig = function(modelName) {
            return Layer8DServiceRegistry.getDetailsConfig(ns, modelName);
        };
        moduleNS.getServicePrimaryKey = function(modelName) {
            return Layer8DServiceRegistry.getPrimaryKey(ns, modelName);
        };

        // 6. Validate sub-module namespaces and clean up internals
        var requiredProps = ['columns', 'forms', 'primaryKeys', 'enums'];
        if (options.requiredNamespaces) {
            for (const nsName of options.requiredNamespaces) {
                var subNS = window[nsName];
                if (!subNS) {
                    console.warn(ns + ' submodule ' + nsName + ' not loaded. Some features may not work.');
                    continue;
                }
                for (var i = 0; i < requiredProps.length; i++) {
                    if (!subNS[requiredProps[i]]) {
                        console.warn(ns + ' submodule ' + nsName + '.' + requiredProps[i] + ' not found.');
                    }
                }
                if (subNS._internal) {
                    delete subNS._internal;
                }
            }
        }

        console.log(`${ns} module initialized`);
    }

    window.Layer8DModuleFactory = {
        create
    };

})();
