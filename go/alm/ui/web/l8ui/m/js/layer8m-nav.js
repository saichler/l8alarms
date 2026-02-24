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
 * Layer8MNav - Hierarchical Navigation System
 * Provides desktop-parity navigation: Module -> Sub-Module -> Service -> Data
 *
 * Split modules:
 * - layer8m-nav-crud.js: CRUD operations
 * - layer8m-nav-data.js: Data loading and registry lookup
 */
(function() {
    'use strict';

    // Navigation stack for back button support
    let navStack = [];

    // Current navigation state
    let currentState = {
        level: 'home',
        module: null,
        subModule: null,
        service: null
    };

    // Shared HTML generation helpers
    const renderBackHeader = (title, subtitle) => `
        <div class="nav-header">
            <button class="nav-back-btn" onclick="Layer8MNav.navigateBack()">
                ${LAYER8M_NAV_CONFIG.getIcon('back')}
            </button>
            <div class="nav-title">
                <h1>${Layer8MUtils.escapeHtml(title)}</h1>
                ${subtitle ? `<p>${subtitle}</p>` : ''}
            </div>
        </div>
    `;

    const renderDataListHeader = (title, subtitle) => `
        <div class="data-list-header">
            <button class="data-list-back-btn" onclick="Layer8MNav.navigateBack()">
                ${LAYER8M_NAV_CONFIG.getIcon('back')}
            </button>
            <div class="data-list-title">
                <h1>${Layer8MUtils.escapeHtml(title)}</h1>
                ${subtitle ? `<p>${subtitle}</p>` : ''}
            </div>
        </div>
    `;

    const renderCardGrid = (items, onClick) => {
        let html = '<div class="nav-card-grid">';
        items.forEach(item => {
            html += `
                <div class="nav-card" onclick="${onClick(item)}">
                    <span class="nav-card-icon">${LAYER8M_NAV_CONFIG.getIcon(item.icon)}</span>
                    <span class="nav-card-label">${Layer8MUtils.escapeHtml(item.label)}</span>
                </div>
            `;
        });
        html += '</div>';
        return html;
    };

    window.Layer8MNav = {
        /**
         * Show home screen with ERP module cards
         */
        showHome() {
            navStack = [];
            currentState = { level: 'home', module: null, subModule: null, service: null };
            this._renderHomeView();
        },

        /**
         * Navigate to a module's sub-modules
         */
        navigateToModule(moduleKey) {
            navStack.push({ ...currentState });
            currentState = { level: 'module', module: moduleKey, subModule: null, service: null };
            this._renderModuleView(moduleKey);
        },

        /**
         * Navigate to a sub-module's services
         */
        navigateToSubModule(moduleKey, subModuleKey) {
            navStack.push({ ...currentState });
            currentState = { level: 'submodule', module: moduleKey, subModule: subModuleKey, service: null };
            this._renderSubModuleView(moduleKey, subModuleKey);
        },

        /**
         * Navigate to service data list
         */
        navigateToService(moduleKey, subModuleKey, serviceKey) {
            navStack.push({ ...currentState });
            currentState = { level: 'service', module: moduleKey, subModule: subModuleKey, service: serviceKey };
            this._renderServiceView(moduleKey, subModuleKey, serviceKey);
        },

        /**
         * Navigate back in the stack
         */
        navigateBack() {
            if (navStack.length === 0) {
                this.showHome();
                return;
            }

            const prev = navStack.pop();
            currentState = prev;

            // Render the previous view directly (don't push to stack)
            switch (prev.level) {
                case 'home':
                    this._renderHomeView();
                    break;
                case 'module':
                    this._renderModuleView(prev.module);
                    break;
                case 'submodule':
                    this._renderSubModuleView(prev.module, prev.subModule);
                    break;
                case 'service':
                    this._renderServiceView(prev.module, prev.subModule, prev.service);
                    break;
            }
        },

        /**
         * Render home view
         */
        _renderHomeView() {
            const statsEl = document.getElementById('nav-stats');
            if (statsEl) statsEl.style.display = 'grid';

            const content = document.getElementById('nav-content');
            if (!content) return;

            let html = '<div class="nav-section-title">ERP Modules</div>';
            html += '<div class="nav-card-grid">';

            const filter = window.Layer8DModuleFilter;
            LAYER8M_NAV_CONFIG.modules.forEach(module => {
                if (filter && !filter.isEnabled(module.key)) return;
                const isImplemented = !!LAYER8M_NAV_CONFIG[module.key];
                const cardClass = isImplemented ? 'nav-card' : 'nav-card coming-soon';

                html += `
                    <div class="${cardClass}" ${isImplemented ? `onclick="Layer8MNav.navigateToModule('${module.key}')"` : ''}>
                        <span class="nav-card-icon">${LAYER8M_NAV_CONFIG.getIcon(module.icon)}</span>
                        <span class="nav-card-label">${Layer8MUtils.escapeHtml(module.label)}</span>
                        ${!isImplemented ? '<span class="nav-card-badge">Coming Soon</span>' : ''}
                    </div>
                `;
            });

            html += '</div>';
            content.innerHTML = html;
        },

        /**
         * Render module view (sub-modules list)
         */
        _renderModuleView(moduleKey) {
            const statsEl = document.getElementById('nav-stats');
            if (statsEl) statsEl.style.display = 'none';

            const content = document.getElementById('nav-content');
            if (!content) return;

            const moduleConfig = LAYER8M_NAV_CONFIG[moduleKey];
            if (!moduleConfig || !moduleConfig.subModules) {
                this.showComingSoon(moduleKey);
                return;
            }

            const moduleInfo = LAYER8M_NAV_CONFIG.modules.find(m => m.key === moduleKey);
            const moduleLabel = moduleInfo ? moduleInfo.label : moduleKey;

            const filter = window.Layer8DModuleFilter;
            const visibleSubModules = filter
                ? moduleConfig.subModules.filter(sm => filter.isEnabled(moduleKey + '.' + sm.key))
                : moduleConfig.subModules;

            let html = renderBackHeader(moduleLabel, 'Select a sub-module');
            html += renderCardGrid(visibleSubModules,
                (sm) => `Layer8MNav.navigateToSubModule('${moduleKey}', '${sm.key}')`);

            content.innerHTML = html;
        },

        /**
         * Render sub-module view (services list)
         */
        _renderSubModuleView(moduleKey, subModuleKey) {
            const content = document.getElementById('nav-content');
            if (!content) return;

            const moduleConfig = LAYER8M_NAV_CONFIG[moduleKey];
            if (!moduleConfig || !moduleConfig.services || !moduleConfig.services[subModuleKey]) {
                this.showComingSoon(subModuleKey);
                return;
            }

            const subModuleInfo = moduleConfig.subModules.find(sm => sm.key === subModuleKey);
            const subModuleLabel = subModuleInfo ? subModuleInfo.label : subModuleKey;
            const services = moduleConfig.services[subModuleKey];

            const filter = window.Layer8DModuleFilter;
            const basePath = moduleKey + '.' + subModuleKey;
            const visibleServices = filter
                ? services.filter(svc => filter.isEnabled(basePath + '.' + svc.key))
                : services;

            let html = renderBackHeader(subModuleLabel, 'Select a service');
            html += renderCardGrid(visibleServices,
                (svc) => `Layer8MNav.navigateToService('${moduleKey}', '${subModuleKey}', '${svc.key}')`);

            content.innerHTML = html;
        },

        /**
         * Render service view (data table)
         */
        _renderServiceView(moduleKey, subModuleKey, serviceKey) {
            const content = document.getElementById('nav-content');
            if (!content) return;

            const moduleConfig = LAYER8M_NAV_CONFIG[moduleKey];
            if (!moduleConfig || !moduleConfig.services || !moduleConfig.services[subModuleKey]) {
                this.showComingSoon(serviceKey);
                return;
            }

            const services = moduleConfig.services[subModuleKey];
            const serviceConfig = services.find(s => s.key === serviceKey);

            if (!serviceConfig) {
                this.showComingSoon(serviceKey);
                return;
            }

            // Custom (non-table) service view
            if (serviceConfig.customInit) {
                let html = renderDataListHeader(serviceConfig.label, serviceConfig.subtitle || '');
                html += `<div id="${serviceConfig.customContainer || 'custom-service-container'}"></div>`;
                content.innerHTML = html;
                const obj = window[serviceConfig.customInit];
                if (obj && typeof obj.initialize === 'function') obj.initialize();
                return;
            }

            let html = renderDataListHeader(serviceConfig.label, 'Tap a record to view details');
            html += '<div id="service-view-switcher" style="text-align:right;padding:0 12px 8px"></div>';
            html += '<div id="service-table-container"></div>';

            content.innerHTML = html;

            // Load the service data using the data module
            Layer8MNavData.loadServiceData(serviceConfig);
        },

        /**
         * Show coming soon placeholder
         */
        showComingSoon(key) {
            const content = document.getElementById('nav-content');
            if (!content) return;

            content.innerHTML = `
                ${renderBackHeader(key, '')}
                <div class="nav-empty-state">
                    <div class="nav-empty-state-icon">🚧</div>
                    <h3>Coming Soon</h3>
                    <p>This module is under development</p>
                </div>
            `;
        },

        /**
         * Get current navigation state
         */
        getCurrentState() {
            return { ...currentState };
        },

        /**
         * Check if we're at home level
         */
        isHome() {
            return currentState.level === 'home';
        }
    };

})();
