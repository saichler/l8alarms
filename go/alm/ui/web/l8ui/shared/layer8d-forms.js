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
 * ERP Shared Form Handler
 * Generic form generation and handling for all ERP modules
 *
 * This file combines the following modules:
 * - layer8d-forms-fields.js - Form field generation
 * - layer8d-forms-data.js - Data handling and CRUD
 * - layer8d-forms-pickers.js - Date and reference picker integration
 * - layer8d-forms-modal.js - Modal helpers
 */
(function() {
    'use strict';

    // Export unified API by combining all sub-modules
    window.Layer8DForms = {
        // Field generation (from layer8d-forms-fields.js)
        get generateFormHtml() { return Layer8DFormsFields.generateFormHtml; },
        get generateFieldHtml() { return Layer8DFormsFields.generateFieldHtml; },
        get generateSelectHtml() { return Layer8DFormsFields.generateSelectHtml; },
        get generateFormattedInput() { return Layer8DFormsFields.generateFormattedInput; },

        // Data handling (from layer8d-forms-data.js)
        get collectFormData() { return Layer8DFormsData.collectFormData; },
        get validateFormData() { return Layer8DFormsData.validateFormData; },
        get fetchRecord() { return Layer8DFormsData.fetchRecord; },
        get saveRecord() { return Layer8DFormsData.saveRecord; },
        get deleteRecord() { return Layer8DFormsData.deleteRecord; },

        // Picker integration (from layer8d-forms-pickers.js)
        get attachDatePickers() { return Layer8DFormsPickers.attachDatePickers; },
        get attachInputFormatters() { return Layer8DFormsPickers.attachInputFormatters; },
        get attachReferencePickers() { return Layer8DFormsPickers.attachReferencePickers; },
        get setFormContext() { return Layer8DFormsPickers.setFormContext; },

        // Modal helpers (from layer8d-forms-modal.js)
        get openAddForm() { return Layer8DFormsModal.openAddForm; },
        get openEditForm() { return Layer8DFormsModal.openEditForm; },
        get openViewForm() { return Layer8DFormsModal.openViewForm; },
        get confirmDelete() { return Layer8DFormsModal.confirmDelete; }
    };

})();
