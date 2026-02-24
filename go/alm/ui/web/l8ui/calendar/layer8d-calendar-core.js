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
// Layer8D Calendar Core
// Month/week calendar view for date-centric entities.

(function() {
    'use strict';

    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    class Layer8DCalendar {
        constructor(options) {
            this.containerId = options.containerId;
            this.columns = options.columns || [];
            this.dataSource = options.dataSource || null;
            this.viewConfig = options.viewConfig || {};
            this.onItemClick = options.onItemClick || null;
            this.onAdd = options.onAdd || null;
            this.primaryKey = options.primaryKey || 'id';
            this.addButtonText = options.addButtonText || 'Add';

            // Calendar config
            this.startDateField = this.viewConfig.startDateField || 'startDate';
            this.endDateField = this.viewConfig.endDateField || this.startDateField;
            this.titleField = this.viewConfig.titleField
                || (Layer8DViewFactory.detectTitleField ? Layer8DViewFactory.detectTitleField(this.columns, this.primaryKey) : 'name');
            this.colorField = this.viewConfig.colorField || null;

            this.container = null;
            this.data = [];
            this.currentDate = new Date();
            this.viewMode = this.viewConfig.defaultView || 'month';
        }

        init() {
            this.container = document.getElementById(this.containerId);
            if (!this.container) {
                console.error('Calendar container not found:', this.containerId);
                return;
            }
            this.container.classList.add('layer8d-calendar-container');

            if (this.dataSource) {
                this.dataSource._onDataLoaded = (result) => {
                    this.setData(result.items, result.totalCount);
                };
                this.dataSource.pageSize = this.viewConfig.pageSize || 200;
                this.dataSource.fetchData(1);
            }
        }

        setData(items) {
            this.data = items || [];
            this._render();
        }

        refresh() {
            if (this.dataSource) {
                this.dataSource.fetchData(1);
            } else {
                this._render();
            }
        }

        destroy() {
            if (this.container) {
                this.container.classList.remove('layer8d-calendar-container');
                this.container.innerHTML = '';
            }
        }

        _render() {
            if (!this.container) return;
            Layer8DCalendarRender.render(this);
            Layer8DCalendarEvents.attach(this);
        }

        // Navigation
        prevMonth() {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this._render();
        }

        nextMonth() {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this._render();
        }

        today() {
            this.currentDate = new Date();
            this._render();
        }

        setViewMode(mode) {
            this.viewMode = mode;
            this._render();
        }

        // Get events for a specific date
        getEventsForDate(date) {
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000;
            const dayEnd = dayStart + 86400;

            return this.data.filter(item => {
                const start = this._getTimestamp(item, this.startDateField);
                const end = this._getTimestamp(item, this.endDateField) || start;
                return start < dayEnd && end >= dayStart;
            });
        }

        _getTimestamp(item, field) {
            const v = this._getNestedValue(item, field);
            if (!v) return 0;
            if (typeof v === 'number') return v;
            return new Date(v).getTime() / 1000 || 0;
        }

        _getItemId(item) {
            return item[this.primaryKey] || item.id || '';
        }

        _getNestedValue(obj, key) {
            if (!key) return '';
            const keys = key.split('.');
            let value = obj;
            for (const k of keys) {
                if (value === null || value === undefined) return '';
                value = value[k];
            }
            return value !== null && value !== undefined ? value : '';
        }

        getMonthName() {
            return MONTH_NAMES[this.currentDate.getMonth()];
        }

        getYear() {
            return this.currentDate.getFullYear();
        }
    }

    Layer8DCalendar.MONTH_NAMES = MONTH_NAMES;
    Layer8DCalendar.DAY_NAMES = DAY_NAMES;

    window.Layer8DCalendar = Layer8DCalendar;

    // Register with view factory
    if (window.Layer8DViewFactory) {
        Layer8DViewFactory.register('calendar', function(options) {
            const ds = new Layer8DDataSource({
                endpoint: options.endpoint,
                modelName: options.modelName,
                columns: options.columns,
                pageSize: options.viewConfig?.pageSize || 200
            });
            return new Layer8DCalendar({
                containerId: options.containerId,
                columns: options.columns,
                dataSource: ds,
                viewConfig: options.viewConfig || {},
                primaryKey: options.primaryKey,
                onItemClick: options.onRowClick,
                onAdd: options.onAdd,
                addButtonText: options.addButtonText
            });
        });
    }

})();
