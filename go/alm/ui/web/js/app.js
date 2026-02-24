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
// Main application initialization for Layer 8 Alarms

// Get authentication headers with bearer token
function getAuthHeaders() {
    const bearerToken = sessionStorage.getItem('bearerToken');
    return {
        'Authorization': bearerToken ? `Bearer ${bearerToken}` : '',
        'Content-Type': 'application/json'
    };
}

// Utility function for making authenticated API calls
async function makeAuthenticatedRequest(url, options = {}) {
    const bearerToken = sessionStorage.getItem('bearerToken');

    if (!bearerToken) {
        console.error('No bearer token found');
        window.location.href = 'l8ui/login/index.html';
        return;
    }

    const headers = {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers: headers
        });

        if (response.status === 401) {
            sessionStorage.removeItem('bearerToken');
            window.location.href = 'l8ui/login/index.html';
            return;
        }

        return response;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Logout function
function logout() {
    sessionStorage.removeItem('bearerToken');
    localStorage.removeItem('bearerToken');
    localStorage.removeItem('rememberedUser');
    window.location.href = 'l8ui/login/index.html';
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    // Load app configuration first
    if (typeof Layer8DConfig !== 'undefined') {
        await Layer8DConfig.load();
    }

    // Check if bearer token exists (user is logged in)
    const bearerToken = sessionStorage.getItem('bearerToken');
    if (!bearerToken) {
        window.location.href = 'l8ui/login/index.html';
        return;
    }

    // Sync bearer token to localStorage so iframes can access it
    localStorage.setItem('bearerToken', bearerToken);
    window.bearerToken = bearerToken;

    // Set username in header from current session
    const username = sessionStorage.getItem('currentUser') || 'Admin';
    document.querySelector('.username').textContent = username;

    // Module filter skipped — L8Alarms has a single module, no server-side ModConfig service
    // If Layer8DModuleFilter is present, mark it as loaded so downstream code doesn't block
    if (typeof Layer8DModuleFilter !== 'undefined') {
        Layer8DModuleFilter._loaded = true;
    }

    // Load default section (dashboard)
    loadSection('dashboard');

    // Add event listeners to navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));

            // Add active class to clicked link
            this.classList.add('active');

            // Load the selected section
            const section = this.getAttribute('data-section');
            loadSection(section);
        });
    });

    // Parallax scroll effect for main content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.addEventListener('scroll', function() {
            const scrollPosition = this.scrollTop;
            const dashboardHero = this.querySelector('.dashboard-hero .hero-illustration');
            if (dashboardHero) {
                const parallaxOffset = scrollPosition * 0.3;
                dashboardHero.style.transform = `translateY(${parallaxOffset}px)`;
            }
        });
    }

    // Add smooth scroll behavior
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
});
