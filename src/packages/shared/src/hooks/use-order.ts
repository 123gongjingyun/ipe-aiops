import { useState, useEffect, useCallback } from 'react';
import type { Order, OrderStatus, DeliveryDetail, ItsmStatus, DeliveryAcceptanceSnapshot, DeliveryImplementationPlan } from '../types';
import { getOrder, updateOrderStatus as storeUpdateStatus, updateServiceStatus as storeUpdateService, completeServiceDelivery as storeCompleteService, resetServiceDelivery as storeResetService, confirmOrder as storeConfirm, submitOrderForReview as storeSubmitOrderForReview, approveReview as storeApproveReview, rejectReview as storeRejectReview, approveCurrentApprovalStage as storeApproveCurrentApprovalStage, rejectCurrentApprovalStage as storeRejectCurrentApprovalStage, submitPlanForConfirmation as storeSubmitPlanForConfirmation, confirmPlan as storeConfirmPlan, rejectPlan as storeRejectPlan, archiveOrder as storeArchiveOrder, updateDeliveryAcceptance as storeUpdateDeliveryAcceptance, updateChainNodeStatus, completeAllChainNodes, startCurrentDeliveryStep as storeStartCurrentDeliveryStep, completeCurrentDeliveryStep as storeCompleteCurrentDeliveryStep, onOrdersSync, pullOrdersFromRemote } from '../store/orders';
import { getItsmService } from '../services/itsm-service';

export function useOrder(id: string) {
  const [order, setOrder] = useState<Order | undefined>();
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const localOrder = getOrder(id);
    if (localOrder) {
      setOrder(localOrder);
      setIsLoaded(true);
      return;
    }

    await pullOrdersFromRemote();
    setOrder(getOrder(id));
    setIsLoaded(true);
  }, [id]);

  useEffect(() => {
    setIsLoaded(false);
    void refresh();
    const unsubscribe = onOrdersSync(refresh);
    return unsubscribe;
  }, [refresh]);

  const updateStatus = useCallback((status: OrderStatus) => {
    const updated = storeUpdateStatus(id, status);
    setOrder(updated);
  }, [id]);

  const updateServiceStatus = useCallback((serviceName: string, status: OrderStatus) => {
    const updated = storeUpdateService(id, serviceName, status);
    setOrder(updated);
  }, [id]);

  const completeService = useCallback((serviceName: string, detail?: DeliveryDetail) => {
    const updated = storeCompleteService(id, serviceName, detail);
    setOrder(updated);
  }, [id]);

  const confirm = useCallback(() => {
    const updated = storeConfirm(id);
    setOrder(updated);
  }, [id]);

  const archive = useCallback(() => {
    const updated = storeArchiveOrder(id);
    setOrder(updated);
  }, [id]);

  const submitForReview = useCallback(() => {
    const updated = storeSubmitOrderForReview(id);
    setOrder(updated);
  }, [id]);

  const approveReview = useCallback((comment?: string) => {
    const updated = storeApproveReview(id, comment);
    setOrder(updated);
  }, [id]);

  const rejectReview = useCallback((comment: string) => {
    const updated = storeRejectReview(id, comment);
    setOrder(updated);
  }, [id]);

  const approveCurrentApprovalStage = useCallback((comment?: string) => {
    const updated = storeApproveCurrentApprovalStage(id, comment);
    setOrder(updated);
  }, [id]);

  const rejectCurrentApprovalStage = useCallback((comment: string) => {
    const updated = storeRejectCurrentApprovalStage(id, comment);
    setOrder(updated);
  }, [id]);

  const submitPlanForConfirmation = useCallback(() => {
    const updated = storeSubmitPlanForConfirmation(id);
    setOrder(updated);
  }, [id]);

  const confirmPlan = useCallback(() => {
    const updated = storeConfirmPlan(id);
    setOrder(updated);
  }, [id]);

  const rejectPlan = useCallback((feedback: string) => {
    const updated = storeRejectPlan(id, feedback);
    setOrder(updated);
  }, [id]);

  const updateItsmTicketInfo = useCallback((payload: {
    ticketNo?: string;
    ticketUrl?: string;
    status?: ItsmStatus;
    resultComment?: string;
    actor?: string;
  }) => {
    getItsmService().updateTicketInfo(id, payload).then(updated => {
      setOrder(updated);
    });
  }, [id]);

  const updateDeliveryAcceptance = useCallback((payload: {
    status?: DeliveryAcceptanceSnapshot['status'];
    acceptedBy?: string;
    deliveryPath?: DeliveryAcceptanceSnapshot['deliveryPath'];
    domains?: string[];
    nonStandardReason?: string;
    nonStandardDiffItems?: string[];
    nonStandardRisks?: string[];
    collaborationDomains?: string[];
    implementationPlan?: DeliveryImplementationPlan;
  }) => {
    const updated = storeUpdateDeliveryAcceptance(id, payload);
    setOrder(updated);
  }, [id]);

  const resetService = useCallback((serviceName: string) => {
    const updated = storeResetService(id, serviceName);
    setOrder(updated);
  }, [id]);

  const updateChainNode = useCallback((nodeId: string, status: 'pending' | 'processing' | 'completed') => {
    const updated = updateChainNodeStatus(id, nodeId, status);
    setOrder(updated);
  }, [id]);

  const completeAllChain = useCallback(() => {
    const updated = completeAllChainNodes(id);
    setOrder(updated);
  }, [id]);

  const startCurrentDeliveryStep = useCallback(() => {
    const updated = storeStartCurrentDeliveryStep(id);
    setOrder(updated);
  }, [id]);

  const completeCurrentDeliveryStep = useCallback(() => {
    const updated = storeCompleteCurrentDeliveryStep(id);
    setOrder(updated);
  }, [id]);

  return { order, isLoaded, updateStatus, updateServiceStatus, completeService, resetService, confirm, archive, submitForReview, approveReview, rejectReview, approveCurrentApprovalStage, rejectCurrentApprovalStage, submitPlanForConfirmation, confirmPlan, rejectPlan, updateItsmTicketInfo, updateDeliveryAcceptance, updateChainNode, completeAllChain, startCurrentDeliveryStep, completeCurrentDeliveryStep, refresh };
}
