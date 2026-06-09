# 🏢 Tenax

A modern property management web app built with React, Supabase, and deployed on GitHub Pages.

---

## 🌟 Features

- **Multi-building** — one platform, unlimited buildings, separated by building_id
- **Role-based access** — tenant (dashboard only), bookkeeper (forms + dashboard), super admin (everything)
- **Dashboard** — financial overview, revenue vs expense chart, payment matrices, transactions feed
- **Expense tracking** — categories, subcategories, multi-month, file attachments via Google Drive
- **Revenue tracking** — multi-tenant, multi-month, amount splits automatically
- **Parking matrix** — configurable slots per building, tracks who paid each month
- **Access requests** — tenants request via /join, super admin approves and invites
- **PWA ready** — installable on home screen, mobile-first design
- **Image compression** — client-side before upload

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 8 + Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase email/password |
| File Storage | Google Drive via Edge Function |
| Deployment | GitHub Pages |

---

## 🚀 Getting Started

```bash
npm install
npm run dev
```

Create `.env.local` in the root:

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

Deploy:
```bash
npm run deploy
```

---

## 👤 Author

Mohamed Ayman — [@m-ayman-kh](https://github.com/m-ayman-kh)