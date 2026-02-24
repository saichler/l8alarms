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
/**
 * Layer8 Form Factory - Preset Field Groups & Utilities
 * Split from layer8-form-factory.js for maintainability.
 * Adds preset methods (basicEntity, dateRange, address, contact, audit, person)
 * and utility methods (section, form, _toTitleCase) to Layer8FormFactory.
 */
(function() {
    'use strict';

    const F = window.Layer8FormFactory;

    F.basicEntity = function() {
        return [
            { key: 'code', label: 'Code', type: 'text', required: true },
            { key: 'name', label: 'Name', type: 'text', required: true },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'isActive', label: 'Active', type: 'checkbox' }
        ];
    };

    F.dateRange = function(prefix) {
        if (prefix) {
            return [
                { key: prefix + 'Date', label: F._toTitleCase(prefix) + ' Date', type: 'date' },
                { key: 'endDate', label: 'End Date', type: 'date' }
            ];
        }
        return [
            { key: 'effectiveDate', label: 'Effective Date', type: 'date' },
            { key: 'endDate', label: 'End Date', type: 'date' }
        ];
    };

    F.address = function(parentKey) {
        const p = parentKey ? parentKey + '.' : '';
        return [
            { key: p + 'line1', label: 'Address Line 1', type: 'text' },
            { key: p + 'line2', label: 'Address Line 2', type: 'text' },
            { key: p + 'city', label: 'City', type: 'text' },
            { key: p + 'stateProvince', label: 'State/Province', type: 'text' },
            { key: p + 'postalCode', label: 'Postal Code', type: 'text' },
            { key: p + 'countryCode', label: 'Country', type: 'text' }
        ];
    };

    F.contact = function(parentKey) {
        const p = parentKey ? parentKey + '.' : '';
        return [
            { key: p + 'value', label: 'Contact Value', type: 'text' },
            { key: p + 'contactType', label: 'Contact Type', type: 'text' }
        ];
    };

    F.audit = function() {
        return [
            { key: 'createdBy', label: 'Created By', type: 'text', readOnly: true },
            { key: 'createdAt', label: 'Created At', type: 'date', readOnly: true },
            { key: 'modifiedBy', label: 'Modified By', type: 'text', readOnly: true },
            { key: 'modifiedAt', label: 'Modified At', type: 'date', readOnly: true }
        ];
    };

    F.person = function(includeMiddle) {
        const fields = [
            { key: 'firstName', label: 'First Name', type: 'text', required: true }
        ];
        if (includeMiddle) {
            fields.push({ key: 'middleName', label: 'Middle Name', type: 'text' });
        }
        fields.push({ key: 'lastName', label: 'Last Name', type: 'text', required: true });
        return fields;
    };

    F.section = function(title, fields) {
        return {
            title: title,
            fields: fields.flat()
        };
    };

    F.form = function(title, sections) {
        return {
            title: title,
            sections: sections
        };
    };

    F._toTitleCase = function(str) {
        if (!str) return '';
        return str
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (s) => s.toUpperCase())
            .trim();
    };

})();
