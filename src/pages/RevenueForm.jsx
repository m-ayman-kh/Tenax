import { useState } from 'react'
import { sql } from '../lib/db'
import { useAuth } from '../context/AuthContext'

const REVENUE_CATEGORIES = ['Rent','Parking','Laundry','Storage','Late Fees','Security Deposit','Monthly Debt','Other']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function monthLabel(dateStr) {
  const d = new Date(dateStr)
  return MONTHS[d.getMonth()] + '-' + String(d.getFullYear()).slice(-2)
}

// File upload stubbed — R2 integration coming in Phase 4
async function uploadFile(file, buildingName) {
  console.warn('File upload not yet implemented (Phase 4 — R2)', file.name)
  return null
}

export default function RevenueForm() {
  const { profile, building } = useAuth()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('')
  const [selectedTenants, setSelectedTenants] = useState([])
  const [selectedMonths, setSelectedMonths] = useState([])
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const totalUnits = building?.config?.total_units || 20
  const tenants = Array.from({ length: totalUnits }, (_, i) => String(i + 1))
  const buildingMonths = Array.from({length: 12}, (_, i) => `2026-${String(i+1).padStart(2,'0')}-01`)

  function toggleTenant(t) {
    setSelectedTenants(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  function toggleMonth(m) {
    setSelectedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  function selectAllTenants() {
    setSelectedTenants(prev => prev.length === tenants.length ? [] : [...tenants])
  }

  function handleFiles(e) {
    const newFiles = Array.from(e.target.files)
    const valid = newFiles.filter(f => f.size <= 10 * 1024 * 1024)
    if (valid.length < newFiles.length) alert('Some files exceed 10MB and were skipped')
    setFiles(prev => [...prev, ...valid].slice(0, 10))
  }

  async function handleSubmit() {
    if (!date) return setError('Please select a date')
    if (!category) return setError('Please select a category')
    if (selectedTenants.length === 0) return setError('Please select at least one tenant')
    if (selectedMonths.length === 0) return setError('Please select at least one month')
    if (!amount || parseFloat(amount) <= 0) return setError('Please enter a valid amount')

    setLoading(true)
    setError('')

    try {
      // File upload stubbed — Phase 4 (R2)
      let attachmentUrls = []
      if (files.length > 0) {
        const uploads = await Promise.all(files.map(f => uploadFile(f, building?.name)))
        attachmentUrls = uploads.filter(Boolean)
      }

      const totalCombinations = selectedTenants.length * selectedMonths.length
      const amountPerEntry = parseFloat(amount) / totalCombinations

      for (const tenant of selectedTenants) {
        for (const month of selectedMonths) {
          await sql`
            INSERT INTO transactions
              (building_id, type, date, category, month, tenant_unit, amount, notes, attachment_urls, created_by)
            VALUES
              (${profile.building_id}, 'Revenue', ${date}, ${category},
               ${month}, ${tenant}, ${amountPerEntry}, ${notes},
               ${JSON.stringify(attachmentUrls)}, ${profile.id})
          `
        }
      }

      setSuccess(true)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Something went wrong')
    }

    setLoading(false)
  }

  function reset() {
    setDate(new Date().toISOString().split('T')[0])
    setCategory('')
    setSelectedTenants([])
    setSelectedMonths([])
    setAmount('')
    setNotes('')
    setFiles([])
    setSuccess(false)
    setError('')
  }

  const totalEntries = selectedTenants.length * selectedMonths.length

  if (success) return (
    <div className="flex flex-col items-center justify-center p-10 text-center space-y-4">
      <div className="text-5xl">✅</div>
      <h2 className="text-xl font-semibold" style={{ color: '#43e97b' }}>Revenue Recorded</h2>
      <p className="text-gray-500 text-sm">
        {selectedTenants.length} tenant(s) × {selectedMonths.length} month(s) = {totalEntries} entries
      </p>
      <button onClick={reset}
        className="px-6 py-3 rounded-xl text-white font-medium"
        style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
        Record Another
      </button>
    </div>
  )

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-center pt-2" style={{ color: '#22c55e' }}>💰 Record Revenue</h1>

      {/* Date */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</label>
        <input type="date" value={date} max={new Date().toISOString().split('T')[0]}
          onChange={e => setDate(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-base focus:outline-none focus:border-green-400" />
      </div>

      {/* Category */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-base focus:outline-none focus:border-green-400 bg-white">
          <option value="">Select category</option>
          {REVENUE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tenants */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Tenants ({selectedTenants.length} selected)
          </label>
          <button onClick={selectAllTenants} className="text-xs font-medium" style={{ color: '#22c55e' }}>
            {selectedTenants.length === tenants.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {tenants.map(t => {
            const selected = selectedTenants.includes(t)
            return (
              <button key={t} onClick={() => toggleTenant(t)}
                className="py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: selected ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'white',
                  color: selected ? 'white' : '#666',
                  border: selected ? 'none' : '2px solid #e0e0e0'
                }}>
                {t}
              </button>
            )
          })}
        </div>
      </div>

      {/* Months */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Months ({selectedMonths.length} selected)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {buildingMonths.map(m => {
            const label = monthLabel(m)
            const selected = selectedMonths.includes(m)
            return (
              <button key={m} onClick={() => toggleMonth(m)}
                className="py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: selected ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'white',
                  color: selected ? 'white' : '#666',
                  border: selected ? 'none' : '2px solid #e0e0e0'
                }}>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Amount */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Amount (EGP)</label>
        <input type="number" value={amount} min="0.01" step="0.01" placeholder="0.00"
          onChange={e => setAmount(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-base focus:outline-none focus:border-green-400" />
        {totalEntries > 1 && amount && (
          <p className="text-xs text-gray-400">
            EGP {(parseFloat(amount) / totalEntries).toFixed(2)} per entry ({totalEntries} entries)
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          rows={3} placeholder="Additional details..."
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-base focus:outline-none focus:border-green-400 resize-none" />
      </div>

      {/* Attachments */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Attachments (optional, max 10 files) — upload coming in Phase 4
        </label>
        <div onClick={() => document.getElementById('revenueFiles').click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer">
          <div className="text-2xl mb-1">📎</div>
          <div className="text-xs text-gray-400">Tap to attach</div>
          <input id="revenueFiles" type="file" multiple accept="image/*,.pdf,.doc,.docx"
            className="hidden" onChange={handleFiles} />
        </div>
        {files.map((f, i) => (
          <div key={i} className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-lg text-xs">
            <span className="text-gray-600 truncate">{f.name}</span>
            <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
              className="text-red-400 ml-2 font-bold">×</button>
          </div>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <button onClick={handleSubmit} disabled={loading}
        className="w-full py-4 rounded-xl text-white font-semibold text-base disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}>
        {loading ? 'Submitting...' : 'Submit Revenue'}
      </button>
    </div>
  )
}
