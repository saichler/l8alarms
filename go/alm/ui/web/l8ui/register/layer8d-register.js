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
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('register-form');
    const captchaImage = document.getElementById('captcha-image');
    const refreshCaptchaBtn = document.getElementById('refresh-captcha');
    const registerBtn = document.getElementById('register-btn');
    const btnSpinner = document.getElementById('btn-spinner');
    const btnText = document.getElementById('btn-text');
    const messageDiv = document.getElementById('message');

    loadCaptcha();

    refreshCaptchaBtn.addEventListener('click', loadCaptcha);

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        register();
    });

    function loadCaptcha() {
        captchaImage.src = '';
        captchaImage.alt = 'Loading...';

        fetch('/captcha', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Failed to load captcha');
            }
            return response.json();
        })
        .then(function(data) {
            if (data.captcha) {
                captchaImage.src = 'data:image/png;base64,' + data.captcha;
                captchaImage.alt = 'Captcha';
            }
        })
        .catch(function(error) {
            console.error('Error loading captcha:', error);
            captchaImage.alt = 'Failed to load captcha';
            showMessage('Failed to load captcha. Please refresh.', 'error');
        });
    }

    function register() {
        const user = document.getElementById('user').value.trim();
        const password = document.getElementById('password').value;
        const captcha = document.getElementById('captcha').value.trim();

        if (!user || !password || !captcha) {
            showMessage('Please fill in all fields.', 'error');
            return;
        }

        registerBtn.disabled = true;
        btnSpinner.style.display = 'inline-block';
        btnText.textContent = 'Registering...';
        hideMessage();

        const payload = {
            user: user,
            pass: password,
            captcha: captcha
        };

        fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(function(response) {
            return response.text().then(function(text) {
                var data = null;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    data = text;
                }
                return { status: response.status, data: data };
            });
        })
        .then(function(result) {
            if (result.status === 200) {
                showMessage('Registration successful! Redirecting to login...', 'success');
                setTimeout(function() {
                    window.location.href = '/l8ui/login/';
                }, 1500);
                return;
            } else {
                var errorMsg = 'Registration failed.';
                if (typeof result.data === 'string' && result.data) {
                    errorMsg = result.data;
                } else if (result.data && result.data.error) {
                    errorMsg = result.data.error;
                } else if (result.data && result.data.message) {
                    errorMsg = result.data.message;
                }
                showMessage(errorMsg, 'error');
            }
            loadCaptcha();
        })
        .catch(function(error) {
            console.error('Error during registration:', error);
            showMessage('An error occurred. Please try again.', 'error');
            loadCaptcha();
        })
        .finally(function() {
            registerBtn.disabled = false;
            btnSpinner.style.display = 'none';
            btnText.textContent = 'Register';
        });
    }

    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = 'message ' + type;
    }

    function hideMessage() {
        messageDiv.className = 'message';
        messageDiv.textContent = '';
    }
});
