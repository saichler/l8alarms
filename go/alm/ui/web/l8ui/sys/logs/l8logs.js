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
// Log File Browser Component
// Displays file system tree in tab content, opens log files in Layer8DPopup

(function() {
    'use strict';

    window.L8Logs = window.L8Logs || {};

    var BYTES_PER_PAGE = 5120; // 5KB per page
    var currentPage = 0;
    var currentContent = '';
    var totalBytes = 0;
    var selectedFile = null;

    function getLogsEndpoint() {
        return Layer8DConfig.resolveEndpoint('/87/logs');
    }

    function buildQueryUrl(queryText) {
        var bodyParam = JSON.stringify({ text: queryText });
        return getLogsEndpoint() + '?body=' + encodeURIComponent(bodyParam);
    }

    // Initialize the logs tab — render tree container and fetch data
    function initialize() {
        var container = document.getElementById('logs-table-container');
        if (!container) return;

        container.innerHTML =
            '<div class="l8logs-tree-container">' +
                '<div class="l8logs-tree-header">' +
                    '<h3 class="l8logs-tree-title">File System</h3>' +
                '</div>' +
                '<div class="l8logs-tree-view" id="l8logs-tree-view">' +
                    '<div class="l8logs-loading">Loading log files...</div>' +
                '</div>' +
            '</div>';

        loadTreeData();
    }

    // Fetch the file tree from the server
    async function loadTreeData() {
        try {
            var queryText = 'select * from l8file where path="*" mapreduce true';
            var url = buildQueryUrl(queryText);
            var response = await makeAuthenticatedRequest(url);
            if (!response || !response.ok) {
                throw new Error('HTTP error: ' + (response ? response.status : 'No response'));
            }
            var data = await response.json();
            renderTree(data);
        } catch (error) {
            console.error('Error loading log tree:', error);
            var treeView = document.getElementById('l8logs-tree-view');
            if (treeView) {
                treeView.innerHTML = '<div class="l8logs-empty">Error loading log files. Please try again later.</div>';
            }
        }
    }

    // Render the tree from server response
    function renderTree(data) {
        var treeView = document.getElementById('l8logs-tree-view');
        if (!treeView) return;
        treeView.innerHTML = '';

        if (data.files && data.files.length > 0) {
            data.files.forEach(function(item) {
                var el = createTreeItem(item);
                treeView.appendChild(el);
            });
        } else {
            treeView.innerHTML = '<div class="l8logs-empty">No log files available</div>';
        }
    }

    // Create a DOM element for a tree item (file or directory)
    function createTreeItem(item) {
        var itemDiv = document.createElement('div');
        itemDiv.className = 'l8logs-tree-item';

        var nodeDiv = document.createElement('div');
        nodeDiv.className = item.isDirectory ? 'l8logs-tree-node l8logs-directory' : 'l8logs-tree-node l8logs-file';

        var icon = document.createElement('span');
        icon.className = item.isDirectory ? 'l8logs-tree-icon l8logs-folder-icon' : 'l8logs-tree-icon l8logs-file-icon';

        var name = document.createElement('span');
        name.className = 'l8logs-tree-name';
        name.textContent = item.name;

        nodeDiv.appendChild(icon);
        nodeDiv.appendChild(name);
        itemDiv.appendChild(nodeDiv);

        if (item.isDirectory) {
            nodeDiv.addEventListener('click', function(e) {
                e.stopPropagation();
                icon.classList.toggle('expanded');
                var children = nodeDiv.nextElementSibling;
                if (children && children.classList.contains('l8logs-tree-children')) {
                    children.classList.toggle('collapsed');
                }
            });

            if (item.files && item.files.length > 0) {
                var childrenDiv = document.createElement('div');
                childrenDiv.className = 'l8logs-tree-children collapsed';
                item.files.forEach(function(child) {
                    childrenDiv.appendChild(createTreeItem(child));
                });
                itemDiv.appendChild(childrenDiv);
            }
        } else {
            nodeDiv.addEventListener('click', function(e) {
                e.stopPropagation();
                // Remove previous selection
                document.querySelectorAll('.l8logs-tree-node').forEach(function(n) {
                    n.classList.remove('selected');
                });
                nodeDiv.classList.add('selected');
                openLogFile(item);
            });
        }

        return itemDiv;
    }

    // Open a log file in Layer8DPopup
    function openLogFile(fileItem) {
        selectedFile = fileItem;
        currentPage = 0;
        currentContent = '';
        totalBytes = 0;

        var fullPath = fileItem.path + '/' + fileItem.name;

        Layer8DPopup.show({
            title: 'Log: ' + fullPath,
            size: 'xlarge',
            content: '<div class="l8logs-popup-loading">Loading log content...</div>',
            showFooter: false
        });

        loadLogPage(fullPath, 0);
    }

    // Fetch a specific page of log content
    async function loadLogPage(filePath, page) {
        try {
            var lastSlash = filePath.lastIndexOf('/');
            var path = filePath.substring(0, lastSlash);
            var name = filePath.substring(lastSlash + 1);

            var queryText = 'select * from l8file where path=' + path +
                ' and name = ' + name + ' limit 1 page ' + page + ' mapreduce true';
            var url = buildQueryUrl(queryText);

            var response = await makeAuthenticatedRequest(url);
            if (!response || !response.ok) {
                throw new Error('HTTP error: ' + (response ? response.status : 'No response'));
            }

            var data = await response.json();
            if (data.data) {
                currentContent = data.data.content || '';
                totalBytes = data.data.size || 0;
                currentPage = page;
            } else {
                currentContent = '';
                totalBytes = 0;
            }

            updatePopupContent();
        } catch (error) {
            console.error('Error loading log page:', error);
            currentContent = 'Error loading log content. Please try again later.';
            totalBytes = 0;
            updatePopupContent();
        }
    }

    // Update the popup body with current page content and pagination
    function updatePopupContent() {
        var popupBody = Layer8DPopup.getBody();
        if (!popupBody) return;

        if (totalBytes === 0) {
            popupBody.innerHTML =
                buildPaginationBar(0, 0, 0, 0, true, true) +
                '<div class="l8logs-log-content">' +
                    '<pre class="l8logs-log-display">No log content available</pre>' +
                '</div>';
            attachPaginationHandlers();
            return;
        }

        var totalPages = Math.ceil(totalBytes / BYTES_PER_PAGE);
        var startByte = currentPage * BYTES_PER_PAGE + 1;
        var endByte = Math.min(startByte + currentContent.length - 1, totalBytes);
        var isFirst = currentPage === 0;
        var isLast = (currentPage + 1) >= totalPages;

        popupBody.innerHTML =
            buildPaginationBar(startByte, endByte, totalBytes, totalPages, isFirst, isLast) +
            '<div class="l8logs-log-content">' +
                '<pre class="l8logs-log-display"></pre>' +
            '</div>';

        // Set content via textContent to avoid XSS
        var pre = popupBody.querySelector('.l8logs-log-display');
        if (pre) {
            pre.textContent = currentContent;
        }

        attachPaginationHandlers();
    }

    // Build the pagination bar HTML
    function buildPaginationBar(startByte, endByte, total, totalPages, isFirst, isLast) {
        var startKB = (startByte / 1024).toFixed(2);
        var endKB = (endByte / 1024).toFixed(2);
        var totalKB = (total / 1024).toFixed(2);
        var pageDisplay = totalPages > 0 ? (currentPage + 1) + '/' + totalPages : '0/0';

        var info = total > 0
            ? 'Bytes ' + startByte + '-' + endByte + ' of ' + total +
              ' (' + startKB + '-' + endKB + ' KB of ' + totalKB + ' KB) | Page ' + pageDisplay
            : 'No content';

        return '<div class="l8logs-pagination-container">' +
            '<div class="l8logs-pagination-info">' + info + '</div>' +
            '<div class="l8logs-pagination-controls">' +
                '<button class="l8logs-pagination-btn" data-action="first"' + (isFirst ? ' disabled' : '') + '>First</button>' +
                '<button class="l8logs-pagination-btn" data-action="prev"' + (isFirst ? ' disabled' : '') + '>Prev</button>' +
                '<button class="l8logs-pagination-btn" data-action="next"' + (isLast ? ' disabled' : '') + '>Next</button>' +
                '<button class="l8logs-pagination-btn" data-action="last"' + (isLast ? ' disabled' : '') + '>Last</button>' +
            '</div>' +
        '</div>';
    }

    // Attach click handlers to pagination buttons
    function attachPaginationHandlers() {
        if (!selectedFile) return;
        var fullPath = selectedFile.path + '/' + selectedFile.name;
        var maxPage = Math.max(0, Math.ceil(totalBytes / BYTES_PER_PAGE) - 1);

        var body = Layer8DPopup.getBody();
        if (!body) return;
        body.querySelectorAll('.l8logs-pagination-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var action = btn.getAttribute('data-action');
                var newPage = currentPage;
                if (action === 'first') newPage = 0;
                else if (action === 'prev') newPage = Math.max(0, currentPage - 1);
                else if (action === 'next') newPage = Math.min(maxPage, currentPage + 1);
                else if (action === 'last') newPage = maxPage;

                if (newPage !== currentPage) {
                    loadLogPage(fullPath, newPage);
                }
            });
        });
    }

    // Expose API
    L8Logs.initialize = initialize;
    L8Logs.refresh = function() { loadTreeData(); };

})();
