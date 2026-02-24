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
 * Layer8MPopup - Full-screen modal component for ERP mobile
 * Desktop Equivalent: popup/popup.js
 */
(function() {
    'use strict';

    const _stack = [];
    let _idCounter = 0;

    window.Layer8MPopup = {
        /**
         * Show a popup
         */
        show(config) {
            const id = config.id || 'mobile-popup-' + (++_idCounter);

            const popup = {
                id: id,
                config: {
                    title: '',
                    titleHtml: null,
                    content: '',
                    size: 'large',
                    showFooter: true,
                    noPadding: false,
                    saveButtonText: 'Save',
                    cancelButtonText: 'Cancel',
                    showCancelButton: true,
                    saveButtonClass: 'mobile-popup-btn-save',
                    tabs: null,
                    onShow: null,
                    onSave: null,
                    onClose: null,
                    ...config
                }
            };

            const overlay = this._createPopupDOM(popup);
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';

            if (_stack.length > 0) {
                overlay.classList.add('stacked');
                if (_stack.length > 1) {
                    overlay.classList.add('stacked-2');
                }
            }

            popup.overlay = overlay;
            popup.element = overlay.querySelector('.mobile-popup');
            popup.body = overlay.querySelector('.mobile-popup-body');
            _stack.push(popup);

            requestAnimationFrame(() => {
                overlay.classList.add('open');
            });

            this._setupEventListeners(popup);

            // Initialize form fields (reference pickers, etc.) if Layer8MForms is available
            if (window.Layer8MForms && popup.body) {
                setTimeout(() => Layer8MForms.initFormFields(popup.body), 50);
            }

            if (popup.config.onShow) {
                setTimeout(() => popup.config.onShow(popup), 300);
            }

            setTimeout(() => {
                const firstInput = popup.body.querySelector('input, textarea, select');
                if (firstInput) firstInput.focus();
            }, 350);

            return popup;
        },

        _createPopupDOM(popup) {
            const config = popup.config;
            const overlay = document.createElement('div');
            overlay.className = 'mobile-popup-overlay';
            overlay.id = popup.id + '-overlay';

            const titleHtml = config.titleHtml ||
                `<span class="mobile-popup-title">${Layer8MUtils.escapeHtml(config.title)}</span>`;

            let tabsHtml = '';
            let tabContentHtml = config.content;

            if (config.tabs && config.tabs.length > 0) {
                tabsHtml = `
                    <div class="mobile-popup-tabs">
                        ${config.tabs.map((tab, idx) => `
                            <button class="mobile-popup-tab ${idx === 0 ? 'active' : ''}"
                                    data-tab="${tab.id}">${Layer8MUtils.escapeHtml(tab.label)}</button>
                        `).join('')}
                    </div>
                `;

                tabContentHtml = config.tabs.map((tab, idx) => `
                    <div class="mobile-popup-tab-content ${idx === 0 ? 'active' : ''}"
                         data-tab-content="${tab.id}">
                        ${tab.content}
                    </div>
                `).join('');
            }

            let footerHtml = '';
            if (config.showFooter) {
                footerHtml = `
                    <div class="mobile-popup-footer">
                        ${config.showCancelButton ? `
                            <button class="mobile-popup-btn mobile-popup-btn-cancel">
                                ${Layer8MUtils.escapeHtml(config.cancelButtonText)}
                            </button>
                        ` : ''}
                        <button class="mobile-popup-btn ${config.saveButtonClass}">
                            ${Layer8MUtils.escapeHtml(config.saveButtonText)}
                        </button>
                    </div>
                `;
            }

            overlay.innerHTML = `
                <div class="mobile-popup size-${config.size}">
                    <div class="mobile-popup-handle"></div>
                    <div class="mobile-popup-header">
                        ${titleHtml}
                        <button class="mobile-popup-close">&times;</button>
                    </div>
                    ${tabsHtml}
                    <div class="mobile-popup-body ${config.noPadding ? 'no-padding' : ''}">
                        ${tabContentHtml}
                    </div>
                    ${footerHtml}
                </div>
            `;

            return overlay;
        },

        _setupEventListeners(popup) {
            const overlay = popup.overlay;
            const config = popup.config;

            overlay.querySelector('.mobile-popup-close').addEventListener('click', () => {
                this.close(popup.id);
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.close(popup.id);
            });

            const cancelBtn = overlay.querySelector('.mobile-popup-btn-cancel');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    // Call onCancel callback if provided (matches desktop behavior)
                    if (config.onCancel) {
                        config.onCancel(popup);
                    } else {
                        this.close(popup.id);
                    }
                });
            }

            const saveBtn = overlay.querySelector('.mobile-popup-btn-save, .mobile-popup-btn-danger');
            if (saveBtn && config.onSave) {
                saveBtn.addEventListener('click', () => config.onSave(popup));
            }

            const tabs = overlay.querySelectorAll('.mobile-popup-tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabId = tab.dataset.tab;
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    overlay.querySelectorAll('.mobile-popup-tab-content').forEach(content => {
                        content.classList.toggle('active', content.dataset.tabContent === tabId);
                    });
                });
            });

            popup._escapeHandler = (e) => {
                if (e.key === 'Escape' && _stack.length > 0 && _stack[_stack.length - 1].id === popup.id) {
                    this.close(popup.id);
                }
            };
            document.addEventListener('keydown', popup._escapeHandler);

            this._setupDragToDismiss(popup);
        },

        _setupDragToDismiss(popup) {
            const handle = popup.element.querySelector('.mobile-popup-handle');
            const popupEl = popup.element;

            if (!handle) return;

            let startY = 0;
            let currentY = 0;
            let isDragging = false;

            handle.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
                isDragging = true;
                popupEl.style.transition = 'none';
            }, { passive: true });

            handle.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                currentY = e.touches[0].clientY;
                const deltaY = currentY - startY;
                if (deltaY > 0) {
                    popupEl.style.transform = `translateY(${deltaY}px)`;
                }
            }, { passive: true });

            handle.addEventListener('touchend', () => {
                if (!isDragging) return;
                isDragging = false;
                popupEl.style.transition = '';

                const deltaY = currentY - startY;
                if (deltaY > 100) {
                    this.close(popup.id);
                } else {
                    popupEl.style.transform = '';
                }

                startY = 0;
                currentY = 0;
            });
        },

        close(id) {
            let popup;

            if (id) {
                const index = _stack.findIndex(p => p.id === id);
                if (index === -1) return;
                popup = _stack.splice(index, 1)[0];
            } else {
                if (_stack.length === 0) return;
                popup = _stack.pop();
            }

            if (popup._escapeHandler) {
                document.removeEventListener('keydown', popup._escapeHandler);
            }

            popup.overlay.classList.remove('open');

            if (popup.config.onClose) {
                popup.config.onClose(popup);
            }

            setTimeout(() => {
                popup.overlay.remove();
                if (_stack.length === 0) {
                    document.body.style.overflow = '';
                }
            }, 300);
        },

        closeAll() {
            while (_stack.length > 0) {
                this.close();
            }
        },

        updateContent(html, id) {
            const popup = id ? _stack.find(p => p.id === id) : _stack[_stack.length - 1];
            if (popup && popup.body) {
                popup.body.innerHTML = html;
            }
        },

        updateTitle(title, id) {
            const popup = id ? _stack.find(p => p.id === id) : _stack[_stack.length - 1];
            if (popup) {
                const titleEl = popup.element.querySelector('.mobile-popup-title');
                if (titleEl) titleEl.textContent = title;
            }
        },

        getBody(id) {
            const popup = id ? _stack.find(p => p.id === id) : _stack[_stack.length - 1];
            return popup ? popup.body : null;
        },

        getElement(id) {
            const popup = id ? _stack.find(p => p.id === id) : _stack[_stack.length - 1];
            return popup ? popup.element : null;
        },

        getStack() { return _stack; },

        isOpen() { return _stack.length > 0; },

        showLoading(message = 'Loading...', id) {
            this.updateContent(`
                <div class="mobile-popup-loading">
                    <div class="spinner"></div>
                    <span>${Layer8MUtils.escapeHtml(message)}</span>
                </div>
            `, id);
        }
    };

})();
