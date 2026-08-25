import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, History } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Customer = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  do_not_service?: boolean
  do_not_service_reason?: string | null
  created_at: string
}

type Job = {
  id: string
  title: string
  status: string
  scheduled_date: string | null
  created_at: string
}

type Estimate = {
  id: string
  title: string
  amount: number
  status: string
  created_at: string
}

type Invoice = {
  id: string
  amount: number
  amount_paid: number
  status: string
  created_at: string
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // History state
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null)
  const [historyJobs, setHistoryJobs] = useState<Job[]>([])
  const [historyEstimates, setHistoryEstimates] = useState<Estimate[]>([])
  const [historyInvoices, setHistoryInvoices] = useState<Invoice[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  async function loadCustomers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setCustomers(data || [])
    setLoading(false)
  }

  async function openHistory(customer: Customer) {
    setHistoryCustomer(customer)
    setHistoryLoading(true)

    const [jobsRes, estRes, invRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('id, title, status, scheduled_date, created_at')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('estimates')
        .select('id, title, amount, status, created_at')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('invoices')
        .select('id, amount, amount_paid, status, created_at')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false }),
    ])

    setHistoryJobs(jobsRes.data || [])
    setHistoryEstimates(estRes.data || [])
    setHistoryInvoices(invRes.data || [])
    setHistoryLoading(false)
  }

  function openNewForm() {
    setEditingId(null)
    setName('')
    setEmail('')
    setPhone('')
    setAddress('')
    setShowForm(true)
  }

  function openEditForm(customer: Customer) {
    setEditingId(customer.id)
    setName(customer.name)
    setEmail(customer.email || '')
    setPhone(customer.phone || '')
    setAddress(customer.address || '')
    setShowForm(true)
  }

  async function saveCustomer(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    if (editingId) {
      const { error } = await supabase
        .from('customers')
        .update({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
        })
        .eq('id', editingId)

      if (error) {
        alert('Error updating: ' + error.message)
        return
      }
    } else {
      const { error } = await supabase.from('customers').insert({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
      })

      if (error) {
        alert('Error creating: ' + error.message)
        return
      }
    }

    setShowForm(false)
    setEditingId(null)
    loadCustomers()
  }

  async function deleteCustomer(id: string, name: string) {
    if (!confirm(`Delete customer "${name}"? This cannot be undone.`)) return

    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) {
      alert('Error deleting: ' + error.message)
      return
    }
    loadCustomers()
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Customers</h1>
          <p className="text-slate-400 mt-1">Customer directory and history</p>
        </div>
        <button
          onClick={openNewForm}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveCustomer} className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 space-y-4">
          <h3 className="text-sm font-medium text-white">
            {editingId ? 'Edit Customer' : 'New Customer'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Address</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-medium px-4 py-2 rounded-lg">
              {editingId ? 'Update Customer' : 'Save Customer'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
              }}
              className="text-slate-400 text-sm px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* History Panel */}
      {historyCustomer && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-white">{historyCustomer.name} — History</h3>
              {historyCustomer.do_not_service && (
  <div className="mt-1">
    <div className="text-sm font-medium text-red-400">DO NOT SERVICE</div>
    {historyCustomer.do_not_service_reason && (
      <div className="text-xs text-red-400/80 mt-0.5">
        Reason: {historyCustomer.do_not_service_reason}
      </div>
    )}
  </div>
)}
            </div>
            <button
              onClick={() => setHistoryCustomer(null)}
              className="text-slate-400 hover:text-white text-sm"
            >
              Close
            </button>
          </div>

          {historyLoading ? (
            <div className="text-slate-500 text-sm">Loading history...</div>
          ) : (
            <div className="space-y-6">
              {/* Jobs */}
              <div>
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Jobs</h4>
                {historyJobs.length === 0 ? (
                  <p className="text-sm text-slate-500">No jobs</p>
                ) : (
                  <div className="space-y-2">
                    {historyJobs.map((job) => (
                      <div key={job.id} className="text-sm text-slate-300">
                        <span className="text-white">{job.title}</span>
                        <span className="text-slate-500 ml-2">
                          {job.scheduled_date || 'No date'} · {job.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Estimates */}
              <div>
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Estimates</h4>
                {historyEstimates.length === 0 ? (
                  <p className="text-sm text-slate-500">No estimates</p>
                ) : (
                  <div className="space-y-2">
                    {historyEstimates.map((est) => (
                      <div key={est.id} className="text-sm text-slate-300">
                        <span className="text-white">{est.title}</span>
                        <span className="text-slate-500 ml-2">
                          ${Number(est.amount).toFixed(2)} · {est.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invoices */}
              <div>
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Invoices</h4>
                {historyInvoices.length === 0 ? (
                  <p className="text-sm text-slate-500">No invoices</p>
                ) : (
                  <div className="space-y-2">
                    {historyInvoices.map((inv) => (
                      <div key={inv.id} className="text-sm text-slate-300">
                        <span className="text-white">${Number(inv.amount).toFixed(2)}</span>
                        <span className="text-slate-500 ml-2">
                          Paid ${Number(inv.amount_paid).toFixed(2)} · {inv.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-medium text-slate-300">
            Customer List {customers.length > 0 && `(${customers.length})`}
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 text-sm">No customers yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {customers.map((c) => (
              <div key={c.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-800/50">
                <div>
                  <div className="font-medium text-white flex items-center gap-2">
                    {c.name}
                    {c.do_not_service && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                        DO NOT SERVICE
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {[c.email, c.phone, c.address].filter(Boolean).join(' · ') || 'No contact info'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
  <button
    onClick={() => openHistory(c)}
    className="p-2 text-slate-400 hover:text-sky-400 transition-colors"
    title="History"
  >
    <History className="w-4 h-4" />
  </button>

  {c.do_not_service ? (
    <button
      onClick={async () => {
        await supabase
          .from('customers')
          .update({ do_not_service: false, do_not_service_reason: null })
          .eq('id', c.id)
        loadCustomers()
      }}
      className="p-2 text-slate-400 hover:text-emerald-400 text-xs"
      title="Unblock"
    >
      Unblock
    </button>
  ) : (
    <button
      onClick={async () => {
        const reason = prompt('Reason for Do Not Service (optional):') || 'Manual block'
        await supabase
          .from('customers')
          .update({ do_not_service: true, do_not_service_reason: reason })
          .eq('id', c.id)
        loadCustomers()
      }}
      className="p-2 text-slate-400 hover:text-red-400 text-xs"
      title="Do Not Service"
    >
      Block
    </button>
  )}

  <button
    onClick={() => openEditForm(c)}
    className="p-2 text-slate-400 hover:text-amber-400 transition-colors"
    title="Edit"
  >
    <Pencil className="w-4 h-4" />
  </button>
  <button
    onClick={() => deleteCustomer(c.id, c.name)}
    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
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