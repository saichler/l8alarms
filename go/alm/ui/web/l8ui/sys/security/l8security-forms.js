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
// Security Module - Form Definitions & Primary Keys
// Minimal form definitions for details view; CRUD uses custom handlers

(function() {
    'use strict';

    window.L8Security = window.L8Security || {};

    // Primary keys per model
    L8Security.primaryKeys = {
        L8User: 'userId',
        L8Role: 'roleId',
        L8Credentials: 'id'
    };

    // Minimal form definitions (used by details view / service registry)
    L8Security.forms = {
        L8User: {
            title: 'User',
            sections: [{
                title: 'User Info',
                fields: [
                    { key: 'userId', label: 'User ID', type: 'text', required: true },
                    { key: 'fullName', label: 'Full Name', type: 'text', required: true }
                ]
            }]
        },
        L8Role: {
            title: 'Role',
            sections: [{
                title: 'Role Info',
                fields: [
                    { key: 'roleId', label: 'Role ID', type: 'text', required: true },
                    { key: 'roleName', label: 'Role Name', type: 'text', required: true }
                ]
            }]
        },
        L8Credentials: {
            title: 'Credentials',
            sections: [{
                title: 'Credentials Info',
                fields: [
                    { key: 'id', label: 'ID', type: 'text', required: true },
                    { key: 'name', label: 'Name', type: 'text', required: true }
                ]
            }]
        }
    };

})();
