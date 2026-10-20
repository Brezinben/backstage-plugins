import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';

/**
 *
 * @public
 */
export const apiDocsModuleWsdlPlugin = createBackendPlugin({
  pluginId: 'api-docs-module-wsdl',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
        discovery: coreServices.discovery,
        auth: coreServices.auth,
        httpAuth: coreServices.httpAuth,
      },
      async init({ logger, httpRouter, discovery, auth, httpAuth }) {
        httpRouter.use(
          await createRouter({
            logger,
            discovery,
            auth,
            httpAuth,
          }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
