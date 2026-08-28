import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Job = {
  id: string
  title: string
  status: string
  scheduled_date: string | null
  scheduled_time: string | null
  customers?: any
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Calendar() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    async function loadJobs() {
      setLoading(true)
      const { data } = await supabase
        .from('jobs')
        .select('id, title, status, scheduled_date, scheduled_time, customers(name)')
        .not('scheduled_date', 'is', null)
        .order('scheduled_date', { ascending: true })

      if (data) setJobs(data)
      setLoading(false)
    }
    loadJobs()
  }, [])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthLabel = currentDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  })

  const jobsByDate = useMemo(() => {
    const map: Record<string, Job[]> = {}
    jobs.forEach((job) => {
      if (!job.scheduled_date) return
      if (!map[job.scheduled_date]) map[job.scheduled_date] = []
      map[job.scheduled_date].push(job)
    })
    return map
  }, [jobs])

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDate(null)
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDate(null)
  }

  function goToToday() {
    setCurrentDate(new Date())
    setSelectedDate(null)
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const selectedJobs = selectedDate ? jobsByDate[selectedDate] || [] : []

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Calendar</h1>
          <p className="text-slate-400 mt-1">Scheduled jobs by month</p>
        </div>
        <button
          onClick={goToToday}
          className="text-sm px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          Today
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-medium text-white">{monthLabel}</h2>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-6">
        <div className="grid grid-cols-7 border-b border-slate-800">
          {DAYS.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="min-h-[90px] border-b border-r border-slate-800/50" />
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayJobs = jobsByDate[dateStr] || []
            const isToday =
              day === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear()
            const isSelected = selectedDate === dateStr

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`min-h-[90px] p-2 border-b border-r border-slate-800/50 text-left transition-colors
                  hover:bg-slate-800/60
                  ${isSelected ? 'bg-amber-500/10' : ''}
                  ${isToday ? 'ring-1 ring-inset ring-amber-500/40' : ''}
                `}
              >
                <div
                  className={`text-sm font-medium mb-1 ${
                    isToday ? 'text-amber-400' : 'text-slate-300'
                  }`}
                >
                  {day}
                </div>

                <div className="space-y-1">
                  {dayJobs.slice(0, 2).map((job) => (
                    <div
                      key={job.id}
                      className="text-[11px] leading-tight px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 truncate"
                    >
                      {job.scheduled_time ? `${job.scheduled_time} · ` : ''}
                      {job.title}
                    </div>
                  ))}
                  {dayJobs.length > 2 && (
                    <div className="text-[11px] text-slate-500 px-1">
                      +{dayJobs.length - 2} more
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day details */}
      {selectedDate && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-sm font-medium text-slate-300">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </h3>
          </div>

          {loading ? (
            <div className="p-6 text-center text-slate-500 text-sm">Loading...</div>
          ) : selectedJobs.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">No jobs scheduled</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {selectedJobs.map((job) => (
                <div key={job.id} className="px-5 py-4">
                  <Link
                    to="/jobs"
                    className="font-medium text-white hover:text-amber-400 transition-colors"
                  >
                    {job.title}
                  </Link>
                  <div className="text-xs text-slate-400 mt-1">
                    {job.customers?.name || 'No customer'}
                    {job.scheduled_time && ` · ${job.scheduled_time}`}
                    {` · ${job.status}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}