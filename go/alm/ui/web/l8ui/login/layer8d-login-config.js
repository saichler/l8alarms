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
// Login App Configuration
// Loaded from /login.json

let LOGIN_CONFIG = null;

// Load configuration from login.json
async function loadConfig() {
    try {
        const response = await fetch('/login.json');
        if (!response.ok) {
            throw new Error('Failed to load configuration');
        }
        const config = await response.json();
        LOGIN_CONFIG = config.login;
        return true;
    } catch (error) {
        console.error('Error loading configuration:', error);
        // Fallback defaults
        LOGIN_CONFIG = {
            appTitle: 'ERP by Layer 8',
            appDescription: 'Enterprise Resource Planning',
            authEndpoint: '/auth',
            redirectUrl: '/app.html',
            showRememberMe: true,
            showRegister: false,
            sessionTimeout: 30,
            tfaEnabled: true
        };
        return false;
    }
}
