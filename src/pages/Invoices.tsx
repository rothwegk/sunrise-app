import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, DollarSign, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Customer = { id: string; name: string; email?: string | null }
type Job = { id: string; title: string }

type Invoice = {
  id: string
  amount: number
  deposit_amount: number
  amount_paid: number
  status: string
  created_at: string
  customer_id: string | null
  job_id: string | null
  customers?: { name: string; email?: string | null } | null
  jobs?: { title: string } | null
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [sendingId, setSendingId] = useState<string | null>(null)

  const [customerId, setCustomerId] = useState('')
  const [jobId, setJobId] = useState('')
  const [amount, setAmount] = useState('')
  const [depositAmount, setDepositAmount] = useState('')

  async function loadData() {
    setLoading(true)
    const [invoicesRes, customersRes, jobsRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('*, customers(name, email), jobs(title)')
        .order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name, email').order('name'),
      supabase.from('jobs').select('id, title').order('created_at', { ascending: false }),
    ])
    if (invoicesRes.data) setInvoices(invoicesRes.data)
    if (customersRes.data) setCustomers(customersRes.data)
    if (jobsRes.data) setJobs(jobsRes.data)
    setLoading(false)
  }

  function openNewForm() {
    setEditingId(null)
    setCustomerId('')
    setJobId('')
    setAmount('')
    setDepositAmount('')
    setShowForm(true)
  }

  function openEditForm(inv: Invoice) {
    setEditingId(inv.id)
    setCustomerId(inv.customer_id || '')
    setJobId(inv.job_id || '')
    setAmount(String(inv.amount))
    setDepositAmount(String(inv.deposit_amount || 0))
    setShowForm(true)
  }

  async function saveInvoice(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) return

    const total = Number(amount)
    const deposit = Number(depositAmount) || 0

    if (editingId) {
      const { error } = await supabase
        .from('invoices')
        .update({
          customer_id: customerId || null,
          job_id: jobId || null,
          amount: total,
          deposit_amount: deposit,
        })
        .eq('id', editingId)
      if (error) {
        alert('Error updating: ' + error.message)
        return
      }
    } else {
      const { error } = await supabase.from('invoices').insert({
        customer_id: customerId || null,
        job_id: jobId || null,
        amount: total,
        deposit_amount: deposit,
        amount_paid: deposit,
        status: deposit > 0 && deposit < total ? 'partial' : deposit >= total ? 'paid' : 'draft',
      })
      if (error) {
        alert('Error creating: ' + error.message)
        return
      }
    }

    setShowForm(false)
    setEditingId(null)
    loadData()
  }

  async function deleteInvoice(id: string) {
    if (!confirm('Delete this invoice? This cannot be undone.')) return
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) {
      alert('Error deleting: ' + error.message)
      return
    }
    loadData()
  }

  async function recordPayment() {
    if (!paymentInvoice || !paymentAmount) return
    const extra = Number(paymentAmount)
    if (extra <= 0) return

    const newPaid = Number(paymentInvoice.amount_paid) + extra
    const newStatus = newPaid >= Number(paymentInvoice.amount) ? 'paid' : 'partial'

    const { error } = await supabase
      .from('invoices')
      .update({ amount_paid: newPaid, status: newStatus })
      .eq('id', paymentInvoice.id)

    if (error) {
      alert('Error recording payment: ' + error.message)
      return
    }

    setPaymentInvoice(null)
    setPaymentAmount('')
    loadData()
  }

  async function sendInvoice(inv: Invoice) {
  if (!inv.customers?.email) {
    alert('This customer has no email address on file.')
    return
  }

  setSendingId(inv.id)

  try {
    const balance = Number(inv.amount) - Number(inv.amount_paid)

    const response = await fetch('/api/send-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: inv.customers.email,
        customerName: inv.customers.name,
        amount: inv.amount,
        balance: balance,
        jobTitle: inv.jobs?.title || null,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email')
    }

    // Mark as sent in the database
    await supabase
      .from('invoices')
      .update({ status: inv.status === 'draft' ? 'sent' : inv.status })
      .eq('id', inv.id)

    alert(`Invoice sent to ${inv.customers.email}`)
    loadData()
  } catch (err: any) {
    alert('Error sending invoice: ' + (err.message || 'Unknown error'))
  } finally {
    setSendingId(null)
  }
}

  useEffect(() => {
    loadData()
  }, [])

  function getBalance(inv: Invoice) {
    return Number(inv.amount) - Number(inv.amount_paid)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Invoices</h1>
          <p className="text-slate-400 mt-1">Create invoices, take deposits, track balances</p>
        </div>
        <button
          onClick={openNewForm}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium text-sm px-4 py-2.5 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveInvoice} className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 space-y-4">
          <h3 className="text-sm font-medium text-white">
            {editingId ? 'Edit Invoice' : 'New Invoice'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Customer</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">— Select —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Job (optional)</label>
              <select
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">— Select —</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Total Amount *</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Deposit Amount</label>
              <input
                type="number"
                step="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-medium px-4 py-2 rounded-lg">
              {editingId ? 'Update Invoice' : 'Create Invoice'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} className="text-slate-400 text-sm px-4 py-2">
              Cancel
            </button>
          </div>
        </form>
      )}

      {paymentInvoice && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-medium text-white mb-3">
            Record Payment — {paymentInvoice.customers?.name}
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Balance due: ${getBalance(paymentInvoice).toFixed(2)}
          </p>
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Amount Received</label>
              <input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white w-40"
              />
            </div>
            <button onClick={recordPayment} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              Record Payment
            </button>
            <button onClick={() => { setPaymentInvoice(null); setPaymentAmount('') }} className="text-slate-400 text-sm px-3 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-medium text-slate-300">
            All Invoices {invoices.length > 0 && `(${invoices.length})`}
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No invoices yet.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {invoices.map((inv) => {
              const balance = getBalance(inv)
              return (
                <div key={inv.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-800/50">
                  <div>
                    <div className="font-medium text-white">
                      {inv.customers?.name || 'No customer'}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {inv.jobs?.title || 'No job'} · ${Number(inv.amount).toFixed(2)}
                      {inv.deposit_amount > 0 && ` · Deposit $${Number(inv.deposit_amount).toFixed(2)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-2">
                      <div className={`text-sm font-medium ${balance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {balance > 0 ? `Balance $${balance.toFixed(2)}` : 'Paid'}
                      </div>
                      <div className="text-xs text-slate-500 capitalize">{inv.status}</div>
                    </div>

                    <button
                      onClick={() => sendInvoice(inv)}
                      disabled={sendingId === inv.id}
                      className="p-2 text-slate-400 hover:text-sky-400 disabled:opacity-50"
                      title="Send Invoice"
                    >
                      <Send className="w-4 h-4" />
                    </button>

                    {balance > 0 && (
                      <button
                        onClick={() => setPaymentInvoice(inv)}
                        className="p-2 text-slate-400 hover:text-emerald-400"
                        title="Record Payment"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditForm(inv)}
                      className="p-2 text-slate-400 hover:text-amber-400"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteInvoice(inv.id)}
                      className="p-2 text-slate-400 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}