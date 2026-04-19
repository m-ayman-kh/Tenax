import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const TABS = ['Join Requests', 'Users', 'Buildings']

export default function Admin() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('Join Requests')
  const [requests, setRequests] = useState([])
  const [users, setUsers] = useState([])
  const [buildings, setBuildings] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!profile?.is_super_admin) return
    fetchAll()
  }, [profile])

  async function fetchAll() {
    setLoading(true)
    const [reqRes, usersRes, bldRes] = await Promise.all([
      supabase.from('join_requests').select('*, buildings(name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*, buildings(name)').order('created_at', { ascending: false }),
      supabase.from('buildings').select('*').order('created_at', { ascending: false })
    ])
    if (reqRes.data) setRequests(reqRes.data)
    if (usersRes.data) setUsers(usersRes.data)
    if (bldRes.data) setBuildings(bldRes.data)
    setLoading(false)
  }

  async function approveRequest(req) {
    const buildingId = prompt('Building ID for this user?', req.building_id || '')
    const role = prompt('Role? (bookkeeper or tenant)', 'tenant')
    if (!buildingId || !role) return

    const { error } = await supabase.functions.invoke('invite-user', {
      body: {
        email: req.email,
        buildingId,
        role,
        unitNumber: req.unit_number
      }
    })

    if (error) return showMessage('Error: ' + error.message)

    await supabase.from('join_requests').update({ status: 'approved' }).eq('id', req.id)
    showMessage('Invite sent to ' + req.email)
    fetchAll()
  }

  async function rejectRequest(id) {
    await supabase.from('join_requests').update({ status: 'rejected' }).eq('id', id)
    showMessage('Request rejected')
    fetchAll()
  }

  async function updateUserRole(userId, role) {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    showMessage('Role updated')
    fetchAll()
  }

  async function updateUserBuilding(userId, buildingId) {
    await supabase.from('profiles').update({ building_id: buildingId }).eq('id', userId)
    showMessage('Building updated')
    fetchAll()
  }

  async function removeUser(userId) {
    if (!confirm('Remove this user?')) return
    await supabase.from('profiles').delete().eq('id', userId)
    showMessage('User removed')
    fetchAll()
  }

  async function addBuilding() {
    const name = prompt('Building name?')
    if (!name) return
    const slug = name.toLowerCase().replace(/\s+/g, '-')
    await supabase.from('buildings').insert({
      name,
      slug,
      config: {
        language: 'en',
        beginning_balance: 50000,
        total_units: 20,
        currency: 'EGP',
        expense_categories: null,
        revenue_categories: null
      }
    })
    showMessage('Building added')
    fetchAll()
  }

  async function updateBuildingConfig(id, field, value) {
    const building = buildings.find(b => b.id === id)
    const newConfig = { ...building.config, [field]: value }
    await supabase.from('buildings').update({ config: newConfig }).eq('id', id)
    showMessage('Building updated')
    fetchAll()
  }

  function showMessage(msg) {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  if (!profile?.is_super_admin) return (
    <div className="p-10 text-center text-gray-400">Access denied</div>
  )

  if (loading) return (
    <div className="p-10 text-center text-gray-400">Loading...</div>
  )

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold text-center pt-2" style={{ color: '#667eea' }}>⚙ Admin Panel</h1>

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

      {/* Join Requests */}
      {tab === 'Join Requests' && (
        <div className="space-y-3">
          {requests.length === 0 && (
            <div className="text-center text-gray-400 py-10">No join requests</div>
          )}
          {requests.map(req => (
            <div key={req.id} className="bg-white rounded-2xl p-4 space-y-2"
              style={{ border: '0.5px solid #e0e0e0' }}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-sm text-gray-800">{req.email}</div>
                  <div className="text-xs text-gray-400">
                    Unit {req.unit_number} · {req.buildings?.name}
                  </div>
                  {req.message && <div className="text-xs text-gray-500 mt-1">"{req.message}"</div>}
                </div>
                <span className="text-xs px-2 py-1 rounded-lg"
                  style={{
                    background: req.status === 'pending' ? '#fef3c7' : req.status === 'approved' ? '#d1fae5' : '#fee2e2',
                    color: req.status === 'pending' ? '#92400e' : req.status === 'approved' ? '#065f46' : '#991b1b'
                  }}>
                  {req.status}
                </span>
              </div>
              {req.status === 'pending' && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => approveRequest(req)}
                    className="flex-1 py-2 rounded-xl text-xs font-medium text-white"
                    style={{ background: '#22c55e' }}>
                    Approve & Invite
                  </button>
                  <button onClick={() => rejectRequest(req.id)}
                    className="flex-1 py-2 rounded-xl text-xs font-medium text-white"
                    style={{ background: '#f5576c' }}>
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Users */}
      {tab === 'Users' && (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-2xl p-4 space-y-3"
              style={{ border: '0.5px solid #e0e0e0' }}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-sm text-gray-800">{u.full_name || 'No name'}</div>
                  <div className="text-xs text-gray-400">{u.buildings?.name || 'No building'}</div>
                </div>
                <button onClick={() => removeUser(u.id)}
                  className="text-xs text-red-400 font-medium">Remove</button>
              </div>
              <div className="flex gap-2">
                <select value={u.role || ''} onChange={e => updateUserRole(u.id, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white">
                  <option value="">No role</option>
                  <option value="bookkeeper">Bookkeeper</option>
                  <option value="tenant">Tenant</option>
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
                <div className="space-y-1">
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