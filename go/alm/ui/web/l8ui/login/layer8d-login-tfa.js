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
// L8ERP - Login Page TFA Functions
// Part 3 of 4 - Load after login-auth.js

// Handle TFA verification (for users with TFA already enabled)
async function handleTfaVerify(event) {
    event.preventDefault();

    if (isLoading || !pendingAuth) return;

    const code = document.getElementById('tfa-code').value.trim();

    if (!code || code.length !== 6) {
        showError('Please enter a valid 6-digit code');
        return;
    }

    setTfaVerifyLoading(true);
    hideError();

    try {
        const response = await fetch('/tfaVerify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: pendingAuth.username,
                code: code,
                bearer: pendingAuth.bearer
            })
        });

        const data = await response.json();

        if (data.ok) {
            handleLoginSuccess(
                { token: pendingAuth.bearer },
                pendingAuth.username,
                document.getElementById('remember-me').checked
            );
        } else {
            showError(data.error || 'Invalid verification code');
        }
    } catch (error) {
        console.error('TFA verification error:', error);
        showError('Verification failed. Please try again.');
    } finally {
        setTfaVerifyLoading(false);
    }
}

// Set TFA verify loading state
function setTfaVerifyLoading(loading) {
    isLoading = loading;
    const spinner = document.getElementById('tfa-spinner');
    const btnText = document.getElementById('tfa-btn-text');

    if (loading) {
        spinner.style.display = 'inline-block';
        btnText.textContent = 'Verifying...';
    } else {
        spinner.style.display = 'none';
        btnText.textContent = 'Verify';
    }
}

// Show TFA verification section (for users with TFA already enabled)
function showTfaSection() {
    tfaRequired = true;
    tfaSetupRequired = false;

    document.getElementById('login-section').style.display = 'none';
    document.getElementById('tfa-setup-section').classList.remove('visible');
    document.getElementById('tfa-section').classList.add('visible');

    document.getElementById('tfa-code').value = '';
    document.getElementById('tfa-code').focus();
    hideError();
}

// Show TFA setup section and fetch QR code
async function showTfaSetupRequired() {
    tfaRequired = true;
    tfaSetupRequired = true;

    document.getElementById('login-section').style.display = 'none';
    document.getElementById('tfa-section').classList.remove('visible');
    document.getElementById('tfa-setup-section').classList.add('visible');
    document.querySelector('.layer8d-login-container').classList.add('layer8d-tfa-setup-active');

    // Show loading state
    document.getElementById('tfa-setup-loading').style.display = 'flex';
    document.getElementById('tfa-setup-content').style.display = 'none';
    document.getElementById('tfa-setup-error').style.display = 'none';

    try {
        // Fetch TFA setup data from server
        const response = await fetch('/tfaSetup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: pendingAuth.username })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch TFA setup data');
        }

        const data = await response.json();

        if (data.error) {
            showTfaSetupError(data.error);
            return;
        }

        // Display QR code and secret
        document.getElementById('tfa-qr-image').src = 'data:image/png;base64,' + data.qr;
        document.getElementById('tfa-secret-code').textContent = data.secret;

        // Show content
        document.getElementById('tfa-setup-loading').style.display = 'none';
        document.getElementById('tfa-setup-content').style.display = 'block';
        document.getElementById('tfa-setup-code').value = '';
        document.getElementById('tfa-setup-code').focus();

    } catch (error) {
        console.error('Error fetching TFA setup:', error);
        showTfaSetupError('Failed to load TFA setup. Please try again.');
    }
}

// Show TFA setup error
function showTfaSetupError(message) {
    document.getElementById('tfa-setup-loading').style.display = 'none';
    document.getElementById('tfa-setup-content').style.display = 'none';
    document.getElementById('tfa-setup-error').style.display = 'block';
    document.getElementById('tfa-setup-error-message').textContent = message;
}

// Handle TFA setup verification
async function handleTfaSetupVerify(event) {
    event.preventDefault();

    if (isLoading || !pendingAuth) return;

    const code = document.getElementById('tfa-setup-code').value.trim();

    if (!code || code.length !== 6) {
        showError('Please enter a valid 6-digit code');
        return;
    }

    setTfaSetupLoading(true);
    hideError();

    try {
        const response = await fetch('/tfaSetupVerify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: pendingAuth.username,
                code: code,
                bearer: pendingAuth.bearer
            })
        });

        const data = await response.json();

        if (data.ok) {
            showToast('Two-factor authentication enabled successfully!', 'success');
            showLoginSection();
            showToast('Please login again with your TFA code', 'warning');
        } else {
            showError(data.error || 'Invalid verification code. Please try again.');
        }
    } catch (error) {
        console.error('TFA setup verification error:', error);
        showError('Verification failed. Please try again.');
    } finally {
        setTfaSetupLoading(false);
    }
}

// Set TFA setup loading state
function setTfaSetupLoading(loading) {
    isLoading = loading;
    const spinner = document.getElementById('tfa-setup-spinner');
    const btnText = document.getElementById('tfa-setup-btn-text');

    if (loading) {
        spinner.style.display = 'inline-block';
        btnText.textContent = 'Verifying...';
    } else {
        spinner.style.display = 'none';
        btnText.textContent = 'Verify & Enable';
    }
}

// Show login section (hide TFA sections)
function showLoginSection() {
    tfaRequired = false;
    tfaSetupRequired = false;
    pendingAuth = null;

    document.getElementById('login-section').style.display = 'block';
    document.getElementById('tfa-section').classList.remove('visible');
    document.getElementById('tfa-setup-section').classList.remove('visible');
    document.querySelector('.layer8d-login-container').classList.remove('layer8d-tfa-setup-active');
    document.getElementById('tfa-code').value = '';
    document.getElementById('tfa-setup-code').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password').focus();
    hideError();
}
