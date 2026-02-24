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
// Health Monitor Component
// Displays service health metrics using Layer8DTable with detail popup

(function() {
    'use strict';

    // Create Health namespace
    window.L8Health = window.L8Health || {};

    // Data stores
    var healthTable = null;
    var healthDataMap = new Map();

    // Column definitions with filterKey for server-side filtering
    var columns = [
        { key: 'service', label: 'Service', filterKey: 'alias', sortKey: 'alias' },
        { key: 'rx', label: 'RX', filterKey: 'stats.rxMsgCount', sortKey: 'stats.rxMsgCount' },
        { key: 'rxData', label: 'RX Data', filterKey: 'stats.rxDataCont', sortKey: 'stats.rxDataCont' },
        { key: 'tx', label: 'TX', filterKey: 'stats.txMsgCount', sortKey: 'stats.txMsgCount' },
        { key: 'txData', label: 'TX Data', filterKey: 'stats.txDataCount', sortKey: 'stats.txDataCount' },
        { key: 'memory', label: 'Memory', filterKey: 'stats.memoryUsage', sortKey: 'stats.memoryUsage' },
        { key: 'cpuPercent', label: 'CPU %', filterKey: 'stats.cpuUsage', sortKey: 'stats.cpuUsage' },
        { key: 'upTime', label: 'Up Time', filterKey: 'startTime', sortKey: 'startTime' },
        { key: 'lastPulse', label: 'Last Pulse', filterKey: 'stats.lastMsgTime', sortKey: 'stats.lastMsgTime' }
    ];

    // Get health endpoint using shared config
    function getHealthEndpoint() {
        var config = Layer8DConfig.getConfig();
        var healthPath = config.healthPath || '/0/Health';
        return Layer8DConfig.resolveEndpoint(healthPath);
    }

    // Initialize the health table
    function initialize() {
        var container = document.getElementById('health-table-container');
        if (!container) return;

        healthTable = new Layer8DTable({
            containerId: 'health-table-container',
            endpoint: getHealthEndpoint(),
            modelName: 'L8Health',
            columns: columns,
            pageSize: 15,
            sortable: true,
            filterable: true,
            serverSide: true,
            transformData: transformHealthData,
            onDataLoaded: function(data, items, totalCount) {
                healthDataMap.clear();
                if (data && data.list) {
                    data.list.forEach(function(item) {
                        if (item.stats) {
                            var serviceName = item.alias || 'Unknown';
                            healthDataMap.set(serviceName, item);
                        }
                    });
                }
            },
            onRowClick: function(rowData) {
                showHealthDetailsModal(rowData);
            }
        });
        healthTable.init();
    }

    // Transform raw health data to table format
    function transformHealthData(item) {
        if (!item.stats) return null;

        return {
            service: item.alias || 'Unknown',
            rx: item.stats.rxMsgCount || 0,
            rxData: formatBytes(item.stats.rxDataCont || 0),
            rxDataRaw: item.stats.rxDataCont || 0,
            tx: item.stats.txMsgCount || 0,
            txData: formatBytes(item.stats.txDataCount || 0),
            txDataRaw: item.stats.txDataCount || 0,
            memory: formatBytes(item.stats.memoryUsage || 0),
            memoryRaw: item.stats.memoryUsage || 0,
            cpuPercent: formatCPU(item.stats.cpuUsage || 0),
            cpuPercentRaw: item.stats.cpuUsage || 0,
            upTime: formatUptime(item.startTime),
            lastPulse: formatLastPulse(item.stats.lastMsgTime)
        };
    }

    // Format bytes to human-readable
    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        var i = Math.floor(Math.log(bytes) / Math.log(1024));
        if (i === 0) return bytes + ' B';
        return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
    }

    // Format CPU percentage
    function formatCPU(cpu) {
        if (!cpu || cpu === 0) return '0.00%';
        return cpu.toFixed(2) + '%';
    }

    // Format uptime from start timestamp
    function formatUptime(startTime) {
        if (!startTime || startTime === 0 || startTime === '0') return '00:00:00';
        var startMs = typeof startTime === 'string' ? parseInt(startTime, 10) : startTime;
        var uptimeSeconds = Math.floor((Date.now() - startMs) / 1000);
        if (uptimeSeconds < 0) return '00:00:00';
        var hours = Math.floor(uptimeSeconds / 3600);
        var minutes = Math.floor((uptimeSeconds % 3600) / 60);
        var seconds = uptimeSeconds % 60;
        return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    }

    // Format last pulse as time since
    function formatLastPulse(lastMsgTime) {
        if (!lastMsgTime || lastMsgTime === 0 || lastMsgTime === '0') return '00:00:00';
        var lastMsgMs = typeof lastMsgTime === 'string' ? parseInt(lastMsgTime, 10) : lastMsgTime;
        var timeSinceSeconds = Math.floor((Date.now() - lastMsgMs) / 1000);
        if (timeSinceSeconds < 0) return '00:00:00';
        var hours = Math.floor(timeSinceSeconds / 3600);
        var minutes = Math.floor((timeSinceSeconds % 3600) / 60);
        var seconds = timeSinceSeconds % 60;
        return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    }

    // Escape HTML for safe rendering
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        var div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    // Show health detail modal using Layer8DPopup
    function showHealthDetailsModal(rowData) {
        var rawData = healthDataMap.get(rowData.service);
        if (!rawData) return;

        var contentHtml = generateHealthDetailContent(rowData, rawData);

        Layer8DPopup.show({
            id: 'health-detail-modal',
            title: 'Service Health - ' + rowData.service,
            size: 'xlarge',
            content: contentHtml,
            showFooter: false
        });
    }

    // Generate health detail content HTML with 4 tabs
    function generateHealthDetailContent(rowData, rawData) {
        var stats = rawData.stats || {};
        var services = rawData.services || {};
        var serviceToAreas = services.serviceToAreas || {};

        // Build services tab rows
        var servicesRows = '';
        var serviceKeys = Object.keys(serviceToAreas);
        if (serviceKeys.length > 0) {
            serviceKeys.forEach(function(serviceName) {
                var serviceData = serviceToAreas[serviceName];
                var areas = serviceData.areas || {};
                var areasList = Object.keys(areas).filter(function(area) { return areas[area]; }).join(', ');
                servicesRows += '<div class="l8health-detail-row">' +
                    '<span class="l8health-detail-label">' + escapeHtml(serviceName) + '</span>' +
                    '<span class="l8health-detail-value">Areas: ' + (escapeHtml(areasList) || 'None') + '</span>' +
                    '</div>';
            });
        } else {
            servicesRows = '<div class="l8health-detail-row"><span class="l8health-detail-label">No services available</span></div>';
        }

        return '' +
            '<div class="probler-popup-tabs">' +
                '<div class="probler-popup-tab active" data-tab="overview">Overview</div>' +
                '<div class="probler-popup-tab" data-tab="network">Network</div>' +
                '<div class="probler-popup-tab" data-tab="resources">Resources</div>' +
                '<div class="probler-popup-tab" data-tab="services">Services</div>' +
            '</div>' +
            '<div class="probler-popup-tab-content">' +
                '<div class="probler-popup-tab-pane active" data-pane="overview">' +
                    '<div class="l8health-detail-grid">' +
                        '<div class="l8health-detail-section">' +
                            '<div class="l8health-detail-section-title">Service Information</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">Service Name</span>' +
                                '<span class="l8health-detail-value">' + escapeHtml(rowData.service) + '</span>' +
                            '</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">Alias</span>' +
                                '<span class="l8health-detail-value">' + escapeHtml(rawData.alias || 'N/A') + '</span>' +
                            '</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">Start Time</span>' +
                                '<span class="l8health-detail-value">' + (rawData.startTime ? new Date(parseInt(rawData.startTime)).toLocaleString() : 'N/A') + '</span>' +
                            '</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">Up Time</span>' +
                                '<span class="l8health-detail-value">' + escapeHtml(rowData.upTime) + '</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="l8health-detail-section">' +
                            '<div class="l8health-detail-section-title">Quick Stats</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">Memory Usage</span>' +
                                '<span class="l8health-detail-value">' + escapeHtml(rowData.memory) + '</span>' +
                            '</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">CPU Usage</span>' +
                                '<span class="l8health-detail-value">' + escapeHtml(rowData.cpuPercent) + '</span>' +
                            '</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">Last Pulse</span>' +
                                '<span class="l8health-detail-value">' + escapeHtml(rowData.lastPulse) + '</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="probler-popup-tab-pane" data-pane="network">' +
                    '<div class="l8health-detail-grid">' +
                        '<div class="l8health-detail-section">' +
                            '<div class="l8health-detail-section-title">Receive Statistics</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">RX Messages</span>' +
                                '<span class="l8health-detail-value">' + (rowData.rx || 0).toLocaleString() + '</span>' +
                            '</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">RX Data</span>' +
                                '<span class="l8health-detail-value">' + escapeHtml(rowData.rxData) + '</span>' +
                            '</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">RX Data (bytes)</span>' +
                                '<span class="l8health-detail-value">' + (stats.rxDataCont || 0).toLocaleString() + '</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="l8health-detail-section">' +
                            '<div class="l8health-detail-section-title">Transmit Statistics</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">TX Messages</span>' +
                                '<span class="l8health-detail-value">' + (rowData.tx || 0).toLocaleString() + '</span>' +
                            '</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">TX Data</span>' +
                                '<span class="l8health-detail-value">' + escapeHtml(rowData.txData) + '</span>' +
                            '</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">TX Data (bytes)</span>' +
                                '<span class="l8health-detail-value">' + (stats.txDataCount || 0).toLocaleString() + '</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="l8health-detail-section l8health-detail-full-width">' +
                            '<div class="l8health-detail-section-title">Message Timing</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">Last Message</span>' +
                                '<span class="l8health-detail-value">' + (stats.lastMsgTime ? new Date(parseInt(stats.lastMsgTime)).toLocaleString() : 'N/A') + '</span>' +
                            '</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">Time Since Last Msg</span>' +
                                '<span class="l8health-detail-value">' + escapeHtml(rowData.lastPulse) + '</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="probler-popup-tab-pane" data-pane="resources">' +
                    '<div class="l8health-detail-grid">' +
                        '<div class="l8health-detail-section">' +
                            '<div class="l8health-detail-section-title">Memory Usage</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">Formatted</span>' +
                                '<span class="l8health-detail-value">' + escapeHtml(rowData.memory) + '</span>' +
                            '</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">Raw (bytes)</span>' +
                                '<span class="l8health-detail-value">' + (stats.memoryUsage || 0).toLocaleString() + '</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="l8health-detail-section">' +
                            '<div class="l8health-detail-section-title">CPU Usage</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">Percentage</span>' +
                                '<span class="l8health-detail-value">' + escapeHtml(rowData.cpuPercent) + '</span>' +
                            '</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">Raw Value</span>' +
                                '<span class="l8health-detail-value">' + (stats.cpuUsage || 0) + '</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="l8health-detail-section l8health-detail-full-width">' +
                            '<div class="l8health-detail-section-title">Additional Details</div>' +
                            '<div class="l8health-detail-row">' +
                                '<span class="l8health-detail-label">Data Object</span>' +
                                '<span class="l8health-detail-value">' + escapeHtml(rawData.data || 'N/A') + '</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="probler-popup-tab-pane" data-pane="services">' +
                    '<div class="l8health-detail-grid">' +
                        '<div class="l8health-detail-section l8health-detail-full-width">' +
                            '<div class="l8health-detail-section-title">Registered Services</div>' +
                            servicesRows +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }

    // Refresh health data
    function refresh() {
        if (healthTable) {
            healthTable.fetchData(healthTable.currentPage, healthTable.pageSize);
        } else {
            initialize();
        }
    }

    // Expose API
    L8Health.initialize = initialize;
    L8Health.refresh = refresh;
    L8Health.getHealthData = function() { return healthDataMap; };

})();
