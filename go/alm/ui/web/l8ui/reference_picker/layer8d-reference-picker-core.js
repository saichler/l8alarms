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
 * ERP Reference Picker - Core API Functions
 */
(function() {
    'use strict';

    const internal = Layer8DReferencePicker._internal;

    /**
     * Attach reference picker to an input element
     *
     * @param {HTMLInputElement} inputElement - The input element to attach to
     * @param {Object} options - Configuration options
     * @param {string} options.endpoint - API endpoint (same as edit_table)
     * @param {string} options.modelName - Model/table name (same as edit_table)
     * @param {string} options.idColumn - The ID field to return
     * @param {string} options.displayColumn - The display field to show
     * @param {Function} [options.displayFormat] - Custom display formatter: (item) => string
     * @param {string[]} [options.selectColumns] - Columns to fetch (defaults to [idColumn, displayColumn])
     * @param {string} [options.baseWhereClause] - Optional base WHERE clause
     * @param {number} [options.pageSize=10] - Page size
     * @param {number} [options.filterDebounceMs=500] - Debounce delay for filter
     * @param {Function} [options.onChange] - Callback: (id, displayValue, item) => void
     * @param {string} [options.placeholder] - Search input placeholder
     * @param {string} [options.emptyMessage] - Message when no results
     * @param {string} [options.title] - Picker popup title
     * @param {string} [options.displayLabel] - Label for sort header
     * @param {string} [options.filterColumn] - Column to filter by (defaults to displayColumn)
     * @param {string} [options.sortColumn] - Column to sort by (defaults to displayColumn)
     */
    Layer8DReferencePicker.attach = function(inputElement, options = {}) {
        // Validate required options
        if (!options.endpoint) {
            console.error('Layer8DReferencePicker: endpoint is required');
            return;
        }
        if (!options.modelName) {
            console.error('Layer8DReferencePicker: modelName is required');
            return;
        }
        if (!options.idColumn) {
            console.error('Layer8DReferencePicker: idColumn is required');
            return;
        }
        if (!options.displayColumn) {
            console.error('Layer8DReferencePicker: displayColumn is required');
            return;
        }

        // Check if already attached
        if (internal.attachedInputs.has(inputElement)) {
            return;
        }

        // Build config
        const config = {
            endpoint: options.endpoint,
            modelName: options.modelName,
            idColumn: options.idColumn,
            displayColumn: options.displayColumn,
            displayFormat: options.displayFormat || null,
            selectColumns: options.selectColumns || [options.idColumn, options.displayColumn],
            baseWhereClause: options.baseWhereClause || null,
            pageSize: options.pageSize || 10,
            filterDebounceMs: options.filterDebounceMs || 500,
            onChange: options.onChange || null,
            placeholder: options.placeholder || 'Search...',
            emptyMessage: options.emptyMessage || 'No results found',
            title: options.title || `Select ${options.modelName}`,
            displayLabel: options.displayLabel || options.displayColumn,
            filterColumn: options.filterColumn || options.displayColumn,
            sortColumn: options.sortColumn || options.displayColumn
        };

        internal.attachedInputs.set(inputElement, config);

        // Make input behave as picker trigger
        inputElement.readOnly = true;
        inputElement.style.cursor = 'pointer';
        inputElement.classList.add('layer8d-refpicker-input');

        // Handle input click
        inputElement.addEventListener('click', (e) => {
            e.stopPropagation();
            Layer8DReferencePicker.open(inputElement);
        });

        // Handle keyboard
        inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                Layer8DReferencePicker.open(inputElement);
            }
        });
    };

    /**
     * Open the reference picker for an input
     */
    Layer8DReferencePicker.open = async function(inputElement) {
        const config = internal.attachedInputs.get(inputElement);
        if (!config) {
            console.warn('Layer8DReferencePicker: Input not attached - no config found');
            return;
        }

        // Don't reopen if already open for this input
        if (internal.currentPicker && internal.currentInput === inputElement) {
            return;
        }

        // Close any existing picker
        Layer8DReferencePicker.close();

        // Create fresh state
        const state = {
            data: [],
            currentPage: 0,
            totalItems: 0,
            sortDirection: 'asc',
            filterValue: '',
            selectedId: inputElement.dataset.refId || null,
            selectedDisplay: inputElement.value || null,
            selectedItem: null
        };

        // Try to restore selected item from stored data
        if (inputElement.dataset.refItem) {
            try {
                state.selectedItem = JSON.parse(inputElement.dataset.refItem);
            } catch (e) {
                // Ignore parse errors
            }
        }

        // Create overlay and picker
        const overlay = internal.createOverlay();
        const picker = internal.createPickerElement(config);
        overlay.appendChild(picker);
        document.body.appendChild(overlay);

        internal.currentOverlay = overlay;
        internal.currentPicker = picker;
        internal.currentInput = inputElement;
        internal.currentConfig = config;
        internal.currentState = state;

        // Setup events
        internal.setupEvents(picker, inputElement, config, state);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                Layer8DReferencePicker.close();
            }
        });

        // Initial data fetch
        await internal.refresh(picker, config, state);

        // Focus search input
        picker.querySelector('.layer8d-refpicker-filter').focus();
    };

    /**
     * Close any open reference picker
     */
    Layer8DReferencePicker.close = function() {
        document.removeEventListener('keydown', internal.handleEscapeKey);

        if (internal.currentOverlay) {
            internal.currentOverlay.remove();
            internal.currentOverlay = null;
        }
        internal.currentPicker = null;
        internal.currentInput = null;
        internal.currentConfig = null;
        internal.currentState = null;
    };

    /**
     * Get selected ID from an input element
     */
    Layer8DReferencePicker.getValue = function(inputElement) {
        return inputElement.dataset.refId || null;
    };

    /**
     * Get selected item data from an input element
     */
    Layer8DReferencePicker.getItem = function(inputElement) {
        if (inputElement.dataset.refItem) {
            try {
                return JSON.parse(inputElement.dataset.refItem);
            } catch (e) {
                return null;
            }
        }
        return null;
    };

    /**
     * Set value programmatically
     */
    Layer8DReferencePicker.setValue = function(inputElement, id, displayValue, item = null) {
        if (id === null || id === undefined) {
            inputElement.value = '';
            delete inputElement.dataset.refId;
            delete inputElement.dataset.refItem;
        } else {
            inputElement.value = displayValue || '';
            inputElement.dataset.refId = id;
            if (item) {
                inputElement.dataset.refItem = JSON.stringify(item);
            }
        }
    };

    /**
     * Detach reference picker from an input element
     */
    Layer8DReferencePicker.detach = function(inputElement) {
        if (internal.currentInput === inputElement) {
            Layer8DReferencePicker.close();
        }
        internal.attachedInputs.delete(inputElement);
        inputElement.readOnly = false;
        inputElement.style.cursor = '';
        inputElement.classList.remove('layer8d-refpicker-input');
    };

})();
