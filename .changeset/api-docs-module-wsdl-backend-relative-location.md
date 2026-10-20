---
'@dweber019/backstage-plugin-api-docs-module-wsdl-backend': patch
---

Convert a WSDL whose `schemaLocation` or `import` location is relative. WSDL files stored next to their schemas use relative locations, and their conversion returned a 500 (`Invalid URL`, then `FODC0002` from the stylesheet). The schema that cannot be downloaded is replaced by an error document, as for any other download failure.
