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
// Layer 8 Ecosystem - Layer8DTable Entry Point
// Reusable table component with pagination, sorting, filtering
//
// This file serves as the entry point. The Layer8DTable class is split across:
//   - table-core.js    : Class definition, constructor, init, static utilities
//   - table-data.js    : Data handling, fetching, server communication
//   - table-render.js  : Rendering table, headers, rows, pagination
//   - table-events.js  : Event listeners and user interaction handling
//   - table-filter.js  : Sorting, filtering, and validation
//
// Load order: table-core.js -> table-data.js -> table-render.js -> table-events.js -> table-filter.js -> table.js

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Layer8DTable;
}
