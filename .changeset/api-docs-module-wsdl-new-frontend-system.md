---
'@dweber019/backstage-plugin-api-docs-module-wsdl': minor
---

Added support for the new frontend system.

A new `/alpha` entry point is now available that exports the plugin as a default export compatible with `createFrontendPlugin`. This includes:

- `ApiBlueprint` for the WSDL conversion API

The api-docs plugin has no extension point for definition widgets yet. The `apiDocsConfigRef` wiring with `wsdlApiWidget` stays in the app.

The existing entry point (`/`) remains unchanged for backward compatibility.
