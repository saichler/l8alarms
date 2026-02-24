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
// Security Roles - Custom CRUD Handler
// Handles nested rules map with stacked rule editor modal

(function() {
    'use strict';

    var ACTION_NAMES = L8Security.enums.ACTION_NAMES;
    var tempRules = [];
    var currentEditingRuleIndex = null;
    var tempRuleActions = {};
    var tempRuleAttributes = {};
    var registryTypes = null;
    var currentService = null;
    var currentIsEdit = false;
    var currentRoleId = null;

    // Fetch registry types for Element Type dropdown
    async function fetchRegistryTypes() {
        if (registryTypes !== null) return registryTypes;
        try {
            var response = await fetch('/registry', {
                method: 'GET',
                headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}
            });
            if (!response.ok) return ['*'];
            var data = await response.json();
            if (data && data.list) {
                var sorted = data.list.slice().sort(function(a, b) { return a.localeCompare(b); });
                registryTypes = ['*'].concat(sorted);
            } else {
                registryTypes = ['*'];
            }
            return registryTypes;
        } catch (e) {
            return ['*'];
        }
    }

    // Generate rules list HTML
    function generateRulesListHtml() {
        if (tempRules.length === 0) {
            return '<p style="color: #999; padding: 10px;">No rules defined. Click "Add Rule" to create one.</p>';
        }
        return tempRules.map(function(rule, index) {
            var actionNames = Object.keys(rule.actions || {})
                .filter(function(k) { return rule.actions[k]; })
                .map(function(k) { return ACTION_NAMES[k] || k; })
                .join(', ');
            return '<div class="l8sys-rule-row">' +
                '<div class="l8sys-rule-info">' +
                '<div class="l8sys-rule-id">' + Layer8DUtils.escapeHtml(rule.ruleId) + '</div>' +
                '<div class="l8sys-rule-details">' +
                '<span class="' + (rule.allowed ? 'l8sys-tag-allow' : 'l8sys-tag-deny') + '">' + (rule.allowed ? 'Allow' : 'Deny') + '</span> ' +
                'Type: ' + Layer8DUtils.escapeHtml(rule.elemType) + ' | Actions: ' + (actionNames || 'None') +
                '</div></div>' +
                '<button type="button" class="btn btn-small" data-action="edit-rule" data-index="' + index + '">Edit</button> ' +
                '<button type="button" class="btn btn-danger btn-small" data-action="remove-rule" data-index="' + index + '">Remove</button>' +
                '</div>';
        }).join('');
    }

    // Generate role form HTML
    function generateRoleFormHtml(roleId, roleName) {
        var isEdit = currentIsEdit;
        return '<div class="form-group">' +
            '<label for="l8sys-role-id">Role ID</label>' +
            '<input type="text" id="l8sys-role-id" name="l8sys-role-id" value="' + Layer8DUtils.escapeAttr(roleId || '') + '"' + (isEdit ? ' disabled' : '') + ' required>' +
            '</div>' +
            '<div class="form-group">' +
            '<label for="l8sys-role-name">Role Name</label>' +
            '<input type="text" id="l8sys-role-name" name="l8sys-role-name" value="' + Layer8DUtils.escapeAttr(roleName || '') + '" required>' +
            '</div>' +
            '<div class="form-group">' +
            '<div class="l8sys-nested-table-header">' +
            '<span>Rules</span>' +
            '<button type="button" class="btn btn-small" data-action="add-rule">Add Rule</button>' +
            '</div>' +
            '<div id="l8sys-rules-container">' + generateRulesListHtml() + '</div>' +
            '</div>';
    }

    // Preserve form values before refresh
    function getFormValues() {
        var body = Layer8DPopup.getBody();
        if (!body) return { roleId: '', roleName: '' };
        var idEl = body.querySelector('#l8sys-role-id');
        var nameEl = body.querySelector('#l8sys-role-name');
        return {
            roleId: idEl ? idEl.value : '',
            roleName: nameEl ? nameEl.value : ''
        };
    }

    // Refresh role modal content (preserves form values)
    function refreshRoleModal() {
        var vals = getFormValues();
        var html = generateRoleFormHtml(vals.roleId, vals.roleName);
        Layer8DPopup.updateContent(html);
    }

    // Attach event delegation to role modal body
    function attachRoleModalEvents(body) {
        body.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-action]');
            if (!btn) return;
            var action = btn.dataset.action;
            var index = parseInt(btn.dataset.index, 10);

            if (action === 'add-rule') {
                openRuleModal(null);
            } else if (action === 'edit-rule' && !isNaN(index)) {
                openRuleModal(index);
            } else if (action === 'remove-rule' && !isNaN(index)) {
                tempRules.splice(index, 1);
                refreshRoleModal();
            }
        });
    }

    // Open Add Role modal
    async function openAdd(service) {
        currentService = service;
        currentIsEdit = false;
        currentRoleId = null;
        tempRules = [];

        var formHtml = generateRoleFormHtml('', '');

        Layer8DPopup.show({
            title: 'Add Role',
            content: formHtml,
            size: 'large',
            showFooter: true,
            saveButtonText: 'Save',
            onSave: function() { handleRoleSave(); },
            onShow: attachRoleModalEvents
        });
    }

    // Open Edit Role modal
    async function openEdit(service, roleId) {
        currentService = service;
        currentIsEdit = true;
        currentRoleId = roleId;

        var role = null;
        try {
            role = await Layer8DForms.fetchRecord(Layer8DConfig.resolveEndpoint(service.endpoint), 'roleId', roleId, 'L8Role');
        } catch (e) {
            Layer8DNotification.error('Failed to load role');
            return;
        }
        if (!role) {
            Layer8DNotification.error('Role not found');
            return;
        }

        tempRules = role.rules ? JSON.parse(JSON.stringify(Object.values(role.rules))) : [];
        var formHtml = generateRoleFormHtml(role.roleId, role.roleName);

        Layer8DPopup.show({
            title: 'Edit Role',
            content: formHtml,
            size: 'large',
            showFooter: true,
            saveButtonText: 'Save',
            onSave: function() { handleRoleSave(); },
            onShow: attachRoleModalEvents
        });
    }

    // Handle role save
    async function handleRoleSave() {
        var body = Layer8DPopup.getBody();
        if (!body) return;

        var idEl = body.querySelector('#l8sys-role-id');
        var nameEl = body.querySelector('#l8sys-role-name');
        var roleId = idEl ? idEl.value.trim() : '';
        var roleName = nameEl ? nameEl.value.trim() : '';

        if (!roleId || !roleName) {
            Layer8DNotification.warning('Please fill in Role ID and Role Name');
            return;
        }

        var rulesMap = {};
        tempRules.forEach(function(rule) {
            rulesMap[rule.ruleId] = rule;
        });

        var roleData = {
            roleId: roleId,
            roleName: roleName,
            rules: rulesMap
        };

        try {
            await Layer8DForms.saveRecord(Layer8DConfig.resolveEndpoint(currentService.endpoint), roleData, currentIsEdit);
            Layer8DPopup.close();
            L8Sys.refreshCurrentTable();
        } catch (e) {
            Layer8DNotification.error('Error saving role: ' + e.message);
        }
    }

    // ===== Rule Modal (stacked) =====

    // Generate actions HTML for rule form
    function generateActionsHtml() {
        var keys = Object.keys(tempRuleActions);
        if (keys.length === 0) return '';
        return keys.map(function(action) {
            if (!tempRuleActions[action]) return '';
            var options = Object.entries(ACTION_NAMES).map(function(entry) {
                return '<option value="' + Layer8DUtils.escapeAttr(entry[0]) + '"' + (action === entry[0] ? ' selected' : '') + '>' + entry[1] + '</option>';
            }).join('');
            return '<div class="l8sys-kv-row">' +
                '<select name="l8sys-action-' + Layer8DUtils.escapeAttr(action) + '">' +
                '<option value="">Select Action</option>' + options + '</select>' +
                '<button type="button" class="l8sys-remove-btn" data-action="remove-action" data-key="' + Layer8DUtils.escapeAttr(action) + '">X</button>' +
                '</div>';
        }).join('');
    }

    // Generate attributes HTML for rule form
    function generateAttributesHtml() {
        var keys = Object.keys(tempRuleAttributes);
        if (keys.length === 0) return '';
        return keys.map(function(key, idx) {
            return '<div class="l8sys-kv-row">' +
                '<input type="text" name="l8sys-attr-key-' + idx + '" placeholder="Key" value="' + Layer8DUtils.escapeAttr(key) + '">' +
                '<input type="text" name="l8sys-attr-val-' + idx + '" placeholder="Value" value="' + Layer8DUtils.escapeAttr(tempRuleAttributes[key]) + '">' +
                '<button type="button" class="l8sys-remove-btn" data-action="remove-attr" data-key="' + Layer8DUtils.escapeAttr(key) + '">X</button>' +
                '</div>';
        }).join('');
    }

    // Generate rule form HTML
    async function generateRuleFormHtml(rule) {
        var ruleId = rule ? rule.ruleId || '' : '';
        var elemType = rule ? rule.elemType || '*' : '*';
        var allowed = rule ? rule.allowed !== false : true;

        var types = await fetchRegistryTypes();
        var elemTypeOptions = types.map(function(type) {
            var selected = elemType === type ? ' selected' : '';
            return '<option value="' + Layer8DUtils.escapeAttr(type) + '"' + selected + '>' + (type === '*' ? '* (Wildcard)' : Layer8DUtils.escapeHtml(type)) + '</option>';
        }).join('');

        return '<div class="form-group">' +
            '<label for="l8sys-rule-id">Rule ID</label>' +
            '<input type="text" id="l8sys-rule-id" name="l8sys-rule-id" value="' + Layer8DUtils.escapeAttr(ruleId) + '" required>' +
            '</div>' +
            '<div class="form-group">' +
            '<label for="l8sys-rule-elem-type">Element Type</label>' +
            '<select id="l8sys-rule-elem-type" name="l8sys-rule-elem-type">' + elemTypeOptions + '</select>' +
            '</div>' +
            '<div class="form-group">' +
            '<label for="l8sys-rule-allowed">Rule Type</label>' +
            '<select id="l8sys-rule-allowed" name="l8sys-rule-allowed">' +
            '<option value="true"' + (allowed ? ' selected' : '') + '>Allow</option>' +
            '<option value="false"' + (!allowed ? ' selected' : '') + '>Deny</option>' +
            '</select></div>' +
            '<div class="form-group">' +
            '<div class="l8sys-nested-table-header"><span>Actions</span>' +
            '<button type="button" class="btn btn-small" data-action="add-action">Add Action</button></div>' +
            '<div id="l8sys-actions-container">' + generateActionsHtml() + '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<div class="l8sys-nested-table-header"><span>Attributes</span>' +
            '<button type="button" class="btn btn-small" data-action="add-attr">Add Attribute</button></div>' +
            '<div id="l8sys-attrs-container">' + generateAttributesHtml() + '</div>' +
            '</div>';
    }

    // Get current rule form values
    function getRuleFormValues() {
        var body = Layer8DPopup.getBody();
        if (!body) return null;
        var idEl = body.querySelector('#l8sys-rule-id');
        var typeEl = body.querySelector('#l8sys-rule-elem-type');
        var allowedEl = body.querySelector('#l8sys-rule-allowed');
        return {
            ruleId: idEl ? idEl.value : '',
            elemType: typeEl ? typeEl.value : '*',
            allowed: allowedEl ? allowedEl.value === 'true' : true
        };
    }

    // Refresh rule modal content
    async function refreshRuleModal() {
        var vals = getRuleFormValues();
        var html = await generateRuleFormHtml(vals);
        Layer8DPopup.updateContent(html);
    }

    // Attach event delegation to rule modal body
    function attachRuleModalEvents(body) {
        body.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-action]');
            if (!btn) return;
            var action = btn.dataset.action;
            var key = btn.dataset.key;

            if (action === 'add-action') {
                tempRuleActions['_new_' + Date.now()] = true;
                refreshRuleModal();
            } else if (action === 'remove-action' && key) {
                delete tempRuleActions[key];
                refreshRuleModal();
            } else if (action === 'add-attr') {
                tempRuleAttributes['_new_attr_' + Date.now()] = '';
                refreshRuleModal();
            } else if (action === 'remove-attr' && key) {
                delete tempRuleAttributes[key];
                refreshRuleModal();
            }
        });
    }

    // Open rule modal (stacked on top of role modal)
    async function openRuleModal(index) {
        currentEditingRuleIndex = index;

        if (index !== null && index !== undefined && tempRules[index]) {
            var rule = tempRules[index];
            tempRuleActions = JSON.parse(JSON.stringify(rule.actions || {}));
            tempRuleAttributes = JSON.parse(JSON.stringify(rule.attributes || {}));
        } else {
            tempRuleActions = {};
            tempRuleAttributes = {};
        }

        var ruleData = index !== null && index !== undefined && tempRules[index] ? tempRules[index] : null;
        var formHtml = await generateRuleFormHtml(ruleData);

        Layer8DPopup.show({
            title: index !== null && index !== undefined ? 'Edit Rule' : 'Add Rule',
            content: formHtml,
            size: 'medium',
            showFooter: true,
            saveButtonText: 'Save Rule',
            onSave: function() { handleRuleSave(); },
            onShow: attachRuleModalEvents
        });
    }

    // Handle rule save
    function handleRuleSave() {
        var body = Layer8DPopup.getBody();
        if (!body) return;

        var ruleId = (body.querySelector('#l8sys-rule-id') || {}).value || '';
        var elemType = (body.querySelector('#l8sys-rule-elem-type') || {}).value || '*';
        var allowed = ((body.querySelector('#l8sys-rule-allowed') || {}).value || 'true') === 'true';

        ruleId = ruleId.trim();
        elemType = elemType.trim();

        if (!ruleId || !elemType) {
            Layer8DNotification.warning('Please fill in Rule ID and Element Type');
            return;
        }

        // Collect actions from selects
        var actions = {};
        body.querySelectorAll('select[name^="l8sys-action-"]').forEach(function(sel) {
            if (sel.value) actions[sel.value] = true;
        });

        // Collect attributes
        var attributes = {};
        var attrKeys = body.querySelectorAll('input[name^="l8sys-attr-key-"]');
        attrKeys.forEach(function(keyInput) {
            var idx = keyInput.name.replace('l8sys-attr-key-', '');
            var valInput = body.querySelector('input[name="l8sys-attr-val-' + idx + '"]');
            var k = keyInput.value.trim();
            if (k && !k.startsWith('_new_attr_')) {
                attributes[k] = valInput ? valInput.value : '';
            }
        });

        var rule = {
            ruleId: ruleId,
            elemType: elemType,
            allowed: allowed,
            actions: actions,
            attributes: attributes
        };

        if (currentEditingRuleIndex !== null && currentEditingRuleIndex !== undefined) {
            tempRules[currentEditingRuleIndex] = rule;
        } else {
            var exists = tempRules.findIndex(function(r) { return r.ruleId === ruleId; });
            if (exists >= 0) {
                Layer8DNotification.warning('Rule ID already exists in this role');
                return;
            }
            tempRules.push(rule);
        }

        currentEditingRuleIndex = null;
        Layer8DPopup.close();

        // Refresh parent role modal
        setTimeout(function() { refreshRoleModal(); }, 250);
    }

    // Note: refreshRoleModal is called in this context to refresh the ROLE modal,
    // not the rule modal. After we close the rule modal, the role modal is the top.
    // We redefine refreshRoleModal here to target the role modal body.
    var _origRefreshRoleModal = refreshRoleModal;
    refreshRoleModal = function() {
        var body = Layer8DPopup.getBody();
        if (!body) return;
        // Check if we're back in the role modal (has l8sys-role-id)
        if (body.querySelector('#l8sys-role-id')) {
            var vals = {
                roleId: (body.querySelector('#l8sys-role-id') || {}).value || '',
                roleName: (body.querySelector('#l8sys-role-name') || {}).value || ''
            };
            var html = generateRoleFormHtml(vals.roleId, vals.roleName);
            Layer8DPopup.updateContent(html);
        }
    };

    // Confirm delete
    function confirmDelete(service, roleId) {
        var serviceConfig = {
            endpoint: Layer8DConfig.resolveEndpoint(service.endpoint),
            primaryKey: 'roleId',
            modelName: 'L8Role'
        };
        Layer8DForms.confirmDelete(serviceConfig, roleId, function() {
            L8Sys.refreshCurrentTable();
        });
    }

    window.L8SysRolesCRUD = {
        openAdd: openAdd,
        openEdit: openEdit,
        confirmDelete: confirmDelete
    };

})();
