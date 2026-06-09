import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import './index.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import Log from './pages/Log'
import ExpenseForm from './pages/ExpenseForm'
import RevenueForm from './pages/RevenueForm'
import Admin from './pages/Admin'
import Layout from './components/Layout'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Redirects unauthenticated users to Clerk's hosted sign-in page
function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  )
}

// Restricts a route to Treasurer / Super Admin only
function FinanceRoute({ children }) {
  const { loading, canManageFinances } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>
  if (!canManageFinances) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route element={
        <ProtectedRoute>
          <AuthProvider>
            <Layout />
          </AuthProvider>
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/log" element={<Log />} />
        <Route path="/expense" element={<FinanceRoute><ExpenseForm /></FinanceRoute>} />
        <Route path="/revenue" element={<FinanceRoute><RevenueForm /></FinanceRoute>} />
        <Route path="/admin" element={<Admin />} />
      </Route>
    </Routes>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <BrowserRouter basename="/Tenax">
        <AppRoutes />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>
)
