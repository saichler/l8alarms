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
// SYS Module - Entry Point
// Bootstraps System Administration using shared module factory
// with custom CRUD overrides for Security entities

(function() {
    'use strict';

    // 1. Bootstrap using shared factory
    Layer8DModuleFactory.create({
        namespace: 'L8Sys',
        defaultModule: 'health',
        defaultService: 'users',
        sectionSelector: 'health',
        initializerName: 'initializeL8Sys',
        requiredNamespaces: ['L8Security']
    });

    // 2. Initialize Health Monitor and Modules Settings when System section loads
    var origInit = window.initializeL8Sys;
    window.initializeL8Sys = function() {
        if (origInit) origInit();
        if (window.L8Health) L8Health.initialize();
        if (window.L8SysModules) L8SysModules.initialize();
        if (window.L8Logs) L8Logs.initialize();
    };

    // 3. Override CRUD methods to route to custom handlers per model
    var origOpenAdd = L8Sys._openAddModal;
    L8Sys._openAddModal = function(service) {
        if (service.model === 'L8User' && window.L8SysUsersCRUD) {
            L8SysUsersCRUD.openAdd(service);
        } else if (service.model === 'L8Role' && window.L8SysRolesCRUD) {
            L8SysRolesCRUD.openAdd(service);
        } else if (service.model === 'L8Credentials' && window.L8SysCredentialsCRUD) {
            L8SysCredentialsCRUD.openAdd(service);
        } else {
            origOpenAdd.call(SYS, service);
        }
    };

    var origOpenEdit = L8Sys._openEditModal;
    L8Sys._openEditModal = function(service, id) {
        if (service.model === 'L8User' && window.L8SysUsersCRUD) {
            L8SysUsersCRUD.openEdit(service, id);
        } else if (service.model === 'L8Role' && window.L8SysRolesCRUD) {
            L8SysRolesCRUD.openEdit(service, id);
        } else if (service.model === 'L8Credentials' && window.L8SysCredentialsCRUD) {
            L8SysCredentialsCRUD.openEdit(service, id);
        } else {
            origOpenEdit.call(SYS, service, id);
        }
    };

    var origConfirmDelete = L8Sys._confirmDeleteItem;
    L8Sys._confirmDeleteItem = function(service, id) {
        if (service.model === 'L8User' && window.L8SysUsersCRUD) {
            L8SysUsersCRUD.confirmDelete(service, id);
        } else if (service.model === 'L8Role' && window.L8SysRolesCRUD) {
            L8SysRolesCRUD.confirmDelete(service, id);
        } else if (service.model === 'L8Credentials' && window.L8SysCredentialsCRUD) {
            L8SysCredentialsCRUD.confirmDelete(service, id);
        } else {
            origConfirmDelete.call(SYS, service, id);
        }
    };

})();
