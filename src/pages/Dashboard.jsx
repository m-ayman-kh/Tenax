import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const TABS = ['Overview', 'Matrices', 'Transactions']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtMonth(date) {
  if (!date) return '-'
  const d = new Date(date)
  return MONTHS[d.getMonth()] + '-' + String(d.getFullYear()).slice(-2)
}

function fmtCurrency(val) {
  const n = parseFloat(val) || 0
  if (n >= 1000) return 'EGP ' + (n / 1000).toFixed(1) + 'K'
  return 'EGP ' + n.toFixed(0)
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-2xl p-4 text-center" style={{ background: 'white', border: '0.5px solid #e0e0e0' }}>
      <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#888' }}>{label}</div>
      <div className="text-lg font-semibold" style={{ color: color || '#333' }}>{value}</div>
    </div>
  )
}

export default function Dashboard() {
  const { profile, building } = useAuth()
  const [tab, setTab] = useState('Overview')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const beginningBalance = building?.config?.beginning_balance || 50000

  useEffect(() => {
    if (!profile?.building_id) return
    fetchTransactions()
  }, [profile])

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

  const revenue = transactions.filter(t => t.type === 'Revenue').reduce((s, t) => s + parseFloat(t.amount), 0)
  const expenses = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0)
  const currentBalance = beginningBalance + revenue - expenses

  // Chart data
  const monthMap = {}
  transactions.forEach(t => {
    const m = fmtMonth(t.month)
    if (!monthMap[m]) monthMap[m] = { month: m, Revenue: 0, Expenses: 0 }
    if (t.type === 'Revenue') monthMap[m].Revenue += parseFloat(t.amount)
    if (t.type === 'Expense') monthMap[m].Expenses += Math.abs(parseFloat(t.amount))
  })
  const chartData = Object.values(monthMap).reverse()

  // Matrices
  const allMonths = [...new Set(transactions.map(t => fmtMonth(t.month)))]
  const totalUnits = building?.config?.total_units || 20
  const tenants = Array.from({ length: totalUnits }, (_, i) => String(i + 1))

  function getMatrixStatus(category, tenant, month) {
    return transactions.some(t =>
      t.category === category &&
      t.tenant_unit === tenant &&
      fmtMonth(t.month) === month &&
      t.type === 'Revenue'
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <div className="text-gray-400">Loading dashboard...</div>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-2xl p-1" style={{ border: '0.5px solid #e0e0e0' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: tab === t ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
              color: tab === t ? 'white' : '#888'
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'Overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Beginning Balance" value={fmtCurrency(beginningBalance)} />
            <StatCard label="Total Revenue" value={fmtCurrency(revenue)} color="#43e97b" />
            <StatCard label="Total Expenses" value={fmtCurrency(expenses)} color="#f5576c" />
            <StatCard label="Current Balance" value={fmtCurrency(currentBalance)} color={currentBalance >= 0 ? '#43e97b' : '#f5576c'} />
          </div>

          <div className="bg-white rounded-2xl p-4" style={{ border: '0.5px solid #e0e0e0' }}>
            <div className="text-sm font-medium text-gray-600 mb-3">Revenue vs Expenses</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v/1000).toFixed(0) + 'K'} />
                <Tooltip formatter={v => 'EGP ' + v.toLocaleString()} />
                <Legend />
                <Bar dataKey="Revenue" fill="#43e97b" radius={[4,4,0,0]} />
                <Bar dataKey="Expenses" fill="#f5576c" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* AI Insights Slot */}
          <div className="bg-white rounded-2xl p-4" style={{ border: '0.5px dashed #c4b5fd' }}>
            <div className="text-sm font-medium mb-1" style={{ color: '#667eea' }}>AI Insights</div>
            <div className="text-xs text-gray-400">Smart analysis of your building data — coming in Phase 2</div>
          </div>
        </div>
      )}

      {/* Matrices Tab */}
      {tab === 'Matrices' && (
        <div className="space-y-4">
          {['Rent', 'Monthly Debt'].map(category => (
            <div key={category} className="bg-white rounded-2xl p-4" style={{ border: '0.5px solid #e0e0e0' }}>
              <div className="text-sm font-medium text-gray-600 mb-3">{category} Payment Matrix</div>
              <div className="overflow-x-auto">
                <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '6px 8px', background: '#764ba2', color: 'white', borderRadius: '4px 0 0 0', position: 'sticky', left: 0 }}>Unit</th>
                      {allMonths.map(m => (
                        <th key={m} style={{ padding: '6px 8px', background: '#667eea', color: 'white', minWidth: 52, textAlign: 'center' }}>{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map(tenant => (
                      <tr key={tenant}>
                        <td style={{ padding: '5px 8px', background: '#f5f5f5', fontWeight: 500, position: 'sticky', left: 0 }}>{tenant}</td>
                        {allMonths.map(m => {
                          const paid = getMatrixStatus(category, tenant, m)
                          return (
                            <td key={m} style={{
                              padding: '5px 4px',
                              textAlign: 'center',
                              background: paid ? '#c8e6c9' : '#ffcdd2',
                              color: paid ? '#2e7d32' : '#c62828',
                              fontWeight: 600
                            }}>
                              {paid ? '✓' : '✗'}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transactions Tab */}
      {tab === 'Transactions' && (
        <div className="bg-white rounded-2xl p-4" style={{ border: '0.5px solid #e0e0e0' }}>
          <div className="text-sm font-medium text-gray-600 mb-3">Recent Transactions</div>
          <div className="overflow-x-auto">
            <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  {['Type','Date','Category','Month','Unit','Amount'].map(h => (
                    <th key={h} style={{ padding: '8px 6px', textAlign: 'left', color: '#666', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 50).map(t => (
                  <tr key={t.id} style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                    <td style={{ padding: '7px 6px' }}>
                      <span style={{
                        background: t.type === 'Revenue' ? '#e8f5e9' : '#ffebee',
                        color: t.type === 'Revenue' ? '#2e7d32' : '#c62828',
                        padding: '2px 7px', borderRadius: 10, fontSize: 10, fontWeight: 500
                      }}>{t.type}</span>
                    </td>
                    <td style={{ padding: '7px 6px', whiteSpace: 'nowrap' }}>{t.date?.slice(5)}</td>
                    <td style={{ padding: '7px 6px', whiteSpace: 'nowrap' }}>{t.category}</td>
                    <td style={{ padding: '7px 6px', whiteSpace: 'nowrap' }}>{fmtMonth(t.month)}</td>
                    <td style={{ padding: '7px 6px' }}>{t.tenant_unit || '-'}</td>
                    <td style={{ padding: '7px 6px', fontWeight: 500, color: t.type === 'Revenue' ? '#43e97b' : '#f5576c', whiteSpace: 'nowrap' }}>
                      {fmtCurrency(Math.abs(parseFloat(t.amount)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}