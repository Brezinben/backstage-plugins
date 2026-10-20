import useAsync from 'react-use/lib/useAsync';
import { Alert } from '@material-ui/lab';
import { Progress } from '@backstage/core-components';
import { useTheme } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { apiDocsModuleWsdlApiRef } from '../../api';
import {
  ApiEntityV1alpha1,
  stringifyEntityRef,
} from '@backstage/catalog-model';

export type WsdlDefinitionProps = {
  definition: string;
  entity: ApiEntityV1alpha1;
};

// The converted document only darkens its text and keeps light boxes, with inline blue and
// green colors that are unreadable on a dark page. The inline colors need !important.
const darkStyles = `
.theme-dark .box {
  background-color: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.87);
  border-color: rgba(255, 255, 255, 0.12);
}
.theme-dark .box [style*="color:blue"] { color: #9CC9FF !important; }
.theme-dark .box [style*="color:green"] { color: #8FD694 !important; }
.theme-dark .xml-element, .theme-dark .xml-proc { color: #FF8A80; }
.theme-dark .xml-att, .theme-dark .xml-att-val { color: #9CC9FF; }
.theme-dark .xml-comment, .theme-dark .xml-text { color: #8FD694; }
`;

export const WsdlDefinition = ({ definition, entity }: WsdlDefinitionProps) => {
  const apiDocsModuleWsdlDocApi = useApi(apiDocsModuleWsdlApiRef);
  const theme = useTheme();
  const result = useAsync(() => {
    return apiDocsModuleWsdlDocApi.convert(stringifyEntityRef(entity));
  }, [definition]);

  if (result.loading) {
    return <Progress />;
  }

  if (result.error) {
    return <Alert severity="error">{result?.error?.message}</Alert>;
  }

  return (
    <>
      {theme.palette.type === 'dark' && <style>{darkStyles}</style>}
      <div
        className={`theme-${theme.palette.type}`}
        dangerouslySetInnerHTML={{ __html: result.value || '' }}
      />
    </>
  );
};
