import { useParams } from 'react-router-dom';
import { ApplyWizard } from '../components/apply-wizard';
import { InternetAppWizard } from '../components/internet-app-wizard';
import { getSpec, resolveApplyStrategy } from '@aiops/shared';

export function Apply() {
  const { comboId } = useParams<{ comboId: string }>();
  const spec = comboId ? getSpec(comboId) : undefined;
  const strategy = spec ? resolveApplyStrategy(spec) : undefined;

  if (strategy?.workflowMode === 'internet_app') {
    return <InternetAppWizard />;
  }

  return <ApplyWizard key={comboId} />;
}
