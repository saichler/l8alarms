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
// ALM Events Module - Enum Definitions
// EventType and EventProcessingState enums

(function() {
    'use strict';

    window.AlmEvents = window.AlmEvents || {};

    const factory = Layer8EnumFactory;

    // EventType: simple enum (no status classes)
    const EVENT_TYPE = factory.simple([
        'Unspecified',
        'Fault',
        'Threshold',
        'StateChange',
        'ConfigChange',
        'Security',
        'Performance',
        'Syslog'
    ]);

    // EventProcessingState: status enum with classes
    const EVENT_PROCESSING_STATE = factory.create([
        ['Unspecified', null, ''],
        ['New', 'new', 'layer8d-status-pending'],
        ['Processing', 'processing', 'layer8d-status-pending'],
        ['Processed', 'processed', 'layer8d-status-active'],
        ['Discarded', 'discarded', 'layer8d-status-inactive'],
        ['Archived', 'archived', 'layer8d-status-inactive']
    ]);

    // Enum exports
    AlmEvents.enums = {
        EVENT_TYPE: EVENT_TYPE.enum,
        EVENT_PROCESSING_STATE: EVENT_PROCESSING_STATE.enum,
        EVENT_PROCESSING_STATE_CLASSES: EVENT_PROCESSING_STATE.classes
    };

    // Renderers
    const { renderEnum, createStatusRenderer } = Layer8DRenderers;

    AlmEvents.render = {
        eventType: (value) => renderEnum(value, EVENT_TYPE.enum),
        processingState: createStatusRenderer(
            EVENT_PROCESSING_STATE.enum,
            EVENT_PROCESSING_STATE.classes
        )
    };

})();
