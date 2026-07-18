import React from 'react';
import { Button } from '@aiops/shared';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Center route render failed', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleBackToOrders = () => {
    window.location.hash = '#/orders';
    this.setState({ hasError: false, errorMessage: undefined });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-[360px] items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl rounded-2xl border border-rose-200 bg-[linear-gradient(180deg,#fff8f8_0%,#ffffff_68%)] p-6 shadow-sm">
          <div className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
            页面渲染异常
          </div>
          <h2 className="mt-4 text-xl font-semibold text-slate-950">当前页面未能正常加载</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            已拦截本次前端异常，避免整页白屏。你可以返回工单列表重新进入，或直接刷新当前页面。
          </p>
          {this.state.errorMessage && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs font-medium text-slate-500">错误摘要</div>
              <div className="mt-1 break-all text-sm text-slate-800">{this.state.errorMessage}</div>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={this.handleBackToOrders}>返回工单列表</Button>
            <Button variant="outline" onClick={this.handleReload}>刷新当前页面</Button>
          </div>
        </div>
      </div>
    );
  }
}
