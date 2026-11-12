import React, { Component } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

class RootErrorBoundary extends Component {
  state = { hasError: false, error: null }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[RootErrorBoundary]', error, info)
  }
  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0a0c10',
          color: '#f4f5f6',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Logpile encountered an unexpected state</h2>
        <p style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '440px', marginBottom: '16px' }}>
          {this.state.error?.message || 'A UI component could not render.'}
        </p>
        <button
          type="button"
          onClick={() => {
            this.setState({ hasError: false, error: null })
            window.location.reload()
          }}
          style={{
            padding: '8px 18px',
            fontSize: '12px',
            fontWeight: 600,
            background: 'var(--accent, #38bdf8)',
            color: '#000',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Reload Sanctuary
        </button>
      </div>
    )
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
)
