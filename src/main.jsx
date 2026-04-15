import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import Join from './pages/Join'
import Dashboard from './pages/Dashboard'
import ExpenseForm from './pages/ExpenseForm'
import RevenueForm from './pages/RevenueForm'
import Admin from './pages/Admin'
import Layout from './components/Layout'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename='/PropertyFlow'>
      <AuthProvider>
        <Routes>
          <Route path='/' element={<Login />} />
          <Route path='/join' element={<Join />} />
          <Route element={<Layout />}>
            <Route path='/dashboard' element={<Dashboard />} />
            <Route path='/expense' element={<ExpenseForm />} />
            <Route path='/revenue' element={<RevenueForm />} />
            <Route path='/admin' element={<Admin />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)