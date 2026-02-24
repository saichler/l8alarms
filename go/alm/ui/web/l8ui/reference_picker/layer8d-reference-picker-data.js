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
/**
 * ERP Reference Picker - Data Management
 * Methods for L8Query building and server communication
 */
(function() {
    'use strict';

    const internal = Layer8DReferencePicker._internal;

    /**
     * Build L8Query for reference picker
     * Key difference from edit_table: select <id>,<display> instead of select *
     */
    internal.buildQuery = function(config, state) {
        const pageIndex = state.currentPage;
        const columns = config.selectColumns.join(',');

        // Start building query with specific columns (not select *)
        let query = `select ${columns} from ${config.modelName}`;

        // Build where conditions
        const conditions = [];

        // Add base where clause if provided
        if (config.baseWhereClause) {
            conditions.push(config.baseWhereClause);
        }

        // Add filter condition (search by display column)
        if (state.filterValue && state.filterValue.trim()) {
            const filterKey = config.filterColumn || config.displayColumn;
            conditions.push(`${filterKey}=${state.filterValue.trim()}*`);
        }

        // Add WHERE clause if there are conditions
        if (conditions.length > 0) {
            query += ` where ${conditions.join(' and ')}`;
        }

        // Add pagination
        query += ` limit ${config.pageSize} page ${pageIndex}`;

        // Add sorting
        const sortColumn = config.sortColumn || config.displayColumn;
        const sortDir = state.sortDirection === 'desc' ? ' descending' : '';
        query += ` sort-by ${sortColumn}${sortDir}`;

        return query;
    };

    /**
     * Fetch data from server
     */
    internal.fetchData = async function(config, state) {
        if (!config.endpoint || !config.modelName) {
            console.error('ReferencePicker requires endpoint and modelName');
            return { data: [], totalItems: 0 };
        }

        const query = internal.buildQuery(config, state);

        try {
            const body = encodeURIComponent(JSON.stringify({ text: query }));
            const response = await fetch(config.endpoint + '?body=' + body, {
                method: 'GET',
                headers: typeof getAuthHeaders === 'function'
                    ? getAuthHeaders()
                    : { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }

            const data = await response.json();

            // Extract total count from metadata
            let totalCount = 0;
            if (data.metadata?.keyCount?.counts) {
                totalCount = data.metadata.keyCount.counts.Total || 0;
            }

            // Get items list
            const items = data.list || [];

            return {
                data: items,
                totalItems: totalCount
            };
        } catch (error) {
            console.error('Error fetching reference data:', error);
            return { data: [], totalItems: 0 };
        }
    };

    /**
     * Refresh picker data and re-render
     */
    internal.refresh = async function(picker, config, state) {
        // Show loading state
        const listEl = picker.querySelector('.layer8d-refpicker-list');
        listEl.innerHTML = '<div class="layer8d-refpicker-loading">Loading...</div>';

        // Fetch data
        const result = await internal.fetchData(config, state);
        state.data = result.data;
        state.totalItems = result.totalItems;

        // Re-render
        internal.renderList(picker, config, state);
        internal.renderPagination(picker, config, state);
        internal.updateSortIndicator(picker, state);
    };

})();
