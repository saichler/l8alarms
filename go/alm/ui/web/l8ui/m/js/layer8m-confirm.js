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
 * Layer8MConfirm - Confirmation dialog for ERP mobile
 */
(function() {
    'use strict';

    window.Layer8MConfirm = {
        /**
         * Show confirmation dialog
         * @returns {Promise<boolean>}
         */
        show(options) {
            return new Promise((resolve) => {
                const config = {
                    title: options.title || 'Confirm',
                    message: options.message || 'Are you sure?',
                    confirmText: options.confirmText || 'Confirm',
                    cancelText: options.cancelText || 'Cancel',
                    destructive: options.destructive || false
                };

                const overlay = document.createElement('div');
                overlay.className = 'mobile-confirm-overlay';

                overlay.innerHTML = `
                    <div class="mobile-confirm">
                        <div class="mobile-confirm-content">
                            <h3 class="mobile-confirm-title">${Layer8MUtils.escapeHtml(config.title)}</h3>
                            <p class="mobile-confirm-message">${Layer8MUtils.escapeHtml(config.message)}</p>
                        </div>
                        <div class="mobile-confirm-actions">
                            <button class="mobile-confirm-btn mobile-confirm-btn-cancel">
                                ${Layer8MUtils.escapeHtml(config.cancelText)}
                            </button>
                            <button class="mobile-confirm-btn ${config.destructive ? 'mobile-confirm-btn-danger' : 'mobile-confirm-btn-primary'}">
                                ${Layer8MUtils.escapeHtml(config.confirmText)}
                            </button>
                        </div>
                    </div>
                `;

                document.body.appendChild(overlay);
                document.body.style.overflow = 'hidden';

                requestAnimationFrame(() => {
                    overlay.classList.add('open');
                });

                const close = (result) => {
                    overlay.classList.remove('open');
                    setTimeout(() => {
                        overlay.remove();
                        document.body.style.overflow = '';
                        resolve(result);
                    }, 200);
                };

                overlay.querySelector('.mobile-confirm-btn-cancel').addEventListener('click', () => close(false));
                overlay.querySelector('.mobile-confirm-btn-primary, .mobile-confirm-btn-danger').addEventListener('click', () => close(true));
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) close(false);
                });
            });
        },

        /**
         * Show delete confirmation
         */
        async confirmDelete(itemName = 'this item') {
            return this.show({
                title: 'Delete',
                message: `Are you sure you want to delete ${itemName}? This action cannot be undone.`,
                confirmText: 'Delete',
                cancelText: 'Cancel',
                destructive: true
            });
        },

        /**
         * Show save confirmation
         */
        async confirmSave() {
            return this.show({
                title: 'Save Changes',
                message: 'Do you want to save your changes?',
                confirmText: 'Save',
                cancelText: 'Cancel'
            });
        },

        /**
         * Show discard confirmation
         */
        async confirmDiscard() {
            return this.show({
                title: 'Discard Changes',
                message: 'You have unsaved changes. Are you sure you want to discard them?',
                confirmText: 'Discard',
                cancelText: 'Keep Editing',
                destructive: true
            });
        }
    };

})();
