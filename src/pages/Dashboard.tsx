import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [stats, setStats] = useState({ todayJobs: 0, pendingEstimates: 0, totalCustomers: 0 })
  const [todaysJobs, setTodaysJobs] = useState<any[]>([])
  const [upcomingJobs, setUpcomingJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      // Get today's date in YYYY-MM-DD format for Eastern Time
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

      // Fetch Today's Scheduled Jobs
      const { data: todayData } = await supabase
        .from('jobs')
        .select('*, customers(name, phone)')
        .eq('scheduled_date', today)
        .eq('status', 'scheduled')
        .order('scheduled_time', { ascending: true })

      // Fetch Upcoming Scheduled Jobs (Next 5)
      const { data: upcomingData } = await supabase
        .from('jobs')
        .select('*, customers(name)')
        .gt('scheduled_date', today)
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true })
        .limit(5)

      // Fetch Pending Estimates Count
      const { count: estimatesCount } = await supabase
        .from('estimates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // Fetch Total Customers Count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      setTodaysJobs(todayData || [])
      setUpcomingJobs(upcomingData || [])
      setStats({
        todayJobs: todayData?.length || 0,
        pendingEstimates: estimatesCount || 0,
        totalCustomers: customersCount || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-6 text-slate-400">Loading command center...</div>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Overview</h1>
        <p className="text-slate-400 mt-1">Your daily command center</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 border-l-4 border-l-blue-500">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Jobs Today</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.todayJobs}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 border-l-4 border-l-orange-500">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Pending Estimates</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.pendingEstimates}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 border-l-4 border-l-green-500">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Customers</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.totalCustomers}</p>
        </div>
      </div>

      {/* Schedules Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Today's Schedule */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-300">Today's Schedule</h2>
          </div>
          <div className="p-6">
            {todaysJobs.length === 0 ? (
              <p className="text-slate-500 text-sm">No jobs scheduled for today. Enjoy the downtime!</p>
            ) : (
              <ul className="space-y-3">
                {todaysJobs.map(job => (
                  <li key={job.id} className="flex justify-between items-center p-4 bg-slate-950/50 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                    <div>
                      <p className="font-medium text-white">{job.title || 'Service Call'}</p>
                      <p className="text-xs text-slate-400 mt-1">{job.customers?.name} • {job.scheduled_time}</p>
                    </div>
                    <Link to={`/jobs`} className="text-amber-500 text-sm font-medium hover:text-amber-400 transition-colors">View Job</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Upcoming Jobs */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-300">Upcoming Jobs</h2>
          </div>
          <div className="p-6">
            {upcomingJobs.length === 0 ? (
              <p className="text-slate-500 text-sm">No upcoming jobs scheduled yet.</p>
            ) : (
              <ul className="space-y-3">
                {upcomingJobs.map(job => (
                  <li key={job.id} className="flex justify-between items-center p-4 bg-slate-950/50 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                    <div>
                      <p className="font-medium text-white">{job.title || 'Service Call'}</p>
                      <p className="text-xs text-slate-400 mt-1">{job.customers?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{new Date(job.scheduled_date).toLocaleDateString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}