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
// ALM Policies Module - Enum Definitions
// PolicyStatus and NotificationChannel enums

(function() {
    'use strict';

    window.AlmPolicies = window.AlmPolicies || {};

    const factory = Layer8EnumFactory;
    const { renderEnum, createStatusRenderer } = Layer8DRenderers;

    // PolicyStatus: status enum with classes
    const POLICY_STATUS = factory.create([
        ['Unspecified', null, ''],
        ['Active', 'active', 'layer8d-status-active'],
        ['Disabled', 'disabled', 'layer8d-status-inactive']
    ]);

    // NotificationChannel: simple enum
    const NOTIFICATION_CHANNEL = factory.simple([
        'Unspecified', 'Email', 'Webhook', 'Slack', 'PagerDuty', 'Custom'
    ]);

    // Enum exports
    AlmPolicies.enums = {
        POLICY_STATUS: POLICY_STATUS.enum,
        POLICY_STATUS_CLASSES: POLICY_STATUS.classes,
        NOTIFICATION_CHANNEL: NOTIFICATION_CHANNEL.enum
    };

    // Renderers
    AlmPolicies.render = {
        policyStatus: createStatusRenderer(
            POLICY_STATUS.enum,
            POLICY_STATUS.classes
        ),
        notificationChannel: (value) => renderEnum(value, NOTIFICATION_CHANNEL.enum)
    };

})();
