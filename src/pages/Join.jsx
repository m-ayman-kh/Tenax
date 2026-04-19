import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Join() {
  const [buildings, setBuildings] = useState([])
  const [email, setEmail] = useState('')
  const [unitNumber, setUnitNumber] = useState('')
  const [buildingId, setBuildingId] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('buildings').select('id, name').then(({ data }) => {
      if (data) setBuildings(data)
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !buildingId) return setError('Email and building are required')

    setLoading(true)
    setError('')

    const { error: insertError } = await supabase.from('join_requests').insert({
      email,
      building_id: buildingId,
      unit_number: unitNumber,
      message
    })

    if (insertError) {
      setError('Something went wrong. Please try again.')
    } else {
      setSuccess(true)
    }

    setLoading(false)
  }

  if (success) return (
    <div className="min-h-screen flex items-center justify-center p-5"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-semibold text-gray-800">Request Sent</h2>
        <p className="text-gray-500 text-sm">
          Your access request has been submitted. You will receive an email once approved.
        </p>
        <a href="/PropertyFlow/"
          className="block text-sm font-medium" style={{ color: '#667eea' }}>
          Back to Login
        </a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-5"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏢</div>
          <h1 className="text-xl font-semibold text-gray-800">Request Access</h1>
          <p className="text-gray-400 text-sm mt-1">Fill in your details and we'll get back to you</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:border-purple-400" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Building</label>
            <select value={buildingId} onChange={e => setBuildingId(e.target.value)} required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:border-purple-400 bg-white">
              <option value="">Select your building</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unit Number</label>
            <input type="text" value={unitNumber} onChange={e => setUnitNumber(e.target.value)}
              placeholder="e.g. 14"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:border-purple-400" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Message (optional)</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Any additional info..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:border-purple-400 resize-none" />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-xl text-white font-semibold text-base disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            {loading ? 'Submitting...' : 'Request Access'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-4">
          Already have access?{' '}
          <a href="/PropertyFlow/" className="font-medium" style={{ color: '#667eea' }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}