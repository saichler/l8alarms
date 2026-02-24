/*
 * Layer8DModuleFilter - Runtime filter that loads SysModuleConfig on startup
 * and provides isEnabled(path) for hiding disabled modules/sub-modules/services.
 */
(function() {
    'use strict';

    window.Layer8DModuleFilter = {
        _disabledPaths: new Set(),
        _loaded: false,

        /**
         * Load module config from server. Must be called on app startup.
         * On failure: shows blocking popup and triggers logout.
         * @param {string} bearerToken
         * @returns {Promise<boolean>} true if loaded, false if failed (logout triggered)
         */
        load: async function(bearerToken) {
            try {
                var query = encodeURIComponent(JSON.stringify({ text: 'select * from SysModuleConfig' }));
                var resp = await fetch('/erp/0/ModConfig?body=' + query, {
                    headers: {
                        'Authorization': 'Bearer ' + bearerToken,
                        'Content-Type': 'application/json'
                    }
                });
                if (!resp.ok) throw new Error('Server returned ' + resp.status);
                var data = await resp.json();
                // Empty list = first startup, everything enabled
                if (data.list && data.list.length > 0) {
                    this._disabledPaths = new Set(data.list[0].disabledPaths || []);
                    this._configId = data.list[0].configId;
                } else {
                    this._disabledPaths = new Set();
                    this._configId = null;
                }
                this._loaded = true;
                return true;
            } catch (e) {
                console.error('Failed to load module config:', e);
                alert('System is still booting, please try again in a few seconds.');
                if (typeof logout === 'function') {
                    logout();
                } else {
                    window.location.href = 'l8ui/login/index.html';
                }
                return false;
            }
        },

        /**
         * Check if a dot-notation path is enabled.
         * A path is disabled if it or any ancestor is in _disabledPaths.
         * @param {string} path - e.g. 'hcm', 'hcm.payroll', 'hcm.core-hr.employees'
         * @returns {boolean}
         */
        isEnabled: function(path) {
            if (!this._loaded) return true; // Before config loads, everything visible
            var parts = path.split('.');
            for (var i = 1; i <= parts.length; i++) {
                if (this._disabledPaths.has(parts.slice(0, i).join('.'))) return false;
            }
            return true;
        },

        /**
         * Apply filter to desktop sidebar - hide disabled module nav items.
         */
        applyToSidebar: function() {
            var navLinks = document.querySelectorAll('.nav-link[data-section]');
            navLinks.forEach(function(link) {
                var section = link.getAttribute('data-section');
                // dashboard and system are never filtered
                if (section === 'dashboard' || section === 'system') return;
                var li = link.closest('li');
                if (!li) return;
                li.style.display = this.isEnabled(section) ? '' : 'none';
            }.bind(this));
        },

        /**
         * Apply filter to section tabs - hide disabled sub-module tabs.
         * @param {string} sectionKey - e.g. 'hcm', 'financial'
         */
        applyToSection: function(sectionKey) {
            // Filter tabs
            var tabs = document.querySelectorAll('.l8-module-tab[data-module], .hcm-module-tab[data-module]');
            var firstVisible = null;
            tabs.forEach(function(tab) {
                var moduleKey = tab.getAttribute('data-module');
                var path = sectionKey + '.' + moduleKey;
                var enabled = this.isEnabled(path);
                tab.style.display = enabled ? '' : 'none';
                if (enabled && !firstVisible) firstVisible = tab;
            }.bind(this));

            // Filter sub-nav items within each tab
            var subnavItems = document.querySelectorAll('.l8-subnav-item[data-service], .hcm-subnav-item[data-service]');
            subnavItems.forEach(function(item) {
                var serviceKey = item.getAttribute('data-service');
                // Find the parent module tab
                var moduleContent = item.closest('[data-module]');
                if (!moduleContent) return;
                var moduleKey = moduleContent.getAttribute('data-module');
                var path = sectionKey + '.' + moduleKey + '.' + serviceKey;
                item.style.display = this.isEnabled(path) ? '' : 'none';
            }.bind(this));
        },

        /**
         * Save disabled paths to server.
         * @param {Set} disabledPaths
         * @param {string} bearerToken
         * @returns {Promise<boolean>}
         */
        save: async function(disabledPaths, bearerToken) {
            try {
                var payload = {
                    disabledPaths: Array.from(disabledPaths)
                };
                if (this._configId) {
                    payload.configId = this._configId;
                }

                var method = this._configId ? 'PUT' : 'POST';
                var resp = await fetch('/erp/0/ModConfig', {
                    method: method,
                    headers: {
                        'Authorization': 'Bearer ' + bearerToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                if (!resp.ok) throw new Error('Save failed: ' + resp.status);
                var data = await resp.json();
                if (data.configId) this._configId = data.configId;
                this._disabledPaths = new Set(disabledPaths);
                return true;
            } catch (e) {
                console.error('Failed to save module config:', e);
                alert('Failed to save module settings. Please try again.');
                return false;
            }
        }
    };

})();
