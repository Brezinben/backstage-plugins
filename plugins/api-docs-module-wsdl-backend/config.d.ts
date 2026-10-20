export interface Config {
  apiDocsModuleWsdl?: {
    /**
     * Hosts external schemas (`schemaLocation`, `import location`) may be
     * downloaded from while converting a WSDL. No host is allowed by default.
     */
    allowedHosts?: string[];
  };
}
