import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('TaleBridge Uncaught Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-[#0c0d14] text-slate-100 p-6 flex flex-col items-center justify-center gap-4 text-xs select-text">
          <div className="bg-[#141622] border border-rose-500/50 p-4 rounded-xl max-w-lg w-full flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <span>✕</span>
              <span>Ошибка отображения интерфейса</span>
            </div>

            <p className="text-slate-300 font-mono text-xs bg-[#10111a] p-2.5 rounded border border-[#262a3d] break-all">
              {this.state.error?.message || 'Неизвестная ошибка'}
            </p>

            {this.state.errorInfo?.componentStack && (
              <pre className="text-xs text-slate-500 font-mono bg-[#10111a] p-2 rounded max-h-32 overflow-y-auto scrollbar-thin">
                {this.state.errorInfo.componentStack}
              </pre>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262a3d]">
              <button
                type="button"
                className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer"
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.reload();
                }}
              >
                Перезагрузить интерфейс
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
