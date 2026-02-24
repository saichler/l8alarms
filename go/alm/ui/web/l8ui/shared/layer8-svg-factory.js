/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/

/**
 * Layer8 SVG Factory
 * Generates consistent section header SVG illustrations.
 * Projects register their own module-specific element templates via registerTemplate().
 */
(function() {
    'use strict';

    const PRIMARY_COLOR = '#0ea5e9';
    const SECONDARY_COLOR = '#0284c7';

    // Template registry - populated by project-specific template files
    const ELEMENT_TEMPLATES = {};

    /**
     * Generate the standard grid background pattern
     */
    function generateGrid() {
        return `
            <g opacity="0.1">
                <line x1="0" y1="30" x2="1200" y2="30" stroke="${PRIMARY_COLOR}" stroke-width="0.5"/>
                <line x1="0" y1="60" x2="1200" y2="60" stroke="${PRIMARY_COLOR}" stroke-width="0.5"/>
                <line x1="0" y1="90" x2="1200" y2="90" stroke="${PRIMARY_COLOR}" stroke-width="0.5"/>
                <line x1="200" y1="0" x2="200" y2="120" stroke="${PRIMARY_COLOR}" stroke-width="0.5"/>
                <line x1="400" y1="0" x2="400" y2="120" stroke="${PRIMARY_COLOR}" stroke-width="0.5"/>
                <line x1="600" y1="0" x2="600" y2="120" stroke="${PRIMARY_COLOR}" stroke-width="0.5"/>
                <line x1="800" y1="0" x2="800" y2="120" stroke="${PRIMARY_COLOR}" stroke-width="0.5"/>
                <line x1="1000" y1="0" x2="1000" y2="120" stroke="${PRIMARY_COLOR}" stroke-width="0.5"/>
            </g>`;
    }

    /**
     * Generate connecting paths between elements
     */
    function generatePaths() {
        return `
            <path d="M 215,60 Q 300,40 385,55" fill="none" stroke="${PRIMARY_COLOR}" stroke-width="1" opacity="0.3"/>
            <path d="M 418,50 Q 500,70 582,60" fill="none" stroke="${PRIMARY_COLOR}" stroke-width="1" opacity="0.3"/>
            <path d="M 618,60 Q 700,45 770,55" fill="none" stroke="${PRIMARY_COLOR}" stroke-width="1" opacity="0.3"/>
            <path d="M 830,60 Q 900,75 984,60" fill="none" stroke="${PRIMARY_COLOR}" stroke-width="1" opacity="0.3"/>`;
    }

    /**
     * Generate animated dots
     */
    function generateAnimatedDots() {
        return `
            <circle cx="300" cy="50" r="3" fill="${PRIMARY_COLOR}" opacity="0.8">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="700" cy="55" r="3" fill="${PRIMARY_COLOR}" opacity="0.8">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="2.5s" repeatCount="indefinite"/>
            </circle>`;
    }

    /**
     * Generate a default placeholder template (used when no template is registered)
     */
    function defaultTemplate(gradientId) {
        return `
            <circle cx="200" cy="60" r="15" fill="url(#${gradientId})" opacity="0.6"/>
            <circle cx="400" cy="55" r="12" fill="url(#${gradientId})" opacity="0.5"/>
            <circle cx="600" cy="60" r="18" fill="url(#${gradientId})" opacity="0.7"/>
            <circle cx="800" cy="55" r="14" fill="url(#${gradientId})" opacity="0.5"/>
            <circle cx="1000" cy="60" r="16" fill="url(#${gradientId})" opacity="0.6"/>`;
    }

    /**
     * Register a custom template for a module
     * @param {string} key - Template key (e.g., 'people', 'financial')
     * @param {function} templateFn - Function that takes gradientId and returns SVG elements
     */
    function registerTemplate(key, templateFn) {
        ELEMENT_TEMPLATES[key] = templateFn;
    }

    /**
     * Generate a complete section header SVG
     * @param {string} moduleKey - Module identifier (matches registered template key)
     * @param {string} [customElements] - Optional custom SVG elements to use instead of template
     * @returns {string} Complete SVG markup
     */
    function generate(moduleKey, customElements) {
        const gradientId = moduleKey + 'Gradient1';

        // Get elements from template or use custom/default
        let elements;
        if (customElements) {
            elements = customElements;
        } else {
            const templateFn = ELEMENT_TEMPLATES[moduleKey] || defaultTemplate;
            elements = templateFn(gradientId);
        }

        return `
        <svg class="l8-illustration" viewBox="0 0 1200 120" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${PRIMARY_COLOR};stop-opacity:0.4" />
                    <stop offset="100%" style="stop-color:${SECONDARY_COLOR};stop-opacity:0.2" />
                </linearGradient>
            </defs>
            ${generateGrid()}
            <g class="elements-animation">
                ${elements}
            </g>
            ${generatePaths()}
            ${generateAnimatedDots()}
        </svg>`;
    }

    // Export the factory
    window.Layer8SvgFactory = {
        generate: generate,
        registerTemplate: registerTemplate,
        templates: ELEMENT_TEMPLATES,
        generateGrid: generateGrid,
        generatePaths: generatePaths,
        generateAnimatedDots: generateAnimatedDots
    };

})();
