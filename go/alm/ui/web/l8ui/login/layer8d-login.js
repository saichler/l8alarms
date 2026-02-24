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
// L8ERP - Login Page JavaScript
//
// This file has been split into multiple files for maintainability.
// The module is split across multiple files:
//
//   - login-state.js : State management, initialization, event listeners
//   - login-auth.js  : Authentication, device detection, session handling
//   - login-tfa.js   : TFA verification and setup functions
//   - login-ui.js    : UI helpers, toast notifications, exports
//
// Load all JS files in index.html in order:
//   1. config.js
//   2. login-state.js
//   3. login-auth.js
//   4. login-tfa.js
//   5. login-ui.js
//
// This file is kept for backwards compatibility but should not be loaded.
