import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Navigation } from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { supabase } from '../lib/supabase'

type Customer = {
  id: string
  name: string
  phone: string | null
}

type Job = {
  id: string
  title: string
  description: string | null
  status: string
  scheduled_date: string | null
  scheduled_time: string | null
  customer_id: string | null
  customers?: { name: string } | null
  created_at: string
}

const timeOptions = [
  '7:00 AM', '7:30 AM',
  '8:00 AM', '8:30 AM',
  '9:00 AM', '9:30 AM',
  '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM',
  '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM',
  '4:00 PM'
]

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null)
  const [scheduledTime, setScheduledTime] = useState('')
  const [status, setStatus] = useState('unscheduled')
  const [previousStatus, setPreviousStatus] = useState<string | null>(null)
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active')

  async function loadData() {
    setLoading(true)
    const [jobsRes, customersRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('*, customers(name)')
        .order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name, phone').order('name'),
    ])
    if (jobsRes.data) setJobs(jobsRes.data)
    if (customersRes.data) setCustomers(customersRes.data)
    setLoading(false)
  }

  function openNewForm() {
    setEditingId(null)
    setTitle('')
    setDescription('')
    setCustomerId('')
    setScheduledDate(null)
    setScheduledTime('')
    setStatus('unscheduled')
    setPreviousStatus(null)
    setShowForm(true)
  }

  function openEditForm(job: Job) {
    setEditingId(job.id)
    setTitle(job.title)
    setDescription(job.description || '')
    setCustomerId(job.customer_id || '')
    setScheduledDate(job.scheduled_date ? new Date(job.scheduled_date) : null)
    setScheduledTime(job.scheduled_time || '')
    setStatus(job.status)
    setPreviousStatus(job.status)
    setShowForm(true)
  }

  async function saveJob(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      customer_id: customerId || null,
      scheduled_date: scheduledDate ? scheduledDate.toISOString().split('T')[0] : null,
      scheduled_time: scheduledTime || null,
      status,
    }

    if (editingId) {
      const { error } = await supabase.from('jobs').update(payload).eq('id', editingId)
      if (error) {
        alert('Error updating job: ' + error.message)
        return
      }
    } else {
      const { error } = await supabase.from('jobs').insert(payload)
      if (error) {
        alert('Error creating job: ' + error.message)
        return
      }
    }

    // Send scheduled confirmation once when job becomes scheduled
    const becameScheduled =
      status === 'scheduled' && (previousStatus === null || previousStatus !== 'scheduled')

    if (becameScheduled && customerId) {
      const customer = customers.find((c) => c.id === customerId)
      if (customer?.phone) {
        try {
          const response = await fetch('/api/job-scheduled', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: customer.phone,
              customerName: customer.name,
              jobTitle: title.trim(),
              scheduledDate: payload.scheduled_date,
              scheduledTime: payload.scheduled_time,
            }),
          })
          const result = await response.json()
          if (!response.ok) {
            alert('Job saved, but text failed: ' + (result.error || 'Unknown error'))
          }
        } catch (err: any) {
          alert('Job saved, but text failed: ' + (err.message || 'Unknown error'))
        }
      }
    }

    setShowForm(false)
    setEditingId(null)
    setPreviousStatus(null)
    loadData()
  }

  async function deleteJob(id: string, title: string) {
    if (!confirm(`Delete job "${title}"? This cannot be undone.`)) return
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (error) {
      alert('Error deleting: ' + error.message)
      return
    }
    loadData()
  }

  async function sendOnMyWay(job: Job) {
    if (!job.customer_id) {
      alert('This job has no customer assigned.')
      return
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .select('phone, name')
      .eq('id', job.customer_id)
      .single()

    if (error || !customer?.phone) {
      alert('This customer has no phone number on file.')
      return
    }

    if (!confirm(`Send "On my way" text to ${customer.name} (${customer.phone})?`)) return

    try {
      const response = await fetch('/api/on-my-way', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customer.phone,
          customerName: customer.name,
          jobTitle: job.title,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send text')
      }

      const { error: statusError } = await supabase
        .from('jobs')
        .update({ status: 'in_progress' })
        .eq('id', job.id)

      if (statusError) {
        alert('Text sent, but could not update status: ' + statusError.message)
      } else {
        alert('On my way text sent! Job marked In Progress.')
      }

      loadData()
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Could not send text'))
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'active') return job.status !== 'completed'
    if (filter === 'completed') return job.status === 'completed'
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Jobs</h1>
          <p className="text-slate-400 mt-1">Create and manage handyman jobs</p>
        </div>
        <button
          onClick={openNewForm}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Job
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveJob} className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 space-y-4">
          <h3 className="text-sm font-medium text-white">
            {editingId ? 'Edit Job' : 'New Job'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1.5">Job Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
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
              <label className="block text-xs text-slate-400 mb-1.5">Scheduled Date</label>
              <DatePicker
                selected={scheduledDate}
                onChange={(date: Date | null) => setScheduledDate(date)}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select date"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Time</label>
              <select
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">— Select time —</option>
                {timeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="unscheduled">Unscheduled</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-medium px-4 py-2 rounded-lg">
              {editingId ? 'Update Job' : 'Create Job'}
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
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-300">
            {filter === 'active' && 'Active Jobs'}
            {filter === 'completed' && 'Completed Jobs'}
            {filter === 'all' && 'All Jobs'}
            {filteredJobs.length > 0 && ` (${filteredJobs.length})`}
          </h2>

          <div className="flex gap-1">
            {(['active', 'completed', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {f === 'active' ? 'Active' : f === 'completed' ? 'Completed' : 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 text-sm">
              {filter === 'active' && 'No active jobs.'}
              {filter === 'completed' && 'No completed jobs yet.'}
              {filter === 'all' && 'No jobs yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredJobs.map((job) => (
              <div key={job.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-800/50">
                <div>
                  <div className="font-medium text-white">{job.title}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {job.customers?.name || 'No customer'}
                    {job.scheduled_date && ` · ${job.scheduled_date}${job.scheduled_time ? ` at ${job.scheduled_time}` : ''}`}
                    {` · ${job.status}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => sendOnMyWay(job)}
                    className="p-2 text-slate-400 hover:text-sky-400 transition-colors"
                    title="On My Way"
                  >
                    <Navigation className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditForm(job)}
                    className="p-2 text-slate-400 hover:text-amber-400 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteJob(job.id, job.title)}
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