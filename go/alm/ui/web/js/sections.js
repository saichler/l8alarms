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
// Section Navigation and Loading Module

// Section mapping to HTML files
const sections = {
    dashboard: 'sections/dashboard.html',
    alarms: 'sections/alarms.html',
    system: 'sections/system.html'
};

// Section initialization functions
const sectionInitializers = {
    dashboard: () => {
        // Dashboard initialization placeholder
    },
    alarms: () => {
        if (typeof initializeAlm === 'function') {
            initializeAlm();
        }
    },
    system: () => {
        if (typeof initializeL8Sys === 'function') {
            initializeL8Sys();
        }
    }
};

// Load section content dynamically
function loadSection(sectionName) {
    const contentArea = document.getElementById('content-area');
    const sectionFile = sections[sectionName];

    if (!sectionFile) {
        contentArea.innerHTML = '<div class="section-container"><h2 class="section-title">Error</h2><div class="section-content">Section not found.</div></div>';
        return;
    }

    // Add fade-out animation
    contentArea.style.opacity = '0';
    contentArea.style.transform = 'translateY(20px)';

    // Fetch the section HTML with cache-busting timestamp
    fetch(sectionFile + '?t=' + new Date().getTime())
        .then(response => {
            if (!response.ok) {
                throw new Error('Section not found');
            }
            return response.text();
        })
        .then(html => {
            setTimeout(() => {
                contentArea.innerHTML = html;

                // Handle section generator placeholder pattern
                // Scripts in innerHTML don't execute, so we need to call the generator directly
                const placeholder = contentArea.querySelector('[id$="-section-placeholder"]');
                if (placeholder && window.Layer8SectionGenerator) {
                    const generatedHtml = Layer8SectionGenerator.generate(sectionName);
                    // Use a more reliable DOM replacement method
                    const temp = document.createElement('div');
                    temp.innerHTML = generatedHtml;
                    // Replace placeholder with generated elements (skip text nodes)
                    placeholder.replaceWith(...temp.children);
                }

                // Add fade-in animation
                setTimeout(() => {
                    contentArea.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    contentArea.style.opacity = '1';
                    contentArea.style.transform = 'translateY(0)';
                }, 50);

                // Add entrance animations to elements
                const sectionContainer = contentArea.querySelector('.section-container');
                if (sectionContainer) {
                    sectionContainer.style.animation = 'fade-in-up 0.6s ease-out';
                }

                // Call section-specific initialization if defined
                if (sectionInitializers[sectionName]) {
                    sectionInitializers[sectionName]();
                }

                // Apply module filter to hide disabled sub-modules/services
                if (window.Layer8DModuleFilter) {
                    Layer8DModuleFilter.applyToSection(sectionName);
                }
            }, 200);
        })
        .catch(error => {
            console.error('Error loading section:', error);
            contentArea.innerHTML = '<div class="section-container"><h2 class="section-title">Error</h2><div class="section-content">Failed to load section content.</div></div>';
            contentArea.style.opacity = '1';
            contentArea.style.transform = 'translateY(0)';
        });
}
