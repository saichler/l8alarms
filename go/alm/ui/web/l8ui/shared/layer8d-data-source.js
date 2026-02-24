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
// Layer8D Data Source
// Shared data fetching utility for all view types (table, chart, kanban, etc.)
// Handles L8Query construction, fetch, pagination metadata, and error handling.

(function() {
    'use strict';

    class Layer8DDataSource {
        constructor(options) {
            this.endpoint = options.endpoint || null;
            this.modelName = options.modelName || null;
            this.baseWhereClause = options.baseWhereClause || null;
            this.pageSize = options.pageSize || 10;
            this.columns = options.columns || [];
            this.transformData = options.transformData || null;

            // State
            this.currentPage = 1;
            this.totalItems = 0;
            this.filters = {};
            this.sortColumn = null;
            this.sortDirection = 'asc';

            // Callbacks
            this._onDataLoaded = options.onDataLoaded || null;
            this._onError = options.onError || null;
            this._onMetadata = options.onMetadata || null;
        }

        /**
         * Build L8Query string with filter and sort conditions
         * @param {number} page - 1-based page number
         * @param {number} pageSize - items per page
         * @returns {{ query: string, invalidFilters: string[] }}
         */
        buildQuery(page, pageSize) {
            const pageIndex = page - 1;
            const invalidFilters = [];
            const filterConditions = [];

            if (this.baseWhereClause) {
                filterConditions.push(this.baseWhereClause);
            }

            for (const [columnKey, filterValue] of Object.entries(this.filters)) {
                if (!filterValue) continue;

                const column = this.columns.find(c => c.key === columnKey);
                if (!column) continue;

                const filterKey = column.filterKey || column.key;

                let queryValue;
                if (column.enumValues) {
                    const enumValue = Layer8DUtils.matchEnumValue(filterValue, column.enumValues);
                    if (enumValue === null) {
                        invalidFilters.push(columnKey);
                        continue;
                    }
                    queryValue = enumValue;
                } else {
                    queryValue = `${filterValue}*`;
                }

                filterConditions.push(`${filterKey}=${queryValue}`);
            }

            let query = `select * from ${this.modelName}`;
            if (filterConditions.length > 0) {
                query += ` where ${filterConditions.join(' and ')}`;
            }
            query += ` limit ${pageSize} page ${pageIndex}`;

            if (this.sortColumn) {
                const column = this.columns.find(c => c.key === this.sortColumn);
                const sortKey = column?.sortKey || column?.filterKey || this.sortColumn;
                const desc = this.sortDirection === 'desc' ? ' descending' : '';
                query += ` sort-by ${sortKey}${desc}`;
            }

            return { query, invalidFilters };
        }

        /**
         * Fetch data from server
         * @param {number} page - 1-based page number
         * @returns {Promise<{items: Array, totalCount: number, metadata: Object, invalidFilters: string[]}>}
         */
        async fetchData(page) {
            if (!this.endpoint || !this.modelName) {
                console.error('DataSource requires endpoint and modelName');
                return null;
            }

            const pageSize = this.pageSize;
            const { query, invalidFilters } = this.buildQuery(page, pageSize);

            try {
                const body = encodeURIComponent(JSON.stringify({ text: query }));
                const response = await fetch(this.endpoint + '?body=' + body, {
                    method: 'GET',
                    headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }

                const data = await response.json();

                let totalCount = 0;
                if (page === 1 && data.metadata?.keyCount?.counts) {
                    totalCount = data.metadata.keyCount.counts.Total || 0;
                    this.totalItems = totalCount;
                } else {
                    totalCount = this.totalItems;
                }

                let items = data.list || [];
                if (this.transformData) {
                    items = items.map(item => this.transformData(item));
                }

                this.currentPage = page;

                const result = { items, totalCount, metadata: data.metadata, invalidFilters };

                if (this._onMetadata && data.metadata) {
                    this._onMetadata(data.metadata);
                }

                if (this._onDataLoaded) {
                    this._onDataLoaded(result);
                }

                return result;
            } catch (error) {
                console.error('DataSource fetch error:', error);
                if (this._onError) {
                    this._onError(error);
                }
                return null;
            }
        }

        /**
         * Update base where clause and re-fetch from page 1
         */
        setBaseWhereClause(whereClause) {
            this.baseWhereClause = whereClause;
            this.filters = {};
            this.currentPage = 1;
            return this.fetchData(1);
        }

        /**
         * Set a filter value for a column
         */
        setFilter(columnKey, value) {
            this.filters[columnKey] = value;
        }

        /**
         * Clear all filters
         */
        clearFilters() {
            this.filters = {};
        }

        /**
         * Set sort column and direction
         */
        setSort(column, direction) {
            this.sortColumn = column;
            this.sortDirection = direction || 'asc';
        }

        /**
         * Get total pages based on current totalItems
         */
        getTotalPages() {
            return Math.ceil(this.totalItems / this.pageSize);
        }
    }

    window.Layer8DDataSource = Layer8DDataSource;

})();
