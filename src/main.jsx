import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Join from './pages/Join'
import Dashboard from './pages/Dashboard'
import ExpenseForm from './pages/ExpenseForm'
import RevenueForm from './pages/RevenueForm'
import Admin from './pages/Admin'
import Layout from './components/Layout'

function ProtectedRoute({ children, requireBookkeeper }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>
  if (!user) return <Navigate to="/" replace />
  if (requireBookkeeper && profile?.role !== 'bookkeeper' && !profile?.is_super_admin) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/join" element={<Join />} />
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/expense" element={
          <ProtectedRoute requireBookkeeper>
            <ExpenseForm />
          </ProtectedRoute>
        } />
        <Route path="/revenue" element={
          <ProtectedRoute requireBookkeeper>
            <RevenueForm />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename='/PropertyFlow'>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)