/*
 * L8SysModulesMap - Visual dependency map for the Modules settings page.
 * Shows module boxes arranged by dependency order with arrows.
 */
(function() {
    'use strict';

    window.L8SysModulesMap = {

        render: function(container, disabledPaths) {
            var graph = window.L8SysDependencyGraph;
            if (!graph) return;

            var disabled = disabledPaths || new Set();
            var mapDiv = document.createElement('div');
            mapDiv.className = 'l8sys-dep-map';

            // Title
            var title = document.createElement('h3');
            title.className = 'l8sys-dep-map-title';
            title.textContent = 'Module Dependency Map';
            mapDiv.appendChild(title);

            var desc = document.createElement('p');
            desc.className = 'l8sys-dep-map-desc';
            desc.textContent = 'Arrows show dependencies. A module requires all modules it points from.';
            mapDiv.appendChild(desc);

            // Build layers based on dependency depth
            var layers = this._buildLayers(graph.modules);
            var grid = document.createElement('div');
            grid.className = 'l8sys-dep-map-grid';

            for (var li = 0; li < layers.length; li++) {
                var row = document.createElement('div');
                row.className = 'l8sys-dep-map-row';

                for (var mi = 0; mi < layers[li].length; mi++) {
                    var key = layers[li][mi];
                    var mod = graph.modules[key];
                    var enabled = !disabled.has(key);

                    var box = document.createElement('div');
                    box.className = 'l8sys-dep-map-box' + (enabled ? ' l8sys-dep-map-enabled' : ' l8sys-dep-map-disabled');
                    box.setAttribute('data-module', key);

                    var iconSpan = document.createElement('span');
                    iconSpan.className = 'l8sys-dep-map-box-icon';
                    iconSpan.textContent = mod.icon;

                    var nameSpan = document.createElement('span');
                    nameSpan.className = 'l8sys-dep-map-box-name';
                    nameSpan.textContent = mod.label;

                    var statusSpan = document.createElement('span');
                    statusSpan.className = 'l8sys-dep-map-box-status';
                    statusSpan.textContent = enabled ? 'ON' : 'OFF';

                    box.appendChild(iconSpan);
                    box.appendChild(nameSpan);
                    box.appendChild(statusSpan);

                    // Click to scroll to toggle
                    box.onclick = (function(k) {
                        return function() {
                            var node = document.querySelector('.l8-toggle-node[data-path="' + k + '"]');
                            if (node) {
                                node.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                node.querySelector('.l8-toggle-row').style.background = 'rgba(14,165,233,0.15)';
                                setTimeout(function() {
                                    node.querySelector('.l8-toggle-row').style.background = '';
                                }, 1500);
                            }
                        };
                    })(key);

                    // Deps line
                    if (mod.depends.length > 0) {
                        var depsSpan = document.createElement('span');
                        depsSpan.className = 'l8sys-dep-map-box-deps';
                        depsSpan.textContent = 'Needs: ' + mod.depends.map(function(d) {
                            return graph.modules[d] ? graph.modules[d].icon : d;
                        }).join(' ');
                        box.appendChild(depsSpan);
                    }

                    row.appendChild(box);
                }

                grid.appendChild(row);
            }

            mapDiv.appendChild(grid);
            container.appendChild(mapDiv);
        },

        refresh: function(container, disabledPaths) {
            var existing = container.querySelector('.l8sys-dep-map');
            if (existing) existing.remove();
            // Insert map at the beginning
            var tmp = document.createElement('div');
            this.render(tmp, disabledPaths);
            if (tmp.firstChild) {
                container.insertBefore(tmp.firstChild, container.firstChild);
            }
        },

        _buildLayers: function(modules) {
            // Topological sort into layers by depth
            var depths = {};
            var keys = Object.keys(modules);

            function getDepth(key) {
                if (depths[key] !== undefined) return depths[key];
                var deps = modules[key].depends;
                if (deps.length === 0) { depths[key] = 0; return 0; }
                var maxDep = 0;
                for (var i = 0; i < deps.length; i++) {
                    maxDep = Math.max(maxDep, getDepth(deps[i]) + 1);
                }
                depths[key] = maxDep;
                return maxDep;
            }

            keys.forEach(function(k) { getDepth(k); });

            var maxLayer = 0;
            keys.forEach(function(k) { if (depths[k] > maxLayer) maxLayer = depths[k]; });

            var layers = [];
            for (var i = 0; i <= maxLayer; i++) {
                var layer = keys.filter(function(k) { return depths[k] === i; });
                layers.push(layer);
            }
            return layers;
        }
    };

})();
