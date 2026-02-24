# Layer8 UI Component Library - Usage Guide

This guide describes how to use the Layer8 generic UI component libraries to build web applications. The library provides two surfaces: **Desktop** (`l8ui/`) and **Mobile** (`l8ui/m/`), both driven by configuration data (no behavioral code in modules).

**To use this guide:** Tell your AI assistant: "Please load `l8ui/GUIDE.md` for instructions on how to use the l8ui components."

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Setup & Configuration](#2-setup--configuration)
3. [Desktop Script Loading Order](#3-desktop-script-loading-order)
4. [Mobile Script Loading Order](#4-mobile-script-loading-order)
5. [Desktop Component API](#5-desktop-component-api)
6. [Mobile Component API](#6-mobile-component-api)
7. [Shared Schemas](#7-shared-schemas)
8. [Adding a New Module (Desktop)](#8-adding-a-new-module-desktop)
9. [Adding a New Module (Mobile)](#9-adding-a-new-module-mobile)
10. [Special Cases](#10-special-cases)
11. [Checklist](#11-checklist)

---

## 1. Architecture Overview

Both desktop and mobile follow a **configuration-driven module pattern**:
- All behavioral logic (CRUD, navigation, table rendering, form handling) lives in shared library components.
- Modules supply only **data**: configs, enums, columns, forms.
- A module is bootstrapped by a single factory call (desktop) or registry registration (mobile).

**Desktop** (`Layer8D*` prefix): Traditional table-based layout with sidebar navigation, tabs, and sub-navigation.
**Mobile** (`Layer8M*` prefix): Card-based responsive layout with hierarchical card drill-down navigation.

### Dependency Graph (Desktop)

```
Layer8DConfig
    |
Layer8DUtils  <--- Layer8DRenderers
    |
    +--- Factory Components
    |       Layer8EnumFactory
    |       Layer8RefFactory
    |       Layer8ColumnFactory
    |       Layer8FormFactory
    |       Layer8SvgFactory
    |       Layer8SectionGenerator / Layer8SectionConfigs
    |       Layer8ModuleConfigFactory
    |
    +--- Layer8DTable (class)
    +--- Layer8DDatePicker
    +--- Layer8DInputFormatter
    +--- Layer8DReferencePicker
    +--- Layer8DNotification
    +--- Layer8DPopup
    +--- Layer8DReferenceRegistry
    +--- Layer8DForms (facade)
    |       Layer8DFormsFields
    |       Layer8DFormsData
    |       Layer8DFormsPickers
    |       Layer8DFormsModal
    +--- Layer8DServiceRegistry
    +--- Layer8DModuleNavigation
    +--- Layer8DModuleCRUD
    +--- Layer8DToggleTree
    +--- Layer8DModuleFilter
    +--- Layer8DModuleFactory (orchestrates all)
    |
    +--- View System
    |       Layer8DViewFactory (registry + table auto-registered)
    |       Layer8ViewSwitcher (dropdown UI)
    |       Layer8DDataSource (shared fetch/pagination)
    |       Layer8DChart (bar/line/pie with type selector)
    |           Layer8DChartBar, Layer8DChartLine, Layer8DChartPie
    |       Layer8DKanban + Layer8DKanbanRender
    |       Layer8DTimeline
    |       Layer8DCalendar + Layer8DCalendarRender
    |       Layer8DGantt + Layer8DGanttRender
    |       Layer8DTreeGrid
    |       Layer8DWizard + Layer8DWizardRender
    +--- Layer8DWidget (dashboard KPI cards)
```

### Dependency Graph (Mobile)

```
Layer8MConfig
    |
Layer8MAuth
Layer8MUtils
    |
    +--- Desktop Shared (loaded in mobile too)
    |       Layer8DConfig, Layer8DUtils, Layer8DRenderers
    |       Layer8DReferenceRegistry
    |       Layer8EnumFactory, Layer8RefFactory
    |       Layer8ColumnFactory, Layer8FormFactory
    |
    +--- Layer8MPopup
    +--- Layer8MConfirm
    +--- Layer8MTable (class)
    +--- Layer8MEditTable (extends Table)
    +--- Layer8MFormFields / Layer8MFormFieldsReference
    +--- Layer8MForms
    +--- Layer8MDatePicker
    +--- Layer8MReferenceRegistry
    +--- Layer8MReferencePicker
    +--- Layer8MRenderers
    +--- Layer8MModuleRegistry
    +--- Layer8DToggleTree, Layer8DModuleFilter
    +--- LAYER8M_NAV_CONFIG (data)
    +--- Layer8MNavCrud, Layer8MNavData
    +--- Layer8MNav (uses all above)
    |
    +--- View System (wraps desktop core components)
    |       Layer8MViewFactory (registry + table auto-registered)
    |       Layer8ViewSwitcher (shared with desktop)
    |       Layer8MChart, Layer8MKanban, Layer8MCalendar
    |       Layer8MTimeline, Layer8MGantt, Layer8MTreeGrid
    |       Layer8MWizard
```

---

## 2. Setup & Configuration

### login.json (shared by desktop and mobile)

Place at web root. Both `Layer8DConfig` and `Layer8MConfig` load this file at startup.

```json
{
    "login": {
        "appTitle": "My App",
        "authEndpoint": "/auth",
        "redirectUrl": "/app.html",
        "sessionTimeout": 30,
        "tfaEnabled": true
    },
    "app": {
        "dateFormat": "mm/dd/yyyy",
        "apiPrefix": "/erp",
        "healthPath": "/0/Health"
    }
}
```

The critical function is `resolveEndpoint(path)` which prepends `apiPrefix`. Example: `/30/Employee` becomes `/erp/30/Employee`.

### L8Query - Server-Side Query Language

All table components use L8Query for server communication:

```
select * from Employee where lastName=Smith limit 10 page 0 sort-by lastName
select * from Employee where lastName=Smith limit 10 page 0 sort-by lastName descending
select employeeId,lastName from Employee where departmentId=D001 limit 15 page 2
```

### Authentication

Both desktop and mobile store a bearer token in `sessionStorage.bearerToken`. Desktop uses a global `getAuthHeaders()` function. Mobile uses `Layer8MAuth.get/post/put/delete()` which auto-attach the token.

---

## 3. Desktop Script Loading Order

CSS files first, then JS in strict dependency order:

```html
<!-- CSS: Theme -->
<link rel="stylesheet" href="l8ui/shared/layer8d-theme.css">
<link rel="stylesheet" href="l8ui/shared/layer8d-animations.css">
<link rel="stylesheet" href="l8ui/shared/layer8d-scrollbar.css">

<!-- CSS: Section Layout (l8-* classes) -->
<link rel="stylesheet" href="l8ui/shared/layer8-section-layout.css">
<link rel="stylesheet" href="l8ui/shared/layer8-section-responsive.css">

<!-- CSS: Components -->
<link rel="stylesheet" href="l8ui/edit_table/layer8d-table.css">
<link rel="stylesheet" href="l8ui/shared/layer8d-toggle-tree.css">
<link rel="stylesheet" href="l8ui/popup/layer8d-popup.css">
<link rel="stylesheet" href="l8ui/popup/layer8d-popup-forms.css">
<link rel="stylesheet" href="l8ui/popup/layer8d-popup-content.css">
<link rel="stylesheet" href="l8ui/datepicker/layer8d-datepicker.css">
<link rel="stylesheet" href="l8ui/reference_picker/layer8d-reference-picker.css">
<link rel="stylesheet" href="l8ui/input_formatters/layer8d-input-formatter.css">
<link rel="stylesheet" href="l8ui/notification/layer8d-notification.css">

<!-- CSS: View System -->
<link rel="stylesheet" href="l8ui/shared/layer8-view-switcher.css">
<link rel="stylesheet" href="l8ui/chart/layer8d-chart.css">
<link rel="stylesheet" href="l8ui/kanban/layer8d-kanban.css">
<link rel="stylesheet" href="l8ui/timeline/layer8d-timeline.css">
<link rel="stylesheet" href="l8ui/calendar/layer8d-calendar.css">
<link rel="stylesheet" href="l8ui/gantt/layer8d-gantt.css">
<link rel="stylesheet" href="l8ui/tree_grid/layer8d-tree-grid.css">
<link rel="stylesheet" href="l8ui/wizard/layer8d-wizard.css">
<link rel="stylesheet" href="l8ui/dashboard/layer8d-widget.css">

<!-- CSS: SYS Module -->
<link rel="stylesheet" href="l8ui/sys/l8sys.css">
<link rel="stylesheet" href="l8ui/sys/health/l8health.css">
<link rel="stylesheet" href="l8ui/sys/modules/l8sys-modules.css">

<!-- CSS: Module-specific (optional, per project) -->
<link rel="stylesheet" href="mymodule/mymodule.css">

<!-- JS: App Shell (sections mapping, app bootstrap) -->
<script src="js/sections.js"></script>
<script src="js/app.js"></script>

<!-- JS: Layer8 Core -->
<script src="l8ui/shared/layer8d-config.js"></script>
<script src="l8ui/shared/layer8d-utils.js"></script>
<script src="l8ui/shared/layer8d-renderers.js"></script>
<script src="l8ui/shared/layer8d-reference-registry.js"></script>

<!-- JS: Factory Components (load before module scripts) -->
<script src="l8ui/shared/layer8-enum-factory.js"></script>
<script src="l8ui/shared/layer8-ref-factory.js"></script>
<script src="l8ui/shared/layer8-column-factory.js"></script>
<script src="l8ui/shared/layer8-form-factory.js"></script>
<script src="l8ui/shared/layer8-svg-factory.js"></script>

<!-- JS: Project-specific SVG templates (optional) -->
<script src="erp-ui/erp-svg-templates.js"></script>

<script src="l8ui/shared/layer8d-module-config-factory.js"></script>
<script src="l8ui/shared/layer8-section-generator.js"></script>

<!-- JS: Reference Data (project-specific) -->
<script src="js/reference-registry-fin.js"></script>
<script src="js/reference-registry-hcm.js"></script>
<!-- ... more reference registries -->

<!-- JS: Notification Component (load before forms) -->
<script src="l8ui/notification/layer8d-notification.js"></script>

<!-- JS: Input Formatter Component (load in order, before forms) -->
<script src="l8ui/input_formatters/layer8d-input-formatter-utils.js"></script>
<script src="l8ui/input_formatters/layer8d-input-formatter-masks.js"></script>
<script src="l8ui/input_formatters/layer8d-input-formatter-types-validators.js"></script>
<script src="l8ui/input_formatters/layer8d-input-formatter-types.js"></script>
<script src="l8ui/input_formatters/layer8d-input-formatter-core.js"></script>
<script src="l8ui/input_formatters/layer8d-input-formatter.js"></script>

<!-- JS: Forms Component (load sub-modules then facade) -->
<script src="l8ui/shared/layer8d-forms-fields.js"></script>
<script src="l8ui/shared/layer8d-forms-data.js"></script>
<script src="l8ui/shared/layer8d-forms-pickers.js"></script>
<script src="l8ui/shared/layer8d-forms-modal.js"></script>
<script src="l8ui/shared/layer8d-forms.js"></script>

<!-- JS: Popup Component -->
<script src="l8ui/popup/layer8d-popup.js"></script>

<!-- JS: Date Picker Component (load in order) -->
<script src="l8ui/datepicker/layer8d-datepicker-utils.js"></script>
<script src="l8ui/datepicker/layer8d-datepicker-calendar.js"></script>
<script src="l8ui/datepicker/layer8d-datepicker-core.js"></script>
<script src="l8ui/datepicker/layer8d-datepicker.js"></script>

<!-- JS: Reference Picker Component (load in order) -->
<script src="l8ui/reference_picker/layer8d-reference-picker-utils.js"></script>
<script src="l8ui/reference_picker/layer8d-reference-picker-data.js"></script>
<script src="l8ui/reference_picker/layer8d-reference-picker-render.js"></script>
<script src="l8ui/reference_picker/layer8d-reference-picker-events.js"></script>
<script src="l8ui/reference_picker/layer8d-reference-picker-core.js"></script>
<script src="l8ui/reference_picker/layer8d-reference-picker.js"></script>

<!-- JS: Table Component (load in order) -->
<script src="l8ui/edit_table/layer8d-table-core.js"></script>
<script src="l8ui/edit_table/layer8d-table-data.js"></script>
<script src="l8ui/edit_table/layer8d-table-render.js"></script>
<script src="l8ui/edit_table/layer8d-table-events.js"></script>
<script src="l8ui/edit_table/layer8d-table-filter.js"></script>
<script src="l8ui/edit_table/layer8d-table.js"></script>

<!-- JS: View System (load after table) -->
<script src="l8ui/shared/layer8d-view-factory.js"></script>
<script src="l8ui/shared/layer8-view-switcher.js"></script>
<script src="l8ui/shared/layer8d-data-source.js"></script>
<script src="l8ui/chart/layer8d-chart-core.js"></script>
<script src="l8ui/chart/layer8d-chart-bar.js"></script>
<script src="l8ui/chart/layer8d-chart-line.js"></script>
<script src="l8ui/chart/layer8d-chart-pie.js"></script>
<script src="l8ui/kanban/layer8d-kanban-core.js"></script>
<script src="l8ui/kanban/layer8d-kanban-render.js"></script>
<script src="l8ui/timeline/layer8d-timeline.js"></script>
<script src="l8ui/calendar/layer8d-calendar-core.js"></script>
<script src="l8ui/calendar/layer8d-calendar-render.js"></script>
<script src="l8ui/gantt/layer8d-gantt-core.js"></script>
<script src="l8ui/gantt/layer8d-gantt-render.js"></script>
<script src="l8ui/tree_grid/layer8d-tree-grid-core.js"></script>
<script src="l8ui/wizard/layer8d-wizard-core.js"></script>
<script src="l8ui/wizard/layer8d-wizard-render.js"></script>
<script src="l8ui/dashboard/layer8d-widget.js"></script>

<!-- JS: Module Abstractions -->
<script src="l8ui/shared/layer8d-service-registry.js"></script>
<script src="l8ui/shared/layer8d-module-crud.js"></script>
<script src="l8ui/shared/layer8d-module-navigation.js"></script>
<script src="l8ui/shared/layer8d-toggle-tree.js"></script>
<script src="l8ui/shared/layer8d-module-filter.js"></script>
<script src="l8ui/shared/layer8d-module-factory.js"></script>

<!-- JS: Module Data (per module, per sub-module) -->
<script src="mymodule/mymodule-section-config.js"></script>
<script src="mymodule/mymodule-config.js"></script>
<script src="mymodule/submodule/submodule-enums.js"></script>
<script src="mymodule/submodule/submodule-columns.js"></script>
<script src="mymodule/submodule/submodule-forms.js"></script>
<!-- repeat for each sub-module -->
<script src="mymodule/mymodule-init.js"></script>

<!-- JS: SYS Module (built-in) -->
<script src="l8ui/sys/l8sys-config.js"></script>
<script src="l8ui/sys/health/l8health.js"></script>
<script src="l8ui/sys/security/l8security-enums.js"></script>
<script src="l8ui/sys/security/l8security-columns.js"></script>
<script src="l8ui/sys/security/l8security-forms.js"></script>
<script src="l8ui/sys/security/l8security.js"></script>
<script src="l8ui/sys/security/l8security-users-crud.js"></script>
<script src="l8ui/sys/security/l8security-roles-crud.js"></script>
<script src="l8ui/sys/security/l8security-credentials-crud.js"></script>
<script src="l8ui/sys/modules/l8sys-dependency-graph.js"></script>
<script src="l8ui/sys/modules/l8sys-modules-map.js"></script>
<script src="l8ui/sys/modules/l8sys-modules.js"></script>
<script src="l8ui/sys/l8sys-init.js"></script>
```

---

## 4. Mobile Script Loading Order

```html
<!-- CSS: Components -->
<link rel="stylesheet" href="../l8ui/m/css/layer8m-popup.css">
<link rel="stylesheet" href="../l8ui/m/css/layer8m-confirm.css">
<link rel="stylesheet" href="../l8ui/m/css/layer8m-table.css">
<link rel="stylesheet" href="../l8ui/m/css/layer8m-edit-table.css">
<link rel="stylesheet" href="../l8ui/m/css/layer8m-forms.css">
<link rel="stylesheet" href="../l8ui/m/css/layer8m-datepicker.css">
<link rel="stylesheet" href="../l8ui/m/css/layer8m-reference-picker.css">
<link rel="stylesheet" href="../l8ui/m/css/layer8m-nav-cards.css">

<!-- JS: Layer8 Mobile Core -->
<script src="../l8ui/m/js/layer8m-config.js"></script>
<!-- JS: Project-specific config registration (optional) -->
<script src="js/mobile-config-hcm.js"></script>
<!-- JS: Layer8 Mobile Auth & Utils -->
<script src="../l8ui/m/js/layer8m-auth.js"></script>
<script src="../l8ui/m/js/layer8m-utils.js"></script>

<!-- JS: Shared Desktop Utilities (needed for currency cache, renderers) -->
<script src="../l8ui/shared/layer8d-config.js"></script>
<script src="../l8ui/shared/layer8d-utils.js"></script>
<script src="../l8ui/shared/layer8d-renderers.js"></script>
<script src="../l8ui/shared/layer8d-reference-registry.js"></script>

<!-- JS: Factory Components (shared with desktop) -->
<script src="../l8ui/shared/layer8-enum-factory.js"></script>
<script src="../l8ui/shared/layer8-ref-factory.js"></script>
<script src="../l8ui/shared/layer8-column-factory.js"></script>
<script src="../l8ui/shared/layer8-form-factory.js"></script>

<!-- JS: Mobile Module Registry Factory -->
<script src="../l8ui/m/js/layer8m-module-registry.js"></script>

<!-- JS: Layer8 Mobile Components -->
<script src="../l8ui/m/js/layer8m-popup.js"></script>
<script src="../l8ui/m/js/layer8m-confirm.js"></script>
<script src="../l8ui/m/js/layer8m-table.js"></script>
<script src="../l8ui/m/js/layer8m-edit-table.js"></script>
<script src="../l8ui/m/js/layer8m-forms-fields.js"></script>
<script src="../l8ui/m/js/layer8m-forms-fields-reference.js"></script>
<script src="../l8ui/m/js/layer8m-forms.js"></script>
<script src="../l8ui/m/js/layer8m-datepicker.js"></script>
<script src="../l8ui/m/js/layer8m-reference-registry.js"></script>

<!-- JS: Project-specific Reference Registries (register with Layer8MReferenceRegistry) -->
<script src="../erp-ui/m/reference-registries/layer8m-reference-registry-hcm.js"></script>
<script src="../erp-ui/m/reference-registries/layer8m-reference-registry-scm.js"></script>
<!-- ... more project-specific registries -->

<script src="../l8ui/m/js/layer8m-reference-picker.js"></script>
<script src="../l8ui/m/js/layer8m-renderers.js"></script>

<!-- JS: Module Data (per module) -->
<script src="js/mymodule/submodule-enums.js"></script>
<script src="js/mymodule/submodule-columns.js"></script>
<script src="js/mymodule/submodule-forms.js"></script>
<script src="js/mymodule/mymodule-index.js"></script>

<!-- JS: Shared Toggle Tree + Module Filter -->
<script src="../l8ui/shared/layer8d-toggle-tree.js"></script>
<script src="../l8ui/shared/layer8d-module-filter.js"></script>
<script src="../l8ui/sys/modules/l8sys-dependency-graph.js"></script>
<script src="../l8ui/sys/modules/l8sys-modules-map.js"></script>
<script src="../l8ui/sys/modules/l8sys-modules.js"></script>

<!-- JS: Navigation Core (generic, load BEFORE nav configs) -->
<script src="../l8ui/m/js/layer8m-nav-crud.js"></script>
<script src="../l8ui/m/js/layer8m-nav-data.js"></script>
<script src="../l8ui/m/js/layer8m-nav.js"></script>

<!-- JS: Navigation Config (project-specific, load AFTER nav core) -->
<script src="../erp-ui/m/nav-configs/layer8m-nav-config-base.js"></script>
<script src="../erp-ui/m/nav-configs/layer8m-nav-config-icons.js"></script>
<script src="../erp-ui/m/nav-configs/layer8m-nav-config-fin-hcm.js"></script>
<script src="../erp-ui/m/nav-configs/layer8m-nav-config-scm-sales.js"></script>
<script src="../erp-ui/m/nav-configs/layer8m-nav-config-prj-other.js"></script>
<script src="../erp-ui/m/nav-configs/layer8m-nav-config.js"></script>

<!-- JS: App -->
<script src="js/app-core.js"></script>
```

**Note:** Mobile loads several desktop shared utilities (`Layer8DConfig`, `Layer8DUtils`, `Layer8DRenderers`, `Layer8DReferenceRegistry`) and all four factory components. Reference registries, nav configs, and SYS module components are project-specific and live in `erp-ui/`. The core l8ui library loads first, then project-specific files register their data. Navigation core scripts load BEFORE nav config scripts.

---

## 5. Desktop Component API

### 5.1 Layer8DConfig

```js
await Layer8DConfig.load()                     // Fetches login.json
Layer8DConfig.getConfig()                      // Returns full app config
Layer8DConfig.getDateFormat()                  // 'mm/dd/yyyy'
Layer8DConfig.getApiPrefix()                   // '/erp'
Layer8DConfig.resolveEndpoint('/30/Employee')  // '/erp/30/Employee'
```

### 5.2 Layer8DUtils

```js
Layer8DUtils.escapeHtml(text)                  // XSS-safe escaping
Layer8DUtils.formatDate(timestamp)             // Unix seconds -> 'MM/DD/YYYY'
Layer8DUtils.formatDateTime(timestamp)         // Unix seconds -> 'MM/DD/YYYY HH:MM:SS'
Layer8DUtils.parseDateToTimestamp(dateString)   // 'MM/DD/YYYY' -> Unix seconds
Layer8DUtils.formatMoney(cents, currency?)     // 150000 -> '$1,500.00'
Layer8DUtils.formatPercentage(decimal)         // 0.75 -> '75.00%'
Layer8DUtils.formatPhone(digits)               // '5551234567' -> '(555) 123-4567'
Layer8DUtils.formatSSN(digits, masked?)        // masked: '***-**-6789'
Layer8DUtils.formatHours(minutes)              // 150 -> '2:30'
Layer8DUtils.getNestedValue(obj, 'a.b.c')     // Deep property access
Layer8DUtils.debounce(fn, ms)                  // Returns debounced function
Layer8DUtils.matchEnumValue(input, enumMap)    // Case-insensitive enum match
```

### 5.3 Layer8DTable

Constructor takes a single options object. **Must call `table.init()` after construction.**

```js
const table = new Layer8DTable({
    containerId: 'my-table-container',     // REQUIRED: DOM element ID
    endpoint: '/erp/30/Employee',          // API endpoint
    modelName: 'Employee',                 // Model name for L8Query
    columns: [...],                        // Column definitions
    pageSize: 10,                          // Rows per page (default: 10)
    serverSide: true,                      // Server-side pagination
    primaryKey: 'employeeId',              // Primary key field
    sortable: true,                        // Column sorting (default: true)
    filterable: true,                      // Column filtering (default: true)
    filterDebounceMs: 1000,                // Filter debounce (default: 1000)
    transformData: (item) => ({...}),      // Transform each row
    baseWhereClause: 'status=1',           // Base WHERE for all queries
    onDataLoaded: (data, items, total) => {},
    onRowClick: (item, id) => {},          // Row click handler
    onAdd: () => {},                       // Add button (null = hidden)
    onEdit: (id) => {},                    // Edit button (null = hidden)
    onDelete: (id) => {},                  // Delete button (null = hidden)
    addButtonText: 'Add Employee',
    showActions: true,                     // Action column (default: true)
    emptyMessage: 'No data found.',
    pageSizeOptions: [5, 10, 25, 50]
});
table.init();
```

Instance methods:
```js
table.init()                               // Initialize and render
table.setData(array)                       // Client-side: set data
table.setServerData(array, totalCount)     // Server-side: set data
table.fetchData(page, pageSize)            // Fetch from server
table.setBaseWhereClause('status=1')       // Update WHERE, re-fetch
table.render()                             // Re-render
table.sort('columnKey')                    // Sort (toggles asc/desc)
table.goToPage(2)                          // Navigate (1-indexed)
```

Static methods:
```js
Layer8DTable.tag('Active', 'status-active')
Layer8DTable.tags(['A', 'B'], 'my-class')
Layer8DTable.countBadge(5, 'item', 'items')
Layer8DTable.statusTag(true, 'Up', 'Down')
```

### 5.4 Layer8DPopup

```js
Layer8DPopup.show({
    title: 'Edit Employee',                // Plain text title
    titleHtml: '<b>Custom</b> Title',      // HTML title (overrides title)
    content: '<div>...</div>',             // Body HTML
    size: 'large',                         // 'small'|'medium'|'large'|'xlarge'
    showFooter: true,                      // Show cancel/save buttons
    saveButtonText: 'Save',
    cancelButtonText: 'Cancel',
    noPadding: false,                      // Remove body padding
    onSave: (formData) => {},              // Save callback
    onShow: (body) => {}                   // Called 50ms after popup appears
});

Layer8DPopup.close()                       // Close topmost
Layer8DPopup.closeAll()                    // Close all stacked
Layer8DPopup.updateContent('<html>')       // Replace body HTML
Layer8DPopup.updateTitle('New Title')
Layer8DPopup.getBody()                     // Get body element
```

Built-in tab support via event delegation:
```html
<div class="probler-popup-tabs">
    <div class="probler-popup-tab active" data-tab="overview">Overview</div>
    <div class="probler-popup-tab" data-tab="details">Details</div>
</div>
<div class="probler-popup-tab-content">
    <div class="probler-popup-tab-pane active" data-pane="overview">...</div>
    <div class="probler-popup-tab-pane" data-pane="details">...</div>
</div>
```

### 5.5 Layer8DNotification

```js
Layer8DNotification.success('Record saved')
Layer8DNotification.error('Failed to save', ['Detail 1', 'Detail 2'])
Layer8DNotification.warning('Check input')
Layer8DNotification.info('Processing...')
Layer8DNotification.close()
```

Durations: error=0 (manual close), warning=5000ms, success=3000ms, info=4000ms.

### 5.6 Layer8DForms

Unified facade for form sub-modules (`Layer8DFormsFields`, `Layer8DFormsData`, `Layer8DFormsPickers`, `Layer8DFormsModal`).

```js
// Open add form in popup
Layer8DForms.openAddForm(serviceConfig, formDef, onSuccess)

// Open edit form (fetches record first)
Layer8DForms.openEditForm(serviceConfig, formDef, recordId, onSuccess)

// Read-only details view
Layer8DForms.openViewForm(serviceConfig, formDef, data)

// Delete with confirmation
Layer8DForms.confirmDelete(serviceConfig, recordId, onSuccess)

// Low-level (from sub-modules)
Layer8DForms.generateFormHtml(formDef, data)         // Returns HTML string
Layer8DForms.collectFormData(formDef)                 // Collect form data from DOM
Layer8DForms.validateFormData(formDef, data)          // Returns errors[]
Layer8DForms.fetchRecord(endpoint, primaryKey, id, modelName) // Fetch single record
Layer8DForms.saveRecord(endpoint, data, isEdit)       // POST or PUT
Layer8DForms.deleteRecord(endpoint, id, primaryKey, modelName) // DELETE
Layer8DForms.attachDatePickers(container)             // Init date pickers
Layer8DForms.attachReferencePickers(container)        // Init reference pickers
```

Where `serviceConfig` is:
```js
{ endpoint: '/erp/30/Employee', primaryKey: 'employeeId', modelName: 'Employee' }
```

### 5.7 Layer8DDatePicker

```js
Layer8DDatePicker.attach(inputElement, {
    minDate: 1609459200,                   // Unix seconds
    maxDate: 1735689600,
    onChange: (timestamp, formatted) => {},
    showTodayButton: true,
    firstDayOfWeek: 0                      // 0=Sunday, 1=Monday
});
Layer8DDatePicker.setDate(input, timestamp) // 0 = 'Current'/'N/A'
Layer8DDatePicker.getDate(input)            // Unix timestamp (0=Current, null=empty)
Layer8DDatePicker.detach(input)
```

### 5.8 Layer8DReferencePicker

```js
Layer8DReferencePicker.attach(inputElement, {
    endpoint: '/erp/30/Department',        // REQUIRED
    modelName: 'Department',               // REQUIRED
    idColumn: 'departmentId',              // REQUIRED
    displayColumn: 'name',                 // REQUIRED
    displayFormat: (item) => `${item.code} - ${item.name}`,
    selectColumns: ['departmentId', 'name', 'code'],
    baseWhereClause: 'isActive=true',
    pageSize: 10,
    onChange: (id, displayValue, item) => {},
    title: 'Select Department'
});
Layer8DReferencePicker.getValue(input)      // Selected ID
Layer8DReferencePicker.getItem(input)       // Full selected item
Layer8DReferencePicker.setValue(input, id, displayValue, item)
Layer8DReferencePicker.detach(input)
```

### 5.9 Layer8DInputFormatter

Supported types: `ssn`, `phone`, `currency`, `percentage`, `routingNumber`, `ein`, `email`, `url`, `colorCode`, `rating`, `hours`

```js
Layer8DInputFormatter.attach(input, 'currency', { min: 0, max: 1000000 })
Layer8DInputFormatter.getValue(input)       // Raw value (cents for currency)
Layer8DInputFormatter.setValue(input, 15000) // Set value (cents)
Layer8DInputFormatter.validate(input)       // { valid, errors[] }
Layer8DInputFormatter.detach(input)
Layer8DInputFormatter.attachAll(container)  // Auto-attach via data-format attr
Layer8DInputFormatter.collectValues(container) // { fieldName: rawValue }

// Display formatters
Layer8DInputFormatter.format.currency(15000)        // '$150.00'
Layer8DInputFormatter.format.ssn('123456789', true)  // '***-**-6789'
Layer8DInputFormatter.format.phone('5551234567')     // '(555) 123-4567'
```

### 5.10 Layer8DReferenceRegistry

```js
Layer8DReferenceRegistry.register({
    Employee: {
        idColumn: 'employeeId',
        displayColumn: 'lastName',
        selectColumns: ['employeeId', 'firstName', 'lastName'],
        displayLabel: 'Employee',
        displayFormat: (item) => `${item.lastName}, ${item.firstName}`
    }
});
Layer8DReferenceRegistry.get('Employee')    // Returns config object
```

### 5.11 Layer8DRenderers

```js
Layer8DRenderers.renderEnum(value, enumMap)
Layer8DRenderers.renderBoolean(value)
Layer8DRenderers.renderDate(timestamp)
Layer8DRenderers.renderDateTime(timestamp)
Layer8DRenderers.renderMoney(cents, currency?)
Layer8DRenderers.renderPercentage(decimal)
Layer8DRenderers.renderPhone(digits)
Layer8DRenderers.renderSSN(digits, masked?)
Layer8DRenderers.renderHours(minutes)
Layer8DRenderers.renderRating(value, max?)
Layer8DRenderers.createStatusRenderer(enumMap, classMap) // Returns function
```

### 5.12 Layer8DModuleFactory

Single call bootstraps an entire module with navigation, CRUD, and service registry:

```js
Layer8DModuleFactory.create({
    namespace: 'HCM',                      // window.HCM
    defaultModule: 'core-hr',              // Default sub-module tab
    defaultService: 'employees',           // Default service
    sectionSelector: 'core-hr',            // data-module attribute
    initializerName: 'initializeHCM',      // Global init function name
    requiredNamespaces: ['CoreHR', 'Payroll']
});
```

This call: registers sub-modules, creates forms facade, attaches tab/subnav navigation, attaches CRUD operations, and exposes the global initializer function.

### 5.13 Layer8ModuleConfigFactory

Factory for creating module configurations with minimal boilerplate. Use instead of manually setting `modules`, `submodules`, and `renderStatus` on namespace objects.

```js
// Helper: create a service entry
const svc = Layer8ModuleConfigFactory.service;

// Helper: create a module entry
const mod = Layer8ModuleConfigFactory.module;

// Create a full module config
Layer8ModuleConfigFactory.create({
    namespace: 'Bi',
    modules: {
        'reporting': mod('Reporting', '📊', [
            svc('reports', 'Reports', '📋', '/35/BiReport', 'BiReport'),
            svc('schedules', 'Schedules', '📅', '/35/BiSchedule', 'BiReportSchedule')
        ]),
        'dashboards': mod('Dashboards', '📈', [
            svc('dashboards', 'Dashboards', '📊', '/35/BiDashbrd', 'BiDashboard')
        ])
    },
    submodules: ['BiReporting', 'BiDashboards']
});
```

This creates `window.Bi` with `.modules`, `.submodules`, and `.renderStatus` properties.

### 5.14 Layer8DModuleFilter

Runtime module filter that hides disabled modules/sub-modules/services based on server-stored config.

```js
await Layer8DModuleFilter.load(bearerToken)        // Load config on app startup
Layer8DModuleFilter.isEnabled('hcm')               // Check module
Layer8DModuleFilter.isEnabled('hcm.payroll')       // Check sub-module
Layer8DModuleFilter.isEnabled('hcm.core-hr.employees') // Check service
Layer8DModuleFilter.applyToSidebar()               // Hide disabled sidebar items
Layer8DModuleFilter.applyToSection('hcm')          // Hide disabled tabs/services
await Layer8DModuleFilter.save(disabledPaths, bearerToken) // Save config
```

Uses dot-notation paths. A disabled parent disables all children. Dashboard and System are never filtered.

### 5.15 Layer8DToggleTree

Generic collapsible toggle tree with dependency enforcement. Used by SYS module selection UI.

```js
const tree = Layer8DToggleTree.create({
    container: document.getElementById('tree-container'),
    data: treeData,                    // Hierarchical data array
    onToggle: (path, enabled) => {},   // Called when a node is toggled
    dependencies: dependencyMap        // Optional dependency enforcement
});
tree.getDisabledPaths()                // Returns Set of disabled paths
```

### 5.16 Factory Components

Four factories reduce boilerplate in module data files. All are loaded before module scripts.

#### Layer8EnumFactory

```js
const factory = window.Layer8EnumFactory;

// Full enum (label, value alias, CSS class)
const STATUS = factory.create([
    ['Unspecified', null, ''],
    ['Active', 'active', 'layer8d-status-active'],
    ['Inactive', 'inactive', 'layer8d-status-inactive'],
]);
// STATUS.enum = { 0: 'Unspecified', 1: 'Active', 2: 'Inactive' }
// STATUS.values = { 'active': 1, 'inactive': 2 }
// STATUS.classes = { 1: 'layer8d-status-active', 2: 'layer8d-status-inactive' }

// Simple enum (labels only, no values/classes)
const TYPE = factory.simple(['Unspecified', 'Type A', 'Type B']);

// Enum with value aliases (no classes)
const EMPLOYMENT = factory.withValues([['Full-Time', 'full-time'], ['Part-Time', 'part-time']]);
```

#### Layer8RefFactory

```js
const ref = window.Layer8RefFactory;
window.MyRegistry = {
    ...ref.simple('Model', 'modelId', 'name', 'Label'),
    ...ref.person('Person', 'personId', 'lastName', 'firstName'),
    ...ref.coded('Entity', 'entityId', 'code', 'name'),
    ...ref.idOnly('LineItem', 'lineId')
};
```

#### Layer8ColumnFactory

```js
const col = window.Layer8ColumnFactory;
Module.columns = {
    Model: [
        ...col.id('modelId'),
        ...col.col('field', 'Label'),
        ...col.boolean('isActive', 'Active'),
        ...col.date('createdDate', 'Created'),
        ...col.money('amount', 'Amount'),
        ...col.status('status', 'Status', enums.STATUS_VALUES, render.status),
        ...col.enum('type', 'Type', null, render.type),
        ...col.custom('key', 'Label', (item) => item.x, { sortKey: 'key' })
    ]
};
```

#### Layer8FormFactory

```js
const f = window.Layer8FormFactory;
Module.forms = {
    Model: f.form('Model', [
        f.section('Info', [
            ...f.text('code', 'Code', true),
            ...f.text('name', 'Name', true),
            ...f.textarea('description', 'Description'),
            ...f.select('status', 'Status', enums.STATUS, true),
            ...f.reference('managerId', 'Manager', 'Employee'),
            ...f.date('startDate', 'Start Date'),
            ...f.money('amount', 'Amount'),
            ...f.checkbox('isActive', 'Active'),
            ...f.number('quantity', 'Quantity')
        ])
    ])
};
```

### 5.17 Layer8DViewFactory

Registry of view type constructors. Creates the appropriate view component based on service `viewType` configuration. Default is `'table'`.

```js
Layer8DViewFactory.register('chart', factoryFn)       // Register a view type
Layer8DViewFactory.create('chart', options)            // Create view instance
Layer8DViewFactory.has('kanban')                       // Check if type registered
Layer8DViewFactory.getTypes()                          // ['table','chart','kanban',...]
Layer8DViewFactory.detectTitleField(columns, pk)       // Auto-detect label field

// Create view with a type-switcher dropdown
Layer8DViewFactory.createWithSwitcher(type, options, viewTypes, serviceKey, onSwitch)
```

All view instances follow the same interface: `init()`, `refresh()`, `destroy()`.

Registered view types: `table`, `chart`, `kanban`, `timeline`, `calendar`, `gantt`, `tree`, `wizard`.

### 5.18 Layer8ViewSwitcher

Small icon button with floating dropdown menu for switching between view types. Shared by desktop and mobile.

```js
// Render HTML for the switcher
const html = Layer8ViewSwitcher.render(serviceKey, viewTypes, activeType)

// Attach click handlers
Layer8ViewSwitcher.attach(container, function(newViewType) { ... })
```

View labels: `table` → "Table View", `chart` → "Chart View", `kanban` → "Kanban Board", `timeline` → "Timeline", `calendar` → "Calendar", `tree` → "Tree Grid", `gantt` → "Gantt Chart", `wizard` → "Wizard".

### 5.19 Layer8DDataSource

Shared data fetching layer used by all view types. Builds L8Query strings, handles pagination, and enforces the metadata-on-page-1-only rule.

```js
const ds = new Layer8DDataSource({
    endpoint: '/erp/30/Employee',
    modelName: 'Employee',
    columns: [...],                     // Column defs (for filter/sort keys)
    pageSize: 10,
    baseWhereClause: 'status=1',
    transformData: (item) => ({...})
});

ds.fetchData(page)                      // Fetch page (1-indexed)
ds.buildQuery(page, pageSize)           // Returns { query, invalidFilters }
ds.setBaseWhereClause('status=2')       // Update WHERE, resets to page 1
ds.setFilter('name', 'Smith')           // Set column filter
ds.clearFilters()
ds.setSort('name', 'asc')              // Set sort column/direction
ds.getTotalPages()                      // ceil(totalItems / pageSize)
```

**Pagination rule:** Metadata (totalCount, key counts) is valid ONLY on page 1. Pages 2+ preserve existing metadata.

### 5.20 Layer8DChart

SVG chart component supporting bar, line, and pie/donut renderers. Auto-detects category and value fields from column definitions. Includes an inline chart type selector (bar | line | pie).

```js
const chart = new Layer8DChart({
    containerId: 'chart-container',
    columns: [...],                     // Column defs (for auto-detection)
    dataSource: dataSourceInstance,      // Layer8DDataSource
    viewConfig: {
        chartType: 'bar',              // 'bar'|'line'|'area'|'pie'|'donut'
        categoryField: 'status',       // Group-by field (auto-detected if omitted)
        valueField: 'amount',          // Value field (auto-detected if omitted)
        aggregation: 'count',          // 'count'|'sum'|'avg'|'min'|'max'
        title: 'Chart Title',
        colors: ['#0ea5e9', ...],      // Custom palette (uses theme if omitted)
        pageSize: 100                  // Fetch all data for chart
    },
    onItemClick: (item, label) => {},
    onAdd: () => {}
});
chart.init();
chart.setData(items, total);
chart.refresh();
chart.destroy();
```

Static utilities:
```js
Layer8DChart.readThemeColor('--layer8d-primary', '#0ea5e9')
Layer8DChart.getThemePalette()          // Array of 10 theme colors
```

Sub-renderers (internal, auto-dispatched by `chartType`):
- `Layer8DChartBar.render(chart, w, h)` — vertical/horizontal bars
- `Layer8DChartLine.render(chart, w, h)` — line/area with data points
- `Layer8DChartPie.render(chart, w, h)` — pie/donut with legend

**Chart type selector:** An inline button group (Bar | Line | Pie) renders above the chart. Clicking a button updates `chartType` and re-renders the SVG without refetching data.

**Auto-detection priority:** When `categoryField` and `valueField` are not specified in `viewConfig`, the chart auto-detects them from columns in this order:
1. **Period columns** (`type: 'period'`) — L8Period objects, grouped by period label
2. **Date columns** (`type: 'date'`) when money columns (`type: 'money'`) also exist — timestamps normalized to year/quarter
3. **Status/type/category/health** patterns — grouped by enum value
4. **Fallback** — title field via `Layer8DViewFactory.detectTitleField()`

**Auto-enabled chart view:** The service registry automatically adds `'chart'` to a service's `supportedViews` when its columns include both a `type: 'date'` and a `type: 'money'` column. No manual `supportedViews` config is needed for date+money models.

**L8Period support:** When the `categoryField` contains L8Period objects (objects with `periodType`, `periodYear`, `periodValue` properties), the chart auto-detects them and converts each period to a human-readable label: `"2025"` (yearly), `"2025 / Q1"` (quarterly), or `"2025 / January"` (monthly). Records with the same period are grouped and aggregated. Groups are sorted chronologically.

**Date normalization:** When the `categoryField` contains Unix timestamps (from date columns), the chart normalizes them to year/quarter buckets. Labels use the format `"2025 / Q1"`. Records within the same quarter are grouped and their money values aggregated (default: sum). Groups are sorted chronologically. Timestamps may arrive as numeric strings (e.g., `"1770840462"`) — both number and string formats are handled automatically.

### 5.21 Layer8DKanban

Kanban board with configurable lanes. Cards display title, subtitle, and custom fields.

```js
// Registered as 'kanban' view type
// viewConfig options:
{
    laneField: 'status',               // Field that determines the lane
    lanes: {                            // Lane definitions (keyed by field value)
        1: { label: 'To Do', color: '#0ea5e9' },
        2: { label: 'In Progress', color: '#f59e0b' },
        3: { label: 'Done', color: '#22c55e' }
    },
    cardTitle: 'name',                 // Field for card title
    cardSubtitle: 'assignee',          // Field for card subtitle
    cardFields: ['priority', 'dueDate'] // Additional fields on cards
}
```

### 5.22 Layer8DTimeline

Vertical timeline displaying events in chronological order with alternating left/right layout.

```js
const timeline = new Layer8DTimeline({
    containerId: 'timeline-container',
    columns: [...],
    dataSource: dataSourceInstance,
    viewConfig: {
        dateField: 'auditInfo.createdDate',    // Timestamp field
        actorField: 'auditInfo.createdBy',     // Who performed the action
        titleField: 'name',                    // Auto-detected if omitted
        descriptionField: 'description',
        colorField: 'status',                  // Optional color grouping
        pageSize: 20
    },
    onItemClick: (item, id) => {},
    onAdd: () => {}
});
timeline.init();
timeline.setData(items, total);
timeline.refresh();
timeline.destroy();
```

### 5.23 Layer8DCalendar

Month/week calendar view for date-based data.

```js
// Registered as 'calendar' view type
// viewConfig options:
{
    dateField: 'startDate',            // Date field for event placement
    titleField: 'name',               // Event display title
    viewMode: 'month'                  // 'month' | 'week'
}
```

Supports navigation (prev/next month/week) and renders events as colored dots on calendar cells.

### 5.24 Layer8DGantt

SVG-based Gantt chart for project scheduling with task bars, progress indicators, and dependency arrows.

```js
// Registered as 'gantt' view type
// viewConfig options:
{
    startDateField: 'startDate',       // Task start timestamp (auto-detected if omitted)
    endDateField: 'endDate',           // Task end timestamp (auto-detected if omitted)
    progressField: 'percentComplete',  // 0-100 completion percentage
    titleField: 'name',               // Task label (auto-detected via detectTitleField)
    dependencyField: 'dependencies',   // Array of dependent task IDs
    defaultZoom: 'week'                // 'day' | 'week' | 'month' | 'quarter' | 'year'
}
```

**Date field auto-detection:** When `startDateField` is not explicitly configured, the Gantt scans columns for date fields (`type: 'date'` or keys ending in `Date`, `Start`, `End`) and matches them to start/end roles using key patterns:
- **Start**: keys containing `start`, `begin`, or `from`
- **End**: keys containing `end`, `due`, `until`, `required`, or `expir`
- If only one pattern matches and there are 2+ date columns, the other date column is assigned to the missing role
- If a start column is found but no end column, the end field is inferred by replacing `Start` with `End` in the key (e.g., `plannedStartDate` → `plannedEndDate`)

This allows models like `MfgWorkOrder` (`plannedStartDate`/`plannedEndDate`) and `MfgProdSchedule` (`scheduleStart`/`scheduleEnd`) to work without explicit `viewConfig`.

**Zoom levels:** Day, Week, Month, Quarter, and Year. Quarter groups cells by ~91 days; Year groups by ~365 days.

**Timestamp handling:** Timestamps from the server may arrive as numeric strings (e.g., `"1770840462"` instead of `1770840462`). The Gantt automatically coerces numeric strings to numbers for correct date parsing.

### 5.25 Layer8DTreeGrid

Hierarchical tree table that builds parent-child relationships from a flat list using a `parentIdField`.

```js
const tree = new Layer8DTreeGrid({
    containerId: 'tree-container',
    columns: [...],
    dataSource: dataSourceInstance,
    viewConfig: {
        parentIdField: 'parentId',     // Field linking to parent's ID
        idField: 'categoryId',         // Primary key (default: primaryKey)
        labelField: 'name',            // Auto-detected if omitted
        expandedByDefault: true,       // Start expanded (default: true)
        pageSize: 500                  // Fetch all for tree building
    },
    primaryKey: 'categoryId',
    onItemClick: (item, id) => {},
    onAdd: () => {},
    onEdit: (id) => {},
    onDelete: (id) => {}
});
tree.init();
tree.setData(items);
tree.toggleNode(nodeId);
tree.expandAll();
tree.collapseAll();
tree.refresh();
tree.destroy();
```

### 5.26 Layer8DWizard

Multi-step wizard view with step navigation, progress indicator, and per-step content rendering.

```js
// Registered as 'wizard' view type
// viewConfig options:
{
    steps: [
        { key: 'info', label: 'Basic Info', fields: ['name', 'code'] },
        { key: 'config', label: 'Configuration', fields: ['type', 'status'] },
        { key: 'review', label: 'Review' }
    ]
}
```

### 5.27 Layer8DWidget

Dashboard KPI card component for rendering stats with trends, sparklines, and mini charts.

```js
// Render a single KPI card
Layer8DWidget.render(
    { label: 'Total Revenue', icon: '$', onClick: () => {} },
    1500000,                           // Value (auto-formats to 1.5M)
    {
        trend: 'up',                   // 'up' | 'down'
        trendValue: 12.5,             // Percentage change
        sparklineData: [10, 20, 15, 30, 25],  // SVG sparkline
        sparklineColor: '#22c55e'
    }
)

// Render a grid of KPI widgets
Layer8DWidget.renderEnhancedStatsGrid(kpis, iconMap)   // Returns HTML string
```

---

## 6. Mobile Component API

### 6.1 Layer8MConfig

```js
await Layer8MConfig.load()                     // Fetches /login.json
Layer8MConfig.getConfig()                      // Returns raw { login: {...}, app: {...} }
Layer8MConfig.resolveEndpoint('/30/Employee')   // '/erp/30/Employee'
Layer8MConfig.getDateFormat()                   // 'mm/dd/yyyy'
Layer8MConfig.registerModules({...})            // Register module configs
Layer8MConfig.registerReferences({...})         // Register reference picker data
Layer8MConfig.getReferenceConfig('Employee')    // Get reference config
```

**Note:** `getConfig()` returns raw login.json. Access app config via `config.app.healthPath`, NOT `config.healthPath`.

### 6.2 Layer8MAuth

```js
Layer8MAuth.requireAuth()                      // Redirect if not authenticated
Layer8MAuth.getUsername()                       // Username from sessionStorage
Layer8MAuth.logout()                           // Clear session, redirect

// HTTP methods (auto-attach bearer token)
await Layer8MAuth.get(url)                     // GET, returns parsed JSON
await Layer8MAuth.post(url, data)              // POST
await Layer8MAuth.put(url, data)               // PUT
await Layer8MAuth.delete(url, data?)           // DELETE (data sent as JSON body)
```

### 6.3 Layer8MUtils

```js
Layer8MUtils.escapeHtml(text)
Layer8MUtils.formatDate(timestamp)             // Unix seconds -> 'MM/DD/YYYY'
Layer8MUtils.formatDateTime(timestamp)
Layer8MUtils.parseDateToTimestamp(dateString)
Layer8MUtils.formatMoney(cents, currency?)
Layer8MUtils.formatPercentage(decimal)
Layer8MUtils.formatPhone(digits)
Layer8MUtils.formatSSN(digits, masked?)
Layer8MUtils.getNestedValue(obj, 'a.b.c')
Layer8MUtils.debounce(fn, ms)
Layer8MUtils.showSuccess(message)              // Toast
Layer8MUtils.showError(message)                // Toast
```

### 6.4 Layer8MPopup

```js
Layer8MPopup.show({
    title: 'Edit Employee',
    content: '<div>...</div>',
    size: 'large',                             // 'small'|'medium'|'large'|'full'
    showFooter: true,
    saveButtonText: 'Save',
    cancelButtonText: 'Cancel',
    showCancelButton: true,
    onSave: (popup) => {},                     // popup.body for DOM access
    onShow: (popup) => {}                      // Called after render
});
Layer8MPopup.close()
Layer8MPopup.getBody()
```

### 6.5 Layer8MConfirm

```js
const confirmed = await Layer8MConfirm.show({
    title: 'Confirm', message: 'Are you sure?',
    confirmText: 'Yes', cancelText: 'No', destructive: false
});
const confirmed = await Layer8MConfirm.confirmDelete('Employee Name');
```

### 6.6 Layer8MTable

Card-based mobile table. Constructor takes `(containerId, config)`.

```js
const table = new Layer8MTable('container-id', {
    endpoint: '/erp/30/Employee',
    modelName: 'Employee',
    columns: [...],
    rowsPerPage: 15,
    transformData: (item) => ({...}),
    statusField: 'status',
    onCardClick: (item) => {},
    getItemId: (item) => item.employeeId
});
```

### 6.7 Layer8MEditTable (extends Layer8MTable)

Adds Add/Edit/Delete buttons. If callbacks are null, buttons are hidden (read-only mode).

```js
const table = new Layer8MEditTable('container-id', {
    // All Layer8MTable options plus:
    onAdd: () => {},                           // null = no add button
    addButtonText: 'Add Employee',
    onEdit: (id, item) => {},                  // null = no edit button
    onDelete: (id, item) => {},                // null = no delete button
    onRowClick: (item, id) => {},
    getItemId: (item) => item.employeeId
});
```

### 6.8 Layer8MForms

```js
const html = Layer8MForms.renderForm(formDef, data, readonly)
const data = Layer8MForms.getFormData(container)
const errors = Layer8MForms.validateForm(container)
Layer8MForms.showErrors(container, errors)
Layer8MForms.initFormFields(container)         // Init reference pickers
```

### 6.9 Layer8MDatePicker

```js
Layer8MDatePicker.show({
    value: 1609459200,                         // Unix timestamp
    minDate: 1577836800,
    maxDate: 1735689600,
    title: 'Select Date',
    onSelect: (timestamp, dateStr) => {}       // null for clear
});
```

### 6.10 Layer8MReferencePicker

```js
Layer8MReferencePicker.show({
    endpoint: '/erp/30/Department',
    modelName: 'Department',
    idColumn: 'departmentId',
    displayColumn: 'name',
    displayFormat: (item) => `${item.code} - ${item.name}`,
    selectColumns: ['departmentId', 'name', 'code'],
    pageSize: 15,
    currentValue: 'DEPT-001',
    onChange: (id, displayValue, item) => {}
});
Layer8MReferencePicker.getValue(inputElement)
Layer8MReferencePicker.setValue(input, id, displayValue, item)
```

### 6.11 Layer8MRenderers

```js
Layer8MRenderers.renderEnum(value, enumMap)
Layer8MRenderers.renderBoolean(value, { trueText, falseText })
Layer8MRenderers.renderDate(timestamp)
Layer8MRenderers.renderMoney(cents, currency?)
Layer8MRenderers.renderPercentage(decimal)
Layer8MRenderers.renderPhone(digits)
Layer8MRenderers.renderSSN(digits)
Layer8MRenderers.renderHours(hours)
Layer8MRenderers.renderPeriod({ startDate, endDate })
Layer8MRenderers.renderRating(value, max?)
Layer8MRenderers.renderProgress(value)
Layer8MRenderers.renderPriority(value, priorityMap)
Layer8MRenderers.renderEmployeeName({ firstName, lastName })
Layer8MRenderers.renderMinutes(minutes)
Layer8MRenderers.renderCount(filled, total)
Layer8MRenderers.createStatusRenderer(enumMap, classMap)
```

### 6.12 LAYER8M_NAV_CONFIG

Navigation hierarchy:

```js
window.LAYER8M_NAV_CONFIG = {
    modules: [
        { key: 'hcm', label: 'Human Capital', icon: 'hcm', hasSubModules: true }
    ],
    hcm: {
        subModules: [
            { key: 'core-hr', label: 'Core HR', icon: 'employees' }
        ],
        services: {
            'core-hr': [
                { key: 'employees', label: 'Employees', icon: 'employees',
                  endpoint: '/30/Employee', model: 'Employee', idField: 'employeeId' },
                { key: 'leave-requests', label: 'Leave Requests', icon: 'time',
                  endpoint: '/30/LeaveReq', model: 'LeaveRequest', idField: 'requestId',
                  supportedViews: ['table', 'kanban', 'calendar'] },
                { key: 'health', label: 'Health', icon: 'health',
                  endpoint: '/0/Health', model: 'L8Health', idField: 'service',
                  readOnly: true }
            ]
        }
    },
    icons: { 'hcm': '<svg>...</svg>' },
    getIcon(key) { ... }
};
```

### 6.13 Layer8MNav

```js
Layer8MNav.showHome()                          // Module cards grid
Layer8MNav.navigateToModule('hcm')             // Sub-module cards
Layer8MNav.navigateToSubModule('hcm', 'core-hr')
Layer8MNav.navigateToService('hcm', 'core-hr', 'employees')
Layer8MNav.navigateBack()
Layer8MNav.getCurrentState()                   // { level, module, subModule, service }
```

Layer8MNav looks up columns/forms/transforms from registered module objects (checked in order):
```js
[window.MobileHCM, window.MobileFIN, window.MobileSCM, window.MobileSYS, ...]
```

Each must provide:
```js
window.MobileXXX = {
    getColumns(modelName),      // Column array or null
    getFormDef(modelName),      // Form definition or null
    getTransformData(modelName) // Transform function or null (optional)
}
```

### 6.14 Extensibility Patterns

The l8ui library is designed for extensibility. Project-specific code lives in a separate directory (e.g., `erp-ui/`) and registers with the library components.

#### Layer8MReferenceRegistry.register()

Register project-specific model reference configurations:

```js
// In erp-ui/m/reference-registries/layer8m-reference-registry-mymodule.js
const ref = window.Layer8RefFactory;

window.Layer8MReferenceRegistryMyModule = {
    ...ref.simple('Model', 'modelId', 'name', 'Label'),
    ...ref.person('Person', 'personId', 'lastName', 'firstName'),
    ...ref.coded('Entity', 'entityId', 'code', 'name'),
    ...ref.idOnly('LineItem', 'lineId')
};

// Register with the central registry
Layer8MReferenceRegistry.register(window.Layer8MReferenceRegistryMyModule);
```

#### Layer8SvgFactory.registerTemplate()

Register project-specific SVG illustration templates:

```js
// In erp-ui/erp-svg-templates.js
Layer8SvgFactory.registerTemplate('myModule', function(color) {
    return `<svg viewBox="0 0 400 300">
        <circle cx="200" cy="150" r="50" fill="${color}" opacity="0.2"/>
        <!-- more SVG content -->
    </svg>`;
});
```

Use in section generator:
```js
Layer8SectionConfigs.register('mymodule', {
    svgContent: Layer8SvgFactory.get('myModule', '#4CAF50'),
    // ...
});
```

### 6.15 Layer8MModuleRegistry

Factory that creates mobile module registries, replacing manual `findModule()` boilerplate.

```js
// Creates window.MobileHCM with getColumns, getFormDef, etc.
window.MobileHCM = Layer8MModuleRegistry.create('MobileHCM', {
    'Core HR': MobileCoreHR,
    'Payroll': MobilePayroll,
    'Benefits': MobileBenefits
});
```

The created registry provides:
```js
registry.getColumns(modelName)      // Column array or null
registry.getFormDef(modelName)      // Form definition or null
registry.getEnums(modelName)        // Enums object or null
registry.getPrimaryKey(modelName)   // Primary key field name or null
registry.getRender(modelName)       // Render object or null
registry.hasModel(modelName)        // Boolean
registry.getAllModels()             // Array of all model names
registry.getModuleName(modelName)   // Sub-module name or null
```

### 6.16 Layer8MViewFactory

Mobile view factory — mirrors `Layer8DViewFactory` for mobile. Creates view instances by type. All mobile view wrappers auto-register on load.

```js
Layer8MViewFactory.register('chart', factoryFn)       // Register a view type
Layer8MViewFactory.create('chart', options)            // Create view instance
Layer8MViewFactory.has('kanban')                       // Check if type registered
```

Registered view types: `table`, `chart`, `kanban`, `calendar`, `timeline`, `gantt`, `tree`, `wizard`.

All view instances follow the same interface: `init()`, `refresh()`, `destroy()`.

**Mobile view switching:** `Layer8MNavData.loadServiceData()` reads `supportedViews` from the service config. When multiple views are available, it renders a `Layer8ViewSwitcher` dropdown above the data container. Switching views destroys the current view and creates a new one via `Layer8MViewFactory.create()`.

**Auto-detect chart:** If a service's columns include both `type: 'date'` and `type: 'money'`, `'chart'` is automatically added to the available views (same logic as desktop `layer8d-service-registry.js`).

**Service config `supportedViews`:**
```js
{ key: 'work-orders', label: 'Work Orders', endpoint: '/70/MfgWorkOrd',
  model: 'MfgWorkOrder', idField: 'workOrderId',
  supportedViews: ['table', 'kanban', 'gantt'] }
```

---

## 7. Shared Schemas

### Column Definition (Desktop)

```js
{
    key: 'fieldName',                      // Data field (dots supported: 'user.name')
    label: 'Display Label',                // Column header
    sortKey: 'fieldName',                  // L8Query sort field
    filterKey: 'fieldName',                // L8Query filter field
    enumValues: { 'active': 1 },           // Filter validation map
    render: (item, index) => '<html>'      // Custom cell renderer
}
```

### Column Definition (Mobile)

Same as desktop plus:
```js
{
    primary: true,                         // Shown as card title
    secondary: true,                       // Shown as card subtitle
    hidden: true                           // Not rendered in card body
}
```

### Form Definition

Same schema for both desktop and mobile:

```js
{
    title: 'Employee',
    sections: [
        {
            title: 'Personal Information',
            fields: [
                { key: 'firstName', label: 'First Name', type: 'text', required: true },
                { key: 'gender', label: 'Gender', type: 'select', options: { 1: 'Male', 2: 'Female' } },
                { key: 'hireDate', label: 'Hire Date', type: 'date' },
                { key: 'salary', label: 'Salary', type: 'currency' },
                { key: 'isActive', label: 'Active', type: 'checkbox' },
                { key: 'bio', label: 'Biography', type: 'textarea' },
                { key: 'nationalId', label: 'SSN', type: 'ssn' },
                { key: 'departmentId', label: 'Dept', type: 'reference', lookupModel: 'Department' },
                { key: 'rate', label: 'Rate', type: 'percentage' },
                { key: 'phone', label: 'Phone', type: 'phone' },
                { key: 'hours', label: 'Hours', type: 'hours' }
            ]
        }
    ]
}
```

### Supported Field Types

`text`, `email`, `tel`, `number`, `textarea`, `date`, `select`, `checkbox`, `currency`, `percentage`, `phone`, `ssn`, `reference`, `url`, `rating`, `hours`, `ein`, `routingNumber`, `colorCode`, `period`

### Data Collection Behaviors

| Type | Input Format | Stored Value |
|------|-------------|-------------|
| currency | Dollar amount | Cents (integer) |
| percentage | Percent value | Decimal (0.75) |
| hours | HH:MM | Total minutes |
| date | Calendar picker | Unix timestamp (0 = Current/N/A) |
| reference | Picker | ID value |
| checkbox | Toggle | 1 or 0 |
| number | Number | parseFloat |
| period | 3 cascading selects (type/year/value) | `{periodType, periodYear, periodValue}` (L8Period) |

---

## 8. Adding a New Module (Desktop)

Example: "Projects" module, service area 60.

### Step 1: Module Config

**File:** `l8ui/projects/projects-config.js`

```js
(function() {
    'use strict';
    const svc = Layer8ModuleConfigFactory.service;
    const mod = Layer8ModuleConfigFactory.module;

    Layer8ModuleConfigFactory.create({
        namespace: 'Projects',
        modules: {
            'planning': mod('Planning', 'icon-emoji', [
                svc('projects', 'Projects', 'icon', '/60/Project', 'Project'),
                svc('tasks', 'Tasks', 'icon', '/60/Task', 'ProjectTask')
            ])
        },
        submodules: ['ProjectPlanning']
    });
})();
```

### Step 2: Sub-Module Data Files (per sub-module)

**Enums:** `l8ui/projects/planning/planning-enums.js`
```js
(function() {
    'use strict';
    window.ProjectPlanning = window.ProjectPlanning || {};
    ProjectPlanning.enums = {
        STATUS: { 0: 'Unknown', 1: 'Draft', 2: 'Active', 3: 'Done' },
        STATUS_VALUES: { 'draft': 1, 'active': 2, 'done': 3 },
        STATUS_CLASSES: { 1: 'status-pending', 2: 'status-active', 3: 'status-completed' }
    };
    ProjectPlanning.render = {};
    ProjectPlanning.render.status = Layer8DRenderers.createStatusRenderer(
        ProjectPlanning.enums.STATUS, ProjectPlanning.enums.STATUS_CLASSES
    );
})();
```

**Columns:** `l8ui/projects/planning/planning-columns.js`
```js
(function() {
    'use strict';
    var enums = ProjectPlanning.enums;
    var render = ProjectPlanning.render;
    ProjectPlanning.columns = {
        Project: [
            { key: 'projectId', label: 'ID', sortKey: 'projectId', filterKey: 'projectId' },
            { key: 'name', label: 'Name', sortKey: 'name', filterKey: 'name' },
            { key: 'status', label: 'Status', sortKey: 'status', filterKey: 'status',
              enumValues: enums.STATUS_VALUES,
              render: (item) => render.status(item.status) }
        ]
    };
    ProjectPlanning.primaryKeys = { Project: 'projectId' };
})();
```

**Forms:** `l8ui/projects/planning/planning-forms.js`
```js
(function() {
    'use strict';
    var enums = ProjectPlanning.enums;
    ProjectPlanning.forms = {
        Project: {
            title: 'Project',
            sections: [{
                title: 'Project Information',
                fields: [
                    { key: 'name', label: 'Name', type: 'text', required: true },
                    { key: 'status', label: 'Status', type: 'select', options: enums.STATUS },
                    { key: 'startDate', label: 'Start', type: 'date', required: true }
                ]
            }]
        }
    };
})();
```

### Step 3: Module Init

**File:** `l8ui/projects/projects-init.js`
```js
(function() {
    'use strict';
    Layer8DModuleFactory.create({
        namespace: 'Projects',
        defaultModule: 'planning',
        defaultService: 'projects',
        sectionSelector: 'planning',
        initializerName: 'initializeProjects',
        requiredNamespaces: ['ProjectPlanning']
    });
})();
```

### Step 4: Section HTML

**File:** `sections/projects.html`

**IMPORTANT:** Table container IDs follow the pattern `{moduleKey}-{serviceKey}-table-container`. CSS classes use the `l8-` prefix for ALL modules (shared CSS from `layer8-section-layout.css`).

```html
<div class="section-container l8-section">
    <div class="page-header"><h1>Projects</h1></div>
    <div class="l8-module-tabs">
        <button class="l8-module-tab active" data-module="planning">
            <span class="tab-icon">icon</span>
            <span class="tab-label">Planning</span>
        </button>
    </div>
    <div class="l8-module-content active" data-module="planning">
        <div class="l8-subnav">
            <a class="l8-subnav-item active" data-service="projects">Projects</a>
            <a class="l8-subnav-item" data-service="tasks">Tasks</a>
        </div>
        <div class="l8-service-view active" data-service="projects">
            <div class="l8-table-container" id="planning-projects-table-container"></div>
        </div>
        <div class="l8-service-view" data-service="tasks">
            <div class="l8-table-container" id="planning-tasks-table-container"></div>
        </div>
    </div>
</div>
```

### Step 5: Wire into app.html

Add script tags (order: config, enums, columns, forms per sub-module, then init):
```html
<script src="l8ui/projects/projects-config.js"></script>
<script src="l8ui/projects/planning/planning-enums.js"></script>
<script src="l8ui/projects/planning/planning-columns.js"></script>
<script src="l8ui/projects/planning/planning-forms.js"></script>
<script src="l8ui/projects/projects-init.js"></script>
```

### Step 6: Wire into sections.js

```js
const sections = { ..., projects: 'sections/projects.html' };
const sectionInitializers = { ..., projects: () => { if (typeof initializeProjects === 'function') initializeProjects(); } };
```

### Step 7: Register Reference Models

```js
Layer8DReferenceRegistry.register({
    Project: { idColumn: 'projectId', displayColumn: 'name', displayLabel: 'Project' }
});
```

---

## 9. Adding a New Module (Mobile)

### Step 1: Module Data Files

**Enums:** `m/js/projects/planning-enums.js`
```js
(function() {
    'use strict';
    window.MobileProjectPlanning = window.MobileProjectPlanning || {};
    MobileProjectPlanning.enums = {
        STATUS: { 0: 'Unknown', 1: 'Draft', 2: 'Active', 3: 'Done' },
        STATUS_VALUES: { 'draft': 1, 'active': 2, 'done': 3 },
        STATUS_CLASSES: { 1: 'pending', 2: 'active', 3: 'completed' }
    };
    MobileProjectPlanning.render = {};
    MobileProjectPlanning.render.status = Layer8MRenderers.createStatusRenderer(
        MobileProjectPlanning.enums.STATUS, MobileProjectPlanning.enums.STATUS_CLASSES
    );
})();
```

**Columns:** `m/js/projects/planning-columns.js` (add `primary: true` and `secondary: true` for card display)
```js
(function() {
    'use strict';
    var enums = MobileProjectPlanning.enums;
    var render = MobileProjectPlanning.render;
    MobileProjectPlanning.columns = {
        Project: [
            { key: 'projectId', label: 'ID', sortKey: 'projectId', filterKey: 'projectId' },
            { key: 'name', label: 'Name', primary: true, sortKey: 'name', filterKey: 'name' },
            { key: 'status', label: 'Status', secondary: true, sortKey: 'status',
              enumValues: enums.STATUS_VALUES,
              render: (item) => render.status(item.status) }
        ]
    };
    MobileProjectPlanning.primaryKeys = { Project: 'projectId' };
})();
```

**Forms:** `m/js/projects/planning-forms.js` (same structure as desktop, mobile namespace)

**Registry:** `m/js/projects/projects-index.js`
```js
// m/js/projects/projects-index.js
(function() {
    'use strict';
    Layer8MModuleRegistry.create('MobileProjects', {
        'Planning': MobileProjectPlanning
    });
})();
```

### Step 2: Update Nav Config

Navigation configs are project-specific and live in `erp-ui/m/nav-configs/`. Add your module to the appropriate config file:

1. Add to modules array in `layer8m-nav-config-base.js`:
   `{ key: 'projects', label: 'Projects', icon: 'projects', hasSubModules: true }`
2. Add config block to the appropriate category file (e.g., `layer8m-nav-config-prj-other.js`):
```js
LAYER8M_NAV_CONFIG.projects = {
    subModules: [
        { key: 'planning', label: 'Planning', icon: 'projects' }
    ],
    services: {
        'planning': [
            { key: 'projects', label: 'Projects', icon: 'projects',
              endpoint: '/60/Project', model: 'Project', idField: 'projectId',
              supportedViews: ['table', 'kanban', 'gantt', 'timeline'] },
            { key: 'tasks', label: 'Tasks', icon: 'projects',
              endpoint: '/60/Task', model: 'ProjectTask', idField: 'taskId' }
        ]
    }
};
```

### Step 3: Register Module with Nav.js

In `l8ui/m/js/layer8m-nav-data.js`, add `window.MobileProjects` to the registry arrays in `_getServiceColumns`, `_getServiceFormDef`, and `_getServiceTransformData`. **Note:** This requires modifying a library file; future versions may support dynamic registration.

### Step 4: Update m/app.html

Add scripts before nav config:
```html
<script src="js/projects/planning-enums.js"></script>
<script src="js/projects/planning-columns.js"></script>
<script src="js/projects/planning-forms.js"></script>
<script src="js/projects/projects-index.js"></script>
```

Add sidebar link (routes through card nav):
```html
<a href="#dashboard" class="sidebar-item" data-section="dashboard" data-module="projects">Projects</a>
```

### Step 5: Register Reference Models

Create a project-specific reference registry file in `erp-ui/m/reference-registries/`:

```js
// erp-ui/m/reference-registries/layer8m-reference-registry-projects.js
const ref = window.Layer8RefFactory;

window.Layer8MReferenceRegistryProjects = {
    ...ref.simple('Project', 'projectId', 'name', 'Project'),
    ...ref.simple('ProjectTask', 'taskId', 'name', 'Task')
};

// Register with the central registry
Layer8MReferenceRegistry.register(window.Layer8MReferenceRegistryProjects);
```

Then include it in `m/app.html` after the main reference registry loads.

---

## 10. Special Cases

### Read-Only Services

Add `readOnly: true` to the service definition. The nav system skips CRUD callbacks, so no Add/Edit/Delete buttons appear.

```js
{ key: 'health', endpoint: '/0/Health', model: 'L8Health', idField: 'service', readOnly: true }
```

### Transform Data

When API data needs conversion before display, add `transformData` to the module namespace:

```js
MobileMyModule.transformData = function(item) {
    return { displayField: item.rawField || 'Unknown', formatted: convert(item.raw) };
};
```

The registry's `getTransformData(modelName)` passes it to the table.

### Custom CRUD Handlers (Desktop)

For models with nested data or special forms, override the factory CRUD in the init file:

```js
var origInit = window.initializeMyModule;
window.initializeMyModule = function() {
    if (origInit) origInit();
    MyModule._openAddModal = function(service) {
        if (service.model === 'SpecialModel') {
            MyCustomCRUD.openAdd(service);
        } else {
            Layer8DModuleCRUD._openAddModal.call(MyModule, service);
        }
    };
};
```

---

## 11. Checklist

### Desktop
- [ ] Config file (`modules`, `submodules`)
- [ ] Per sub-module: enums, columns, forms, entry point
- [ ] Init file (single `Layer8DModuleFactory.create()` call)
- [ ] Section HTML with correct container IDs (`{moduleKey}-{serviceKey}-table-container`)
- [ ] app.html: script tags in correct order
- [ ] sections.js: section mapping + initializer
- [ ] Reference registry entries

### Mobile
- [ ] Per sub-module: enums, columns (with `primary`/`secondary`), forms
- [ ] Registry index file (`getColumns`, `getFormDef`, `getTransformData`, `hasModel`)
- [ ] Nav config: `hasSubModules: true` + config block with `subModules` and `services`
- [ ] Nav.js: registry added to all lookup arrays
- [ ] m/app.html: script tags + sidebar link (`data-section="dashboard" data-module="xxx"`)
- [ ] Reference registry entries

### Critical Rules
- Field names MUST match actual API/protobuf field names (verify against `.pb.go` files)
- Endpoint names max 10 characters
- CSS classes use `l8-` prefix for ALL desktop modules (shared CSS from `layer8-section-layout.css`)
- Desktop: `new Layer8DTable(options)` then `table.init()` -- single options object
- Mobile: `new Layer8MEditTable(containerId, config)` -- two arguments, no init() call needed
