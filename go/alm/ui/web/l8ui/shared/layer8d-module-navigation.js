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
// ERP Module Navigation
// Generic navigation attached to any module namespace

(function() {
    'use strict';

    // Attach navigation functionality to a module namespace
    function attach(moduleNS, parentModule, config) {
        // Initialize state
        moduleNS._state = {
            currentModule: config.defaultModule,
            currentService: config.defaultService,
            serviceTables: {},
            sectionEl: null
        };

        // Initialize module
        moduleNS.initialize = function() {
            moduleNS._state.serviceTables = {};
            moduleNS._state.currentModule = config.defaultModule;
            moduleNS._state.currentService = config.defaultService;

            // Get section container by finding first module content element
            moduleNS._state.sectionEl = document.querySelector(
                `.l8-module-content[data-module="${config.sectionSelector}"]`
            );
            if (moduleNS._state.sectionEl) {
                moduleNS._state.sectionEl = moduleNS._state.sectionEl.closest('.section-container');
            }
            if (!moduleNS._state.sectionEl) {
                console.error(`${parentModule} section container not found`);
                return;
            }

            moduleNS._setupModuleTabs();
            moduleNS._setupSubNavigation();
            moduleNS.loadServiceView(moduleNS._state.currentModule, moduleNS._state.currentService);
        };

        // Setup module tab click handlers
        moduleNS._setupModuleTabs = function() {
            const tabs = moduleNS._state.sectionEl.querySelectorAll('.l8-module-tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const moduleKey = tab.dataset.module;
                    moduleNS.switchModule(moduleKey);
                });
            });
        };

        // Switch to a different module
        moduleNS.switchModule = function(moduleKey) {
            if (!moduleNS.modules[moduleKey]) return;

            moduleNS._state.currentModule = moduleKey;

            moduleNS._state.sectionEl.querySelectorAll('.l8-module-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.module === moduleKey);
            });

            moduleNS._state.sectionEl.querySelectorAll('.l8-module-content').forEach(content => {
                content.classList.toggle('active', content.dataset.module === moduleKey);
            });

            const firstService = moduleNS.modules[moduleKey].services[0];
            if (firstService) {
                moduleNS._state.currentService = firstService.key;
                moduleNS._updateSubNavActive(moduleNS._state.currentService);
                moduleNS.loadServiceView(moduleKey, firstService.key);
            }
        };

        // Setup sub-navigation click handlers
        moduleNS._setupSubNavigation = function() {
            moduleNS._state.sectionEl.querySelectorAll('.l8-subnav').forEach(subnav => {
                subnav.addEventListener('click', (e) => {
                    const item = e.target.closest('.l8-subnav-item');
                    if (!item) return;

                    const serviceKey = item.dataset.service;
                    const moduleKey = item.closest('.l8-module-content').dataset.module;

                    moduleNS._state.currentService = serviceKey;
                    moduleNS._updateSubNavActive(serviceKey, moduleKey);
                    moduleNS.loadServiceView(moduleKey, serviceKey);
                });
            });
        };

        // Update sub-navigation active state
        moduleNS._updateSubNavActive = function(serviceKey, moduleKey) {
            moduleKey = moduleKey || moduleNS._state.currentModule;
            const moduleContent = moduleNS._state.sectionEl.querySelector(`.l8-module-content[data-module="${moduleKey}"]`);
            if (!moduleContent) return;

            moduleContent.querySelectorAll('.l8-subnav-item').forEach(item => {
                item.classList.toggle('active', item.dataset.service === serviceKey);
            });
        };

        // Load a service view
        moduleNS.loadServiceView = function(moduleKey, serviceKey) {
            const module = moduleNS.modules[moduleKey];
            if (!module) return;

            const service = module.services.find(s => s.key === serviceKey);
            if (!service) return;

            const moduleContent = moduleNS._state.sectionEl.querySelector(`.l8-module-content[data-module="${moduleKey}"]`);
            if (!moduleContent) return;

            moduleContent.querySelectorAll('.l8-service-view').forEach(view => {
                view.classList.toggle('active', view.dataset.service === serviceKey);
            });

            const tableId = `${moduleKey}-${serviceKey}-table`;
            if (!moduleNS._state.serviceTables[tableId]) {
                Layer8DServiceRegistry.initializeServiceTable(moduleNS, parentModule, moduleKey, service, tableId);
            }
        };

        // Get service info by key
        moduleNS.getServiceInfo = function(moduleKey, serviceKey) {
            const module = moduleNS.modules[moduleKey];
            if (!module) return null;
            return module.services.find(s => s.key === serviceKey);
        };

        // Refresh current view (table, chart, kanban, etc.)
        moduleNS.refreshCurrentTable = function() {
            const tableId = `${moduleNS._state.currentModule}-${moduleNS._state.currentService}-table`;
            const view = moduleNS._state.serviceTables[tableId];
            if (view) {
                if (typeof view.refresh === 'function') {
                    view.refresh();
                } else if (typeof view.fetchData === 'function') {
                    view.fetchData(1, view.pageSize);
                }
            }
        };

        // Expose initializer globally for sections.js compatibility
        window[config.initializerName] = moduleNS.initialize;
    }

    window.Layer8DModuleNavigation = {
        attach
    };

})();
