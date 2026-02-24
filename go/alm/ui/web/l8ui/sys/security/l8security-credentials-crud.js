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
// Security Credentials - Custom CRUD Handler
// Handles nested creds map with stacked credential item editor modal

(function() {
    'use strict';

    var tempCredItems = [];
    var currentCredItemEditIndex = -1;
    var currentService = null;
    var currentIsEdit = false;
    var currentCredId = null;

    // Convert creds map to array
    function credsMapToArray(credsMap) {
        if (!credsMap) return [];
        return Object.entries(credsMap).map(function(entry) {
            return {
                key: entry[0],
                aside: entry[1].aside || '',
                yside: entry[1].yside || '',
                zside: entry[1].zside || ''
            };
        });
    }

    // Convert creds array to map
    function credsArrayToMap(credsArray) {
        var map = {};
        credsArray.forEach(function(item) {
            if (item.key && item.key.trim()) {
                map[item.key.trim()] = {
                    aside: item.aside || '',
                    yside: item.yside || '',
                    zside: item.zside || ''
                };
            }
        });
        return map;
    }

    // Mask a value for display
    function maskValue(value) {
        if (!value) return '<span style="color: #999;">-</span>';
        return '********';
    }

    // Generate credential items table HTML
    function generateCredItemsTableHtml() {
        if (tempCredItems.length === 0) {
            return '<tr><td colspan="5" style="text-align: center; color: #999; padding: 16px;">' +
                'No credential items. Click "Add Item" to add one.</td></tr>';
        }
        return tempCredItems.map(function(item, index) {
            return '<tr>' +
                '<td>' + Layer8DUtils.escapeHtml(item.key) + '</td>' +
                '<td class="l8sys-masked-value">' + maskValue(item.aside) + '</td>' +
                '<td class="l8sys-masked-value">' + maskValue(item.yside) + '</td>' +
                '<td class="l8sys-masked-value">' + maskValue(item.zside) + '</td>' +
                '<td>' +
                '<button type="button" class="btn btn-small" data-action="edit-item" data-index="' + index + '">Edit</button> ' +
                '<button type="button" class="btn btn-danger btn-small" data-action="remove-item" data-index="' + index + '">Delete</button>' +
                '</td></tr>';
        }).join('');
    }

    // Generate credentials form HTML
    function generateCredentialsFormHtml(credId, credName) {
        var isEdit = currentIsEdit;
        return '<div class="form-group">' +
            '<label for="l8sys-cred-id">ID</label>' +
            '<input type="text" id="l8sys-cred-id" name="l8sys-cred-id" value="' + Layer8DUtils.escapeAttr(credId || '') + '"' + (isEdit ? ' disabled' : '') + ' required>' +
            '</div>' +
            '<div class="form-group">' +
            '<label for="l8sys-cred-name">Name</label>' +
            '<input type="text" id="l8sys-cred-name" name="l8sys-cred-name" value="' + Layer8DUtils.escapeAttr(credName || '') + '" required>' +
            '</div>' +
            '<div class="form-group">' +
            '<div class="l8sys-nested-table-header">' +
            '<span>Credential Items</span>' +
            '<button type="button" class="btn btn-small" data-action="add-item">Add Item</button>' +
            '</div>' +
            '<table class="l8sys-nested-table">' +
            '<thead><tr><th>Key</th><th>A-Side</th><th>Y-Side</th><th>Z-Side</th><th>Actions</th></tr></thead>' +
            '<tbody>' + generateCredItemsTableHtml() + '</tbody>' +
            '</table></div>';
    }

    // Get current form values
    function getFormValues() {
        var body = Layer8DPopup.getBody();
        if (!body) return { id: '', name: '' };
        var idEl = body.querySelector('#sys-cred-id');
        var nameEl = body.querySelector('#sys-cred-name');
        return {
            id: idEl ? idEl.value : '',
            name: nameEl ? nameEl.value : ''
        };
    }

    // Refresh credentials modal content
    function refreshCredModal() {
        var vals = getFormValues();
        var html = generateCredentialsFormHtml(vals.id, vals.name);
        Layer8DPopup.updateContent(html);
    }

    // Attach event delegation to credentials modal body
    function attachCredModalEvents(body) {
        body.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-action]');
            if (!btn) return;
            var action = btn.dataset.action;
            var index = parseInt(btn.dataset.index, 10);

            if (action === 'add-item') {
                openCredItemModal(null);
            } else if (action === 'edit-item' && !isNaN(index)) {
                openCredItemModal(index);
            } else if (action === 'remove-item' && !isNaN(index)) {
                tempCredItems.splice(index, 1);
                refreshCredModal();
            }
        });
    }

    // Open Add Credentials modal
    async function openAdd(service) {
        currentService = service;
        currentIsEdit = false;
        currentCredId = null;
        tempCredItems = [];

        var formHtml = generateCredentialsFormHtml('', '');

        Layer8DPopup.show({
            title: 'Add Credentials',
            content: formHtml,
            size: 'large',
            showFooter: true,
            saveButtonText: 'Save',
            onSave: function() { handleCredSave(); },
            onShow: attachCredModalEvents
        });
    }

    // Open Edit Credentials modal
    async function openEdit(service, credId) {
        currentService = service;
        currentIsEdit = true;
        currentCredId = credId;

        var cred = null;
        try {
            cred = await Layer8DForms.fetchRecord(Layer8DConfig.resolveEndpoint(service.endpoint), 'id', credId, 'L8Credentials');
        } catch (e) {
            Layer8DNotification.error('Failed to load credentials');
            return;
        }
        if (!cred) {
            Layer8DNotification.error('Credentials not found');
            return;
        }

        tempCredItems = credsMapToArray(cred.creds);
        var formHtml = generateCredentialsFormHtml(cred.id, cred.name);

        Layer8DPopup.show({
            title: 'Edit Credentials',
            content: formHtml,
            size: 'large',
            showFooter: true,
            saveButtonText: 'Save',
            onSave: function() { handleCredSave(); },
            onShow: attachCredModalEvents
        });
    }

    // Handle credentials save
    async function handleCredSave() {
        var body = Layer8DPopup.getBody();
        if (!body) return;

        var idEl = body.querySelector('#sys-cred-id');
        var nameEl = body.querySelector('#sys-cred-name');
        var id = idEl ? idEl.value.trim() : '';
        var name = nameEl ? nameEl.value.trim() : '';

        if (!id || !name) {
            Layer8DNotification.warning('Please fill in ID and Name');
            return;
        }

        var credData = {
            id: id,
            name: name,
            creds: credsArrayToMap(tempCredItems)
        };

        try {
            await Layer8DForms.saveRecord(Layer8DConfig.resolveEndpoint(currentService.endpoint), credData, currentIsEdit);
            Layer8DPopup.close();
            L8Sys.refreshCurrentTable();
        } catch (e) {
            Layer8DNotification.error('Error saving credentials: ' + e.message);
        }
    }

    // ===== Credential Item Modal (stacked) =====

    // Generate credential item form HTML
    function generateCredItemFormHtml(item) {
        var isEdit = item !== null;
        return '<div class="form-group">' +
            '<label for="l8sys-cred-item-key">Key</label>' +
            '<input type="text" id="l8sys-cred-item-key" name="l8sys-cred-item-key" value="' + Layer8DUtils.escapeAttr(isEdit ? item.key : '') + '"' + (isEdit ? ' disabled' : '') + ' placeholder="e.g., db, api, ssh" required>' +
            '</div>' +
            '<div class="form-group">' +
            '<label for="l8sys-cred-item-aside">A-Side</label>' +
            '<div class="l8sys-input-with-toggle">' +
            '<input type="password" id="l8sys-cred-item-aside" name="l8sys-cred-item-aside" value="' + Layer8DUtils.escapeAttr(isEdit ? item.aside : '') + '" placeholder="Enter value">' +
            '<button type="button" class="l8sys-toggle-btn" data-action="toggle-vis" data-field="l8sys-cred-item-aside">Show</button>' +
            '</div></div>' +
            '<div class="form-group">' +
            '<label for="l8sys-cred-item-yside">Y-Side</label>' +
            '<div class="l8sys-input-with-toggle">' +
            '<input type="password" id="l8sys-cred-item-yside" name="l8sys-cred-item-yside" value="' + Layer8DUtils.escapeAttr(isEdit ? item.yside : '') + '" placeholder="Enter value">' +
            '<button type="button" class="l8sys-toggle-btn" data-action="toggle-vis" data-field="l8sys-cred-item-yside">Show</button>' +
            '</div></div>' +
            '<div class="form-group">' +
            '<label for="l8sys-cred-item-zside">Z-Side</label>' +
            '<div class="l8sys-input-with-toggle">' +
            '<input type="password" id="l8sys-cred-item-zside" name="l8sys-cred-item-zside" value="' + Layer8DUtils.escapeAttr(isEdit ? item.zside : '') + '" placeholder="Enter value">' +
            '<button type="button" class="l8sys-toggle-btn" data-action="toggle-vis" data-field="l8sys-cred-item-zside">Show</button>' +
            '</div></div>';
    }

    // Attach event delegation to credential item modal body
    function attachCredItemModalEvents(body) {
        body.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-action="toggle-vis"]');
            if (!btn) return;
            var fieldId = btn.dataset.field;
            var input = body.querySelector('#' + fieldId);
            if (input) {
                if (input.type === 'password') {
                    input.type = 'text';
                    btn.textContent = 'Hide';
                } else {
                    input.type = 'password';
                    btn.textContent = 'Show';
                }
            }
        });
    }

    // Open credential item modal (stacked)
    function openCredItemModal(index) {
        currentCredItemEditIndex = (index !== null && index !== undefined) ? index : -1;
        var item = currentCredItemEditIndex >= 0 ? tempCredItems[currentCredItemEditIndex] : null;
        var formHtml = generateCredItemFormHtml(item);

        Layer8DPopup.show({
            title: item ? 'Edit Credential Item' : 'Add Credential Item',
            content: formHtml,
            size: 'medium',
            showFooter: true,
            saveButtonText: 'Save Item',
            onSave: function() { handleCredItemSave(); },
            onShow: attachCredItemModalEvents
        });
    }

    // Handle credential item save
    function handleCredItemSave() {
        var body = Layer8DPopup.getBody();
        if (!body) return;

        var key = (body.querySelector('#sys-cred-item-key') || {}).value || '';
        var aside = (body.querySelector('#sys-cred-item-aside') || {}).value || '';
        var yside = (body.querySelector('#sys-cred-item-yside') || {}).value || '';
        var zside = (body.querySelector('#sys-cred-item-zside') || {}).value || '';

        key = key.trim();
        if (!key) {
            Layer8DNotification.warning('Key is required');
            return;
        }

        // Check for duplicate key on new items
        if (currentCredItemEditIndex < 0) {
            var exists = tempCredItems.findIndex(function(i) { return i.key === key; });
            if (exists >= 0) {
                Layer8DNotification.warning('A credential with this key already exists');
                return;
            }
        }

        var credItem = { key: key, aside: aside, yside: yside, zside: zside };

        if (currentCredItemEditIndex >= 0) {
            tempCredItems[currentCredItemEditIndex] = credItem;
        } else {
            tempCredItems.push(credItem);
        }

        currentCredItemEditIndex = -1;
        Layer8DPopup.close();

        // Refresh parent credentials modal
        setTimeout(function() { refreshCredModal(); }, 250);
    }

    // Confirm delete
    function confirmDelete(service, credId) {
        var serviceConfig = {
            endpoint: Layer8DConfig.resolveEndpoint(service.endpoint),
            primaryKey: 'id',
            modelName: 'L8Credentials'
        };
        Layer8DForms.confirmDelete(serviceConfig, credId, function() {
            L8Sys.refreshCurrentTable();
        });
    }

    window.L8SysCredentialsCRUD = {
        openAdd: openAdd,
        openEdit: openEdit,
        confirmDelete: confirmDelete
    };

})();
