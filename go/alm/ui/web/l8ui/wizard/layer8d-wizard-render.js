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
// Layer8D Wizard Render
// Step indicator bar, content panel, and navigation buttons.

(function() {
    'use strict';

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str || '');
        return div.innerHTML;
    }

    window.Layer8DWizardRender = {
        render(wizard) {
            const container = wizard.container;
            if (!container) return;

            let html = '<div class="layer8d-wizard">';

            // Step indicator
            html += this._renderStepIndicator(wizard);

            // Step content
            html += this._renderStepContent(wizard);

            // Navigation buttons
            html += this._renderNavigation(wizard);

            html += '</div>';
            container.innerHTML = html;
        },

        _renderStepIndicator(wizard) {
            let html = '<div class="layer8d-wizard-steps">';

            wizard.steps.forEach((step, i) => {
                const status = i < wizard.currentStep ? 'completed'
                    : i === wizard.currentStep ? 'active' : 'pending';
                const clickable = i <= wizard.currentStep ? 'clickable' : '';

                html += `<div class="layer8d-wizard-step-indicator ${status} ${clickable}" data-step="${i}">
                    <div class="layer8d-wizard-step-number">
                        ${status === 'completed' ? '&#10003;' : i + 1}
                    </div>
                    <div class="layer8d-wizard-step-label">${escapeHtml(step.title || 'Step ' + (i + 1))}</div>
                </div>`;

                if (i < wizard.steps.length - 1) {
                    html += `<div class="layer8d-wizard-step-connector ${status === 'completed' ? 'completed' : ''}"></div>`;
                }
            });

            html += '</div>';
            return html;
        },

        _renderStepContent(wizard) {
            const step = wizard.getCurrentStepConfig();
            if (!step) return '<div class="layer8d-wizard-content">No steps defined</div>';

            const errors = wizard.stepErrors[wizard.currentStep] || {};

            let html = `<div class="layer8d-wizard-content">
                <h3 class="layer8d-wizard-step-title">${escapeHtml(step.title || '')}</h3>`;

            if (step.description) {
                html += `<p class="layer8d-wizard-step-desc">${escapeHtml(step.description)}</p>`;
            }

            // Render fields
            if (step.fields && step.fields.length > 0) {
                html += '<form class="layer8d-wizard-step-form">';
                step.fields.forEach(field => {
                    const value = wizard.data[field.key] !== undefined ? wizard.data[field.key] : (field.defaultValue || '');
                    const error = errors[field.key];

                    html += `<div class="layer8d-wizard-field ${error ? 'has-error' : ''}">
                        <label class="layer8d-wizard-label">${escapeHtml(field.label)}${field.required ? ' *' : ''}</label>`;

                    if (field.type === 'select' && field.options) {
                        html += `<select name="${escapeHtml(field.key)}" class="layer8d-wizard-input">`;
                        html += '<option value="">Select...</option>';
                        Object.entries(field.options).forEach(([k, v]) => {
                            html += `<option value="${escapeHtml(k)}" ${value === k ? 'selected' : ''}>${escapeHtml(v)}</option>`;
                        });
                        html += '</select>';
                    } else if (field.type === 'textarea') {
                        html += `<textarea name="${escapeHtml(field.key)}" class="layer8d-wizard-input" rows="3">${escapeHtml(value)}</textarea>`;
                    } else if (field.type === 'checkbox') {
                        html += `<input type="checkbox" name="${escapeHtml(field.key)}" class="layer8d-wizard-checkbox" ${value ? 'checked' : ''}>`;
                    } else {
                        html += `<input type="${field.type || 'text'}" name="${escapeHtml(field.key)}" value="${escapeHtml(value)}" class="layer8d-wizard-input" ${field.required ? 'required' : ''}>`;
                    }

                    if (error) {
                        html += `<span class="layer8d-wizard-error">${escapeHtml(error)}</span>`;
                    }

                    html += '</div>';
                });
                html += '</form>';
            }

            // Custom content renderer
            if (step.render) {
                html += `<div class="layer8d-wizard-custom">${step.render(wizard.data)}</div>`;
            }

            html += '</div>';
            return html;
        },

        _renderNavigation(wizard) {
            let html = '<div class="layer8d-wizard-nav">';

            html += `<button class="layer8d-btn layer8d-btn-secondary layer8d-btn-small" data-action="cancel">Cancel</button>`;

            html += '<div class="layer8d-wizard-nav-right">';
            if (!wizard.isFirstStep()) {
                html += `<button class="layer8d-btn layer8d-btn-secondary layer8d-btn-small" data-action="prev">Back</button>`;
            }

            if (wizard.isLastStep()) {
                html += `<button class="layer8d-btn layer8d-btn-primary layer8d-btn-small" data-action="finish">Finish</button>`;
            } else {
                html += `<button class="layer8d-btn layer8d-btn-primary layer8d-btn-small" data-action="next">Next</button>`;
            }
            html += '</div></div>';

            return html;
        }
    };

})();
