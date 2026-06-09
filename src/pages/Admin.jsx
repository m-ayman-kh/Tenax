import { useState, useEffect } from 'react'
import { sql } from '../lib/db'
import { useAuth } from '../context/AuthContext'

const HOA_ROLES = ['super_admin','president','vice_president','treasurer','tenant']
const TABS = ['Users', 'Buildings']

export default function Admin() {
  const { profile, isSuperAdmin } = useAuth()
  const [tab, setTab] = useState('Users')
  const [users, setUsers] = useState([])
  const [buildings, setBuildings] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!isSuperAdmin) return
    fetchAll()
  }, [isSuperAdmin])

  async function fetchAll() {
    setLoading(true)
    const [usersRows, buildingsRows] = await Promise.all([
      sql`
        SELECT p.*, b.name AS building_name
        FROM profiles p
        LEFT JOIN buildings b ON b.id = p.building_id
        ORDER BY p.created_at DESC
      `,
      sql`SELECT * FROM buildings ORDER BY created_at DESC`
    ])
    setUsers(usersRows)
    setBuildings(buildingsRows)
    setLoading(false)
  }

  async function updateUserRole(userId, role) {
    await sql`UPDATE profiles SET role = ${role} WHERE id = ${userId}`
    showMessage('Role updated')
    fetchAll()
  }

  async function updateUserBuilding(userId, buildingId) {
    await sql`UPDATE profiles SET building_id = ${buildingId || null} WHERE id = ${userId}`
    showMessage('Building updated')
    fetchAll()
  }

  async function removeUser(userId) {
    if (!confirm('Remove this user from the app? Their Clerk account will not be deleted.')) return
    await sql`DELETE FROM profiles WHERE id = ${userId}`
    showMessage('User removed')
    fetchAll()
  }

  async function addBuilding() {
    const name = prompt('Building name?')
    if (!name) return
    const slug = name.toLowerCase().replace(/\s+/g, '-')
    await sql`
      INSERT INTO buildings (name, slug, config)
      VALUES (${name}, ${slug}, ${{
        language: 'en',
        beginning_balance: 50000,
        total_units: 20,
        parking_slots: 5,
        currency: 'EGP'
      }})
    `
    showMessage('Building added')
    fetchAll()
  }

  async function updateBuildingConfig(id, field, value) {
    const building = buildings.find(b => b.id === id)
    const newConfig = { ...building.config, [field]: value }
    await sql`UPDATE buildings SET config = ${newConfig} WHERE id = ${id}`
    showMessage('Building updated')
    fetchAll()
  }

  function showMessage(msg) {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  if (!isSuperAdmin) return (
    <div className="p-10 text-center text-gray-400">Access denied</div>
  )

  if (loading) return (
    <div className="p-10 text-center text-gray-400">Loading...</div>
  )

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold text-center pt-2" style={{ color: '#667eea' }}>⚙️ Admin Panel</h1>

      {message && (
        <div className="text-center text-sm py-2 px-4 rounded-xl"
          style={{ background: '#eeedfe', color: '#667eea' }}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-2xl p-1" style={{ border: '0.5px solid #e0e0e0' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
            style={{
              background: tab === t ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
              color: tab === t ? 'white' : '#888'
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* Users */}
      {tab === 'Users' && (
        <div className="space-y-3">
          <div className="text-xs text-gray-400 text-center">{users.length} users total</div>
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-2xl p-4 space-y-3"
              style={{ border: '0.5px solid #e0e0e0' }}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-sm text-gray-800">{u.full_name || 'No name'}</div>
                  <div className="text-xs text-gray-400">{u.building_name || 'No building'}</div>
                  <div className="text-xs text-gray-300 mt-0.5 font-mono">{u.id.slice(0,16)}…</div>
                </div>
                <button onClick={() => removeUser(u.id)}
                  className="text-xs text-red-400 font-medium">Remove</button>
              </div>
              <div className="flex gap-2">
                <select value={u.role || ''} onChange={e => updateUserRole(u.id, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white">
                  <option value="">No role</option>
                  {HOA_ROLES.map(r => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
                <select value={u.building_id || ''} onChange={e => updateUserBuilding(u.id, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white">
                  <option value="">No building</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Buildings */}
      {tab === 'Buildings' && (
        <div className="space-y-3">
          <button onClick={addBuilding}
            className="w-full py-3 rounded-xl text-white font-medium text-sm"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            + Add Building
          </button>
          {buildings.map(b => (
            <div key={b.id} className="bg-white rounded-2xl p-4 space-y-3"
              style={{ border: '0.5px solid #e0e0e0' }}>
              <div className="font-medium text-sm text-gray-800">{b.name}</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Total Units</label>
                  <input type="number" defaultValue={b.config?.total_units}
                    onBlur={e => updateBuildingConfig(b.id, 'total_units', parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Parking Slots</label>
                  <input type="number" defaultValue={b.config?.parking_slots}
                    onBlur={e => updateBuildingConfig(b.id, 'parking_slots', parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Beginning Balance</label>
                  <input type="number" defaultValue={b.config?.beginning_balance}
                    onBlur={e => updateBuildingConfig(b.id, 'beginning_balance', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Currency</label>
                  <input type="text" defaultValue={b.config?.currency}
                    onBlur={e => updateBuildingConfig(b.id, 'currency', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs text-gray-400">Language</label>
                  <select defaultValue={b.config?.language}
                    onChange={e => updateBuildingConfig(b.id, 'language', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white">
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
