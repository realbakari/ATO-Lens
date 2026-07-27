import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: any) {
    console.error(`ErrorBoundary (${this.props.name || 'Component'}) caught:`, error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-zinc-100">Something went wrong</h3>
            </div>
            <p className="text-xs text-zinc-400">
              An unexpected UI error occurred in {this.props.name || 'ATO Lens'}. You can reload the workspace or submit a bug report.
            </p>

            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 max-h-40 overflow-auto">
              <code className="text-xs text-rose-300 break-all whitespace-pre-wrap">
                {this.state.error?.name}: {this.state.error?.message}
              </code>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
