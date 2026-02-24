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
// Layer8D Tree Grid Events
// Expand/collapse, row click, and toolbar event handlers.

(function() {
    'use strict';

    window.Layer8DTreeGridEvents = {
        attach(treeGrid) {
            const container = treeGrid.container;
            if (!container) return;

            // Expand/collapse arrows
            container.querySelectorAll('.layer8d-tree-grid-arrow').forEach(arrow => {
                arrow.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const nodeId = arrow.dataset.toggle;
                    treeGrid.toggleNode(nodeId);
                });
            });

            // Row click
            if (treeGrid.onItemClick) {
                container.querySelectorAll('.layer8d-tree-grid-row').forEach(row => {
                    row.addEventListener('click', () => {
                        const id = row.dataset.id;
                        const item = treeGrid.data.find(d =>
                            String(treeGrid._getItemId(d)) === id);
                        if (item) treeGrid.onItemClick(item, id);
                    });
                });
            }

            // Toolbar
            const addBtn = container.querySelector('[data-action="add"]');
            if (addBtn && treeGrid.onAdd) {
                addBtn.addEventListener('click', () => treeGrid.onAdd());
            }

            const expandBtn = container.querySelector('[data-action="expand-all"]');
            if (expandBtn) {
                expandBtn.addEventListener('click', () => treeGrid.expandAll());
            }

            const collapseBtn = container.querySelector('[data-action="collapse-all"]');
            if (collapseBtn) {
                collapseBtn.addEventListener('click', () => treeGrid.collapseAll());
            }
        }
    };

})();
