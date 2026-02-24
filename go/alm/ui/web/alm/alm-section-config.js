/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/

// ALM Section Configuration for Layer8SectionGenerator
(function() {
    'use strict';

    Layer8SectionConfigs.register('alarms', {
        title: 'Alarms & Events Management',
        subtitle: 'Monitoring, Correlation, Notification & Maintenance',
        icon: '\uD83D\uDD14',
        svgContent: Layer8SvgFactory.generate('alarms'),
        initFn: 'initializeAlm',
        modules: [
            {
                key: 'alarms', label: 'Alarms', isDefault: true,
                services: [
                    { key: 'alarms', label: 'Active Alarms', isDefault: true },
                    { key: 'alarm-definitions', label: 'Definitions' },
                    { key: 'alarm-filters', label: 'Saved Filters' }
                ]
            },
            {
                key: 'events', label: 'Events',
                services: [
                    { key: 'events', label: 'Events', isDefault: true }
                ]
            },
            {
                key: 'correlation', label: 'Correlation',
                services: [
                    { key: 'correlation-rules', label: 'Rules', isDefault: true }
                ]
            },
            {
                key: 'policies', label: 'Policies',
                services: [
                    { key: 'notification-policies', label: 'Notification', isDefault: true },
                    { key: 'escalation-policies', label: 'Escalation' }
                ]
            },
            {
                key: 'maintenance', label: 'Maintenance',
                services: [
                    { key: 'maintenance-windows', label: 'Windows', isDefault: true }
                ]
            }
        ]
    });
})();
