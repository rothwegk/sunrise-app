import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Customer = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  created_at: string
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

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
      // Update existing
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
      // Create new
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
          <p className="text-slate-400 mt-1">Customer directory and contact info</p>
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
                  <div className="font-medium text-white">{c.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {[c.email, c.phone, c.address].filter(Boolean).join(' · ') || 'No contact info'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
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