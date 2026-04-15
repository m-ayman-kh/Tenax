import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [navVisible, setNavVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY < 10) {
        setNavVisible(true)
      } else if (currentScrollY > lastScrollY.current) {
        setNavVisible(false)
      } else {
        setNavVisible(true)
      }
      lastScrollY.current = currentScrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const role = profile?.role
  const tabs = [
    { path: '/dashboard', label: 'Dashboard', icon: '◎' },
    { path: '/expense', label: 'Expense', icon: '↓', restricted: true },
    { path: '/revenue', label: 'Revenue', icon: '↑', restricted: true },
    { path: '/admin', label: 'Admin', icon: '⚙', adminOnly: true },
  ]

  return (
    <div className="min-h-screen pb-16" style={{ background: '#f5f5f5' }}>
      <div className="sticky top-0 z-50 flex justify-between items-center px-4 py-3"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <span className="text-white font-semibold text-base">🏢 PropertyFlow</span>
        <div className="text-right">
          <div className="text-white text-xs opacity-90">{profile?.full_name}</div>
          <div className="text-white text-xs opacity-70 capitalize">{role}</div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <Outlet />
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300"
        style={{
          background: 'white',
          borderTop: '0.5px solid #e0e0e0',
          transform: navVisible ? 'translateY(0)' : 'translateY(100%)'
        }}>
        <div className="flex justify-around items-center py-2 max-w-2xl mx-auto">
          {tabs.map(tab => {
            if (tab.adminOnly && role !== 'bookkeeper') return null
            const isActive = location.pathname === tab.path
            const isLocked = tab.restricted && role === 'tenant'

            return (
              <button
                key={tab.path}
                onClick={() => !isLocked && navigate(tab.path)}
                className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all"
                style={{ opacity: isLocked ? 0.35 : 1 }}>
                <div className="text-lg w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ background: isActive ? '#eeedfe' : 'transparent', color: isActive ? '#667eea' : '#888' }}>
                  {tab.icon}
                </div>
                <span className="text-xs" style={{ color: isActive ? '#667eea' : '#888', fontWeight: isActive ? 500 : 400 }}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}