import type { Order, ItsmStatus } from '../types';
import { updateItsmTicketInfo as updateItsmTicketInfoInStore } from '../store/orders';

export interface UpdateItsmTicketPayload {
  ticketNo?: string;
  ticketUrl?: string;
  status?: ItsmStatus;
  resultComment?: string;
  actor?: string;
}

export interface ItsmService {
  updateTicketInfo(orderId: string, payload: UpdateItsmTicketPayload): Promise<Order>;
}

class LocalItsmService implements ItsmService {
  async updateTicketInfo(orderId: string, payload: UpdateItsmTicketPayload): Promise<Order> {
    return updateItsmTicketInfoInStore(orderId, payload);
  }
}

let itsmService: ItsmService = new LocalItsmService();

export function getItsmService(): ItsmService {
  return itsmService;
}

export function setItsmService(service: ItsmService) {
  itsmService = service;
}
