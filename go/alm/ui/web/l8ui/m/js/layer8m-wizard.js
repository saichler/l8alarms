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
// Layer8M Wizard - Mobile full-screen step navigation.

(function() {
    'use strict';

    class Layer8MWizard {
        constructor(containerId, config) {
            this.containerId = containerId;
            this.config = config || {};

            this._wizard = new Layer8DWizard({
                containerId: containerId,
                steps: config.steps || [],
                title: config.title || 'Wizard',
                onFinish: config.onFinish || null,
                onCancel: config.onCancel || null
            });
        }

        init() {
            const container = document.getElementById(this.containerId);
            if (container) {
                container.classList.add('layer8m-wizard-container');
            }
            this._wizard.init();
        }

        refresh() { this._wizard.refresh(); }
        destroy() { this._wizard.destroy(); }
        next() { this._wizard.next(); }
        prev() { this._wizard.prev(); }
        finish() { this._wizard.finish(); }
    }

    window.Layer8MWizard = Layer8MWizard;

    if (window.Layer8MViewFactory) {
        Layer8MViewFactory.register('wizard', function(options) {
            const cfg = options.viewConfig || {};
            return new Layer8MWizard(options.containerId, {
                steps: cfg.steps || [],
                title: cfg.title || options.addButtonText || 'Wizard',
                onFinish: cfg.onFinish || null,
                onCancel: cfg.onCancel || null
            });
        });
    }

})();
