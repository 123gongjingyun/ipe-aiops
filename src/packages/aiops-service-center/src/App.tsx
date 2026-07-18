import { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Navigate, Routes, Route } from 'react-router-dom';
import { initDevConfigRemoteSync } from '@aiops/shared';
import { CenterLayout } from './components/center-layout';
import { AppErrorBoundary } from './components/app-error-boundary';

const loadDashboard = () => import('./pages/dashboard');
const loadOrders = () => import('./pages/orders');
const loadOrderDetail = () => import('./pages/order-detail');
const loadMatrix = () => import('./pages/matrix');
const loadMatrixDetailPage = () => import('./pages/matrix-detail');
const loadHelp = () => import('./pages/help');
const loadHandbook = () => import('./pages/handbook');
const loadServiceLedger = () => import('./pages/service-ledger');
const loadMonitoringCenterPage = () => import('./pages/monitoring-center');
const loadOpsManagementPage = () => import('./pages/ops-management');
const loadSecurityOpsPage = () => import('./pages/security-ops');
const loadFaultHandlingPage = () => import('./pages/fault-handling');
const loadDCFacilityPage = () => import('./pages/dc-facility');
const loadAIKnowledgePage = () => import('./pages/ai-knowledge');
const loadServiceCatalog = () => import('./pages/service-catalog');
const loadSLAManagement = () => import('./pages/service-catalog/sla');
const loadServiceFlow = () => import('./pages/service-catalog/flow');
const loadOpsIntegration = () => import('./pages/ops-integration');
const loadSettingsPage = () => import('./pages/settings');

const Dashboard = lazy(() => loadDashboard().then(module => ({ default: module.Dashboard })));
const Orders = lazy(() => loadOrders().then(module => ({ default: module.Orders })));
const OrderDetail = lazy(() => loadOrderDetail().then(module => ({ default: module.OrderDetail })));
const Matrix = lazy(() => loadMatrix().then(module => ({ default: module.Matrix })));
const MatrixDetailPage = lazy(() => loadMatrixDetailPage());
const Help = lazy(() => loadHelp().then(module => ({ default: module.Help })));
const Handbook = lazy(() => loadHandbook().then(module => ({ default: module.Handbook })));
const ServiceLedger = lazy(() => loadServiceLedger().then(module => ({ default: module.ServiceLedger })));
const MonitoringCenterPage = lazy(() => loadMonitoringCenterPage());
const OpsManagementPage = lazy(() => loadOpsManagementPage());
const SecurityOpsPage = lazy(() => loadSecurityOpsPage());
const FaultHandlingPage = lazy(() => loadFaultHandlingPage());
const DCFacilityPage = lazy(() => loadDCFacilityPage());
const AIKnowledgePage = lazy(() => loadAIKnowledgePage());
const ServiceCatalog = lazy(() => loadServiceCatalog().then(module => ({ default: module.ServiceCatalog })));
const SLAManagement = lazy(() => loadSLAManagement().then(module => ({ default: module.SLAManagement })));
const ServiceFlow = lazy(() => loadServiceFlow().then(module => ({ default: module.ServiceFlow })));
const OpsIntegration = lazy(() => loadOpsIntegration().then(module => ({ default: module.OpsIntegration })));
const SettingsPage = lazy(() => loadSettingsPage());

function preloadCenterRoutes() {
  void loadMatrix();
  void loadOpsIntegration();
  void loadSettingsPage();
}

export function warmCenterRoute(pathname: string) {
  if (pathname.startsWith('/matrix')) return void loadMatrix();
  if (pathname.startsWith('/ops-integration')) return void loadOpsIntegration();
  if (pathname.startsWith('/settings')) return void loadSettingsPage();
  if (pathname.startsWith('/orders')) return void loadOrders();
  if (pathname.startsWith('/order/')) return void loadOrderDetail();
  if (pathname.startsWith('/help')) return void loadHelp();
  if (pathname.startsWith('/handbook')) return void loadHandbook();
}

function RouteFallback() {
  return (
    <div className="min-h-[420px] rounded-2xl border border-slate-200 bg-white/80 p-6">
      <div className="animate-pulse space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-40 rounded-md bg-slate-200" />
            <div className="h-4 w-72 rounded-md bg-slate-100" />
          </div>
          <div className="h-9 w-28 rounded-lg bg-slate-200" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="h-24 rounded-xl bg-slate-100" />
          <div className="h-24 rounded-xl bg-slate-100" />
          <div className="h-24 rounded-xl bg-slate-100" />
        </div>
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
          <div className="h-4 w-36 rounded-md bg-slate-200" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-full rounded-md bg-slate-100" />
            <div className="h-4 w-5/6 rounded-md bg-slate-100" />
            <div className="h-4 w-2/3 rounded-md bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  useEffect(() => initDevConfigRemoteSync('center'), []);

  useEffect(() => {
    const schedule = window.requestIdleCallback
      ? window.requestIdleCallback(() => preloadCenterRoutes(), { timeout: 1500 })
      : window.setTimeout(preloadCenterRoutes, 900);

    return () => {
      if (typeof schedule === 'number') {
        window.clearTimeout(schedule);
      } else {
        window.cancelIdleCallback?.(schedule);
      }
    };
  }, []);

  return (
    <CenterLayout>
      <AppErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/order/:id" element={<OrderDetail />} />
            <Route path="/matrix" element={<Matrix />} />
            <Route path="/matrix/:domainKey" element={<MatrixDetailPage />} />
            <Route path="/help" element={<Help />} />
            <Route path="/handbook" element={<Handbook />} />
            <Route path="/service-ledger" element={<ServiceLedger />} />
            <Route path="/monitoring-center" element={<MonitoringCenterPage />} />
            <Route path="/ops-management" element={<OpsManagementPage />} />
            <Route path="/security-ops" element={<SecurityOpsPage />} />
            <Route path="/fault-handling" element={<FaultHandlingPage />} />
            <Route path="/dc-facility" element={<DCFacilityPage />} />
            <Route path="/ai-knowledge" element={<AIKnowledgePage />} />
            <Route path="/service-catalog" element={<ServiceCatalog />} />
            <Route path="/service-catalog/sla" element={<SLAManagement />} />
            <Route path="/service-catalog/flow" element={<ServiceFlow />} />
            <Route path="/service-catalog/templates" element={<Navigate to="/settings?tab=templates" replace />} />
            <Route path="/ops-integration" element={<OpsIntegration />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Suspense>
      </AppErrorBoundary>
    </CenterLayout>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
