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
    <div
      className={`theme-${theme.palette.type}`}
      dangerouslySetInnerHTML={{ __html: result.value || '' }}
    />
  );
};
