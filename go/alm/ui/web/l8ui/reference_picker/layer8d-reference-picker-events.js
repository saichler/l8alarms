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
 * ERP Reference Picker - Event Handling
 * All event listeners and keyboard navigation
 */
(function() {
    'use strict';

    const internal = Layer8DReferencePicker._internal;

    /**
     * Setup all event handlers for the picker
     */
    internal.setupEvents = function(picker, inputElement, config, state) {
        // Close button
        picker.querySelector('.layer8d-refpicker-close').addEventListener('click', () => {
            Layer8DReferencePicker.close();
        });

        // Filter input with debounce
        const filterInput = picker.querySelector('.layer8d-refpicker-filter');
        const debouncedFilter = internal.debounce(async (value) => {
            state.filterValue = value;
            state.currentPage = 0;
            await internal.refresh(picker, config, state);
        }, config.filterDebounceMs || 500);

        filterInput.addEventListener('input', (e) => {
            debouncedFilter(e.target.value);
        });

        // Immediate filter on Enter key
        filterInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                state.filterValue = filterInput.value;
                state.currentPage = 0;
                internal.refresh(picker, config, state);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                focusFirstItem(picker);
            }
        });

        // Sort toggle
        picker.querySelector('.layer8d-refpicker-sort-btn').addEventListener('click', async () => {
            state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
            state.currentPage = 0;
            await internal.refresh(picker, config, state);
        });

        // Item selection (click)
        picker.querySelector('.layer8d-refpicker-list').addEventListener('click', (e) => {
            const item = e.target.closest('.layer8d-refpicker-item');
            if (item) {
                selectItem(picker, config, state, item);
            }
        });

        // Item selection (keyboard)
        picker.querySelector('.layer8d-refpicker-list').addEventListener('keydown', (e) => {
            const item = e.target.closest('.layer8d-refpicker-item');
            if (!item) return;

            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectItem(picker, config, state, item);
                // Also confirm selection on Enter
                if (e.key === 'Enter') {
                    confirmSelection(inputElement, config, state);
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                focusNextItem(item);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                focusPrevItem(item, picker);
            }
        });

        // Pagination buttons
        picker.querySelector('.layer8d-refpicker-page-btns').addEventListener('click', async (e) => {
            const btn = e.target.closest('.layer8d-refpicker-page-btn');
            if (!btn || btn.disabled) return;

            const action = btn.dataset.action;
            const page = btn.dataset.page;

            if (action === 'prev') {
                state.currentPage = Math.max(0, state.currentPage - 1);
            } else if (action === 'next') {
                const totalPages = Math.ceil(state.totalItems / config.pageSize);
                state.currentPage = Math.min(totalPages - 1, state.currentPage + 1);
            } else if (page !== undefined) {
                state.currentPage = parseInt(page, 10);
            }

            await internal.refresh(picker, config, state);
        });

        // Select button
        picker.querySelector('.layer8d-refpicker-select-btn').addEventListener('click', () => {
            confirmSelection(inputElement, config, state);
        });

        // Clear button
        picker.querySelector('.layer8d-refpicker-clear-btn').addEventListener('click', () => {
            inputElement.value = '';
            delete inputElement.dataset.refId;
            delete inputElement.dataset.refItem;

            if (config.onChange) {
                config.onChange(null, '', null);
            }

            Layer8DReferencePicker.close();
        });

        // Global keyboard handler
        document.addEventListener('keydown', internal.handleEscapeKey);
    };

    /**
     * Select an item in the list
     */
    function selectItem(picker, config, state, itemEl) {
        // Update state
        state.selectedId = itemEl.dataset.id;
        state.selectedDisplay = itemEl.dataset.display;

        // Find the full item data
        const index = parseInt(itemEl.dataset.index, 10);
        state.selectedItem = state.data[index] || null;

        // Update visual selection
        picker.querySelectorAll('.layer8d-refpicker-item').forEach(el => {
            el.classList.remove('selected');
            el.querySelector('.layer8d-refpicker-radio').textContent = '○';
        });
        itemEl.classList.add('selected');
        itemEl.querySelector('.layer8d-refpicker-radio').textContent = '●';
    }

    /**
     * Confirm selection and close picker
     */
    function confirmSelection(inputElement, config, state) {
        if (state.selectedId) {
            inputElement.value = state.selectedDisplay || '';
            inputElement.dataset.refId = state.selectedId;

            // Store full item data as JSON for complex use cases
            if (state.selectedItem) {
                inputElement.dataset.refItem = JSON.stringify(state.selectedItem);
            }

            if (config.onChange) {
                config.onChange(state.selectedId, state.selectedDisplay, state.selectedItem);
            }

            Layer8DReferencePicker.close();
        }
    }

    /**
     * Focus the first item in the list
     */
    function focusFirstItem(picker) {
        const firstItem = picker.querySelector('.layer8d-refpicker-item');
        if (firstItem) {
            firstItem.focus();
        }
    }

    /**
     * Focus the next item in the list
     */
    function focusNextItem(currentItem) {
        const next = currentItem.nextElementSibling;
        if (next && next.classList.contains('layer8d-refpicker-item')) {
            next.focus();
        }
    }

    /**
     * Focus the previous item, or filter input if at top
     */
    function focusPrevItem(currentItem, picker) {
        const prev = currentItem.previousElementSibling;
        if (prev && prev.classList.contains('layer8d-refpicker-item')) {
            prev.focus();
        } else {
            picker.querySelector('.layer8d-refpicker-filter').focus();
        }
    }

})();
