---
'@dweber019/backstage-plugin-api-docs-module-wsdl-backend': minor
---

Read the API entity from the catalog with the credentials of the user who calls `/v1/convert`, not with the credentials of the plugin. The catalog permission policy now applies, so a user can no longer render the definition of an entity they cannot read.

`createRouter` has a new required option `httpAuth`. The new backend system passes it for you.
