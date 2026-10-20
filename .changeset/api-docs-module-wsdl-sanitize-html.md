---
'@dweber019/backstage-plugin-api-docs-module-wsdl': patch
---

Sanitize the HTML returned by the backend with DOMPurify before rendering it. A WSDL containing markup could previously run scripts in the browser of every viewer of the API entity.
