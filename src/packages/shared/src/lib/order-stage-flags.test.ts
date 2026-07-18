import { describe, expect, it } from 'vitest';

import {
  hasReachedAcceptanceStage,
  hasReachedDeliveryStage,
  hasReachedItsmStage,
  hasReachedPlanStage,
  isAcceptedOrArchived,
} from './order-stage-flags';

describe('order stage flags', () => {
  it('treats processing and later statuses as reaching the itsm stage', () => {
    expect(hasReachedItsmStage('processing')).toBe(true);
    expect(hasReachedItsmStage('plan_confirming')).toBe(true);
    expect(hasReachedItsmStage('pending')).toBe(false);
  });

  it('separates plan, delivery, acceptance and archive boundaries', () => {
    expect(hasReachedPlanStage('plan_confirming')).toBe(true);
    expect(hasReachedPlanStage('processing')).toBe(false);

    expect(hasReachedDeliveryStage('delivering')).toBe(true);
    expect(hasReachedDeliveryStage('plan_confirming')).toBe(false);

    expect(hasReachedAcceptanceStage('completed')).toBe(true);
    expect(hasReachedAcceptanceStage('delivering')).toBe(false);

    expect(isAcceptedOrArchived('confirmed')).toBe(true);
    expect(isAcceptedOrArchived('archived')).toBe(true);
    expect(isAcceptedOrArchived('completed')).toBe(false);
  });
});
