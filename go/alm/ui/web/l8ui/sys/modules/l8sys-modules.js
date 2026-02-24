/*
 * L8SysModules - Modules settings page orchestrator.
 * Thin consumer of Layer8DToggleTree + L8SysDependencyGraph.
 */
(function() {
    'use strict';

    window.L8SysModules = {
        _treeInstance: null,
        _dirty: false,

        initialize: function() {
            var container = document.getElementById('modules-settings-container');
            if (!container) return;
            container.innerHTML = '';

            var graph = window.L8SysDependencyGraph;
            var filter = window.Layer8DModuleFilter;
            if (!graph) return;

            var disabled = filter ? new Set(filter._disabledPaths) : new Set();

            // 1. Render dependency map
            if (window.L8SysModulesMap) {
                L8SysModulesMap.render(container, disabled);
            }

            // 2. Build tree data from dependency graph + section configs
            var treeNodes = this._buildTreeNodes(graph);
            var dependencies = this._buildDependencyMap(graph);

            // 3. Tree container
            var treeSection = document.createElement('div');
            treeSection.className = 'l8sys-modules-tree-section';

            var treeTitle = document.createElement('h3');
            treeTitle.className = 'l8sys-modules-tree-title';
            treeTitle.textContent = 'Module Settings';
            treeSection.appendChild(treeTitle);

            var treeDesc = document.createElement('p');
            treeDesc.className = 'l8sys-modules-tree-desc';
            treeDesc.textContent = 'Toggle modules, sub-modules, and services on or off. Dependency rules are enforced automatically.';
            treeSection.appendChild(treeDesc);

            var treeContainer = document.createElement('div');
            treeContainer.className = 'l8sys-modules-tree-container';
            treeSection.appendChild(treeContainer);
            container.appendChild(treeSection);

            // 4. Create toggle tree
            var self = this;
            this._treeInstance = Layer8DToggleTree.create({
                container: treeContainer,
                nodes: treeNodes,
                dependencies: dependencies,
                disabledPaths: disabled,
                onToggle: function(path, enabled, allDisabled) {
                    self._dirty = true;
                    self._updateSaveBtn();
                    // Refresh the map
                    if (window.L8SysModulesMap) {
                        L8SysModulesMap.refresh(container, allDisabled);
                    }
                },
                options: {
                    collapsedByDefault: true,
                    showFoundationBadge: true,
                    confirmAutoEnable: true
                }
            });

            // 5. Action bar
            this._renderActions(container);
        },

        _buildTreeNodes: function(graph) {
            var nodes = [];
            var moduleKeys = Object.keys(graph.modules);

            for (var i = 0; i < moduleKeys.length; i++) {
                var modKey = moduleKeys[i];
                var mod = graph.modules[modKey];
                var subModules = graph.subModules[modKey] || {};
                var subKeys = Object.keys(subModules);

                var children = [];
                for (var j = 0; j < subKeys.length; j++) {
                    var subKey = subKeys[j];
                    var sub = subModules[subKey];

                    // Get services from section configs if available
                    var serviceChildren = this._getServiceNodes(modKey, subKey);

                    children.push({
                        key: subKey,
                        label: this._formatLabel(subKey),
                        icon: this._getSubModuleIcon(modKey, subKey),
                        foundation: sub.foundation || false,
                        children: serviceChildren
                    });
                }

                nodes.push({
                    key: modKey,
                    label: mod.label,
                    icon: mod.icon,
                    children: children
                });
            }
            return nodes;
        },

        _getServiceNodes: function(modKey, subKey) {
            // Try to find services from section config data
            var configs = window.Layer8SectionConfigs;
            if (!configs || !configs._configs || !configs._configs[modKey]) return [];

            var sectionConfig = configs._configs[modKey];
            var modules = sectionConfig.modules || [];
            for (var i = 0; i < modules.length; i++) {
                if (modules[i].key === subKey) {
                    var services = modules[i].services || [];
                    return services.map(function(s) {
                        return { key: s.key, label: s.label, icon: s.icon };
                    });
                }
            }
            return [];
        },

        _buildDependencyMap: function(graph) {
            var deps = {};
            var moduleKeys = Object.keys(graph.modules);

            // Module-level dependencies
            for (var i = 0; i < moduleKeys.length; i++) {
                var modKey = moduleKeys[i];
                deps[modKey] = graph.modules[modKey].depends.slice();
            }

            // Sub-module dependencies (include parent module as implicit dep)
            for (var m = 0; m < moduleKeys.length; m++) {
                var mk = moduleKeys[m];
                var subs = graph.subModules[mk] || {};
                var subKeys = Object.keys(subs);
                for (var s = 0; s < subKeys.length; s++) {
                    var subPath = mk + '.' + subKeys[s];
                    var subDeps = (subs[subKeys[s]].depends || []).map(function(d) {
                        return mk + '.' + d;
                    });
                    deps[subPath] = subDeps;
                }
            }

            // Service-level dependencies
            var serviceKeys = Object.keys(graph.services || {});
            for (var k = 0; k < serviceKeys.length; k++) {
                var svcParent = serviceKeys[k];
                var svcs = graph.services[svcParent];
                var svcNames = Object.keys(svcs);
                for (var v = 0; v < svcNames.length; v++) {
                    var svcPath = svcParent + '.' + svcNames[v];
                    var svcDeps = (svcs[svcNames[v]].depends || []).map(function(d) {
                        return svcParent + '.' + d;
                    });
                    deps[svcPath] = svcDeps;
                }
            }

            return deps;
        },

        _renderActions: function(container) {
            var bar = document.createElement('div');
            bar.className = 'l8sys-modules-actions';

            var saveBtn = document.createElement('button');
            saveBtn.className = 'l8sys-modules-save-btn';
            saveBtn.textContent = 'Save Changes';
            saveBtn.disabled = true;
            saveBtn.id = 'l8sys-modules-save';

            var self = this;
            saveBtn.onclick = function() { self._save(); };

            var cancelBtn = document.createElement('button');
            cancelBtn.className = 'l8sys-modules-cancel-btn';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.onclick = function() { self._cancel(); };

            var enableAllBtn = document.createElement('button');
            enableAllBtn.className = 'l8sys-modules-cancel-btn';
            enableAllBtn.textContent = 'Enable All';
            enableAllBtn.onclick = function() { self._enableAll(); };

            bar.appendChild(enableAllBtn);
            bar.appendChild(cancelBtn);
            bar.appendChild(saveBtn);
            container.appendChild(bar);
        },

        _updateSaveBtn: function() {
            var btn = document.getElementById('l8sys-modules-save');
            if (btn) btn.disabled = !this._dirty;
        },

        _save: async function() {
            if (!this._treeInstance) return;
            var disabled = this._treeInstance.getDisabledPaths();
            var token = sessionStorage.getItem('bearerToken');
            var saved = await Layer8DModuleFilter.save(disabled, token);
            if (saved) {
                this._dirty = false;
                this._updateSaveBtn();
                var msg = 'Module settings saved. Changes will take effect on next page reload.';
                if (confirm(msg + '\n\nReload now?')) {
                    window.location.reload();
                }
            }
        },

        _enableAll: function() {
            if (!this._treeInstance) return;
            this._treeInstance._disabled.clear();
            this._treeInstance._refreshStates();
            this._dirty = true;
            this._updateSaveBtn();
            var container = document.getElementById('modules-settings-container');
            if (container && window.L8SysModulesMap) {
                L8SysModulesMap.refresh(container, this._treeInstance._disabled);
            }
        },

        _cancel: function() {
            if (this._dirty && !confirm('Discard unsaved changes?')) return;
            this._dirty = false;
            this.initialize();
        },

        _formatLabel: function(key) {
            return key.split('-').map(function(w) {
                return w.charAt(0).toUpperCase() + w.slice(1);
            }).join(' ');
        },

        _getSubModuleIcon: function(modKey, subKey) {
            var configs = window.Layer8SectionConfigs;
            if (!configs || !configs._configs || !configs._configs[modKey]) return '';
            var modules = configs._configs[modKey].modules || [];
            for (var i = 0; i < modules.length; i++) {
                if (modules[i].key === subKey) return modules[i].icon || '';
            }
            return '';
        }
    };

})();
