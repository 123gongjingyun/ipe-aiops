import { useState, useEffect, useCallback } from 'react';
import type { Order, OrderStatus } from '../types';
import { getOrders, onOrdersSync } from '../store/orders';

export function useOrders(statusFilter?: OrderStatus) {
  const [orders, setOrders] = useState<Order[]>([]);

  const refresh = useCallback(() => {
    setOrders(getOrders());
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = onOrdersSync(refresh);
    return unsubscribe;
  }, [refresh]);

  const filtered = statusFilter
    ? orders.filter(o => o.status === statusFilter)
    : orders;

  return { orders: filtered, allOrders: orders, refresh };
}
