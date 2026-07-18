import type { OrderStatus } from '../types';

const ITSM_REACHED_STATUSES: OrderStatus[] = [
  'processing',
  'plan_confirming',
  'delivering',
  'completed',
  'confirmed',
  'archived',
];

const PLAN_REACHED_STATUSES: OrderStatus[] = [
  'plan_confirming',
  'delivering',
  'completed',
  'confirmed',
  'archived',
];

const DELIVERY_REACHED_STATUSES: OrderStatus[] = [
  'delivering',
  'completed',
  'confirmed',
  'archived',
];

const ACCEPTANCE_REACHED_STATUSES: OrderStatus[] = [
  'completed',
  'confirmed',
  'archived',
];

const ACCEPTED_OR_ARCHIVED_STATUSES: OrderStatus[] = ['confirmed', 'archived'];

export function hasReachedItsmStage(status: OrderStatus) {
  return ITSM_REACHED_STATUSES.includes(status);
}

export function hasReachedPlanStage(status: OrderStatus) {
  return PLAN_REACHED_STATUSES.includes(status);
}

export function hasReachedDeliveryStage(status: OrderStatus) {
  return DELIVERY_REACHED_STATUSES.includes(status);
}

export function hasReachedAcceptanceStage(status: OrderStatus) {
  return ACCEPTANCE_REACHED_STATUSES.includes(status);
}

export function isAcceptedOrArchived(status: OrderStatus) {
  return ACCEPTED_OR_ARCHIVED_STATUSES.includes(status);
}
