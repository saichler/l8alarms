(function() {
    'use strict';

    const { createStatusRenderer, renderEnum } = Layer8DRenderers;

    // ─── Category 1: Audit ───

    const AUDIT_EVENT_TYPE = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'Create' },
        { value: 2, label: 'Update' },
        { value: 3, label: 'Delete' },
        { value: 4, label: 'Login' },
        { value: 5, label: 'Logout' },
        { value: 6, label: 'Config Change' },
        { value: 7, label: 'Permission Change' },
        { value: 8, label: 'Export' },
        { value: 9, label: 'Import' }
    ]);

    // ─── Category 2: System ───

    const SYSTEM_EVENT_TYPE = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'Service Start' },
        { value: 2, label: 'Service Stop' },
        { value: 3, label: 'Health Check' },
        { value: 4, label: 'Config Reload' },
        { value: 5, label: 'License' },
        { value: 6, label: 'Error' },
        { value: 7, label: 'Upgrade' },
        { value: 8, label: 'Backup' },
        { value: 9, label: 'Restore' }
    ]);

    const SYSTEM_EVENT_TYPE_CLASSES = {
        0: '', 1: 'status-success', 2: 'status-error', 3: 'status-info',
        4: 'status-info', 5: 'status-warning', 6: 'status-error',
        7: 'status-info', 8: 'status-info', 9: 'status-info'
    };

    // ─── Category 3: Monitoring ───

    const MONITORING_EVENT_TYPE = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'Poll Success' },
        { value: 2, label: 'Poll Failure' },
        { value: 3, label: 'Target Unreachable' },
        { value: 4, label: 'Target Recovered' },
        { value: 5, label: 'Data Stale' },
        { value: 6, label: 'Collection Start' },
        { value: 7, label: 'Collection Complete' },
        { value: 8, label: 'Parse Error' }
    ]);

    const MONITORING_EVENT_TYPE_CLASSES = {
        0: '', 1: 'status-success', 2: 'status-error', 3: 'status-error',
        4: 'status-success', 5: 'status-warning', 6: 'status-info',
        7: 'status-success', 8: 'status-error'
    };

    // ─── Category 4: Security ───

    const SECURITY_EVENT_TYPE = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'Auth Success' },
        { value: 2, label: 'Auth Failure' },
        { value: 3, label: 'Access Denied' },
        { value: 4, label: 'Privilege Escalation' },
        { value: 5, label: 'Cert Expiry' },
        { value: 6, label: 'Cert Renewed' },
        { value: 7, label: 'Policy Violation' },
        { value: 8, label: 'Brute Force' },
        { value: 9, label: 'Token Revoked' }
    ]);

    const SECURITY_EVENT_TYPE_CLASSES = {
        0: '', 1: 'status-success', 2: 'status-error', 3: 'status-error',
        4: 'status-warning', 5: 'status-warning', 6: 'status-success',
        7: 'status-error', 8: 'status-error', 9: 'status-warning'
    };

    // ─── Category 5: Integration ───

    const INTEGRATION_EVENT_TYPE = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'API Call Success' },
        { value: 2, label: 'API Call Failure' },
        { value: 3, label: 'Webhook Received' },
        { value: 4, label: 'Webhook Failed' },
        { value: 5, label: 'Sync Start' },
        { value: 6, label: 'Sync Complete' },
        { value: 7, label: 'Sync Failed' },
        { value: 8, label: 'Connector Up' },
        { value: 9, label: 'Connector Down' }
    ]);

    const INTEGRATION_EVENT_TYPE_CLASSES = {
        0: '', 1: 'status-success', 2: 'status-error', 3: 'status-info',
        4: 'status-error', 5: 'status-info', 6: 'status-success',
        7: 'status-error', 8: 'status-success', 9: 'status-error'
    };

    // ─── Category 7: Network ───

    const NETWORK_EVENT_TYPE = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'Device Status' },
        { value: 2, label: 'Interface' },
        { value: 3, label: 'BGP' },
        { value: 4, label: 'OSPF' },
        { value: 5, label: 'MPLS' },
        { value: 6, label: 'LDP' },
        { value: 7, label: 'Segment Routing' },
        { value: 8, label: 'Traffic Engineering' },
        { value: 9, label: 'VRF' },
        { value: 10, label: 'QoS' },
        { value: 11, label: 'Hardware' }
    ]);

    // ─── Category 8: Kubernetes ───

    const KUBERNETES_EVENT_TYPE = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'Pod' },
        { value: 2, label: 'Node' },
        { value: 3, label: 'Deployment' },
        { value: 4, label: 'StatefulSet' },
        { value: 5, label: 'DaemonSet' },
        { value: 6, label: 'Service' },
        { value: 7, label: 'Namespace' },
        { value: 8, label: 'Network Policy' }
    ]);

    // ─── Category 9: Performance ───

    const PERFORMANCE_METRIC = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'CPU' },
        { value: 2, label: 'Memory' },
        { value: 3, label: 'Temperature' },
        { value: 4, label: 'Traffic' },
        { value: 5, label: 'Disk' },
        { value: 6, label: 'Fan Speed' },
        { value: 7, label: 'Power Load' },
        { value: 8, label: 'Voltage' },
        { value: 9, label: 'Latency' },
        { value: 10, label: 'Packet Loss' }
    ]);

    const THRESHOLD_TYPE = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'Upper' },
        { value: 2, label: 'Lower' }
    ]);

    // ─── Category 12: Compute ───

    const COMPUTE_EVENT_TYPE = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'Hypervisor Status' },
        { value: 2, label: 'VM Status' },
        { value: 3, label: 'VM Migration' },
        { value: 4, label: 'VM Resource' },
        { value: 5, label: 'Host Resource' }
    ]);

    // ─── Category 13: Storage ───

    const STORAGE_EVENT_TYPE = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'Array Status' },
        { value: 2, label: 'Volume Status' },
        { value: 3, label: 'Capacity' },
        { value: 4, label: 'Replication' },
        { value: 5, label: 'Disk' },
        { value: 6, label: 'Controller' }
    ]);

    // ─── Category 14: Power ───

    const POWER_EVENT_TYPE = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'PSU Status' },
        { value: 2, label: 'PDU Status' },
        { value: 3, label: 'UPS Status' },
        { value: 4, label: 'Battery' },
        { value: 5, label: 'Load' },
        { value: 6, label: 'Voltage' },
        { value: 7, label: 'Temperature' }
    ]);

    // ─── Category 15: GPU ───

    const GPU_EVENT_TYPE = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'Status' },
        { value: 2, label: 'Temperature' },
        { value: 3, label: 'Memory' },
        { value: 4, label: 'Utilization' },
        { value: 5, label: 'Error' },
        { value: 6, label: 'Power' }
    ]);

    // ─── Category 16: Topology ───

    const TOPOLOGY_EVENT_TYPE = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'Link Discovered' },
        { value: 2, label: 'Link Lost' },
        { value: 3, label: 'Neighbor Change' },
        { value: 4, label: 'Topology Change' }
    ]);

    // ─── Category 17: Automation ───

    const AUTOMATION_EVENT_TYPE = Layer8EnumFactory.create([
        { value: 0, label: 'Unspecified' },
        { value: 1, label: 'Rule Triggered' },
        { value: 2, label: 'Rule Completed' },
        { value: 3, label: 'Rule Failed' },
        { value: 4, label: 'Policy Violation' },
        { value: 5, label: 'Remediation' }
    ]);

    const AUTOMATION_EVENT_TYPE_CLASSES = {
        0: '', 1: 'status-info', 2: 'status-success', 3: 'status-error',
        4: 'status-warning', 5: 'status-info'
    };

    // ─── Export ───

    window.L8EventsCategoryEnums = {
        AUDIT_EVENT_TYPE: AUDIT_EVENT_TYPE,
        SYSTEM_EVENT_TYPE: SYSTEM_EVENT_TYPE,
        MONITORING_EVENT_TYPE: MONITORING_EVENT_TYPE,
        SECURITY_EVENT_TYPE: SECURITY_EVENT_TYPE,
        INTEGRATION_EVENT_TYPE: INTEGRATION_EVENT_TYPE,
        NETWORK_EVENT_TYPE: NETWORK_EVENT_TYPE,
        KUBERNETES_EVENT_TYPE: KUBERNETES_EVENT_TYPE,
        PERFORMANCE_METRIC: PERFORMANCE_METRIC,
        THRESHOLD_TYPE: THRESHOLD_TYPE,
        COMPUTE_EVENT_TYPE: COMPUTE_EVENT_TYPE,
        STORAGE_EVENT_TYPE: STORAGE_EVENT_TYPE,
        POWER_EVENT_TYPE: POWER_EVENT_TYPE,
        GPU_EVENT_TYPE: GPU_EVENT_TYPE,
        TOPOLOGY_EVENT_TYPE: TOPOLOGY_EVENT_TYPE,
        AUTOMATION_EVENT_TYPE: AUTOMATION_EVENT_TYPE,
        render: {
            auditEventType: (value) => renderEnum(value, AUDIT_EVENT_TYPE.enum),
            systemEventType: createStatusRenderer(SYSTEM_EVENT_TYPE.enum, SYSTEM_EVENT_TYPE_CLASSES),
            monitoringEventType: createStatusRenderer(MONITORING_EVENT_TYPE.enum, MONITORING_EVENT_TYPE_CLASSES),
            securityEventType: createStatusRenderer(SECURITY_EVENT_TYPE.enum, SECURITY_EVENT_TYPE_CLASSES),
            integrationEventType: createStatusRenderer(INTEGRATION_EVENT_TYPE.enum, INTEGRATION_EVENT_TYPE_CLASSES),
            networkEventType: (value) => renderEnum(value, NETWORK_EVENT_TYPE.enum),
            kubernetesEventType: (value) => renderEnum(value, KUBERNETES_EVENT_TYPE.enum),
            performanceMetric: (value) => renderEnum(value, PERFORMANCE_METRIC.enum),
            thresholdType: (value) => renderEnum(value, THRESHOLD_TYPE.enum),
            computeEventType: (value) => renderEnum(value, COMPUTE_EVENT_TYPE.enum),
            storageEventType: (value) => renderEnum(value, STORAGE_EVENT_TYPE.enum),
            powerEventType: (value) => renderEnum(value, POWER_EVENT_TYPE.enum),
            gpuEventType: (value) => renderEnum(value, GPU_EVENT_TYPE.enum),
            topologyEventType: (value) => renderEnum(value, TOPOLOGY_EVENT_TYPE.enum),
            automationEventType: createStatusRenderer(AUTOMATION_EVENT_TYPE.enum, AUTOMATION_EVENT_TYPE_CLASSES)
        }
    };
})();
