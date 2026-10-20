import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@material-ui/core/styles';
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

const renderInTheme = (type: 'light' | 'dark') =>
  render(
    <TestApiProvider
      apis={[
        [
          apiDocsModuleWsdlApiRef,
          { convert: async () => '<h1>Calculator</h1>' },
        ],
        // An app can name its themes as it likes, only the palette tells dark from light.
        [
          appThemeApiRef,
          {
            getActiveThemeId: () =>
              type === 'dark' ? 'custom-dark-theme' : 'custom-light-theme',
          },
        ],
      ]}
    >
      <ThemeProvider theme={createTheme({ palette: { type } })}>
        <WsdlDefinition definition="x" entity={entity} />
      </ThemeProvider>
    </TestApiProvider>,
  );

describe('WsdlDefinition theme', () => {
  it('uses the dark styles of the converted document in a dark theme', async () => {
    const { container } = renderInTheme('dark');

    await screen.findByText('Calculator');
    expect(container.querySelector('.theme-dark')).not.toBeNull();
  });

  it('does not use the dark styles in a light theme', async () => {
    const { container } = renderInTheme('light');

    await screen.findByText('Calculator');
    expect(container.querySelector('.theme-dark')).toBeNull();
  });

  it('darkens the boxes of the converted document in a dark theme', async () => {
    const { container } = renderInTheme('dark');

    await screen.findByText('Calculator');
    expect(container.querySelector('style')?.textContent).toContain(
      '.theme-dark .box',
    );
  });

  it('adds no style in a light theme', async () => {
    const { container } = renderInTheme('light');

    await screen.findByText('Calculator');
    expect(container.querySelector('style')).toBeNull();
  });
});
