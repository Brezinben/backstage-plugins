import {
  ApiBlueprint,
  createFrontendPlugin,
  discoveryApiRef,
  identityApiRef,
} from '@backstage/frontend-plugin-api';
import { apiDocsModuleWsdlApiRef, ApiDocsModuleWsdlClient } from './api';

/**
 * Provides the WSDL conversion API as an extension.
 * @alpha
 */
const apiDocsModuleWsdlApi = ApiBlueprint.make({
  params: defineParams =>
    defineParams({
      api: apiDocsModuleWsdlApiRef,
      deps: {
        identityApi: identityApiRef,
        discoveryApi: discoveryApiRef,
      },
      factory: ({ identityApi, discoveryApi }) =>
        new ApiDocsModuleWsdlClient({ identityApi, discoveryApi }),
    }),
});

/**
 * The WSDL module of api-docs, for use with the new frontend system.
 * @alpha
 */
export default createFrontendPlugin({
  pluginId: 'api-docs-module-wsdl',
  extensions: [apiDocsModuleWsdlApi],
});
