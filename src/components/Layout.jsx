import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const icons = {
  dashboard: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#667eea' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  log: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#667eea' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  expense: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#667eea' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
    </svg>
  ),
  revenue: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#667eea' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
    </svg>
  ),
  admin: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#667eea' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M12 14c-5 0-8 2-8 3v1h16v-1c0-1-3-3-8-3z"/>
    </svg>
  )
}

export default function Layout() {
  const { profile, building, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [navVisible, setNavVisible] = useState(true)
  const [buildings, setBuildings] = useState([])
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const lastScrollY = useRef(0)

  useEffect(() => {
    if (profile?.is_super_admin) fetchBuildings()
  }, [profile])

  useEffect(() => {
    if (building) setSelectedBuilding(building.id)
  }, [building])

  async function fetchBuildings() {
    const { data } = await supabase.from('buildings').select('id, name')
    if (data) setBuildings(data)
  }

  async function switchBuilding(buildingId) {
    setSelectedBuilding(buildingId)
    await supabase.from('profiles').update({ building_id: buildingId }).eq('id', profile.id)
    window.location.reload()
  }

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY < 10) setNavVisible(true)
      else if (currentScrollY > lastScrollY.current) setNavVisible(false)
      else setNavVisible(true)
      lastScrollY.current = currentScrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const role = profile?.role
  const tabs = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/log', label: 'Log', icon: 'log' },
    { path: '/expense', label: 'Expense', icon: 'expense', restricted: true },
    { path: '/revenue', label: 'Revenue', icon: 'revenue', restricted: true },
    { path: '/admin', label: 'Admin', icon: 'admin', superAdminOnly: true },
  ]

  return (
    <div className="min-h-screen pb-16" style={{ background: '#f5f5f5' }}>
      <div className="sticky top-0 z-50 px-4 py-3"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="flex justify-between items-center">
          <span className="text-white font-semibold text-base">🏢 PropertyFlow</span>
          <div className="text-right">
            {profile?.is_super_admin && buildings.length > 0 ? (
              <select
                value={selectedBuilding || ''}
                onChange={e => switchBuilding(e.target.value)}
                className="text-xs rounded-lg px-2 py-1 font-medium"
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '0.5px solid rgba(255,255,255,0.4)' }}>
                {buildings.map(b => (
                  <option key={b.id} value={b.id} style={{ background: '#667eea', color: 'white' }}>{b.name}</option>
                ))}
              </select>
            ) : (
              <div className="text-white text-xs opacity-90">{building?.name}</div>
            )}
            <div className="text-white text-xs opacity-70 capitalize mt-0.5">{profile?.full_name}</div>
          </div>
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
            if (tab.superAdminOnly && !profile?.is_super_admin) return null
            const isActive = location.pathname === tab.path
            const isLocked = tab.restricted && role === 'tenant'
            return (
              <button
                key={tab.path}
                onClick={() => !isLocked && navigate(tab.path)}
                className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all"
                style={{ opacity: isLocked ? 0.35 : 1 }}>
                <div className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ background: isActive ? '#eeedfe' : 'transparent' }}>
                  {icons[tab.icon](isActive)}
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