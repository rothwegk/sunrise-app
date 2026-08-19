import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('business_settings')
        .select('*')
        .eq('id', 1)
        .single()

      if (data) {
        setBusinessName(data.business_name || '')
        setEmail(data.email || '')
        setPhone(data.phone || '')
        setAddress(data.address || '')
        setLogoUrl(data.logo_url || '')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('business_settings')
      .update({
        business_name: businessName,
        email,
        phone,
        address,
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    setSaving(false)

    if (error) {
      setMessage('Error saving: ' + error.message)
    } else {
      setMessage('Saved successfully')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage('')

    const fileExt = file.name.split('.').pop()
    const fileName = `logo-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      setMessage('Upload failed: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(fileName)
    const publicUrl = data.publicUrl

    setLogoUrl(publicUrl)

    // also save it immediately
    await supabase
      .from('business_settings')
      .update({ logo_url: publicUrl })
      .eq('id', 1)

    setUploading(false)
    setMessage('Logo uploaded')
    setTimeout(() => setMessage(''), 3000)
  }

  if (loading) {
    return <div className="text-slate-400">Loading settings...</div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Business info and preferences</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-medium text-amber-400 mb-4">Business Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Business Name</label>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
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
              <label className="block text-xs text-slate-400 mb-1.5">Phone (for calls)</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Business Address</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </section>

        {/* Logo Upload */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-medium text-amber-400 mb-4">Company Logo</h2>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-slate-500">No logo</span>
              )}
            </div>
            <div>
              <label className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-sm text-white px-4 py-2 rounded-lg cursor-pointer transition-colors">
                {uploading ? 'Uploading...' : 'Upload Logo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-slate-500 mt-2">PNG or JPG recommended</p>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-medium text-sm px-5 py-2.5 rounded-lg"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {message && <span className="text-sm text-emerald-400">{message}</span>}
        </div>
      </form>
    </div>
  )
}