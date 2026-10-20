import express from 'express';
import Router from 'express-promise-router';
import fetch from 'cross-fetch';
import { CatalogClient } from '@backstage/catalog-client';
import { ApiEntity } from '@backstage/catalog-model';
// @ts-ignore
import SaxonJS from 'saxon-js';
import styleSheet from '../stylesheet.sef.json';
import { AuthService, DiscoveryService, LoggerService } from '@backstage/backend-plugin-api';

const isAllowedHost = (uri: string, allowedHosts: string[]) => {
  try {
    const { protocol, host, hostname } = new URL(uri);
    return (
      ['http:', 'https:'].includes(protocol) &&
      (allowedHosts.includes(host) || allowedHosts.includes(hostname))
    );
  } catch {
    return false;
  }
};

const downloadExternalSchema = async (
  uri: string,
  logger: LoggerService,
  allowedHosts: string[],
) => {
  if (!isAllowedHost(uri, allowedHosts)) {
    logger.warn(
      `Skipped downloading schema ${uri}, its host is not in apiDocsModuleWsdl.allowedHosts`,
    );
    return `<?xml version="1.0" encoding="UTF-8"?><Error>Could not download external schema!</Error>`;
  }
  try {
    // A redirect could lead from an allowed host to one that is not.
    const value = await fetch(uri, { redirect: 'error' });
    return await value.text();
  } catch {
    logger.warn(`Error downloading schema for ${uri}`);
    return `<?xml version="1.0" encoding="UTF-8"?><Error>Could not download external schema!</Error>`;
  }
};

// Do to a bug in SaxonJS we have to remove the port else the
// document can't be found by the URL in the documentPool.
const removePort = (uri: string) => {
  const url = new URL(uri);
  if (
    (url.protocol.toLowerCase() === 'https' &&
      url.port.toLowerCase() === '443') ||
    (url.protocol.toLowerCase() === 'http' && url.port.toLowerCase() === '80')
  ) {
    url.port = '';
  }
  return url.toString();
};

const recursiveDocumentPoolDownload = async (
  saxonDocument: any,
  logger: LoggerService,
  allowedHosts: string[],
  documentPool: { [name: string]: string } = {},
) => {
  const schemaURIs: Array<{ value: string }> =
    SaxonJS.XPath.evaluate(
      "//*[local-name() = 'import'][@location]/@location|//*[@schemaLocation]/@schemaLocation",
      saxonDocument,
      { resultForm: 'array' },
    ) || [];

  if (schemaURIs.length > 0) {
    const externalSchemas = await Promise.all(
      schemaURIs.map(async schemaURI =>
        SaxonJS.getResource({
          text: await downloadExternalSchema(
            schemaURI.value,
            logger,
            allowedHosts,
          ),
          type: 'xml',
        }),
      ),
    );

    for (let i = 0; i < externalSchemas.length; i++) {
      documentPool[removePort(schemaURIs[i].value)] = externalSchemas[i];
    }

    await Promise.all(
      externalSchemas.map(async (document: any) =>
        recursiveDocumentPoolDownload(
          document,
          logger,
          allowedHosts,
          documentPool,
        ),
      ),
    );
  }

  return documentPool;
};

const wsdlToHtml = async (
  xml: string,
  logger: LoggerService,
  allowedHosts: string[],
) => {
  const saxonDocument = await SaxonJS.getResource({ text: xml, type: 'xml' });
  const documentPool: { [name: string]: string } =
    await recursiveDocumentPoolDownload(saxonDocument, logger, allowedHosts);

  const schemaURIs = Object.keys(documentPool);
  if (schemaURIs.length > 0) {
    logger.info(
      `Downloading external schemas as found ${schemaURIs.length} external schemas.`,
    );
    logger.info(`External schemas ${schemaURIs.join(', ')}`);
  } else {
    logger.info('No external schema found');
  }

  logger.info('Transforming wsdl document');

  return SaxonJS.transform(
    {
      stylesheetText: JSON.stringify(styleSheet),
      sourceText: xml,
      sourceBaseURI: 'https://backstage.io', // Needs to be set to anything
      documentPool: documentPool,
      destination: 'serialized',
      logLevel: 10,
    },
    'async',
  ).then((output: { principalResult: string }) => output.principalResult);
};

export interface RouterOptions {
  logger: LoggerService;
  discovery: DiscoveryService;
  auth: AuthService;
  /**
   * Hosts external schemas may be downloaded from, matched against the host
   * with and without port. No host is allowed by default.
   */
  allowedHosts?: string[];
}

/** @public */
export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, discovery, auth, allowedHosts = [] } = options;

  const catalogClient = new CatalogClient({ discoveryApi: discovery });

  const router = Router();
  router.use(express.text());

  router.get('/health', (_, response) => {
    response.json({ status: 'ok' });
  });

  router.get('/v1/convert', async (req, res) => {
    const { token } = await auth.getPluginRequestToken({
      onBehalfOf: await auth.getOwnServiceCredentials(),
      targetPluginId: 'catalog',
    });
    const entityRef = req.query.entityRef as string;
    const entityLogger = logger.child({ entity: entityRef });
    const apiEntity = (await catalogClient.getEntityByRef(entityRef, {
      token,
    })) as ApiEntity;
    const result = await wsdlToHtml(
      apiEntity.spec.definition,
      entityLogger,
      allowedHosts,
    );
    res.send(result);
  });

  return router;
}
