# BloodLink

**Connecting Donors. Saving Lives.**

BloodLink is a web platform that connects verified hospitals with potential
blood donors during urgent blood requirements. It is a **college project and
academic prototype**, not a production medical service.

## Important limitations

- BloodLink is a donor discovery and coordination tool. It is **not a blood
  bank** and does not collect, test, store or distribute blood.
- It does not decide medical eligibility. All screening and final decisions
  are made by qualified professionals at healthcare facilities.
- Blood group compatibility rules (`backend/src/config/compatibility.js`) are an
  academic simplification and **must be reviewed by qualified blood-bank
  professionals** before any real use.
- SMS and email notifications are **simulated** and only logged in the database.
  Nothing is actually sent.
- All demo data is fictional.

## Features

- Donor, hospital and admin roles with role-based access control
- Registration and login with hashed passwords and JWT tokens
- Hospital verification by an administrator, with audit logging
- Donor profile, availability and consent-based approximate location
  (rounded to about 1 km, exact GPS is never stored)
- Verified hospitals create blood requests (component, group, units, urgency, time)
- Donor matching by compatibility, availability, consent and distance, with an
  expanding radius (5, 10, 20, 50 km)
- Donors accept or decline; hospitals track each donor through the process
- Donor name and phone are shared with the hospital only after the donor accepts

## Tech stack

- Frontend: React, Vite, React Router, Axios, Lucide icons
- Backend: Node.js, Express
- Database: PostgreSQL (hosted on Supabase)

## Project structure

```
BloodLink/
├── backend/     Express API, database scripts
└── frontend/    React app
```

## Setup

### 1. Requirements

Node.js (LTS version) and a free Supabase account.

### 2. Database

1. Create a Supabase project.
2. In the Supabase **SQL Editor**, run `backend/database/schema.sql`, then
   `backend/database/stage8.sql`.
3. Click **Connect** in Supabase and copy the **Session pooler** connection string.

### 3. Backend

```bash
cd backend
npm install
```

Copy `.env.example` to a new file named `.env` and fill in your values
(`DATABASE_URL` with your real password, and a long random `JWT_SECRET`). Then:

```bash
node database/seed.js
npm run dev
```

The API runs at http://localhost:5000 (health check: `/api/health/db`).

### 4. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Demo accounts (fictional)

| Role | Email | Password |
|---|---|---|
| Admin | admin@bloodlink.demo | Admin@12345 |
| Donor | donor@bloodlink.demo | Demo@12345 |
| Verified hospital | hospital@bloodlink.demo | Demo@12345 |
| Pending hospital | pending@bloodlink.demo | Demo@12345 |

These accounts are for demonstration only. Never reuse these passwords.

## Security notes

- Secrets live only in `backend/.env`, which is not committed.
- Passwords are hashed with bcrypt. Routes are protected by role.
- Input validation, parameterised SQL queries, rate limiting and security
  headers (helmet) are used.
- Row Level Security is enabled on all tables; data is accessed only through
  the backend.