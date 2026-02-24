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
// Layer 8 Ecosystem - Layer8DTable Event Handling
// Methods for attaching event listeners and handling user interactions

// Attach event listeners
Layer8DTable.prototype.attachEventListeners = function() {
    if (!this.container) return;

    // Sorting (click on headers)
    if (this.sortable) {
        this.container.querySelectorAll('th.sortable').forEach(header => {
            header.addEventListener('click', (e) => {
                const column = header.dataset.column;
                if (column) this.sort(column);
            });
        });
    }

    // Filtering (input in filter row)
    if (this.filterable) {
        this.container.querySelectorAll('.l8-filter-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const column = input.dataset.column;
                const value = input.value;
                this.filters[column] = value;

                if (this.serverSide) {
                    this.debouncedFilterHandler();
                } else {
                    this.filter(column, value);
                }
            });
        });
    }

    // Page size change
    const pageSizeSelect = this.container.querySelector('[data-action="pageSize"]');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', (e) => {
            const newPageSize = parseInt(e.target.value, 10);
            this.pageSize = newPageSize;
            this.currentPage = 1;
            if (this.serverSide) {
                this.fetchData(this.currentPage, this.pageSize);
            } else {
                this.render();
            }
        });
    }

    // Pagination buttons
    this.container.querySelectorAll('.l8-page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            this.handlePageAction(action);
        });
    });

    // Action buttons (Edit/Delete)
    this.container.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            if (this.onEdit) this.onEdit(id);
        });
    });

    this.container.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            if (this.onDelete) this.onDelete(id);
        });
    });

    // Toggle state button
    this.container.querySelectorAll('[data-action="toggle"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.closest('button').dataset.id;
            if (this.onToggleState) this.onToggleState(id);
        });
    });

    // Add button
    this.container.querySelectorAll('[data-action="add"]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (this.onAdd) this.onAdd();
        });
    });

    // Row click handler for details view
    if (this.onRowClick) {
        this.container.querySelectorAll('tbody tr.l8-clickable-row').forEach(row => {
            row.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons
                if (e.target.closest('.l8-action-btns') || e.target.closest('button')) {
                    return;
                }
                const rowIndex = parseInt(row.dataset.rowIndex, 10);
                const item = this.data[rowIndex];
                if (item) {
                    this.onRowClick(item, this.getItemId(item));
                }
            });
        });
    }
};

// Handle pagination actions
Layer8DTable.prototype.handlePageAction = function(action) {
    const totalPages = this.getTotalPages();
    const oldPage = this.currentPage;

    switch (action) {
        case 'first':
            this.currentPage = 1;
            break;
        case 'prev':
            if (this.currentPage > 1) this.currentPage--;
            break;
        case 'next':
            if (this.currentPage < totalPages) this.currentPage++;
            break;
        case 'last':
            this.currentPage = totalPages;
            break;
    }

    if (this.currentPage !== oldPage) {
        if (this.serverSide) {
            this.fetchData(this.currentPage, this.pageSize);
        } else {
            this.render();
        }
    }
};

// Go to specific page
Layer8DTable.prototype.goToPage = function(page) {
    const totalPages = this.getTotalPages();
    if (page >= 1 && page <= totalPages && page !== this.currentPage) {
        this.currentPage = page;
        if (this.serverSide) {
            this.fetchData(this.currentPage, this.pageSize);
        } else {
            this.render();
        }
    }
};
