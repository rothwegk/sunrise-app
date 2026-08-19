import express from 'express'
import cors from 'cors'
import { Resend } from 'resend'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const resend = new Resend(process.env.RESEND_API_KEY)

app.use(cors())
app.use(express.json())

// Serve the built frontend
app.use(express.static(path.join(__dirname, 'dist')))

// Send invoice email
app.post('/api/send-invoice', async (req, res) => {
  try {
    const { to, customerName, amount, balance, jobTitle } = req.body

    if (!to) {
      return res.status(400).json({ error: 'Missing recipient email' })
    }

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

    if (error) {
      console.error(error)
      return res.status(500).json({ error: error.message })
    }

    res.json({ success: true, id: data?.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to send email' })
  }
})

// Fallback to frontend for any other route
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})