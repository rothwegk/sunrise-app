# Sunrise Handyman Services – App Skeleton

Custom job & invoicing app for Sunrise Handyman Services.

## Current Status
Clean skeleton with dark theme and sidebar navigation.

### Pages
- **Dashboard** – overview stats (placeholder)
- **Jobs** – job list + “New Job” button
- **Customers** – customer directory
- **Invoices** – invoice list with status filters (supports future deposits/partial payments)
- **Settings** – business info, logo upload placeholder, and integration status (Supabase / Resend / Twilio / Gmail Calendar)

## Tech
- Vite + React + TypeScript
- Tailwind CSS v4
- React Router
- Lucide icons

## Run locally
```bash
cd sunrise-handyman-app
npm install
npm run dev
```

Then open the URL shown (usually http://localhost:5173).

## Next steps
1. Connect Supabase for real data
2. Wire Resend for emails from glenn@sunrisesbcs.com
3. Wire Twilio for “On my way” texts
4. Add logo upload and invoice PDF generation
5. Deploy to Render
