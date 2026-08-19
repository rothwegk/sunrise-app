import { useEffect, useState } from 'react'
import { Wrench, Users, FileText, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeJobs: 0,
    customers: 0,
    openInvoices: 0,
    outstanding: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      setLoading(true)

      const [jobsRes, customersRes, invoicesRes] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }).neq('status', 'completed'),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('invoices').select('amount, amount_paid, status'),
      ])

      const openInvoices = (invoicesRes.data || []).filter(
        (inv) => inv.status !== 'paid'
      )

      const outstanding = openInvoices.reduce((sum, inv) => {
        return sum + (Number(inv.amount) - Number(inv.amount_paid))
      }, 0)

      setStats({
        activeJobs: jobsRes.count || 0,
        customers: customersRes.count || 0,
        openInvoices: openInvoices.length,
        outstanding,
      })

      setLoading(false)
    }

    loadStats()
  }, [])

  const cards = [
    { label: 'Active Jobs', value: stats.activeJobs, icon: Wrench, color: 'text-amber-400' },
    { label: 'Customers', value: stats.customers, icon: Users, color: 'text-sky-400' },
    { label: 'Open Invoices', value: stats.openInvoices, icon: FileText, color: 'text-violet-400' },
    {
      label: 'Outstanding',
      value: loading ? '—' : `$${stats.outstanding.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-emerald-400',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Overview of Sunrise Handyman Services</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{label}</span>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="text-2xl font-semibold text-white">
              {loading && label !== 'Outstanding' ? '—' : value}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-medium text-white mb-2">Status</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Basic create & list is working for Customers, Jobs, and Invoices.
          Next we’ll add edit/delete actions and then wire up email + texting.
        </p>
      </div>
    </div>
  )
}