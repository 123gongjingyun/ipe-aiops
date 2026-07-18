import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Portal ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[320px] flex flex-col items-center justify-center p-6 text-center">
          <div className="text-lg font-semibold text-foreground mb-2">页面渲染出错</div>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            当前页面发生异常，请刷新重试。如问题持续存在，请联系管理员。
          </p>
          {this.state.error && (
            <pre className="text-xs text-left bg-muted p-3 rounded-md max-w-2xl overflow-auto text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            className="mt-4 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => window.location.reload()}
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
