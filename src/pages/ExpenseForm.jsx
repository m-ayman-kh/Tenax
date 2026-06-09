import { useState } from 'react'
import { sql } from '../lib/db'
import { useAuth } from '../context/AuthContext'
import { compressImage } from '../lib/compress'

const EXPENSE_CATEGORIES = {
  'Maintenance': ['Plumber','Painting','Electrical','HVAC','Cleaning','Security','Other'],
  'Innovation': ['Landscape','Entrance','Lighting','Parking','Gym','Pool','Other'],
  'Utilities': ['Water','Electricity','Gas','Internet','Waste','Other'],
  'Insurance': ['Property','Liability','Other'],
  'Taxes': ['Property Tax','Income Tax','Other'],
  'Administrative': ['Legal','Accounting','Management','Other']
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function monthLabel(dateStr) {
  const d = new Date(dateStr)
  return MONTHS[d.getMonth()] + '-' + String(d.getFullYear()).slice(-2)
}

// File upload stubbed — R2 integration coming in Phase 4
async function uploadFile(file, buildingName) {
  // TODO: upload to Cloudflare R2 via Cloudflare Worker
  console.warn('File upload not yet implemented (Phase 4 — R2)', file.name)
  return null
}

export default function ExpenseForm() {
  const { profile, building } = useAuth()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [selectedMonths, setSelectedMonths] = useState([])
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const buildingMonths = building?.config?.months ||
    Array.from({length: 12}, (_, i) => `2026-${String(i+1).padStart(2,'0')}-01`)

  function toggleMonth(m) {
    setSelectedMonths(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    )
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
    if (!subCategory) return setError('Please select a sub-category')
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

      const amountPerMonth = parseFloat(amount) / selectedMonths.length

      for (const month of selectedMonths) {
        await sql`
          INSERT INTO transactions
            (building_id, type, date, category, sub_category, month, amount, notes, attachment_urls, created_by)
          VALUES
            (${profile.building_id}, 'Expense', ${date}, ${category}, ${subCategory},
             ${month}, ${-amountPerMonth}, ${notes}, ${JSON.stringify(attachmentUrls)}, ${profile.id})
        `
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
    setSubCategory('')
    setSelectedMonths([])
    setAmount('')
    setNotes('')
    setFiles([])
    setSuccess(false)
    setError('')
  }

  if (success) return (
    <div className="flex flex-col items-center justify-center p-10 text-center space-y-4">
      <div className="text-5xl">✅</div>
      <h2 className="text-xl font-semibold" style={{ color: '#667eea' }}>Expense Recorded</h2>
      <p className="text-gray-500 text-sm">
        {selectedMonths.length} month(s) × EGP {(parseFloat(amount) / selectedMonths.length).toFixed(0)} each
      </p>
      <button onClick={reset}
        className="px-6 py-3 rounded-xl text-white font-medium"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        Record Another
      </button>
    </div>
  )

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-center pt-2" style={{ color: '#f5576c' }}>💸 Record Expense</h1>

      {/* Date */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</label>
        <input type="date" value={date} max={new Date().toISOString().split('T')[0]}
          onChange={e => setDate(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-base focus:outline-none focus:border-pink-400" />
      </div>

      {/* Category */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</label>
        <select value={category} onChange={e => { setCategory(e.target.value); setSubCategory('') }}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-base focus:outline-none focus:border-pink-400 bg-white">
          <option value="">Select category</option>
          {Object.keys(EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Sub Category */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sub-Category</label>
        <select value={subCategory} onChange={e => setSubCategory(e.target.value)}
          disabled={!category}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-base focus:outline-none focus:border-pink-400 bg-white disabled:opacity-40">
          <option value="">Select sub-category</option>
          {(EXPENSE_CATEGORIES[category] || []).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
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
                  background: selected ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : 'white',
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
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-base focus:outline-none focus:border-pink-400" />
        {selectedMonths.length > 1 && amount && (
          <p className="text-xs text-gray-400">
            EGP {(parseFloat(amount) / selectedMonths.length).toFixed(2)} per month
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          rows={3} placeholder="Additional details..."
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-base focus:outline-none focus:border-pink-400 resize-none" />
      </div>

      {/* Attachments */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Attachments (optional, max 10 files) — upload coming in Phase 4
        </label>
        <div onClick={() => document.getElementById('expenseFiles').click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer">
          <div className="text-2xl mb-1">📎</div>
          <div className="text-xs text-gray-400">Tap to attach</div>
          <input id="expenseFiles" type="file" multiple accept="image/*,.pdf,.doc,.docx"
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
        style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
        {loading ? 'Submitting...' : 'Submit Expense'}
      </button>
    </div>
  )
}
