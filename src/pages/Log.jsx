import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtMonth(date) {
  if (!date) return '-'
  const d = new Date(date)
  return MONTHS[d.getMonth()] + '-' + String(d.getFullYear()).slice(-2)
}

function fmtDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return String(d.getDate()).padStart(2,'0') + '/' +
    String(d.getMonth()+1).padStart(2,'0') + '/' +
    String(d.getFullYear()).slice(-2)
}

export default function Log() {
  const { profile, building } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [subCategoryFilter, setSubCategoryFilter] = useState('')
  const [unitFilter, setUnitFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const totalUnits = building?.config?.total_units || 20
  const tenants = Array.from({ length: totalUnits }, (_, i) => String(i + 1))

  useEffect(() => {
    if (!profile?.building_id) return
    fetchTransactions()
  }, [profile])

  useEffect(() => {
    applyFilters()
  }, [transactions, typeFilter, categoryFilter, subCategoryFilter, unitFilter, monthFilter, dateFrom, dateTo])

  async function fetchTransactions() {
    setLoading(true)
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('building_id', profile.building_id)
      .gte('month', threeMonthsAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (!error) setTransactions(data || [])
    setLoading(false)
  }

  function applyFilters() {
    let result = [...transactions]
    if (typeFilter !== 'All') result = result.filter(t => t.type === typeFilter)
    if (categoryFilter) result = result.filter(t => t.category === categoryFilter)
    if (subCategoryFilter) result = result.filter(t => t.sub_category === subCategoryFilter)
    if (unitFilter) result = result.filter(t => t.tenant_unit === unitFilter)
    if (monthFilter) result = result.filter(t => fmtMonth(t.month) === monthFilter)
    if (dateFrom) result = result.filter(t => t.date >= dateFrom)
    if (dateTo) result = result.filter(t => t.date <= dateTo)
    setFiltered(result)
  }

  function clearFilters() {
    setTypeFilter('All')
    setCategoryFilter('')
    setSubCategoryFilter('')
    setUnitFilter('')
    setMonthFilter('')
    setDateFrom('')
    setDateTo('')
  }

  const categories = [...new Set(transactions
    .filter(t => typeFilter === 'All' || t.type === typeFilter)
    .map(t => t.category)
  )]

  const subCategories = [...new Set(transactions
    .filter(t => !categoryFilter || t.category === categoryFilter)
    .map(t => t.sub_category)
    .filter(Boolean)
  )]

  const allMonths = [...new Set(transactions.map(t => fmtMonth(t.month)))]
  const hasActiveFilters = typeFilter !== 'All' || categoryFilter || subCategoryFilter || unitFilter || monthFilter || dateFrom || dateTo

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <div className="text-gray-400">Loading log...</div>
    </div>
  )

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-semibold text-center pt-2" style={{ color: '#667eea' }}>📋 Log</h1>

      {/* Type chips */}
      <div className="flex gap-2">
        {['All', 'Revenue', 'Expense'].map(type => (
          <button key={type} onClick={() => { setTypeFilter(type); setCategoryFilter(''); setSubCategoryFilter('') }}
            className="px-4 py-2 rounded-full text-xs font-medium transition-all"
            style={{
              background: typeFilter === type ? '#667eea' : 'white',
              color: typeFilter === type ? 'white' : '#666',
              border: typeFilter === type ? 'none' : '1.5px solid #e0e0e0'
            }}>
            {type}
          </button>
        ))}
      </div>

      {/* Dropdowns row 1 */}
      <div className="grid grid-cols-2 gap-2">
        <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setSubCategoryFilter('') }}
          className="px-2 py-2 rounded-xl text-xs bg-white"
          style={{ border: categoryFilter ? '1.5px solid #667eea' : '1.5px solid #e0e0e0', color: categoryFilter ? '#667eea' : '#555' }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={subCategoryFilter} onChange={e => setSubCategoryFilter(e.target.value)}
          disabled={!categoryFilter || subCategories.length === 0}
          className="px-2 py-2 rounded-xl text-xs bg-white disabled:opacity-40"
          style={{ border: subCategoryFilter ? '1.5px solid #667eea' : '1.5px solid #e0e0e0', color: subCategoryFilter ? '#667eea' : '#555' }}>
          <option value="">All Sub-cats</option>
          {subCategories.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Dropdowns row 2 */}
      <div className="grid grid-cols-2 gap-2">
        <select value={unitFilter} onChange={e => setUnitFilter(e.target.value)}
          className="px-2 py-2 rounded-xl text-xs bg-white"
          style={{ border: unitFilter ? '1.5px solid #667eea' : '1.5px solid #e0e0e0', color: unitFilter ? '#667eea' : '#555' }}>
          <option value="">All Units</option>
          {tenants.map(t => <option key={t} value={t}>Unit {t}</option>)}
        </select>

        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          className="px-2 py-2 rounded-xl text-xs bg-white"
          style={{ border: monthFilter ? '1.5px solid #667eea' : '1.5px solid #e0e0e0', color: monthFilter ? '#667eea' : '#555' }}>
          <option value="">All Months</option>
          {allMonths.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-gray-400 pl-1">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="w-full px-2 py-2 rounded-xl text-xs bg-white"
            style={{ border: dateFrom ? '1.5px solid #667eea' : '1.5px solid #e0e0e0', color: dateFrom ? '#667eea' : '#555' }} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400 pl-1">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="w-full px-2 py-2 rounded-xl text-xs bg-white"
            style={{ border: dateTo ? '1.5px solid #667eea' : '1.5px solid #e0e0e0', color: dateTo ? '#667eea' : '#555' }} />
        </div>
      </div>

      {/* Result count + clear */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400">{filtered.length} entries found</span>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs font-medium" style={{ color: '#667eea' }}>
            Clear all
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '0.5px solid #e0e0e0' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                {['Type','Date','Category','Sub-cat','Month','Unit','Amount','Note','File'].map(h => (
                  <th key={h} style={{ padding: '8px 6px', textAlign: 'left', color: '#666', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>No entries found</td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                  <td style={{ padding: '7px 6px' }}>
                    <span style={{
                      background: t.type === 'Revenue' ? '#dcfce7' : '#fee2e2',
                      color: t.type === 'Revenue' ? '#16a34a' : '#dc2626',
                      padding: '2px 6px', borderRadius: 8, fontSize: 9, fontWeight: 500
                    }}>{t.type}</span>
                  </td>
                  <td style={{ padding: '7px 6px', whiteSpace: 'nowrap' }}>{fmtDate(t.date)}</td>
                  <td style={{ padding: '7px 6px', whiteSpace: 'nowrap' }}>{t.category || '-'}</td>
                  <td style={{ padding: '7px 6px', whiteSpace: 'nowrap' }}>{t.sub_category || '-'}</td>
                  <td style={{ padding: '7px 6px', whiteSpace: 'nowrap' }}>{fmtMonth(t.month)}</td>
                  <td style={{ padding: '7px 6px' }}>{t.tenant_unit || '-'}</td>
                  <td style={{ padding: '7px 6px', fontWeight: 500, whiteSpace: 'nowrap',
                    color: t.type === 'Revenue' ? '#22c55e' : '#f5576c' }}>
                    {Math.abs(parseFloat(t.amount)).toLocaleString()} EGP
                  </td>
                  <td style={{ padding: '7px 6px', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.notes || '-'}
                  </td>
                  <td style={{ padding: '7px 6px' }}>
                    {t.attachment_urls && t.attachment_urls.length > 0
                      ? t.attachment_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer"
                            style={{ color: '#667eea', fontSize: 10, marginRight: 4 }}>
                            📎{i + 1}
                          </a>
                        ))
                      : <span style={{ color: '#ccc' }}>—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}