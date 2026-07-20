import { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Navigate, Routes, Route } from 'react-router-dom';
import { initDevConfigRemoteSync, LoginPage, RequireAuth, RequireMenuAccess } from '@aiops/shared';
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

const CENTER_LOGIN_BRAND = {
  moduleName: '运营中心',
  title: '运营中心',
  subtitle: '登录后继续处理工单、管理交付资产与运维集成',
  defaultPath: '/',
  app: 'center',
} as const;

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
            <Route path="/login" element={<LoginPage brand={CENTER_LOGIN_BRAND} />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <RequireMenuAccess menuKey="menu.center.dashboard">
                    <Dashboard />
                  </RequireMenuAccess>
                </RequireAuth>
              }
            />
            <Route
              path="/orders"
              element={
                <RequireAuth>
                  <RequireMenuAccess menuKey="menu.center.orders">
                    <Orders />
                  </RequireMenuAccess>
                </RequireAuth>
              }
            />
            <Route
              path="/order/:id"
              element={
                <RequireAuth>
                  <RequireMenuAccess menuKey="menu.center.orders">
                    <OrderDetail />
                  </RequireMenuAccess>
                </RequireAuth>
              }
            />
            <Route
              path="/matrix"
              element={
                <RequireAuth>
                  <RequireMenuAccess menuKey="menu.center.matrix">
                    <Matrix />
                  </RequireMenuAccess>
                </RequireAuth>
              }
            />
            <Route
              path="/matrix/:domainKey"
              element={
                <RequireAuth>
                  <RequireMenuAccess menuKey="menu.center.matrix">
                    <MatrixDetailPage />
                  </RequireMenuAccess>
                </RequireAuth>
              }
            />
            <Route
              path="/help"
              element={
                <RequireAuth>
                  <Help />
                </RequireAuth>
              }
            />
            <Route
              path="/handbook"
              element={
                <RequireAuth>
                  <Handbook />
                </RequireAuth>
              }
            />
            <Route
              path="/service-ledger"
              element={
                <RequireAuth>
                  <RequireMenuAccess menuKey="menu.center.service-ledger">
                    <ServiceLedger />
                  </RequireMenuAccess>
                </RequireAuth>
              }
            />
            <Route
              path="/monitoring-center"
              element={
                <RequireAuth>
                  <RequireMenuAccess menuKey="menu.center.ops-integration">
                    <MonitoringCenterPage />
                  </RequireMenuAccess>
                </RequireAuth>
              }
            />
            <Route
              path="/ops-management"
              element={
                <RequireAuth>
                  <RequireMenuAccess menuKey="menu.center.ops-integration">
                    <OpsManagementPage />
                  </RequireMenuAccess>
                </RequireAuth>
              }
            />
            <Route
              path="/security-ops"
              element={
                <RequireAuth>
                  <RequireMenuAccess menuKey="menu.center.ops-integration">
                    <SecurityOpsPage />
                  </RequireMenuAccess>
                </RequireAuth>
              }
            />
            <Route
              path="/fault-handling"
              element={
                <RequireAuth>
                  <RequireMenuAccess menuKey="menu.center.ops-integration">
                    <FaultHandlingPage />
                  </RequireMenuAccess>
                </RequireAuth>
              }
            />
            <Route
              path="/dc-facility"
              element={
                <RequireAuth>
                  <RequireMenuAccess menuKey="menu.center.ops-integration">
                    <DCFacilityPage />
                  </RequireMenuAccess>
                </RequireAuth>
              }
            />
            <Route
              path="/ai-knowledge"
              element={
                <RequireAuth>
                  <RequireMenuAccess menuKey="menu.center.ai-knowledge">
                    <AIKnowledgePage />
                  </RequireMenuAccess>
                </RequireAuth>
              }
            />
            <Route
              path="/service-catalog"
              element={
                <RequireAuth>
                  <RequireMenuAccess menuKey="menu.center.service-catalog">
                    <ServiceCatalog />
                  </RequireMenuAccess>
                </RequireAuth>
              }
            />
            <Route
              path="/service-catalog/sla"
              element={
                <RequireAuth>
                  <RequireMenuAccess menuKey="menu.center.service-catalog">
                    <SLAManagement />
                  </RequireMenuAccess>
                </RequireAuth>
              }
            />
            <Route
              path="/service-catalog/flow"
              element={
                <RequireAuth>
                  <RequireMenuAccess menuKey="menu.center.service-catalog">
                    <ServiceFlow />
                  </RequireMenuAccess>
                </RequireAuth>
              }
            />
            <Route
              path="/service-catalog/templates"
              element={
                <RequireAuth>
                  <RequireMenuAccess menuKey="menu.center.settings">
                    <Navigate to="/settings?tab=templates" replace />
                  </RequireMenuAccess>
                </RequireAuth>
              }
            />
            <Route
              path="/ops-integration"
              element={
                <RequireAuth>
                  <RequireMenuAccess menuKey="menu.center.ops-integration">
                    <OpsIntegration />
                  </RequireMenuAccess>
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <RequireMenuAccess menuKey="menu.center.settings">
                    <SettingsPage />
                  </RequireMenuAccess>
                </RequireAuth>
              }
            />
          </Routes>
        </Suspense>
      </AppErrorBoundary>
    </CenterLayout>
  );
}

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;
