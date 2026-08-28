import express from 'express'
import cors from 'cors'
import { Resend } from 'resend'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'
import { google } from 'googleapis'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const twilioClient = twilio(
  process.env.TWILIO_API_KEY,
  process.env.TWILIO_API_SECRET,
  { accountSid: process.env.TWILIO_ACCOUNT_SID }
)

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'dist')))

// ----- Send Invoice -----
app.post('/api/send-invoice', async (req, res) => {
  try {
    const { to, customerName, amount, balance, jobTitle } = req.body
    if (!to) return res.status(400).json({ error: 'Missing recipient email' })

    const { data, error } = await resend.emails.send({
      from: 'Sunrise Handyman Services <glenn@sunrisesvcs.com>',
      to: [to],
      subject: 'Invoice from Sunrise Handyman Services',
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

// ----- Send Receipt (paid invoice) -----
app.post('/api/send-receipt', async (req, res) => {
  try {
    const { to, customerName, amount, amountPaid, jobTitle } = req.body
    if (!to) return res.status(400).json({ error: 'Missing recipient email' })

    const paid = Number(amountPaid ?? amount).toFixed(2)
    const total = Number(amount).toFixed(2)

    const { data, error } = await resend.emails.send({
      from: 'Sunrise Handyman Services <glenn@sunrisesvcs.com>',
      to: [to],
      subject: 'Payment Receipt – Sunrise Handyman Services',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #d97706; margin-bottom: 8px;">Sunrise Handyman Services</h2>
          <p style="font-size: 18px; font-weight: 600; color: #16a34a; margin: 0 0 16px;">Payment Received</p>
          
          <p>Hi ${customerName || 'there'},</p>
          <p>Thank you! We've received your payment${jobTitle ? ` for <strong>${jobTitle}</strong>` : ''}.</p>
          
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px;"><strong>Invoice Total:</strong> $${total}</p>
            <p style="margin: 0 0 8px;"><strong>Amount Paid:</strong> $${paid}</p>
            <p style="margin: 0; color: #16a34a; font-weight: 600;">Balance Due: $0.00</p>
          </div>

          <p>This email serves as your official receipt. Please keep it for your records.</p>
          <p>We appreciate your business!</p>
          
          <hr style="margin: 28px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #666; font-size: 12px; line-height: 1.5;">
            Sunrise Handyman Services<br/>
            glenn@sunrisesvcs.com<br/>
            (352) 634-1962
          </p>
        </div>
      `,
    })

    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true, id: data?.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to send receipt' })
  }
})

// ----- Send Estimate -----
app.post('/api/send-estimate', async (req, res) => {
  try {
    const { to, customerName, title, amount, requireDeposit, depositAmount, description, token } = req.body
    if (!to || !token) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const baseUrl = 'https://sunrise-app-web.onrender.com'
    const approveUrl = `${baseUrl}/api/estimate/approve?token=${token}`
    const declineUrl = `${baseUrl}/api/estimate/decline?token=${token}`

    const depositHtml = requireDeposit
      ? `<p><strong>Deposit required to schedule:</strong> $${Number(depositAmount).toFixed(2)}</p>`
      : ''

    const { data, error } = await resend.emails.send({
      from: 'Sunrise Handyman Services <glenn@sunrisesvcs.com>',
      to: [to],
      subject: `Estimate from Sunrise Handyman Services – ${title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #d97706;">Sunrise Handyman Services</h2>
          <p>Hi ${customerName || 'there'},</p>
          <p>Here is your estimate:</p>
          
          <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${title}</h3>
            ${description ? `<p>${description}</p>` : ''}
            <p style="font-size: 20px; font-weight: bold;">Total: $${Number(amount).toFixed(2)}</p>
            ${depositHtml}
          </div>

          <p>Please choose one of the options below:</p>

          <div style="margin: 30px 0;">
            <a href="${approveUrl}" style="background: #16a34a; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 12px;">Approve Estimate</a>
            <a href="${declineUrl}" style="background: #dc2626; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">Decline Estimate</a>
          </div>

          <p style="color: #666; font-size: 14px;">If the buttons don’t work, you can copy and paste these links:</p>
          <p style="font-size: 12px; color: #666;">Approve: ${approveUrl}<br/>Decline: ${declineUrl}</p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="color: #666; font-size: 12px;">
            Sunrise Handyman Services<br/>
            glenn@sunrisesvcs.com<br/>
            (352) 634-1962
          </p>
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
    res.status(500).json({ error: 'Failed to send estimate email' })
  }
})

// ----- On My Way Text -----
app.post('/api/on-my-way', async (req, res) => {
  try {
    const { to, customerName, jobTitle } = req.body

    if (!to) {
      return res.status(400).json({ error: 'Missing phone number' })
    }

    const message = await twilioClient.messages.create({
      body: `Hi ${customerName || 'there'}, this is Glenn from Sunrise Handyman Services. I'm on my way${jobTitle ? ` for your ${jobTitle} job` : ''} and should arrive within 30 minutes.\n\nFor questions, call or text (352) 634-1962.\n\nThis is an automated text — please do not reply to this number.\nReply STOP to opt out of future texts.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    })

    res.json({ success: true, sid: message.sid })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Failed to send text' })
  }
})

// ----- Job Scheduled Text & Calendar Sync -----
app.post('/api/job-scheduled', async (req, res) => {
  try {
    const { to, customerName, jobTitle, scheduledDate, scheduledTime } = req.body
    
    // 1. Sync to Google Calendar using GoogleAuth object structure
    try {
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim();
      let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
      
      // Auto-scrub accidental quotes and fix line breaks
      privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

      if (clientEmail && privateKey && process.env.GOOGLE_CALENDAR_ID && scheduledDate) {
        
        // This is the bulletproof way Google expects credentials now
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: clientEmail,
            private_key: privateKey,
          },
          scopes: ['https://www.googleapis.com/auth/calendar.events']
        });
        
        const calendar = google.calendar({ version: 'v3', auth });

        let startObj = { date: scheduledDate };
        let d = new Date(scheduledDate);
        d.setUTCDate(d.getUTCDate() + 1);
        let endObj = { date: d.toISOString().split('T')[0] };

        if (scheduledTime) {
          const match = scheduledTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (match) {
            let [_, h, m, ampm] = match;
            h = parseInt(h);
            if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
            if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
            
            const hourStr = h.toString().padStart(2, '0');
            startObj = { dateTime: `${scheduledDate}T${hourStr}:${m}:00`, timeZone: 'America/New_York' };
            
            let endH = h + 2;
            if (endH < 24) {
               const endHourStr = endH.toString().padStart(2, '0');
               endObj = { dateTime: `${scheduledDate}T${endHourStr}:${m}:00`, timeZone: 'America/New_York' };
            } else {
               startObj = { date: scheduledDate };
            }
          }
        }

        await calendar.events.insert({
          calendarId: process.env.GOOGLE_CALENDAR_ID.trim(),
          resource: {
            summary: `Sunrise: ${customerName}`,
            description: `Job: ${jobTitle || 'N/A'}`,
            start: startObj,
            end: endObj
          },
        });
        console.log("Calendar sync successful!");
      } else {
        console.log("Skipping Calendar Sync. Missing Variables.");
      }
    } catch (calErr) {
      console.error('Google Calendar error detail:', calErr.message || calErr);
    }

    // 2. Send Twilio Text
    if (!to) {
      return res.status(400).json({ error: 'Missing phone number' })
    }

    let whenPart = ''
    if (scheduledDate && scheduledTime) {
      whenPart = ` for ${scheduledDate} at ${scheduledTime}`
    } else if (scheduledDate) {
      whenPart = ` for ${scheduledDate}`
    }

    const message = await twilioClient.messages.create({
      body: `Hi ${customerName || 'there'}, this is Glenn from Sunrise Handyman Services. Your${jobTitle ? ` ${jobTitle}` : ''} job is scheduled${whenPart}.\n\nFor questions, call or text (352) 634-1962.\n\nThis is an automated text — please do not reply to this number.\nReply STOP to opt out of future texts.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    })

    res.json({ success: true, sid: message.sid })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Failed to send text' })
  }
})

// ----- Automated Reminders Text -----
app.post('/api/send-reminders', async (req, res) => {
  try {
    const tomorrow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
    tomorrow.setDate(tomorrow.getDate() + 1);
    const targetDate = tomorrow.toLocaleDateString("en-CA");

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, scheduled_time, customers(name, phone)')
      .eq('scheduled_date', targetDate)
      .eq('status', 'scheduled');

    if (error) throw error;
    if (!jobs || jobs.length === 0) return res.status(200).json({ message: 'No jobs' });

    for (const job of jobs) {
      const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
      if (!customer?.phone) continue;

      await twilioClient.messages.create({
        body: `Hi ${customer.name}, a reminder that Sunrise Handyman Services is scheduled for tomorrow at ${job.scheduled_time}. See you then!`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: customer.phone
      });

      await twilioClient.messages.create({
        body: `Automated reminder sent to ${customer.name} for tomorrow's job.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: process.env.MY_PERSONAL_PHONE 
      });
    }

    res.status(200).json({ success: true, count: jobs.length });
  } catch (error) {
    console.error('Reminder error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----- Approve Estimate -----
app.get('/api/estimate/approve', async (req, res) => {
  const token = req.query.token
  if (!token) return res.status(400).send('Missing token')

  try {
    const { data: estimate, error } = await supabase
      .from('estimates')
      .select('*')
      .eq('public_token', token)
      .single()

    if (error || !estimate) {
      return res.status(404).send('Estimate not found or link is invalid.')
    }

    if (estimate.status === 'approved') {
      return res.send(`
        <html><body style="font-family: sans-serif; text-align: center; padding: 60px;">
          <h2>Already Approved</h2>
          <p>This estimate was already approved.</p>
        </body></html>
      `)
    }

    await supabase
      .from('estimates')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', estimate.id)

    res.send(`
      <html><body style="font-family: sans-serif; text-align: center; padding: 60px;">
        <h2 style="color: green;">Estimate Approved</h2>
        <p>Thank you. We have received your approval and will contact you shortly to schedule the work.</p>
      </body></html>
    `)
  } catch (err) {
    console.error(err)
    res.status(500).send('Something went wrong. Please try again or call us.')
  }
})

// ----- Decline Estimate -----
app.get('/api/estimate/decline', async (req, res) => {
  const token = req.query.token
  if (!token) return res.status(400).send('Missing token')

  try {
    const { data: estimate, error } = await supabase
      .from('estimates')
      .select('*')
      .eq('public_token', token)
      .single()

    if (error || !estimate) {
      return res.status(404).send('Estimate not found or link is invalid.')
    }

    await supabase
      .from('estimates')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', estimate.id)

    if (estimate.customer_id) {
      await supabase
        .from('customers')
        .update({
          do_not_service: true,
          do_not_service_reason: 'Declined estimate'
        })
        .eq('id', estimate.customer_id)
    }

    res.send(`
      <html><body style="font-family: sans-serif; text-align: center; padding: 60px;">
        <h2>Estimate Declined</h2>
        <p>Thank you for letting us know. This estimate has been closed.</p>
      </body></html>
    `)
  } catch (err) {
    console.error(err)
    res.status(500).send('Something went wrong. Please try again or call us.')
  }
})

// Fallback – serve the React app
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})