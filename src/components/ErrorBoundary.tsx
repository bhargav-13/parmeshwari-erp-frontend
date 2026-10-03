import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Keeps a crash in one page from blanking the whole app, and shows what went wrong
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Navigating to another page clears the error
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: '32px', fontFamily: 'var(--font-sans)' }}>
        <h2 style={{ margin: '0 0 8px', color: 'var(--danger)', fontSize: '18px' }}>Something went wrong on this page</h2>
        <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
          Please share this message with support:
        </p>
        <pre
          style={{
            margin: '0 0 16px',
            padding: '12px',
            background: 'var(--danger-soft)',
            color: 'var(--danger-hover)',
            borderRadius: '8px',
            fontSize: '13px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {this.state.error.message}
        </pre>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          style={{
            padding: '8px 16px',
            border: '1px solid var(--brand)',
            borderRadius: '6px',
            background: 'var(--brand)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
