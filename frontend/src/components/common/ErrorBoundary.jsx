import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('LIFELINE UI Error Boundary caught an error:', error, errorInfo);
    // If it is a chunk load failure (stale hash), automatically refresh once
    const isChunkError = 
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed');
    
    if (isChunkError && !sessionStorage.getItem('chunk_retry_attempted')) {
      sessionStorage.setItem('chunk_retry_attempted', 'true');
      window.location.reload();
    }
  }

  handleReload = () => {
    sessionStorage.removeItem('chunk_retry_attempted');
    window.location.reload();
  };

  handleGoHome = () => {
    sessionStorage.removeItem('chunk_retry_attempted');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-200">
          <div className="w-full max-w-md bg-slate-900/90 border border-red-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md text-center">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-red-400" size={28} />
            </div>

            <h2 className="text-lg font-bold text-white mb-2 font-mono">
              OPERATIONAL INTERFACE RECOVERY
            </h2>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              A module sync or connection interruption was detected. The system is ready to re-initialize your operational workspace.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Reload Console</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              >
                <Home size={14} />
                <span>Return to Login</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
