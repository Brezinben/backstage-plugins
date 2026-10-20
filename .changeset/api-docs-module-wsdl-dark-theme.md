---
'@dweber019/backstage-plugin-api-docs-module-wsdl': patch
---

Pick the dark styles of the converted document from the palette type of the theme, not from the theme id. An app that names its themes other than `light` and `dark` always got the light styles.

Darken the boxes and the XML source of the converted document in a dark theme. It kept light boxes, with blue and green text that is hard to read on a dark page.
