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

// `schemaLocation` is relative in WSDL files that sit next to their schemas in a repository.
const wsdl = `<?xml version="1.0"?>
<definitions xmlns="http://schemas.xmlsoap.org/wsdl/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:test" name="Test">
  <types>
    <xsd:schema>
      <xsd:import namespace="urn:imported" schemaLocation="local.xsd"/>
    </xsd:schema>
  </types>
</definitions>`;

describe('createRouter /v1/convert with a relative schemaLocation', () => {
  let catalog: http.Server;
  let catalogPort: number;

  beforeAll(async () => {
    catalog = http.createServer((_req, res) => {
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

  it('converts the WSDL without the schema it cannot download', async () => {
    const app = express().use(
      '/',
      await createRouter({
        logger,
        discovery: {
          getBaseUrl: async () => `http://127.0.0.1:${catalogPort}/api/catalog`,
          getExternalBaseUrl: async () => '',
        },
        auth: {
          getOwnServiceCredentials: async () => ({}),
          getPluginRequestToken: async () => ({ token: 'token' }),
        } as any,
      }),
    );

    const response = await request(app).get(
      '/v1/convert?entityRef=api:default/test',
    );

    expect(response.status).toBe(200);
  });
});
