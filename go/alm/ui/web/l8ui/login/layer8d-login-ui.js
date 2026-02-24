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
// L8ERP - Login Page UI Helper Functions
// Part 4 of 4 - Load this file last

// UI Helper Functions
function setLoading(loading) {
    isLoading = loading;
    const btn = document.getElementById('login-btn');
    const btnText = document.getElementById('btn-text');
    const spinner = document.getElementById('btn-spinner');

    btn.disabled = loading;

    if (loading) {
        btnText.textContent = 'Authenticating...';
        spinner.style.display = 'inline-block';
    } else {
        btnText.textContent = tfaRequired ? 'Verify' : 'Login';
        spinner.style.display = 'none';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    errorText.textContent = message;
    errorDiv.classList.add('visible');
}

function hideError() {
    document.getElementById('error-message').classList.remove('visible');
}

// Toast notification system
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        error: '!',
        success: '\u2713',
        warning: '\u26A0',
        info: 'i'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" onclick="dismissToast(this.parentElement)">&times;</button>
    `;

    container.appendChild(toast);
    setTimeout(() => dismissToast(toast), 5000);
}

function dismissToast(toast) {
    if (!toast || toast.classList.contains('removing')) return;
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// Logout function (can be called from other pages)
function logout() {
    sessionStorage.removeItem('bearerToken');
    localStorage.removeItem('tfaSetupRequired');
    if (window.location.pathname.includes('/login')) {
        window.location.reload();
    } else {
        window.location.href = 'login/index.html';
    }
}

// Export for use in other pages
if (typeof window !== 'undefined') {
    window.L8Login = {
        logout: logout,
        getToken: () => sessionStorage.getItem('bearerToken'),
        isLoggedIn: () => !!sessionStorage.getItem('bearerToken')
    };
}
