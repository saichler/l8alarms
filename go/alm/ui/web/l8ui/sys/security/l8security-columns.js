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
// Security Module - Column Definitions
// Table column configurations for L8User, L8Role, L8Credentials

(function() {
    'use strict';

    window.L8Security = window.L8Security || {};
    L8Security.columns = {};

    // L8User columns
    L8Security.columns.L8User = [
        { key: 'userId', label: 'User ID', sortable: true, filterable: true },
        { key: 'fullName', label: 'Full Name', sortable: true, filterable: true },
        {
            label: 'Assigned Roles',
            render: function(user) {
                const roleIds = Object.keys(user.roles || {}).filter(function(r) {
                    return user.roles[r];
                });
                if (roleIds.length === 0) return '-';
                return roleIds.map(function(r) {
                    return '<span class="layer8d-tag">' + Layer8DUtils.escapeHtml(r) + '</span>';
                }).join(' ');
            }
        }
    ];

    // L8Role columns
    L8Security.columns.L8Role = [
        { key: 'roleId', label: 'Role ID', sortable: true, filterable: true },
        { key: 'roleName', label: 'Role Name', sortable: true, filterable: true },
        {
            label: 'Rules Count',
            render: function(role) {
                var count = role.rules ? Object.keys(role.rules).length : 0;
                return String(count);
            }
        }
    ];

    // L8Credentials columns
    L8Security.columns.L8Credentials = [
        { key: 'id', label: 'ID', sortable: true, filterable: true },
        { key: 'name', label: 'Name', sortable: true, filterable: true },
        {
            label: 'Items Count',
            render: function(cred) {
                var count = cred.creds ? Object.keys(cred.creds).length : 0;
                return String(count);
            }
        }
    ];

})();
