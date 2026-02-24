/*
 * Layer8DToggleTree - Generic collapsible toggle tree with dependency enforcement.
 * Domain-agnostic: receives tree structure and dependency graph as plain data.
 * Reusable for any hierarchical toggle with dependency rules.
 */
(function() {
    'use strict';

    window.Layer8DToggleTree = {

        /**
         * Create a toggle tree inside a container.
         * @param {Object} config
         * @param {HTMLElement} config.container  - DOM element to render into
         * @param {Array} config.nodes           - Hierarchical tree data
         * @param {Object} config.dependencies   - Flat map: { 'path': ['dep1','dep2'] }
         * @param {Set} config.disabledPaths     - Initial set of disabled dot-paths
         * @param {Function} config.onToggle     - Callback: (path, enabled, allDisabled) => {}
         * @param {Object} [config.options]      - Optional overrides
         * @returns {Object} Tree instance with getDisabledPaths() method
         */
        create: function(config) {
            var container = config.container;
            var nodes = config.nodes;
            var deps = config.dependencies || {};
            var disabled = new Set(config.disabledPaths || []);
            var onToggle = config.onToggle || function() {};
            var opts = config.options || {};

            var instance = {
                _container: container,
                _nodes: nodes,
                _deps: deps,
                _disabled: disabled,
                _onToggle: onToggle,
                _opts: opts,
                _nodeMap: {},

                getDisabledPaths: function() {
                    return new Set(this._disabled);
                },

                _isEnabled: function(path) {
                    // Disabled if path itself or any ancestor is disabled
                    var parts = path.split('.');
                    for (var i = 1; i <= parts.length; i++) {
                        if (this._disabled.has(parts.slice(0, i).join('.'))) return false;
                    }
                    return true;
                },

                _canDisable: function(path) {
                    // Check if any enabled path depends on this path
                    var self = this;
                    var keys = Object.keys(this._deps);
                    for (var i = 0; i < keys.length; i++) {
                        var p = keys[i];
                        if (p === path) continue;
                        if (!self._isEnabled(p)) continue;
                        var chain = self._getFullDependencyChain(p);
                        if (chain.has(path)) return false;
                    }
                    return true;
                },

                _getFullDependencyChain: function(path) {
                    var result = new Set();
                    var queue = (this._deps[path] || []).slice();
                    while (queue.length > 0) {
                        var dep = queue.shift();
                        if (result.has(dep)) continue;
                        result.add(dep);
                        var transitive = this._deps[dep] || [];
                        for (var i = 0; i < transitive.length; i++) {
                            if (!result.has(transitive[i])) queue.push(transitive[i]);
                        }
                    }
                    return result;
                },

                _getAutoEnablePaths: function(path) {
                    var result = new Set();
                    // Enable all dependencies
                    var chain = this._getFullDependencyChain(path);
                    chain.forEach(function(dep) {
                        if (!this._isEnabled(dep)) result.add(dep);
                    }.bind(this));
                    // Enable all ancestor paths
                    var parts = path.split('.');
                    for (var i = 1; i < parts.length; i++) {
                        var ancestor = parts.slice(0, i).join('.');
                        if (!this._isEnabled(ancestor)) result.add(ancestor);
                    }
                    return result;
                },

                _getDependentLabels: function(path) {
                    var labels = [];
                    var self = this;
                    Object.keys(this._deps).forEach(function(p) {
                        if (p === path || !self._isEnabled(p)) return;
                        var chain = self._getFullDependencyChain(p);
                        if (chain.has(path)) {
                            var node = self._nodeMap[p];
                            labels.push(node ? node.label : p);
                        }
                    });
                    return labels;
                },

                _getCascadeDisablePaths: function(path) {
                    var self = this;
                    var result = [];
                    var visited = new Set();
                    var queue = [path];
                    while (queue.length > 0) {
                        var current = queue.shift();
                        Object.keys(self._deps).forEach(function(p) {
                            if (visited.has(p) || p === path || !self._isEnabled(p)) return;
                            var directDeps = self._deps[p] || [];
                            if (directDeps.indexOf(current) !== -1) {
                                visited.add(p);
                                result.push(p);
                                queue.push(p);
                            }
                        });
                    }
                    // Also include children (sub-paths) that are enabled
                    var prefix = path + '.';
                    Object.keys(self._nodeMap).forEach(function(p) {
                        if (p.indexOf(prefix) === 0 && self._isEnabled(p) && !visited.has(p)) {
                            result.push(p);
                        }
                    });
                    return result;
                },

                _handleToggle: function(path, newEnabled) {
                    if (newEnabled) {
                        // Enable: auto-enable dependencies
                        var autoEnable = this._getAutoEnablePaths(path);
                        if (autoEnable.size > 0 && this._opts.confirmAutoEnable) {
                            var labels = [];
                            autoEnable.forEach(function(p) {
                                var node = this._nodeMap[p];
                                labels.push(node ? node.label : p);
                            }.bind(this));
                            var msg = 'Enabling this will also enable:\n' + labels.join(', ') + '\n\nContinue?';
                            if (!confirm(msg)) return;
                        }
                        // Remove path and all auto-enable paths from disabled
                        this._disabled.delete(path);
                        autoEnable.forEach(function(p) { this._disabled.delete(p); }.bind(this));
                        // Also remove any children that were individually disabled
                        var prefix = path + '.';
                        var toRemove = [];
                        this._disabled.forEach(function(d) {
                            if (d.indexOf(prefix) === 0) toRemove.push(d);
                        });
                        toRemove.forEach(function(d) { this._disabled.delete(d); }.bind(this));
                    } else {
                        // Disable: collect cascade targets
                        var that = this;
                        var cascadePaths = this._getCascadeDisablePaths(path);
                        if (cascadePaths.length > 0) {
                            var cascadeLabels = cascadePaths.map(function(p) {
                                var node = that._nodeMap[p];
                                return node ? (node.icon ? node.icon + ' ' : '') + node.label : p;
                            });
                            var msg = 'Disabling this will also disable the following dependent items:\n\n' +
                                cascadeLabels.map(function(l) { return '  ' + l; }).join('\n') +
                                '\n\nDisable all?';
                            if (!confirm(msg)) return;
                            for (var ci = 0; ci < cascadePaths.length; ci++) {
                                this._disabled.add(cascadePaths[ci]);
                            }
                        }
                        this._disabled.add(path);
                        // Remove any child paths (parent covers them implicitly)
                        var pfx = path + '.';
                        var childRemove = [];
                        this._disabled.forEach(function(d) {
                            if (d.indexOf(pfx) === 0) childRemove.push(d);
                        });
                        childRemove.forEach(function(d) { this._disabled.delete(d); }.bind(this));
                    }
                    this._refreshStates();
                    this._onToggle(path, newEnabled, this._disabled);
                },

                _refreshStates: function() {
                    var self = this;
                    Object.keys(this._nodeMap).forEach(function(path) {
                        var el = self._container.querySelector('[data-path="' + path + '"]');
                        if (!el) return;
                        var toggle = el.querySelector('.l8-toggle-input');
                        var row = el.querySelector('.l8-toggle-row');
                        if (!toggle || !row) return;

                        var enabled = self._isEnabled(path);
                        toggle.checked = enabled;

                        var canDisable = enabled ? self._canDisable(path) : true;
                        var isFoundation = self._nodeMap[path].foundation;

                        // Determine if parent is disabled (makes this implicitly disabled)
                        var parts = path.split('.');
                        var parentDisabled = false;
                        for (var i = 1; i < parts.length; i++) {
                            if (self._disabled.has(parts.slice(0, i).join('.'))) {
                                parentDisabled = true;
                                break;
                            }
                        }

                        row.classList.toggle('l8-toggle-locked', !canDisable && enabled);
                        row.classList.toggle('l8-toggle-implicit', parentDisabled);
                        toggle.disabled = parentDisabled;

                        // Update tooltip
                        var tooltip = row.querySelector('.l8-toggle-tooltip');
                        if (tooltip) {
                            if (!canDisable && enabled) {
                                var deps = self._getDependentLabels(path);
                                tooltip.textContent = 'Required by: ' + deps.join(', ');
                                tooltip.style.display = '';
                            } else {
                                tooltip.style.display = 'none';
                            }
                        }
                    });
                },

                render: function() {
                    this._container.innerHTML = '';
                    var tree = document.createElement('div');
                    tree.className = 'l8-toggle-tree';
                    this._renderNodes(tree, this._nodes, '', 0);
                    this._container.appendChild(tree);
                    this._refreshStates();
                },

                _renderNodes: function(parent, nodes, parentPath, depth) {
                    var self = this;
                    for (var i = 0; i < nodes.length; i++) {
                        var node = nodes[i];
                        var path = parentPath ? parentPath + '.' + node.key : node.key;
                        this._nodeMap[path] = node;

                        var wrapper = document.createElement('div');
                        wrapper.className = 'l8-toggle-node';
                        wrapper.setAttribute('data-path', path);
                        wrapper.style.paddingLeft = (depth * 24) + 'px';

                        var row = document.createElement('div');
                        row.className = 'l8-toggle-row';

                        // Collapse button (if has children)
                        if (node.children && node.children.length > 0) {
                            var collapseBtn = document.createElement('button');
                            collapseBtn.className = 'l8-toggle-collapse';
                            collapseBtn.textContent = this._opts.collapsedByDefault ? '\u25B6' : '\u25BC';
                            collapseBtn.onclick = (function(btn, w) {
                                return function() {
                                    var childContainer = w.querySelector('.l8-toggle-children');
                                    if (!childContainer) return;
                                    var collapsed = childContainer.style.display === 'none';
                                    childContainer.style.display = collapsed ? '' : 'none';
                                    btn.textContent = collapsed ? '\u25BC' : '\u25B6';
                                };
                            })(collapseBtn, wrapper);
                            row.appendChild(collapseBtn);
                        } else {
                            var spacer = document.createElement('span');
                            spacer.className = 'l8-toggle-collapse-spacer';
                            row.appendChild(spacer);
                        }

                        // Icon
                        if (node.icon) {
                            var icon = document.createElement('span');
                            icon.className = 'l8-toggle-icon';
                            icon.textContent = node.icon;
                            row.appendChild(icon);
                        }

                        // Label
                        var label = document.createElement('span');
                        label.className = 'l8-toggle-label';
                        label.textContent = node.label;
                        row.appendChild(label);

                        // Foundation badge
                        if (node.foundation && this._opts.showFoundationBadge) {
                            var badge = document.createElement('span');
                            badge.className = 'l8-toggle-foundation';
                            badge.textContent = 'Foundation';
                            row.appendChild(badge);
                        }

                        // Toggle switch
                        var toggleLabel = document.createElement('label');
                        toggleLabel.className = 'l8-toggle-switch';
                        var input = document.createElement('input');
                        input.type = 'checkbox';
                        input.className = 'l8-toggle-input';
                        input.checked = true;
                        input.onchange = (function(p) {
                            return function() { self._handleToggle(p, this.checked); };
                        })(path);
                        var slider = document.createElement('span');
                        slider.className = 'l8-toggle-slider';
                        toggleLabel.appendChild(input);
                        toggleLabel.appendChild(slider);
                        row.appendChild(toggleLabel);

                        // Tooltip
                        var tooltip = document.createElement('span');
                        tooltip.className = 'l8-toggle-tooltip';
                        tooltip.style.display = 'none';
                        row.appendChild(tooltip);

                        wrapper.appendChild(row);

                        // Children
                        if (node.children && node.children.length > 0) {
                            var childContainer = document.createElement('div');
                            childContainer.className = 'l8-toggle-children';
                            if (this._opts.collapsedByDefault) {
                                childContainer.style.display = 'none';
                            }
                            this._renderNodes(childContainer, node.children, path, depth + 1);
                            wrapper.appendChild(childContainer);
                        }

                        parent.appendChild(wrapper);
                    }
                }
            };

            instance.render();
            return instance;
        }
    };

})();
