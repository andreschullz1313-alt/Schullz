import React from 'react';
import { notifyAppIssue } from '../services/appMonitor';
import { STUDIO_LOGO_URI } from '../assets/studioMedia';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Erro inesperado de renderização.',
    };
  }

  componentDidCatch(error: Error): void {
    notifyAppIssue({
      category: 'bug',
      title: 'Schullz Ink · Falha Recuperável',
      message: error.message || 'Ocorreu um erro interno no aplicativo.',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ background: 'var(--bg)', color: 'var(--text)' }}
        >
          <div className="si-card max-w-md w-full text-center space-y-4">
            <img
              src={STUDIO_LOGO_URI}
              alt="Schullz Ink Tattoo"
              className="w-20 h-20 rounded-full object-cover border-2 mx-auto"
              style={{ borderColor: 'var(--r)' }}
            />
            <h2 style={{ color: 'var(--r)' }}>Proteção contra falhas ativada</h2>
            <p className="text-base" style={{ color: 'var(--text-muted)' }}>
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              className="si-btn w-full"
              onClick={() => window.location.reload()}
            >
              Recarregar aplicativo atualizado
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
