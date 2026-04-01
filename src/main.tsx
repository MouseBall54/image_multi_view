import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { RendererErrorBoundary } from './components/RendererErrorBoundary'
import './app.css' // As per GEMINI.md

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RendererErrorBoundary>
      <App />
    </RendererErrorBoundary>
  </React.StrictMode>,
)
