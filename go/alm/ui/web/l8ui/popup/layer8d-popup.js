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
/* ERP Generic Popup Component */

(function() {
    'use strict';

    // Modal stack to support nested modals
    const modalStack = [];

    // Root container element
    let popupRoot = null;

    // Initialize popup system
    function init() {
        popupRoot = document.getElementById('layer8d-popup-root');
        if (!popupRoot) {
            // Create the root element if it doesn't exist
            popupRoot = document.createElement('div');
            popupRoot.id = 'layer8d-popup-root';
            document.body.appendChild(popupRoot);
        }
    }

    // Show a popup
    function show(config) {
        if (!popupRoot) {
            init();
            if (!popupRoot) return;
        }

        // Mark previous modals as stacked
        modalStack.forEach(function(modal) {
            modal.overlay.classList.add('stacked');
        });

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'probler-popup-overlay active';

        // Determine size class
        const sizeClass = 'probler-popup-' + (config.size || 'medium');

        // Create container
        const container = document.createElement('div');
        container.className = 'probler-popup-container ' + sizeClass;

        // Create header
        const header = document.createElement('div');
        header.className = 'probler-popup-header';

        // Support custom title HTML (for status badges, etc.) or plain title
        let titleHtml;
        if (config.titleHtml) {
            titleHtml = config.titleHtml;
        } else {
            titleHtml = '<h3 class="probler-popup-title">' + Layer8DUtils.escapeHtml(config.title || 'Popup') + '</h3>';
        }
        header.innerHTML = titleHtml + '<button class="probler-popup-close" type="button">&times;</button>';

        // Close button handler
        header.querySelector('.probler-popup-close').addEventListener('click', function() {
            close();
        });

        // Create body
        const body = document.createElement('div');
        body.className = 'probler-popup-body';
        if (config.noPadding) {
            body.style.padding = '0';
        }
        body.innerHTML = config.content || '';

        // Create footer if needed
        let footer = null;
        if (config.showFooter !== false) {
            footer = document.createElement('div');
            footer.className = 'probler-popup-footer';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.textContent = config.cancelButtonText || 'Cancel';
            cancelBtn.addEventListener('click', function() {
                close();
            });

            const saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.className = 'btn btn-primary';
            saveBtn.textContent = config.saveButtonText || 'Save';
            saveBtn.addEventListener('click', function() {
                handleSave(config);
            });

            footer.appendChild(cancelBtn);
            footer.appendChild(saveBtn);
        }

        // Assemble popup
        container.appendChild(header);
        container.appendChild(body);
        if (footer) {
            container.appendChild(footer);
        }
        overlay.appendChild(container);

        // Click on overlay background closes popup
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                close();
            }
        });

        // Escape key closes popup
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                close();
            }
        };
        document.addEventListener('keydown', escHandler);

        // Push to stack
        modalStack.push({
            overlay: overlay,
            config: config,
            escHandler: escHandler
        });

        // Add to DOM
        popupRoot.appendChild(overlay);

        // Focus first input if present
        const firstInput = body.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(function() { firstInput.focus(); }, 100);
        }

        // Call onShow callback if provided (for initializing tabs, trees, etc.)
        if (typeof config.onShow === 'function') {
            setTimeout(function() { config.onShow(body); }, 50);
        }

        // Setup tab switching via event delegation (for any tabs in popup content)
        body.addEventListener('click', function(e) {
            const tab = e.target.closest('.probler-popup-tab');
            if (!tab) return;

            const tabId = tab.dataset.tab;
            if (!tabId) return;

            // Deactivate all tabs and panes in this popup
            body.querySelectorAll('.probler-popup-tab').forEach(function(t) {
                t.classList.remove('active');
            });
            body.querySelectorAll('.probler-popup-tab-pane').forEach(function(p) {
                p.classList.remove('active');
            });

            // Activate clicked tab and corresponding pane
            tab.classList.add('active');
            const pane = body.querySelector('.probler-popup-tab-pane[data-pane="' + tabId + '"]');
            if (pane) {
                pane.classList.add('active');
            }

            // Notify iframe if applicable (for custom tab handlers)
            if (config.iframeId) {
                const iframe = document.getElementById(config.iframeId);
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                        type: 'probler-popup-tab-changed',
                        id: config.id,
                        tabId: tabId
                    }, '*');
                }
            }
        });
    }

    // Close the topmost popup
    function close() {
        if (modalStack.length === 0) return;

        const modal = modalStack.pop();

        // Remove escape handler
        document.removeEventListener('keydown', modal.escHandler);

        // Animate out
        modal.overlay.classList.add('closing');

        setTimeout(function() {
            modal.overlay.remove();

            // Notify iframe if applicable
            if (modal.config.iframeId) {
                const iframe = document.getElementById(modal.config.iframeId);
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                        type: 'probler-popup-closed',
                        id: modal.config.id
                    }, '*');
                }
            }

            // Unstack previous modal if exists
            if (modalStack.length > 0) {
                const prev = modalStack[modalStack.length - 1];
                prev.overlay.classList.remove('stacked');
            }
        }, 200);
    }

    // Handle save button click
    function handleSave(config) {
        // Collect form data from the popup body
        const body = popupRoot.querySelector('.probler-popup-overlay:not(.stacked) .probler-popup-body');
        if (!body) return;

        const formData = collectFormData(body);

        // Notify iframe
        if (config.iframeId) {
            const iframe = document.getElementById(config.iframeId);
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    type: 'probler-popup-save',
                    id: config.id,
                    formData: formData
                }, '*');
            }
        }

        // Call onSave callback if provided
        if (typeof config.onSave === 'function') {
            config.onSave(formData);
        }
    }

    // Collect form data from container
    function collectFormData(container) {
        const data = {};
        const inputs = container.querySelectorAll('input, select, textarea');

        inputs.forEach(function(input) {
            const name = input.name || input.id;
            if (!name) return;

            if (input.type === 'checkbox') {
                data[name] = input.checked;
            } else if (input.type === 'radio') {
                if (input.checked) {
                    data[name] = input.value;
                }
            } else {
                data[name] = input.value;
            }
        });

        return data;
    }

    // Update content of current popup
    function updateContent(html) {
        if (modalStack.length === 0) return;

        const body = popupRoot.querySelector('.probler-popup-overlay:not(.stacked) .probler-popup-body');
        if (body) {
            body.innerHTML = html;
        }
    }

    // Update title of current popup
    function updateTitle(title) {
        if (modalStack.length === 0) return;

        const titleEl = popupRoot.querySelector('.probler-popup-overlay:not(.stacked) .probler-popup-title');
        if (titleEl) {
            titleEl.textContent = title;
        }
    }

    // Get current popup's body element (for direct DOM manipulation)
    function getBody() {
        if (modalStack.length === 0) return null;
        return popupRoot.querySelector('.probler-popup-overlay:not(.stacked) .probler-popup-body');
    }

    // Close all popups
    function closeAll() {
        while (modalStack.length > 0) {
            close();
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose API
    window.Layer8DPopup = {
        show: show,
        close: close,
        closeAll: closeAll,
        updateContent: updateContent,
        updateTitle: updateTitle,
        getBody: getBody,
        getStack: function() { return modalStack.slice(); }
    };

})();
