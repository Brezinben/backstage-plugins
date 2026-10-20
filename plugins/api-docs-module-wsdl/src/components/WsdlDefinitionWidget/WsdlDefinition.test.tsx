import { render, screen, waitFor } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { appThemeApiRef } from '@backstage/core-plugin-api';
import { ApiEntityV1alpha1 } from '@backstage/catalog-model';
import { apiDocsModuleWsdlApiRef } from '../../api';
import { WsdlDefinition } from './WsdlDefinition';

const entity: ApiEntityV1alpha1 = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'API',
  metadata: { name: 'hello' },
  spec: { type: 'wsdl', lifecycle: 'production', owner: 'x', definition: 'x' },
};

const renderWithHtml = (html: string) =>
  render(
    <TestApiProvider
      apis={[
        [apiDocsModuleWsdlApiRef, { convert: async () => html }],
        [appThemeApiRef, { getActiveThemeId: () => 'light' }],
      ]}
    >
      <WsdlDefinition definition="x" entity={entity} />
    </TestApiProvider>,
  );

describe('WsdlDefinition', () => {
  it('keeps the converted markup', async () => {
    renderWithHtml('<h1>Calculator</h1><table><tr><td>Add</td></tr></table>');

    expect(await screen.findByText('Calculator')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('removes scripts and event handlers from the converted markup', async () => {
    const { container } = renderWithHtml(
      '<h1>Calculator</h1><script>window.pwned = 1</script>' +
        '<img src="x" onerror="window.pwned = 2">' +
        '<a href="javascript:window.pwned = 3">op</a>',
    );

    await screen.findByText('Calculator');
    await waitFor(() => expect(container.querySelector('script')).toBeNull());
    expect(container.querySelector('[onerror]')).toBeNull();
    expect(
      container.querySelector('a')?.getAttribute('href') ?? '',
    ).not.toMatch(/javascript:/i);
  });
});
