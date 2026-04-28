# PropertyFlow — Handoff Document
> Last updated: April 2026 | Stack: React (Vite) + Supabase + GitHub Pages

---

## 🚀 Live URLs
- **App**: https://m-ayman-kh.github.io/PropertyFlow/
- **Join page**: https://m-ayman-kh.github.io/PropertyFlow/join
- **GitHub repo**: https://github.com/m-ayman-kh/PropertyFlow
- **Supabase project**: https://supabase.com/dashboard/project/fzvukzhxtwmbrcdrhwkx

---

## 🏗️ Architecture
- **Frontend**: React 18 + Vite 8 + Tailwind CSS
- **Database**: Supabase (PostgreSQL) — project ID: fzvukzhxtwmbrcdrhwkx, region: eu-west-1
- **Auth**: Supabase email/password
- **File storage**: Google Drive via Supabase Edge Function
- **Deployment**: GitHub Pages via gh-pages branch, `npm run deploy`

---

## 📁 Project Structure

src/
├── lib/
│   ├── supabase.js          — Supabase client
│   └── compress.js          — Image compression (WhatsApp-style)
├── pages/
│   ├── Login.jsx            — Email/password login
│   ├── Join.jsx             — Access request form
│   ├── Dashboard.jsx        — 3 tabs: Overview, Matrices, Transactions
│   ├── ExpenseForm.jsx      — Expense entry with attachments
│   ├── RevenueForm.jsx      — Revenue entry, multi-tenant/month
│   └── Admin.jsx            — Super admin only: users, buildings, requests
├── components/
│   └── Layout.jsx           — Sticky header, bottom tab nav (auto-hide)
├── context/
│   └── AuthContext.jsx      — Auth state, profile, building
└── main.jsx                 — Routes + protected route logic

---

## 🗄️ Database Schema
| Table | Purpose |
|---|---|
| `buildings` | One row per building, config stored as JSONB |
| `building_months` | Each building's active month range |
| `profiles` | Extends auth.users — role, building_id, is_super_admin |
| `transactions` | All revenue + expense entries |
| `join_requests` | Access requests from new users |
| `categories` | Global default expense/revenue categories |

### Building config JSONB shape
```json
{
  "language": "ar",
  "beginning_balance": 50000,
  "total_units": 20,
  "currency": "EGP",
  "parking_slots": 5,
  "expense_categories": null,
  "revenue_categories": null
}
```
`null` = use global defaults from `categories` table.

---

## 👤 Roles
| Role | Access |
|---|---|
| `tenant` | Dashboard only (read) |
| `bookkeeper` | Dashboard + Expense + Revenue forms |
| `is_super_admin = true` | All of the above + Admin panel + building switcher |

---

## 🔐 Auth Flow
1. New user goes to `/join`, fills email + building + unit + message
2. Row created in `join_requests` with status `pending`
3. Super admin sees it in Admin panel → clicks Approve
4. `invite-user` Edge Function calls `supabase.auth.admin.inviteUserByEmail`
5. User gets email → sets password → logs in
6. Profile row created with correct role + building_id

---

## ⚡ Supabase Edge Functions
| Function | Purpose |
|---|---|
| `upload-to-drive` | Uploads files to Google Drive, returns shareable URL |
| `invite-user` | Invites new user via Supabase admin API, creates profile |

### Secrets set in Supabase
- `GOOGLE_SERVICE_ACCOUNT` — Google service account JSON
- `SITE_URL` — https://m-ayman-kh.github.io

---

## 📊 Dashboard
**Tab 1 — Overview**
- 4 stat cards: Beginning Balance, Total Revenue, Total Expenses, Current Balance
- Bar chart: Revenue vs Expenses per month (Recharts)
- AI Insights slot (placeholder, Phase 2)

**Tab 2 — Matrices**
- Monthly Debt matrix: 20 units × months, sticky first column, green/red paid/unpaid
- Parking matrix: configurable slots × months, filled = green unit badge, empty = —

**Tab 3 — Transactions**
- Last 50 transactions, scrollable table

---

## 📱 PWA Status
- `public/manifest.json` — configured
- `public/icons/` — SVG icons in 8 sizes (72 to 512px)
- `index.html` — manifest + apple meta tags added
- Service worker — NOT YET IMPLEMENTED (next step)

---

## 🔄 Deployment
```bash
npm run dev          # local dev server
npm run deploy       # build + push to gh-pages branch
```
After deploy, GitHub Actions builds and publishes automatically (~2 min).

---

## ✅ Completed Features
- [x] Auth (login, logout, session)
- [x] Role-based access (tenant, bookkeeper, super admin)
- [x] Protected routes
- [x] Multi-building support with building switcher (super admin)
- [x] Dashboard with 2 tabs (Overview, Matrices)
- [x] Monthly Debt matrix (sticky first column, horizontal scroll)
- [x] Parking matrix (configurable slots per building)
- [x] Bar chart (Revenue vs Expenses per month)
- [x] AI insights slot (placeholder)
- [x] Expense form with Google Drive attachments + image compression
- [x] Revenue form with multi-tenant/month selection + image compression
- [x] Admin panel (join requests, users, buildings)
- [x] Join page for access requests
- [x] SVG app icons + PWA manifest + service worker
- [x] Splash screen on app load
- [x] 404 fix for GitHub Pages
- [x] Log page (separate tab, accessible to all roles)
- [x] Log filters: type chips, category, sub-category, unit, month, date range
- [x] Bottom nav: Dashboard, Log, Expense, Revenue, Admin

---

## 🔲 Pending Features (Priority Order)
1. **Arabic RTL support** — per-building language toggle, full RTL layout
2. **AI insights panel** — Claude API via Supabase Edge Function (Phase 2)
3. **Fix hardcoded months** — read from `building_months` table instead of hardcoded 2026 array
4. **Fix hardcoded categories** — read from `categories` table + building config override
5. **Google Sheets sync** — Supabase webhook → Sheets for pivot analysis
6. **Capacitor** — wrap as native iOS/Android app
7. **WhatsApp notifications** — via WhatsApp Business API

---

## ⚠️ Known Issues / Decisions
- Expense/Revenue categories are hardcoded in JSX — should read from `categories` table + building config override
- `building_months` table exists but not yet used — months are hardcoded as 2026 array in forms
- Deno linter warnings in `invite-user/index.ts` — cosmetic only, function works
- Chunk size warning on build — acceptable for now, fix with dynamic imports later

---

## 🔑 Environment Variables
In `.env.local` (never committed):
VITE_SUPABASE_URL=https://fzvukzhxtwmbrcdrhwkx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

---

---

## 🧩 Key Code Patterns (mandatory context)

### Month format
- Stored in DB as: `date` type, first day of month e.g. `2026-01-01`
- Displayed in UI as: `MMM-YY` e.g. `Jan-26`
- Conversion function used everywhere: `fmtMonth(date)` in Dashboard.jsx
- In forms, months are hardcoded as: `2026-${String(i+1).padStart(2,'0')}-01`

### Colors (brand)
- Primary gradient: `#667eea → #764ba2`
- Revenue green: `#22c55e` (text), `#16a34a` (dark variant), `#dcfce7` (background)
- Expense red: `#f5576c` (text), `#dc2626` (dark), `#fee2e2` (background)
- Page background: `#f5f5f5`
- Card border: `0.5px solid #e0e0e0`

### Auth context usage
```jsx
const { user, profile, building, loading, signIn, signOut } = useAuth()
// profile.role → 'tenant' | 'bookkeeper'
// profile.is_super_admin → true | false
// profile.building_id → uuid
// building.config → { beginning_balance, total_units, parking_slots, language, currency }
```

### Building config access pattern
```jsx
const totalUnits = building?.config?.total_units || 20
const parkingSlots = building?.config?.parking_slots || 5
const beginningBalance = building?.config?.beginning_balance || 50000
```

### Supabase query pattern
```jsx
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .eq('building_id', profile.building_id)
  .order('date', { ascending: false })
```

### Google Drive upload pattern
```jsx
const { data, error } = await supabase.functions.invoke('upload-to-drive', {
  body: { fileName, fileType, fileData: base64, folder: `PropertyFlow/${building.name}` }
})
// returns { success: true, url: 'https://drive.google.com/...' }
```

### Image compression
```jsx
import { compressImage } from '../lib/compress'
const compressed = await compressImage(file) // max 1200px, 75% quality, images only
```

### Protected route logic
- Tenant → dashboard only, expense/revenue routes redirect to /dashboard
- Bookkeeper → dashboard + expense + revenue
- is_super_admin → everything + admin panel + building switcher in header

### Transaction structure
```js
{
  building_id, type: 'Revenue'|'Expense',
  date,        // entry date e.g. '2026-04-01'
  category,    // e.g. 'Rent', 'Maintenance'
  sub_category,// expenses only
  month,       // first of month e.g. '2026-01-01'
  tenant_unit, // string e.g. '7', null for expenses
  amount,      // positive for revenue, negative for expenses
  notes,
  attachment_urls, // string[] of Google Drive links
  created_by   // auth.users.id
}
```

### Matrix logic
- Monthly Debt matrix: revenue rows where category = 'Monthly Debt', tenant_unit × month
- Parking matrix: revenue rows where category = 'Parking', slots filled by order of entry

### Known hardcoded values to fix later
- Months array in forms hardcoded to 2026 — should read from `building_months` table
- Categories in forms hardcoded in JSX — should read from `categories` table + building config

---

---

## 🎯 Feature Backlog (for next conversation)

### 1. Arabic RTL + Translation (next up)
- Building config has `language: 'en' | 'ar'`
- Need: full RTL layout flip + Arabic UI labels for all pages
- Pages affected: Login, Join, Dashboard, Log, ExpenseForm, RevenueForm, Admin, Layout
- Approach: create `src/lib/i18n.js` with en/ar label maps, read language from `building.config.language`, set `dir="rtl"` on root div conditionally
- Arabic font: Cairo or Tajawal from Google Fonts

### 2. Fix Hardcoded Months
- Currently: months hardcoded as `2026-01-01` to `2026-12-01` in ExpenseForm and RevenueForm
- Should: read from `building_months` table filtered by `building_id`
- Table exists but no rows inserted yet — need UI in Admin panel to manage months per building
- Admin panel Buildings tab should have a "Manage Months" section: add month, remove month, mark active/inactive

### 3. Fix Hardcoded Categories
- Currently: `EXPENSE_CATEGORIES` and `REVENUE_CATEGORIES` hardcoded in ExpenseForm and RevenueForm
- Should: read from `categories` table (global defaults) + override from `building.config.expense_categories` and `building.config.revenue_categories` if not null
- Admin panel Buildings tab should allow adding custom categories per building

### 4. AI Insights Panel (Phase 2)
- Placeholder card already in Dashboard Overview tab
- Implementation: Supabase Edge Function `ai-insights` calls Claude API (claude-haiku-4-5-20251001)
- Input: last 60 days of transactions summarized as JSON
- Output: 3-4 plain English insight cards
- Cost: ~$0.001 per dashboard load
- API key stored as Supabase secret: `ANTHROPIC_API_KEY`

### 5. Google Sheets Sync
- Purpose: pivot analysis of transaction data in Sheets
- Approach: Supabase Database Webhook on `transactions` table INSERT → Edge Function → Google Sheets API
- Same Google Service Account already set up for Drive can be reused
- Target sheet: separate from the old GAS sheet

### 6. PWA Enhancements
- Add install prompt banner ("Add to Home Screen") for first-time visitors
- Test splash screen on iOS Safari
- Chrome PWA install currently not working — investigate

### 7. Capacitor (Phase 3)
- Wrap React app as native iOS/Android app
- Requires Apple Developer Account ($99/year) for iOS
- Google Play is $25 one-time

### 8. WhatsApp Notifications (Phase 3)
- Via WhatsApp Business API
- Use case: notify tenants when payment recorded, notify bookkeeper of new join requests
- Requires WhatsApp Business account approval

---

## 📋 Admin Panel — Pending Sections
Current Admin tabs: Join Requests, Users, Buildings
Still needed inside Buildings tab:
- Manage months (add/remove months per building)
- Manage custom categories per building
- Building config currently edited field by field — consider a cleaner settings form

---

## 🐛 Known Bugs / Issues
- Chrome PWA install not working on mobile (Edge works)
- Deno linter warnings in `invite-user/index.ts` — cosmetic only
- Chunk size warning on build — fix with dynamic imports later
- `building_months` table exists but unused
- Months in forms hardcoded to 2026
- Categories in forms hardcoded in JSX

---

## 👤 Author
Mohamed Ayman — [@m-ayman-kh](https://github.com/m-ayman-kh)