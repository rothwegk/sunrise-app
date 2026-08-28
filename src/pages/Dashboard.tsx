import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
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

  if (loading) return <div className="p-6">Loading command center...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Overview</h1>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-500 uppercase">Jobs Today</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.todayJobs}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-orange-500">
          <p className="text-sm font-medium text-gray-500 uppercase">Pending Estimates</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingEstimates}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-500 uppercase">Total Customers</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCustomers}</p>
        </div>
      </div>

      {/* Schedules Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Today's Schedule */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">Today's Schedule</h2>
          </div>
          <div className="p-6">
            {todaysJobs.length === 0 ? (
              <p className="text-gray-500">No jobs scheduled for today. Enjoy the downtime!</p>
            ) : (
              <ul className="space-y-4">
                {todaysJobs.map(job => (
                  <li key={job.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <p className="font-bold text-gray-900">{job.title || 'Service Call'}</p>
                      <p className="text-sm text-gray-600">{job.customers?.name} • {job.scheduled_time}</p>
                    </div>
                    <Link to={`/jobs/${job.id}`} className="text-blue-600 text-sm font-medium hover:underline">View Job</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Upcoming Jobs */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">Upcoming Jobs</h2>
          </div>
          <div className="p-6">
            {upcomingJobs.length === 0 ? (
              <p className="text-gray-500">No upcoming jobs scheduled yet.</p>
            ) : (
              <ul className="space-y-4">
                {upcomingJobs.map(job => (
                  <li key={job.id} className="flex justify-between items-center border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-900">{job.title || 'Service Call'}</p>
                      <p className="text-sm text-gray-500">{job.customers?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{job.scheduled_date}</p>
                      <Link to={`/jobs/${job.id}`} className="text-blue-600 text-xs hover:underline">Details</Link>
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