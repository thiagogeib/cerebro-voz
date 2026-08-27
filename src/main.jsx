import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import AppPage from './pages/AppPage'
import AdminLayout from './pages/admin/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app" element={
          <ProtectedRoute>
            <AppPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/*" element={
          <ProtectedRoute requireRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/app" replace />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
)

// Service worker: é ele que faz o app abrir sem internet e permite instalar
// na tela inicial do celular. Em desenvolvimento fica desligado para não
// servir arquivo velho durante a edição.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('Service worker não registrado:', err.message)
    })
  })
}
