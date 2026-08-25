import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Send, ArrowRightCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Customer = {
  id: string
  name: string
  email: string | null
}

type Estimate = {
  id: string
  title: string
  description: string | null
  amount: number
  require_deposit: boolean
  deposit_amount: number
  status: string
  notes: string | null
  customer_id: string | null
  public_token?: string | null
  job_id?: string | null
  job_number?: string | null
  customers?: { name: string; email: string | null } | null
  created_at: string
}

export default function Estimates() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [requireDeposit, setRequireDeposit] = useState(false)
  const [notes, setNotes] = useState('')
  const [customerId, setCustomerId] = useState('')

  async function loadData() {
    setLoading(true)
    const [estRes, custRes] = await Promise.all([
      supabase
        .from('estimates')
        .select('*, customers(name, email)')
        .order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name, email').order('name'),
    ])
    if (estRes.data) setEstimates(estRes.data)
    if (custRes.data) setCustomers(custRes.data)
    setLoading(false)
  }

  function openNewForm() {
    setEditingId(null)
    setTitle('')
    setDescription('')
    setAmount('')
    setRequireDeposit(false)
    setNotes('')
    setCustomerId('')
    setShowForm(true)
  }

  function openEditForm(est: Estimate) {
    setEditingId(est.id)
    setTitle(est.title)
    setDescription(est.description || '')
    setAmount(String(est.amount))
    setRequireDeposit(est.require_deposit)
    setNotes(est.notes || '')
    setCustomerId(est.customer_id || '')
    setShowForm(true)
  }

  async function getNextJobNumber(): Promise<string> {
    const { data } = await supabase
      .from('jobs')
      .select('job_number')
      .not('job_number', 'is', null)
      .order('job_number', { ascending: false })
      .limit(1)

    if (data && data.length > 0 && data[0].job_number) {
      const match = data[0].job_number.match(/SR-(\d+)/)
      if (match) {
        const next = parseInt(match[1], 10) + 1
        return `SR-${next}`
      }
    }
    return 'SR-1993'
  }

  async function convertToJob(est: Estimate) {
    if (est.job_id || est.status === 'converted') {
      alert('This estimate has already been converted.')
      return
    }

    if (!confirm(`Convert "${est.title}" to a job?`)) return

    try {
      const jobNumber = await getNextJobNumber()

      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          title: est.title,
          description: est.description,
          customer_id: est.customer_id,
          status: 'unscheduled',
          job_number: jobNumber,
          estimate_id: est.id,
        })
        .select('id, job_number')
        .single()

      if (jobError) throw jobError

      const { error: estError } = await supabase
        .from('estimates')
        .update({
          status: 'converted',
          job_id: job.id,
          job_number: job.job_number,
        })
        .eq('id', est.id)

      if (estError) throw estError

      alert(`Converted to job ${job.job_number}`)
      loadData()
    } catch (err: any) {
      alert('Error converting: ' + (err.message || 'Unknown error'))
    }
  }

  async function markAccepted(est: Estimate) {
    const { error } = await supabase
      .from('estimates')
      .update({ status: 'accepted' })
      .eq('id', est.id)

    if (error) {
      alert('Error: ' + error.message)
      return
    }
    loadData()
  }

  async function sendEstimate(est: Estimate) {
    if (!est.customers?.email) {
      alert('This customer has no email address on file.')
      return
    }

    if (!est.public_token) {
      alert('This estimate is missing a public token. Please edit and re-save it.')
      return
    }

    try {
      const response = await fetch('/api/send-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: est.customers.email,
          customerName: est.customers.name,
          title: est.title,
          amount: est.amount,
          requireDeposit: est.require_deposit,
          depositAmount: est.deposit_amount,
          description: est.description,
          token: est.public_token,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email')
      }

      await supabase
        .from('estimates')
        .update({ status: 'sent' })
        .eq('id', est.id)

      alert(`Estimate sent to ${est.customers.email}`)
      loadData()
    } catch (err: any) {
      alert('Error sending estimate: ' + (err.message || 'Unknown error'))
    }
  }

  async function saveEstimate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !amount) return

    const total = Number(amount)
    const deposit = requireDeposit ? total * 0.5 : 0

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      amount: total,
      require_deposit: requireDeposit,
      deposit_amount: deposit,
      notes: notes.trim() || null,
      customer_id: customerId || null,
      status: editingId ? undefined : 'draft',
    }

    if (editingId) {
      const { error } = await supabase.from('estimates').update(payload).eq('id', editingId)
      if (error) {
        alert('Error updating: ' + error.message)
        return
      }
    } else {
      const { error } = await supabase.from('estimates').insert(payload)
      if (error) {
        alert('Error creating: ' + error.message)
        return
      }
    }

    setShowForm(false)
    setEditingId(null)
    loadData()
  }

  async function deleteEstimate(id: string) {
    if (!confirm('Delete this estimate?')) return
    const { error } = await supabase.from('estimates').delete().eq('id', id)
    if (error) {
      alert('Error deleting: ' + error.message)
      return
    }
    loadData()
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Estimates</h1>
          <p className="text-slate-400 mt-1">Create and send labor-only estimates</p>
        </div>
        <button
          onClick={openNewForm}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium text-sm px-4 py-2.5 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          New Estimate
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveEstimate} className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 space-y-4">
          <h3 className="text-sm font-medium text-white">
            {editingId ? 'Edit Estimate' : 'New Estimate'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1.5">Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Install new ceiling fan"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Customer</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">— Select customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Total Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1.5">Description of work</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1.5">Notes (materials, etc.)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional – e.g. Includes materials for faucet"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="requireDeposit"
                checked={requireDeposit}
                onChange={(e) => setRequireDeposit(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="requireDeposit" className="text-sm text-slate-300">
                Require 50% deposit
                {requireDeposit && amount && (
                  <span className="text-amber-400 ml-2">
                    (${(Number(amount) * 0.5).toFixed(2)})
                  </span>
                )}
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-medium px-4 py-2 rounded-lg">
              {editingId ? 'Update Estimate' : 'Save Estimate'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null) }}
              className="text-slate-400 text-sm px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-medium text-slate-300">
            All Estimates {estimates.length > 0 && `(${estimates.length})`}
          </h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
        ) : estimates.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No estimates yet.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {estimates.map((est) => (
              <div key={est.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-800/50">
                <div>
                  <div className="font-medium text-white">{est.title}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {est.customers?.name || 'No customer'} · ${Number(est.amount).toFixed(2)}
                    {est.require_deposit && ` · 50% deposit $${Number(est.deposit_amount).toFixed(2)}`}
                    {est.job_number && ` · Job ${est.job_number}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 capitalize">
                    {est.status}
                  </span>

                  {est.status !== 'converted' && (
                    <button
                      onClick={() => convertToJob(est)}
                      className="p-2 text-slate-400 hover:text-emerald-400"
                      title="Convert to Job"
                    >
                      <ArrowRightCircle className="w-4 h-4" />
                    </button>
                  )}

                  {est.status === 'sent' && (
                    <button
                      onClick={() => markAccepted(est)}
                      className="text-xs px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                      title="Mark Accepted"
                    >
                      Accept
                    </button>
                  )}

                  <button
                    onClick={() => sendEstimate(est)}
                    className="p-2 text-slate-400 hover:text-sky-400"
                    title="Send Estimate"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditForm(est)}
                    className="p-2 text-slate-400 hover:text-amber-400"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteEstimate(est.id)}
                    className="p-2 text-slate-400 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}