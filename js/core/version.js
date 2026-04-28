// version.js
//
// Single source of truth for the user-facing app version. Used by:
//   - js/ui/feedback.js          (auto-attached to bug reports)
//   - js/ui/settings/data-io.js  (Settings → Data & About → About row)
//
// Bump alongside `package.json` when releasing. Keeping this in code
// (rather than importing package.json at runtime) avoids leaking devDeps
// and lock-file metadata into the bundle.

export const APP_VERSION = '1.0.0';
