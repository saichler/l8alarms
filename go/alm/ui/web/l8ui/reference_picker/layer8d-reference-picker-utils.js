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
 * ERP Reference Picker - Utility Functions and Constants
 * A reusable dropdown picker for selecting referenced entities
 */
(function() {
    'use strict';

    // Create namespace
    window.Layer8DReferencePicker = window.Layer8DReferencePicker || {};
    Layer8DReferencePicker._internal = {};

    // Store attached pickers
    Layer8DReferencePicker._internal.attachedInputs = new WeakMap();
    Layer8DReferencePicker._internal.currentOverlay = null;
    Layer8DReferencePicker._internal.currentPicker = null;
    Layer8DReferencePicker._internal.currentInput = null;
    Layer8DReferencePicker._internal.currentConfig = null;
    Layer8DReferencePicker._internal.currentState = null;

    /**
     * Create the overlay element
     */
    Layer8DReferencePicker._internal.createOverlay = function() {
        const overlay = document.createElement('div');
        overlay.className = 'layer8d-refpicker-overlay';
        return overlay;
    };

    /**
     * Handle Escape key to close picker
     */
    Layer8DReferencePicker._internal.handleEscapeKey = function(e) {
        if (e.key === 'Escape') {
            Layer8DReferencePicker.close();
        }
    };

    /**
     * Debounce utility for filtering
     */
    Layer8DReferencePicker._internal.debounce = function(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    /**
     * Escape HTML to prevent XSS
     */
    Layer8DReferencePicker._internal.escapeHtml = function(text) {
        if (typeof Layer8DUtils !== 'undefined' && Layer8DUtils.escapeHtml) {
            return Layer8DUtils.escapeHtml(text);
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

})();
