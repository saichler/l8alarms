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
// Layer8D Wizard Core
// Multi-step form flow with step indicator, validation, and back/next/finish navigation.

(function() {
    'use strict';

    class Layer8DWizard {
        constructor(options) {
            this.containerId = options.containerId;
            this.steps = options.steps || [];
            this.onFinish = options.onFinish || null;
            this.onCancel = options.onCancel || null;
            this.title = options.title || 'Wizard';

            this.container = null;
            this.currentStep = 0;
            this.data = {};
            this.stepErrors = {};
        }

        init() {
            this.container = document.getElementById(this.containerId);
            if (!this.container) {
                console.error('Wizard container not found:', this.containerId);
                return;
            }
            this.container.classList.add('layer8d-wizard-container');
            this.currentStep = 0;
            this._render();
        }

        refresh() {
            this._render();
        }

        destroy() {
            if (this.container) {
                this.container.classList.remove('layer8d-wizard-container');
                this.container.innerHTML = '';
            }
        }

        next() {
            if (!this._validateCurrentStep()) return;
            this._collectStepData();
            if (this.currentStep < this.steps.length - 1) {
                this.currentStep++;
                this._render();
            }
        }

        prev() {
            this._collectStepData();
            if (this.currentStep > 0) {
                this.currentStep--;
                this._render();
            }
        }

        goToStep(index) {
            if (index >= 0 && index < this.steps.length && index <= this.currentStep) {
                this._collectStepData();
                this.currentStep = index;
                this._render();
            }
        }

        finish() {
            if (!this._validateCurrentStep()) return;
            this._collectStepData();
            if (this.onFinish) {
                this.onFinish(this.data);
            }
        }

        cancel() {
            if (this.onCancel) {
                this.onCancel();
            }
        }

        _render() {
            if (!this.container) return;
            Layer8DWizardRender.render(this);
            this._attachEvents();
        }

        _attachEvents() {
            const container = this.container;
            if (!container) return;

            const nextBtn = container.querySelector('[data-action="next"]');
            if (nextBtn) nextBtn.addEventListener('click', () => this.next());

            const prevBtn = container.querySelector('[data-action="prev"]');
            if (prevBtn) prevBtn.addEventListener('click', () => this.prev());

            const finishBtn = container.querySelector('[data-action="finish"]');
            if (finishBtn) finishBtn.addEventListener('click', () => this.finish());

            const cancelBtn = container.querySelector('[data-action="cancel"]');
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.cancel());

            // Step indicator clicks (only allow going back)
            container.querySelectorAll('.layer8d-wizard-step-indicator').forEach(step => {
                step.addEventListener('click', () => {
                    const idx = parseInt(step.dataset.step);
                    if (idx <= this.currentStep) {
                        this.goToStep(idx);
                    }
                });
            });
        }

        _validateCurrentStep() {
            const step = this.steps[this.currentStep];
            if (!step || !step.validate) return true;

            const errors = step.validate(this.data);
            if (errors && Object.keys(errors).length > 0) {
                this.stepErrors[this.currentStep] = errors;
                this._render();
                return false;
            }
            delete this.stepErrors[this.currentStep];
            return true;
        }

        _collectStepData() {
            const form = this.container?.querySelector('.layer8d-wizard-step-form');
            if (!form) return;

            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (input.name) {
                    if (input.type === 'checkbox') {
                        this.data[input.name] = input.checked;
                    } else {
                        this.data[input.name] = input.value;
                    }
                }
            });
        }

        getStepCount() {
            return this.steps.length;
        }

        getCurrentStepConfig() {
            return this.steps[this.currentStep] || null;
        }

        isFirstStep() {
            return this.currentStep === 0;
        }

        isLastStep() {
            return this.currentStep === this.steps.length - 1;
        }
    }

    window.Layer8DWizard = Layer8DWizard;

    // Register with view factory (wizard is not a data-browsing view but can be triggered)
    if (window.Layer8DViewFactory) {
        Layer8DViewFactory.register('wizard', function(options) {
            const cfg = options.viewConfig || {};
            return new Layer8DWizard({
                containerId: options.containerId,
                steps: cfg.steps || [],
                title: cfg.title || options.addButtonText || 'Wizard',
                onFinish: cfg.onFinish || null,
                onCancel: cfg.onCancel || null
            });
        });
    }

})();
