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
// Layer8M Data Source
// Mobile shared data fetching utility for all view types.
// Handles L8Query construction, fetch, pagination metadata, and error handling.

(function() {
    'use strict';

    class Layer8MDataSource {
        constructor(options) {
            this.endpoint = options.endpoint || null;
            this.modelName = options.modelName || null;
            this.baseWhereClause = options.baseWhereClause || null;
            this.pageSize = options.pageSize || 15;
            this.columns = options.columns || [];
            this.transformData = options.transformData || null;

            // State
            this.currentPage = 1;
            this.totalItems = 0;
            this.filterColumn = null;
            this.filterValue = '';
            this.sortColumn = null;
            this.sortDirection = 'asc';

            // Callbacks
            this._onDataLoaded = options.onDataLoaded || null;
            this._onError = options.onError || null;
            this._onMetadata = options.onMetadata || null;
        }

        /**
         * Build L8Query string
         */
        buildQuery(page, pageSize) {
            const pageIndex = page - 1;
            const filterConditions = [];
            let isInvalid = false;

            if (this.baseWhereClause) {
                filterConditions.push(this.baseWhereClause);
            }

            if (this.filterValue) {
                if (this.filterColumn) {
                    const column = this.columns.find(c => c.key === this.filterColumn);
                    if (column) {
                        const filterKey = column.filterKey || column.key;
                        let queryValue;

                        if (column.enumValues) {
                            const enumValue = Layer8MUtils.matchEnumValue
                                ? Layer8MUtils.matchEnumValue(this.filterValue, column.enumValues)
                                : this._matchEnumValue(this.filterValue, column.enumValues);
                            if (enumValue !== null) {
                                queryValue = enumValue;
                            } else {
                                isInvalid = true;
                            }
                        } else {
                            queryValue = `${this.filterValue}*`;
                        }

                        if (queryValue !== undefined) {
                            filterConditions.push(`${filterKey}=${queryValue}`);
                        }
                    }
                } else {
                    filterConditions.push(`Id=${this.filterValue}*`);
                }
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

            return { query, isInvalid };
        }

        /**
         * Fetch data from server
         */
        async fetchData(page) {
            if (!this.endpoint || !this.modelName) return null;

            const { query, isInvalid } = this.buildQuery(page, this.pageSize);

            try {
                const body = encodeURIComponent(JSON.stringify({ text: query }));
                const response = await Layer8MAuth.get(this.endpoint + '?body=' + body);

                let totalCount = this.totalItems;
                if (page === 1 && response.metadata?.keyCount?.counts) {
                    totalCount = response.metadata.keyCount.counts.Total || 0;
                    this.totalItems = totalCount;
                }

                let items = response.list || [];
                if (this.transformData) {
                    items = items.map(item => this.transformData(item)).filter(item => item !== null);
                }

                this.currentPage = page;

                const result = { items, totalCount, metadata: response.metadata, isInvalid };

                if (this._onMetadata && response.metadata) {
                    this._onMetadata(response.metadata);
                }

                if (this._onDataLoaded) {
                    this._onDataLoaded(result);
                }

                return result;
            } catch (error) {
                console.error('Layer8MDataSource fetch error:', error);
                if (this._onError) {
                    this._onError(error);
                }
                return null;
            }
        }

        setBaseWhereClause(whereClause) {
            this.baseWhereClause = whereClause;
            this.filterColumn = null;
            this.filterValue = '';
            this.currentPage = 1;
            return this.fetchData(1);
        }

        setFilter(column, value) {
            this.filterColumn = column;
            this.filterValue = value;
        }

        clearFilters() {
            this.filterColumn = null;
            this.filterValue = '';
        }

        setSort(column, direction) {
            this.sortColumn = column;
            this.sortDirection = direction || 'asc';
        }

        getTotalPages() {
            return Math.ceil(this.totalItems / this.pageSize);
        }

        _matchEnumValue(input, enumValues) {
            const normalized = String(input).toLowerCase().trim();
            if (!normalized) return null;
            if (enumValues[normalized] !== undefined) return enumValues[normalized];
            for (const [key, value] of Object.entries(enumValues)) {
                if (key.toLowerCase().startsWith(normalized)) return value;
            }
            return null;
        }
    }

    window.Layer8MDataSource = Layer8MDataSource;

})();
