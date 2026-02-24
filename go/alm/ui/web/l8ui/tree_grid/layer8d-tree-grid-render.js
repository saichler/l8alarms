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
// Layer8D Tree Grid Render
// Renders tree rows with indentation and expand/collapse arrows.

(function() {
    'use strict';

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str || '');
        return div.innerHTML;
    }

    window.Layer8DTreeGridRender = {
        render(treeGrid) {
            const container = treeGrid.container;
            if (!container) return;

            let html = '<div class="layer8d-tree-grid">';

            // Toolbar
            html += '<div class="layer8d-tree-grid-toolbar">';
            if (treeGrid.onAdd) {
                html += `<button class="layer8d-tree-grid-btn" data-action="add">${escapeHtml(treeGrid.addButtonText)}</button>`;
            }
            html += '<button class="layer8d-tree-grid-btn" data-action="expand-all">Expand All</button>';
            html += '<button class="layer8d-tree-grid-btn" data-action="collapse-all">Collapse All</button>';
            html += '</div>';

            // Table
            html += '<table class="layer8d-tree-grid-table"><thead><tr>';
            // First column is the tree column (with expand arrows)
            treeGrid.columns.forEach((col, i) => {
                if (col.hidden) return;
                html += `<th>${escapeHtml(col.label)}</th>`;
            });
            html += '</tr></thead><tbody>';

            if (treeGrid.tree.length === 0) {
                const visibleCols = treeGrid.columns.filter(c => !c.hidden).length;
                html += `<tr><td colspan="${visibleCols}" class="layer8d-tree-grid-empty">No data found</td></tr>`;
            } else {
                html += this._renderNodes(treeGrid, treeGrid.tree, 0);
            }

            html += '</tbody></table></div>';
            container.innerHTML = html;
        },

        _renderNodes(treeGrid, nodes, depth) {
            let html = '';
            nodes.forEach(node => {
                const item = node.item;
                const id = treeGrid._getItemId(item);
                const hasChildren = node.children.length > 0;
                const isExpanded = treeGrid.expandedNodes[String(id)];

                html += `<tr class="layer8d-tree-grid-row" data-id="${escapeHtml(String(id))}" data-depth="${depth}">`;

                treeGrid.columns.forEach((col, colIdx) => {
                    if (col.hidden) return;

                    let cellContent;
                    if (col.render) {
                        cellContent = col.render(item);
                    } else {
                        cellContent = escapeHtml(treeGrid._getNestedValue(item, col.key));
                    }

                    if (colIdx === 0) {
                        // Tree column with indent and expand arrow
                        const indent = depth * 20;
                        const arrow = hasChildren
                            ? `<span class="layer8d-tree-grid-arrow ${isExpanded ? 'expanded' : ''}" data-toggle="${id}">&#9656;</span>`
                            : '<span class="layer8d-tree-grid-arrow-placeholder"></span>';
                        html += `<td><div class="layer8d-tree-grid-cell" style="padding-left:${indent}px">${arrow}${cellContent}</div></td>`;
                    } else {
                        html += `<td>${cellContent}</td>`;
                    }
                });

                html += '</tr>';

                // Render children if expanded
                if (hasChildren && isExpanded) {
                    html += this._renderNodes(treeGrid, node.children, depth + 1);
                }
            });
            return html;
        }
    };

})();
