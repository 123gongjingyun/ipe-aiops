import { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { initDevConfigRemoteSync } from '@aiops/shared';
import { PortalLayout } from './components/portal-layout';
import { SupportWidget } from './components/support-widget';
import { ErrorBoundary } from './components/error-boundary';

const loadHome = () => import('./pages/home');
const loadWorkbench = () => import('./pages/workbench');
const loadCommonRequests = () => import('./pages/common-requests');
const loadCatalog = () => import('./pages/catalog');
const loadRequestRecords = () => import('./pages/request-records');
const loadRequestReviewExport = () => import('./pages/request-review-export');
const loadGuide = () => import('./pages/guide');
const loadApply = () => import('./pages/apply');
const loadOrders = () => import('./pages/orders');
const loadOrderDetail = () => import('./pages/order-detail');
const loadAbout = () => import('./pages/about');
const loadHelp = () => import('./pages/help');
const loadHandbook = () => import('./pages/handbook');
const loadApplyServicePage = () => import('./pages/apply-service');

const Home = lazy(() => loadHome().then(module => ({ default: module.Home })));
const GuidedWorkbench = lazy(() => loadWorkbench().then(module => ({ default: module.GuidedWorkbench })));
const DirectWorkbench = lazy(() => loadWorkbench().then(module => ({ default: module.DirectWorkbench })));
const CommonRequests = lazy(() => loadCommonRequests().then(module => ({ default: module.CommonRequests })));
const Catalog = lazy(() => loadCatalog().then(module => ({ default: module.Catalog })));
const RequestRecords = lazy(() => loadRequestRecords().then(module => ({ default: module.RequestRecords })));
const RequestReviewExportPage = lazy(() => loadRequestReviewExport().then(module => ({ default: module.RequestReviewExportPage })));
const Guide = lazy(() => loadGuide().then(module => ({ default: module.Guide })));
const Apply = lazy(() => loadApply().then(module => ({ default: module.Apply })));
const Orders = lazy(() => loadOrders().then(module => ({ default: module.Orders })));
const OrderDetail = lazy(() => loadOrderDetail().then(module => ({ default: module.OrderDetail })));
const About = lazy(() => loadAbout().then(module => ({ default: module.About })));
const Help = lazy(() => loadHelp().then(module => ({ default: module.Help })));
const Handbook = lazy(() => loadHandbook().then(module => ({ default: module.Handbook })));
const ApplyServicePage = lazy(() => loadApplyServicePage().then(module => ({ default: module.ApplyServicePage })));

function preloadPortalRoutes() {
  void loadOrders();
  void loadOrderDetail();
  void loadApply();
}

export function warmPortalRoute(pathname: string) {
  if (pathname.startsWith('/common-requests')) return void loadCommonRequests();
  if (pathname.startsWith('/catalog')) return void loadCatalog();
  if (pathname.startsWith('/request-records')) return void loadRequestRecords();
  if (pathname.startsWith('/request-review-export/')) return void loadRequestReviewExport();
  if (pathname.startsWith('/guided-workbench')) return void loadWorkbench();
  if (pathname.startsWith('/direct-workbench')) return void loadWorkbench();
  if (pathname.startsWith('/guide')) return void loadGuide();
  if (pathname.startsWith('/orders')) return void loadOrders();
  if (pathname.startsWith('/order/')) return void loadOrderDetail();
  if (pathname.startsWith('/apply-service/')) return void loadApplyServicePage();
  if (pathname.startsWith('/apply/')) return void loadApply();
  if (pathname.startsWith('/about')) return void loadAbout();
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
  useEffect(() => initDevConfigRemoteSync('portal'), []);

  useEffect(() => {
    const schedule = window.requestIdleCallback
      ? window.requestIdleCallback(() => preloadPortalRoutes(), { timeout: 1500 })
      : window.setTimeout(preloadPortalRoutes, 900);

    return () => {
      if (typeof schedule === 'number') {
        window.clearTimeout(schedule);
      } else {
        window.cancelIdleCallback?.(schedule);
      }
    };
  }, []);

  return (
    <PortalLayout>
      <Suspense fallback={<RouteFallback />}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/guided-workbench" element={<GuidedWorkbench />} />
            <Route path="/direct-workbench" element={<DirectWorkbench />} />
            <Route path="/common-requests" element={<CommonRequests />} />
            <Route path="/request-records" element={<RequestRecords />} />
            <Route path="/request-review-export/:id" element={<RequestReviewExportPage />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/apply/:comboId" element={<Apply />} />
            <Route path="/apply-service/:serviceId" element={<ApplyServicePage />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/order/:id" element={<OrderDetail />} />
            <Route path="/about/*" element={<About />} />
            <Route path="/help" element={<Help />} />
            <Route path="/handbook" element={<Handbook />} />
          </Routes>
        </ErrorBoundary>
      </Suspense>
      <SupportWidget />
    </PortalLayout>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
