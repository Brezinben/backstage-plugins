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

const schema = (targetNamespace: string) =>
  `<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" targetNamespace="${targetNamespace}"/>`;

const wsdlImporting = (schemaLocation: string) => `<?xml version="1.0"?>
<definitions xmlns="http://schemas.xmlsoap.org/wsdl/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:test" name="Test">
  <types>
    <xsd:schema>
      <xsd:import namespace="urn:imported" schemaLocation="${schemaLocation}"/>
    </xsd:schema>
  </types>
</definitions>`;

const listen = (server: http.Server) =>
  new Promise<number>(resolve =>
    server.listen(0, '127.0.0.1', () =>
      resolve((server.address() as AddressInfo).port),
    ),
  );

describe('createRouter /v1/convert', () => {
  const requestedPaths: string[] = [];
  let definition = '';
  let probe: http.Server;
  let probePort: number;
  let catalog: http.Server;
  let catalogPort: number;

  const app = async (allowedHosts?: string[]) =>
    express().use(
      '/',
      await createRouter({
        logger,
        allowedHosts,
        discovery: {
          getBaseUrl: async () => `http://127.0.0.1:${catalogPort}/api/catalog`,
          getExternalBaseUrl: async () => '',
        },
        auth: {
          getOwnServiceCredentials: async () => ({}),
          getPluginRequestToken: async () => ({ token: 'token' }),
        } as any,
      } as any),
    );

  beforeAll(async () => {
    probe = http.createServer((req, res) => {
      requestedPaths.push(req.url ?? '');
      if (req.url === '/redirect.xsd') {
        res.writeHead(302, {
          Location: `http://127.0.0.1:${probePort}/after-redirect.xsd`,
        });
        res.end();
        return;
      }
      res.setHeader('Content-Type', 'text/xml');
      res.end(schema('urn:imported'));
    });
    probePort = await listen(probe);

    catalog = http.createServer((_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'API',
          metadata: { name: 'test' },
          spec: { type: 'wsdl', definition },
        }),
      );
    });
    catalogPort = await listen(catalog);
  });

  afterAll(() => {
    probe.close();
    catalog.close();
  });

  beforeEach(() => {
    requestedPaths.length = 0;
  });

  it('does not fetch external schemas by default', async () => {
    definition = wsdlImporting(`http://127.0.0.1:${probePort}/internal.xsd`);

    await request(await app()).get('/v1/convert?entityRef=api:default/test');

    expect(requestedPaths).toEqual([]);
  });

  it('does not fetch external schemas from a host that is not allowed', async () => {
    definition = wsdlImporting(`http://127.0.0.1:${probePort}/internal.xsd`);

    await request(await app(['schemas.example.com'])).get(
      '/v1/convert?entityRef=api:default/test',
    );

    expect(requestedPaths).toEqual([]);
  });

  it('fetches external schemas from an allowed host', async () => {
    definition = wsdlImporting(`http://127.0.0.1:${probePort}/allowed.xsd`);

    await request(await app(['127.0.0.1'])).get(
      '/v1/convert?entityRef=api:default/test',
    );

    expect(requestedPaths).toEqual(['/allowed.xsd']);
  });

  it('does not follow a redirect from an allowed host', async () => {
    definition = wsdlImporting(`http://127.0.0.1:${probePort}/redirect.xsd`);

    await request(await app(['127.0.0.1'])).get(
      '/v1/convert?entityRef=api:default/test',
    );

    expect(requestedPaths).toEqual(['/redirect.xsd']);
  });
});
