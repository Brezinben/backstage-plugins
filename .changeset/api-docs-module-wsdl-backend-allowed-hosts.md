---
'@dweber019/backstage-plugin-api-docs-module-wsdl-backend': minor
---

Restrict the download of external schemas to the hosts listed in `apiDocsModuleWsdl.allowedHosts`, and do not follow redirects. A WSDL could previously make the backend request any URL, including internal ones.

No host is allowed by default. Add the hosts of your external schemas to the configuration to keep rendering them.
