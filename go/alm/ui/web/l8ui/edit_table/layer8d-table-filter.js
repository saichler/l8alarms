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
// Layer 8 Ecosystem - Layer8DTable Filtering & Sorting
// Methods for sorting, filtering, and validation

// Sort by column
Layer8DTable.prototype.sort = function(column) {
    if (this.sortColumn === column) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        this.sortColumn = column;
        this.sortDirection = 'asc';
    }

    // Server-side sorting
    if (this.serverSide) {
        this.currentPage = 1;
        this.fetchData(this.currentPage, this.pageSize);
        return;
    }

    // Client-side sorting
    const columnConfig = this.columns.find(col => col.key === column);
    const sortKey = columnConfig && columnConfig.sortKey ? columnConfig.sortKey : column;

    this.filteredData.sort((a, b) => {
        let aVal = this.getNestedValue(a, sortKey);
        let bVal = this.getNestedValue(b, sortKey);

        // Handle numbers
        if (!isNaN(aVal) && !isNaN(bVal)) {
            aVal = parseFloat(aVal);
            bVal = parseFloat(bVal);
        }

        if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    this.currentPage = 1;
    this.render();
};

// Filter data by column value
Layer8DTable.prototype.filter = function(column, value) {
    this.filters[column] = value;

    this.filteredData = this.data.filter(row => {
        for (let col in this.filters) {
            const filterValue = this.filters[col].toLowerCase();
            if (filterValue) {
                const cellValue = String(this.getNestedValue(row, col)).toLowerCase();
                if (!cellValue.includes(filterValue)) {
                    return false;
                }
            }
        }
        return true;
    });

    this.currentPage = 1;
    this.render();
};

// Mark filter inputs as invalid (for server-side validation)
Layer8DTable.prototype.setInvalidFilters = function(invalidColumns) {
    if (!this.container) return;

    this.container.querySelectorAll('.l8-filter-input').forEach(input => {
        input.classList.remove('invalid');
    });

    invalidColumns.forEach(columnKey => {
        const input = this.container.querySelector(`.l8-filter-input[data-column="${columnKey}"]`);
        if (input) {
            input.classList.add('invalid');
        }
    });
};
