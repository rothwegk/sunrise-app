import express from 'express'
import cors from 'cors'
import { Resend } from 'resend'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ethknhjrhdpcjstkquby.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.RESEND_API_KEY // temporary – we’ll fix this
)

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'dist')))

// ---------- Send Invoice (existing) ----------
app.post('/api/send-invoice', async (req, res) => {
  try {
    const { to, customerName, amount, balance, jobTitle } = req.body
    if (!to) return res.status(400).json({ error: 'Missing recipient email' })

    const { data, error } = await resend.emails.send({
      from: 'Sunrise Handyman Services <glenn@sunrisesvcs.com>',
      to: [to],
      subject: `Invoice from Sunrise Handyman Services`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Sunrise Handyman Services</h2>
          <p>Hi ${customerName || 'there'},</p>
          <p>Here is your invoice${jobTitle ? ` for <strong>${jobTitle}</strong>` : ''}:</p>
          <p style="font-size: 18px;"><strong>Total: $${Number(amount).toFixed(2)}</strong></p>
          ${balance > 0 ? `<p>Balance due: <strong>$${Number(balance).toFixed(2)}</strong></p>` : `<p>Status: <strong>Paid</strong></p>`}
          <p>Thank you for your business!</p>
          <hr />
          <p style="color: #666; font-size: 12px;">Sunrise Handyman Services<br/>glenn@sunrisesvcs.com</p>
        </div>
      `,
    })

    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true, id: data?.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to send email' })
  }
})

// ---------- NEW: Approve Estimate ----------
app.get('/api/estimate/approve', async (req, res) => {
  const token = req.query.token
  if (!token) return res.status(400).send('Missing token')

  // We’ll finish the real logic in the next step
  res.send(`
    <html><body style="font-family: sans-serif; text-align: center; padding: 60px;">
      <h2>Estimate Approved</h2>
      <p>Thank you. We have received your approval and will be in touch shortly.</p>
    </body></html>
  `)
})

// ---------- NEW: Decline Estimate ----------
app.get('/api/estimate/decline', async (req, res) => {
  const token = req.query.token
  if (!token) return res.status(400).send('Missing token')

  res.send(`
    <html><body style="font-family: sans-serif; text-align: center; padding: 60px;">
      <h2>Estimate Declined</h2>
      <p>Thank you for letting us know. This estimate has been closed.</p>
    </body></html>
  `)
})

// Fallback
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})