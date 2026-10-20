import http from 'http';
import { AddressInfo } from 'net';
import express from 'express';
import request from 'supertest';
import { createRouter } from './router';

const logger: any = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: () => logger,
};

const wsdl = `<?xml version="1.0"?>
<definitions xmlns="http://schemas.xmlsoap.org/wsdl/" targetNamespace="urn:test" name="Test"/>`;

const userCredentials = {
  principal: { type: 'user', userEntityRef: 'user:default/guest' },
};

describe('createRouter /v1/convert', () => {
  let catalog: http.Server;
  let catalogPort: number;
  // The catalog answers with the entity only to the tokens listed here, as its permission policy would.
  let tokensAllowedToRead: string[];

  const app = async () =>
    express().use(
      '/',
      await createRouter({
        logger,
        discovery: {
          getBaseUrl: async () => `http://127.0.0.1:${catalogPort}/api/catalog`,
          getExternalBaseUrl: async () => '',
        },
        auth: {
          getOwnServiceCredentials: async () => ({
            principal: {
              type: 'service',
              subject: 'plugin:api-docs-module-wsdl',
            },
          }),
          getPluginRequestToken: async ({ onBehalfOf }: any) => ({
            token:
              onBehalfOf.principal.type === 'user'
                ? 'user-token'
                : 'service-token',
          }),
        } as any,
        httpAuth: { credentials: async () => userCredentials } as any,
      } as any),
    );

  beforeAll(async () => {
    catalog = http.createServer((req, res) => {
      const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
      if (!tokensAllowedToRead.includes(token)) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: { name: 'NotFoundError' } }));
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'API',
          metadata: { name: 'test' },
          spec: { type: 'wsdl', definition: wsdl },
        }),
      );
    });
    await new Promise<void>(resolve =>
      catalog.listen(0, '127.0.0.1', () => {
        catalogPort = (catalog.address() as AddressInfo).port;
        resolve();
      }),
    );
  });

  afterAll(() => {
    catalog.close();
  });

  it('converts an entity the user can read', async () => {
    tokensAllowedToRead = ['user-token'];

    const response = await request(await app()).get(
      '/v1/convert?entityRef=api:default/test',
    );

    expect(response.status).toBe(200);
  });

  it('does not convert an entity the user cannot read', async () => {
    tokensAllowedToRead = ['service-token'];

    const response = await request(await app()).get(
      '/v1/convert?entityRef=api:default/test',
    );

    expect(response.status).not.toBe(200);
    expect(response.text).not.toContain('Test');
  });
});
