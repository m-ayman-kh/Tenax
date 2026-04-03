# 🏢 PropertyFlow

A full-stack **Building Finance Tracker** built entirely on **Google Apps Script**, designed to manage expenses, revenue, and tenant payments for a residential building with 20 units.

---

## 🌟 Features

- **Role-Based Access Control** — Three user roles: Admin, Editor, and Viewer (per-tenant)
- **Expense Tracking** — Log building expenses with categories, subcategories, and file attachments
- **Revenue Tracking** — Record rent and other income across multiple tenants and months
- **Live Dashboard** — Real-time financial overview including balance, totals, and a 20-unit payment matrix
- **Session Management** — Secure token-based sessions with 10-minute auto-expiry
- **Password Manager** — Admin panel to manage all user passwords without touching the code
- **File Attachments** — Upload receipts and documents directly to Google Drive per transaction
- **Mobile Friendly** — Fully responsive UI that works on phones and tablets

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Google Apps Script (JavaScript) |
| Frontend | Vanilla HTML, CSS, JavaScript (SPA) |
| Database | Google Sheets |
| File Storage | Google Drive |
| Auth | Token-based sessions via CacheService |
| Config | Script Properties (no hardcoded secrets) |

---

## 📁 Project Structure

```
PropertyFlow/
├── Code.txt            # Backend: routing, auth, data logic (Apps Script)
├── App.txt             # Main SPA shell with navigation
├── Dashboard.txt       # Financial dashboard + payment matrix
├── ExpenseForm.txt     # Expense entry form with attachments
├── RevenueForm.txt     # Revenue entry form (multi-tenant/month)
├── Login.txt           # Login page with session creation
└── PasswordManager.txt # Admin panel for managing passwords
```

> **Note:** Files use `.txt` extension for GitHub display. In Google Apps Script they are `.html` and `.gs` files.

---

## 🏗️ Architecture

```
User Browser
     │
     ▼
Google Apps Script Web App
     │
     ├── doGet()  → Serves HTML pages (Login / App / PasswordManager)
     └── doPost() → Handles all API actions
              │
              ├── Authentication (login, token validation)
              ├── Form Templates (expense, revenue, dashboard)
              ├── Data Submission (write to Google Sheets)
              ├── Dashboard Data (read + aggregate from Sheets)
              └── Password Management (Script Properties)
```

---

## 🔐 Security Design

- All passwords stored in **Google Script Properties** (not in code)
- Sessions managed via **CacheService** with UUID tokens
- Role enforcement on every API call server-side
- No sensitive data committed to this repository

---

## 🚀 How to Deploy

1. Open [Google Apps Script](https://script.google.com) and create a new project
2. Copy each `.txt` file into its corresponding Apps Script file (`.gs` or `.html`)
3. Set up your Google Sheet and update `SPREADSHEET_ID` and `PARENT_FOLDER_ID` in `Code.txt`
4. Go to **Project Settings → Script Properties** and set:
   - `MASTER_PASSWORD` — your admin password
5. Click **Deploy → New Deployment → Web App**
6. Set access to **"Anyone"** and copy the deployment URL

---

## 👤 Author

**Mohamed Ayman**
- GitHub: [@m-ayman-kh](https://github.com/m-ayman-kh)
- Linkedin: [@m-ayman-kh](https://www.linkedin.com/in/i-am-khalifa/)
