import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Navigation } from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { supabase } from '../lib/supabase'

type Customer = {
  id: string
  name: string
}

type Job = {
  id: string
  title: string
  description: string | null
  status: string
  scheduled_date: string | null
  customer_id: string | null
  customers?: { name: string } | null
  created_at: string
}

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
  const [status, setStatus] = useState('scheduled')

  async function loadData() {
    setLoading(true)
    const [jobsRes, customersRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('*, customers(name)')
        .order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name').order('name'),
    ])
    if (jobsRes.data) setJobs(jobsRes.data)
    if (customersRes.data) setCustomers(customersRes.data)
    setLoading(false)
  }

  function openNewForm() {
    setEditingId(null)
