/*
Copyright 2024 Sharon Aicler (saichler@gmail.com)

Layer 8 Alarms is licensed under the Apache License, Version 2.0.
You may obtain a copy of the License at:

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
// ALM Maintenance Module - Enum Definitions
// MaintenanceWindowStatus and RecurrenceType enums

(function() {
    'use strict';

    window.AlmMaintenance = window.AlmMaintenance || {};

    const factory = Layer8EnumFactory;
    const { renderEnum, createStatusRenderer } = Layer8DRenderers;

    // MaintenanceWindowStatus: status enum with classes
    const MAINTENANCE_WINDOW_STATUS = factory.create([
        ['Unspecified', null, ''],
        ['Scheduled', 'scheduled', 'layer8d-status-pending'],
        ['Active', 'active', 'layer8d-status-active'],
        ['Completed', 'completed', 'layer8d-status-inactive'],
        ['Cancelled', 'cancelled', 'layer8d-status-terminated']
    ]);

    // RecurrenceType: simple enum
    const RECURRENCE_TYPE = factory.simple([
        'Unspecified', 'None', 'Daily', 'Weekly', 'Monthly'
    ]);

    // Enum exports
    AlmMaintenance.enums = {
        MAINTENANCE_WINDOW_STATUS: MAINTENANCE_WINDOW_STATUS.enum,
        MAINTENANCE_WINDOW_STATUS_CLASSES: MAINTENANCE_WINDOW_STATUS.classes,
        RECURRENCE_TYPE: RECURRENCE_TYPE.enum
    };

    // Renderers
    AlmMaintenance.render = {
        windowStatus: createStatusRenderer(
            MAINTENANCE_WINDOW_STATUS.enum,
            MAINTENANCE_WINDOW_STATUS.classes
        ),
        recurrenceType: (value) => renderEnum(value, RECURRENCE_TYPE.enum)
    };

})();
