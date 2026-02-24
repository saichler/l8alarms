/*
 * System Module Dependency Graph
 * Single source of truth for module/sub-module/service dependencies.
 * Used by the toggle tree and module filter to enforce enable/disable rules.
 */
(function() {
    'use strict';

    window.L8SysDependencyGraph = {
        // Tier 1: Cross-module dependencies
        modules: {
            financial:     { label: 'Financial Management',  icon: '💰', depends: [] },
            hcm:           { label: 'Human Capital Mgmt',    icon: '👥', depends: ['financial'] },
            scm:           { label: 'Supply Chain Mgmt',     icon: '🔗', depends: ['financial', 'hcm'] },
            sales:         { label: 'Sales & Distribution',  icon: '📈', depends: ['financial', 'hcm', 'scm'] },
            manufacturing: { label: 'Manufacturing',         icon: '🏭', depends: ['financial', 'hcm', 'scm', 'sales'] },
            crm:           { label: 'Customer Relations',    icon: '🤝', depends: ['financial', 'hcm'] },
            projects:      { label: 'Project Management',    icon: '📁', depends: ['financial', 'hcm', 'crm'] },
            bi:            { label: 'Business Intelligence', icon: '📊', depends: ['hcm'] },
            documents:     { label: 'Document Management',   icon: '📄', depends: ['hcm'] },
            ecommerce:     { label: 'E-Commerce',            icon: '🛒', depends: ['financial', 'hcm', 'scm'] },
            compliance:    { label: 'Compliance & Risk',     icon: '🛡️', depends: ['financial', 'hcm'] }
        },

        // Tier 2: Intra-module sub-module dependencies
        // First sub-module is always the foundation (required by all others)
        subModules: {
            financial: {
                'general-ledger':      { depends: [], foundation: true },
                'accounts-payable':    { depends: ['general-ledger'] },
                'accounts-receivable': { depends: ['general-ledger'] },
                'cash':                { depends: ['general-ledger'] },
                'fixed-assets':        { depends: ['general-ledger'] },
                'budgeting':           { depends: ['general-ledger'] },
                'tax':                 { depends: ['general-ledger'] }
            },
            hcm: {
                'core-hr':      { depends: [], foundation: true },
                'payroll':      { depends: ['core-hr'] },
                'benefits':     { depends: ['core-hr'] },
                'time':         { depends: ['core-hr'] },
                'talent':       { depends: ['core-hr'] },
                'learning':     { depends: ['core-hr'] },
                'compensation': { depends: ['core-hr'] }
            },
            scm: {
                'procurement':     { depends: [], foundation: true },
                'inventory':       { depends: ['procurement'] },
                'warehouse':       { depends: ['inventory'] },
                'logistics':       { depends: ['procurement'] },
                'demand-planning': { depends: ['inventory'] },
                'supply-planning': { depends: ['procurement', 'inventory'] }
            },
            sales: {
                'customers': { depends: [], foundation: true },
                'pricing':   { depends: ['customers'] },
                'orders':    { depends: ['customers', 'pricing'] },
                'shipping':  { depends: ['orders'] },
                'billing':   { depends: ['orders'] },
                'analytics': { depends: ['customers'] }
            },
            manufacturing: {
                'engineering': { depends: [], foundation: true },
                'production':  { depends: ['engineering'] },
                'shopfloor':   { depends: ['production'] },
                'quality':     { depends: ['production'] },
                'planning':    { depends: ['engineering'] },
                'costing':     { depends: ['production'] }
            },
            crm: {
                'leads':        { depends: [], foundation: true },
                'opportunities': { depends: ['leads'] },
                'accounts':     { depends: ['leads'] },
                'marketing':    { depends: ['leads'] },
                'service':      { depends: ['accounts'] },
                'fieldservice': { depends: ['accounts', 'service'] }
            },
            projects: {
                'planning':    { depends: [], foundation: true },
                'resources':   { depends: ['planning'] },
                'timeexpense': { depends: ['planning'] },
                'billing':     { depends: ['planning'] },
                'analytics':   { depends: ['planning'] }
            },
            bi: {
                'reporting':      { depends: [], foundation: true },
                'dashboards':     { depends: ['reporting'] },
                'analytics':      { depends: ['reporting'] },
                'datamanagement': { depends: [] }
            },
            documents: {
                'storage':     { depends: [], foundation: true },
                'workflow':    { depends: ['storage'] },
                'integration': { depends: ['storage'] },
                'compliance':  { depends: ['storage'] }
            },
            ecommerce: {
                'catalog':    { depends: [], foundation: true },
                'customers':  { depends: [] },
                'orders':     { depends: ['catalog', 'customers'] },
                'promotions': { depends: ['catalog'] }
            },
            compliance: {
                'regulatory': { depends: [], foundation: true },
                'controls':   { depends: ['regulatory'] },
                'risk':       { depends: ['regulatory'] },
                'audit':      { depends: ['regulatory', 'controls'] }
            }
        },

        // Tier 3: Intra-sub-module service dependencies (only non-trivial ones)
        // Services not listed here are independent within their sub-module
        services: {}
    };

})();
