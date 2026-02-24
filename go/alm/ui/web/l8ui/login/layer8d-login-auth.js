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
// L8ERP - Login Page Authentication Functions
// Part 2 of 4 - Load after login-state.js

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();

    if (isLoading) return;

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;

    if (!username || !password) {
        showError('Please enter username and password');
        return;
    }

    setLoading(true);
    hideError();

    try {
        const result = await authenticate(username, password);

        if (result.success) {
            handleLoginSuccess(result, username, rememberMe);
        } else if (result.setupTfa) {
            // TFA setup required - show QR code setup screen
            pendingAuth = { username, password, bearer: result.token };
            showTfaSetupRequired();
        } else if (result.needTfa) {
            // TFA verification required - show code input
            pendingAuth = { username, password, bearer: result.token };
            showTfaSection();
        } else {
            showError(result.error || 'Authentication failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Unable to connect to server. Please try again.');
    } finally {
        setLoading(false);
    }
}

// Authenticate with the server
async function authenticate(username, password) {
    const response = await fetch(LOGIN_CONFIG.authEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user: username, pass: password })
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return {
            success: false,
            error: errorText || `Authentication failed (${response.status})`
        };
    }

    const data = await response.json();

    // Check for TFA requirements
    if (data.setupTfa) {
        return { success: false, setupTfa: true, token: data.token };
    }

    if (data.needTfa) {
        return { success: false, needTfa: true, token: data.token };
    }

    return { success: true, token: data.token };
}

// Detect if device is mobile
function isMobileDevice() {
    // Check for mobile user agent
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    if (mobileRegex.test(navigator.userAgent)) {
        return true;
    }

    // Also check screen width as a fallback
    if (window.innerWidth <= 768) {
        return true;
    }

    // Check for touch capability combined with small screen
    if ('ontouchstart' in window && window.innerWidth <= 1024) {
        return true;
    }

    return false;
}

// Get appropriate redirect URL based on device type
function getRedirectUrl() {
    const baseRedirectUrl = LOGIN_CONFIG.redirectUrl || '/app.html';

    // If already pointing to mobile, use as-is
    if (baseRedirectUrl.includes('/m/')) {
        return baseRedirectUrl;
    }

    // If mobile device, redirect to mobile app
    if (isMobileDevice()) {
        // Convert ../app.html to ../m/app.html
        if (baseRedirectUrl.endsWith('app.html')) {
            return baseRedirectUrl.replace('app.html', 'm/app.html');
        }
        // Fallback for other patterns
        return '/m/app.html';
    }

    return baseRedirectUrl;
}

// Handle successful login
function handleLoginSuccess(result, username, rememberMe) {
    // Store bearer token in sessionStorage (cleared when tab is closed)
    sessionStorage.setItem('bearerToken', result.token);

    // Always store current username in sessionStorage for display
    sessionStorage.setItem('currentUser', username);

    // Handle remember me (persists username across sessions for auto-fill)
    if (rememberMe) {
        localStorage.setItem('rememberedUser', username);
    } else {
        localStorage.removeItem('rememberedUser');
    }

    // Setup session timeout if configured
    if (LOGIN_CONFIG.sessionTimeout > 0) {
        setupSessionTimeout();
    }

    showToast('Login successful!', 'success');

    // Redirect or callback - detect mobile and redirect appropriately
    if (LOGIN_CONFIG.redirectUrl) {
        setTimeout(() => {
            window.location.href = getRedirectUrl();
        }, 500);
    } else if (typeof onLoginSuccess === 'function') {
        onLoginSuccess(result.token, username);
    }
}

// Setup session timeout
function setupSessionTimeout() {
    const timeoutMs = LOGIN_CONFIG.sessionTimeout * 60 * 1000;
    let timeoutId;

    const resetTimeout = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            sessionStorage.removeItem('bearerToken');
            showToast('Session expired. Please login again.', 'warning');
            if (LOGIN_CONFIG.redirectUrl) {
                window.location.reload();
            }
        }, timeoutMs);
    };

    // Reset timeout on user activity
    ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
        document.addEventListener(event, resetTimeout, { passive: true });
    });

    resetTimeout();
}
