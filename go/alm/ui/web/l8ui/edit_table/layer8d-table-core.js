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
// Layer 8 Ecosystem - Layer8DTable Core
// Class definition, constructor, init, and static utilities

class Layer8DTable {
    constructor(options) {
        this.containerId = options.containerId;
        this.columns = options.columns || [];
        this.data = [];
        this.pageSize = options.pageSize || 10;
        this.currentPage = 1;
        this.emptyMessage = options.emptyMessage || 'No data found.';
        this.onEdit = options.onEdit || null;
        this.onDelete = options.onDelete || null;
        this.showActions = options.showActions !== false;
        this.pageSizeOptions = options.pageSizeOptions || [5, 10, 25, 50];

        // Server-side pagination support
        this.serverSide = options.serverSide || false;
        this.totalItems = 0;

        // Server-side auto-fetch options
        this.endpoint = options.endpoint || null;
        this.modelName = options.modelName || null;
        this.baseWhereClause = options.baseWhereClause || null;
        this.transformData = options.transformData || null;
        this.onDataLoaded = options.onDataLoaded || null;

        // Add button support
        this.onAdd = options.onAdd || null;
        this.addButtonText = options.addButtonText || 'Add';

        // Toggle state button support
        this.onToggleState = options.onToggleState || null;
        this.getItemState = options.getItemState || null;

        // Primary key for record identification
        this.primaryKey = options.primaryKey || null;

        // Row click handler for details view
        this.onRowClick = options.onRowClick || null;

        // Sorting and filtering support
        this.sortable = options.sortable !== false;
        this.filterable = options.filterable !== false;
        this.filterDebounceMs = options.filterDebounceMs || 1000;

        // Sorting and filtering state
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.filters = {};
        this.filteredData = [];

        this.container = null;
        this.tableId = options.tableId || 'l8-table-' + Date.now();
    }

    // Initialize the table in the container
    init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error('Container not found:', this.containerId);
            return;
        }

        // Create debounced filter handler for server-side filtering
        if (this.serverSide) {
            this.debouncedFilterHandler = this.debounce(() => {
                this.currentPage = 1;
                this.fetchData(this.currentPage, this.pageSize);
            }, this.filterDebounceMs);
        }

        this.render();

        // Auto-fetch initial data if server-side with endpoint
        if (this.serverSide && this.endpoint && this.modelName) {
            this.fetchData(1, this.pageSize);
        }
    }

    // Utility: Create tag HTML
    static tag(text, className) {
        const div = document.createElement('div');
        div.textContent = String(text || '');
        const escaped = div.innerHTML;
        return `<span class="l8-tag ${className || ''}">${escaped}</span>`;
    }

    // Utility: Create multiple tags
    static tags(items, className) {
        if (!items || items.length === 0) return '-';
        return items.map(item => Layer8DTable.tag(item, className)).join(' ');
    }

    // Utility: Format count badge
    static countBadge(count, singular, plural) {
        plural = plural || singular + 's';
        const label = count === 1 ? singular : plural;
        return `<span class="l8-tag">${count} ${label}</span>`;
    }

    // Utility: Status tag
    static statusTag(isUp, upText, downText) {
        upText = upText || 'Up';
        downText = downText || 'Down';
        const className = isUp ? 'l8-tag-up' : 'l8-tag-down';
        const text = isUp ? upText : downText;
        return `<span class="l8-tag ${className}">${text}</span>`;
    }
}
