# PulseShift

PulseShift is a multi-tenant healthcare scheduling SaaS for managing shift requests, PTO, sick leave, approvals, workspace plans, and AI-assisted staffing decisions.

This version uses Supabase instead of local SQLite while keeping the existing Express API and frontend flow intact.

## What PulseShift Does

- Staff users submit work, PTO, and sick requests
- Admin users review and approve requests from a centralized queue
- Organizations are isolated as separate workspaces
- Plan tiers enforce request volume and AI credit usage per workspace
- Gemini-powered checks help flag staffing pressure before submission
- Gemini-powered response drafting helps admins communicate decisions faster

## Stack

- Frontend: React 19, TypeScript, Vite
- Styling: Tailwind CDN + custom CSS
- Backend: Express
- Database: Supabase Postgres via `@supabase/supabase-js`
- Auth: App-managed JWT + bcrypt
- AI: Google Gemini through a server-side proxy

## Architecture

### Frontend

- `App.tsx`: session bootstrap, workspace hydration, request lifecycle, view switching
- `components/Layout.tsx`: SaaS shell, metrics, usage, workspace switching
- `components/Calendar.tsx`: dispatch/day and annual calendar views
- `components/AdminPanel.tsx`: approval queue
- `components/MyShifts.tsx`: self-service request history
- `components/RequestModal.tsx`: request creation/editing with AI checks
- `components/PlanModal.tsx`: plan comparison and billing CTA

### Backend

- `../pulseshift-server/server.js`: API routes, auth, tenant enforcement, request CRUD, AI proxy, Supabase-backed seed bootstrap
- `../pulseshift-server/supabase.js`: Supabase server client configuration

### Database

- `../pulseshift-server/supabase/schema.sql`: schema you run in Supabase before starting the API

## Supabase Data Model

PulseShift stores application data in four main tables:

- `organizations`: workspace plan, limits, seats, timezone, trial metadata
- `users`: app users, password hashes, profile metadata
- `memberships`: user-to-organization role mapping
- `requests`: per-user staffing requests scoped to an organization

## Migration Change

The app now uses Supabase instead of the previous SQLite database layer.

What changed:

- Removed local `better-sqlite3` persistence
- Added a dedicated Supabase server client
- Replaced synchronous SQL queries with async Supabase queries
- Added `../pulseshift-server/supabase/schema.sql` for database setup
- Kept the current Express routes and JWT auth model stable
- Preserved seeded demo accounts by auto-seeding empty Supabase tables at startup

## Local Setup

### Prerequisites

- Node.js 18+
- npm
- A Supabase project

### 1. Install dependencies

```bash
npm install
```

### 2. Create Supabase tables

Open your Supabase project SQL editor and run:

```sql
-- paste the contents of ../pulseshift-server/supabase/schema.sql
```

Or copy/paste the file directly from:

- `../pulseshift-server/supabase/schema.sql`

### 3. Configure environment variables

Create `.env.local` for frontend development:

```bash
VITE_API_URL=http://localhost:4000
```

Export backend variables in the same shell where you start the API:

```bash
JWT_SECRET=replace-this-for-local-development
CORS_ORIGIN=http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=
```

Example:

```bash
export JWT_SECRET="replace-this-for-local-development"
export CORS_ORIGIN="http://localhost:3000"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export GEMINI_API_KEY=""
```

You can also keep the same values in `.env.example` as a reference file, but the backend still needs those variables exported into the process environment unless you use an external env loader.

Frontend environment variable:

```bash
VITE_API_URL=http://localhost:4000
```

Important:

- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only
- do not expose the service role key in the browser
- `GEMINI_API_KEY` is optional; AI routes fall back gracefully when it is missing

### 4. Start the backend

```bash
npm run dev:server
```

On first startup, the API checks that the Supabase tables exist and seeds demo data if the tables are empty.

### 5. Start the frontend

```bash
npm run dev:client
```

Frontend: `http://localhost:3000`  
Backend: `http://localhost:4000`

## Demo Accounts

The backend seeds demo tenants automatically when the `users` table is empty.

### Summit Health Network

- Admin: `bruce@summit.com` / `password123`
- Nurse: `jake@summit.com` / `password123`

### Lumen Home Care

- Admin: `carla@lumen.com` / `password123`
- Nurse: `devon@lumen.com` / `password123`

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | frontend | Base URL for the Express API |
| `JWT_SECRET` | backend | Signs app JWTs |
| `CORS_ORIGIN` | backend | Allowed frontend origin(s) |
| `SUPABASE_URL` | backend | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | Elevated server-side database access |
| `GEMINI_API_KEY` | optional | Enables AI analysis and response drafting |

## API Surface

### Auth

- `POST /auth/signup`
- `POST /auth/login`
- `GET /me`

### Workspace Data

- `GET /orgs/:orgId/full`
- `GET /orgs/:orgId/requests`
- `POST /orgs/:orgId/requests`
- `PUT /orgs/:orgId/requests/:requestId`
- `DELETE /orgs/:orgId/requests/:requestId`

### AI

- `POST /ai/analyze`
- `POST /ai/respond`

### Health

- `GET /health`

## Usage and Plan Logic

Three plan tiers are modeled in the backend:

| Tier | Request Limit | AI Credits |
| --- | ---: | ---: |
| `ESSENTIALS` | 40 | 0 |
| `TEAM` | 120 | 80 |
| `BUSINESS` | 500 | 200 |

Rules enforced server-side:

- workspace request limits
- workspace AI credit limits
- per-user uniqueness for one request per org/date
- role-based admin approval permissions
- membership checks for every organization-scoped route

## Supabase Notes

- PulseShift uses Supabase as the database layer, not as the auth provider
- The app still manages its own JWT sessions and bcrypt password hashes
- The backend uses the service-role key because all database access is mediated by the server
- `../pulseshift-server/supabase/schema.sql` enables RLS on tables, but the service-role key bypasses RLS for trusted backend access

## Useful Scripts

```bash
npm run dev:client
npm run dev:server
npm run build
npm run check
npm run preview
```

## Project Structure

```text
.
├── .env.example
├── App.tsx
├── components/
│   ├── AdminPanel.tsx
│   ├── Calendar.tsx
│   ├── Layout.tsx
│   ├── MyShifts.tsx
│   ├── PlanModal.tsx
│   └── RequestModal.tsx
├── ../pulseshift-server/
│   ├── server.js
│   ├── supabase.js
│   └── supabase/
│       └── schema.sql
├── services/
│   ├── api.ts
│   └── gemini.ts
├── index.css
├── index.html
├── package.json
├── README.md
└── types.ts
```

## Known Gaps

- No Stripe or subscription billing integration yet
- No email delivery or notifications yet
- No enterprise SSO or SCIM yet
- No automated tests yet
- No deployment manifests yet
- No transactional signup workflow beyond simple server-side rollback cleanup

## Recommended Next Steps

1. Add automated tests for auth, membership enforcement, and request CRUD.
2. Add database migrations or Supabase CLI workflow for schema versioning.
3. Move signup and multi-step writes into Postgres functions or transactional workflows.
4. Add notification delivery for approvals and rejections.
5. Introduce real billing and subscription management.

## Summary

PulseShift now uses Supabase as its hosted database layer while keeping the app’s current multi-tenant scheduling workflow, plan enforcement, AI features, and frontend UX intact.
