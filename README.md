# PlacementX

## Prepare Smarter. Get Placement Ready.

PlacementX is a full-stack placement-readiness platform for B.Tech students. It brings structured DSA practice, aptitude preparation, company preparation, resume analysis, text-based mock interviews, and evidence-based readiness into one focused workspace.

## Problem statement

Placement preparation is usually fragmented across coding sites, notes, resume tools, interview resources, and company research. PlacementX gives students a single view of their real preparation activity and the next practical action that improves readiness.

## Current features

- Student registration, login, JWT session restoration, logout, and profile onboarding
- Placement dashboard with real backend-derived progress, activity, and recommendations
- DSA questions, filters, details, bookmarks, attempts, and solved progress
- Aptitude practice with server-evaluated answers, explanations, accuracy, and weak topics
- Company directory, company detail, and evidence-based company readiness
- PDF-only resume analysis with structured findings, history, and deletion
- Text-based HR, Technical, and Mixed mock interviews with persisted answers and deterministic feedback
- Central placement-readiness breakdown with missing-category handling and actionable recommendations
- Role-protected admin workspace for users and preparation content

## Technology stack

- Frontend: React, Vite, React Router, Tailwind CSS, Axios, Lucide React, Framer Motion, React Hot Toast, Recharts
- Backend: Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, Multer, pdf-parse
- Tooling: ESLint, Node test runner, Nodemon

## Architecture overview

```text
React + Vite client
  ├─ route-level pages, role guards, reusable UI primitives
  ├─ Axios API services and JWT request interceptor
  └─ Student and admin workspaces
        │
        ▼
Express REST API (/api/v1)
  ├─ routes → middleware → controllers → services → Mongoose models
  ├─ JWT authentication and student/admin authorization
  └─ MongoDB persistence
```

## Project structure

```text
PlacementX/
├─ client/                 # React/Vite frontend
│  └─ src/
│     ├─ api/              # API service modules
│     ├─ components/       # UI and layout primitives
│     ├─ features/auth/    # Auth state and services
│     ├─ pages/            # Student and admin pages
│     └─ routes/           # Route guards
├─ server/                 # Express REST API
│  ├─ src/
│  │  ├─ controllers/ middleware/ models/ routes/ services/
│  │  ├─ config/ utils/ seeds/
│  │  └─ app.js, localServer.js
│  └─ tests/
├─ .gitignore
└─ README.md
```

## Local installation

Prerequisites: Node.js 20+, npm, and a MongoDB deployment reachable from the machine running the server.

```bash
cd server
npm install

cd ../client
npm install
```

## Environment setup

Copy the templates; do not commit real environment files.

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

### Server variables

```env
PORT=4000
NODE_ENV=development
MONGODB_URI=<your-mongodb-uri>
CLIENT_URL=http://localhost:5173
JWT_SECRET=<long-random-secret>
JWT_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=500
AUTH_RATE_LIMIT_MAX=20
```

`MONGODB_URL` is also accepted by the current server for legacy compatibility, but new environments should use `MONGODB_URI`.

### Client variable

```env
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

## Commands

### Server

```bash
cd server
npm run dev       # development server
npm start         # production-style server
npm run seed      # development seed; blocked when NODE_ENV=production
npm run lint
npm test
```

### Client

```bash
cd client
npm run dev
npm run lint
npm run build
npm run preview
```

## Vercel deployment preparation

Use two Vercel projects connected to this repository. Set the frontend project Root Directory to `client` (Vite build command `npm run build`, output directory `dist`) and the backend Root Directory to `server` (Express entry `src/app.js`). `src/localServer.js` is only for local `npm run dev` and `npm start`; it is not the serverless handler. Do not run either seed command as a build step.

Configure these **backend project** environment variables for production: `MONGODB_URI`, `CLIENT_URL` (the exact frontend origin, without a trailing slash), `JWT_SECRET`, `JWT_EXPIRES_IN`, and `NODE_ENV=production`. `PORT` is only used by the local listener. Optional variables used by the current code are `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`, `MENTOR_RATE_LIMIT_MAX`, `CODE_EXECUTION_PROVIDER_URL`, `CODE_EXECUTION_PROVIDER_TOKEN`, `AI_PROVIDER`, and `AI_API_KEY`. The current AI provider is a stub and returns deterministic fallback guidance; setting AI variables alone does not enable an external model. Keep all credentials in Vercel project settings, never in the repository.

Leave `VITE_API_BASE_URL` unset in the **frontend project** so the client uses `/api/v1`. The committed `client/vercel.json` already supports SPA refreshes and excludes `/api/*` from the SPA fallback. Vercel's static rewrite destination needs a real absolute backend URL, so after the backend project has a stable production domain, insert this rule **first** in `client/vercel.json` and redeploy the client:

```json
{ "source": "/api/:path*", "destination": "https://<actual-backend-domain>/api/:path*" }
```

Replace `<actual-backend-domain>` with the domain assigned to the backend project; do not use the placeholder as a deployment value. Until this rule is added, frontend `/api/*` requests intentionally do not resolve to the backend. Configure Atlas network access for Vercel outbound connections and select a backend Function region near the Atlas cluster. Verify `/api/v1/health`, login, an authenticated database endpoint, direct SPA navigation, and a PDF upload below 4 MB after deployment.

Local development continues to use `VITE_API_BASE_URL=http://localhost:4000/api/v1`. Vercel functions reuse a cached Mongoose connection across warm requests and initialize it before database-backed routes; `/api/v1/health` does not connect to MongoDB.

## Major API modules

- `/api/v1/auth` — authentication and current user
- `/api/v1/profile` — student profile and completion
- `/api/v1/dashboard` and `/api/v1/readiness` — aggregated progress/readiness
- `/api/v1/dsa` and `/api/v1/aptitude` — preparation questions and progress
- `/api/v1/companies` — company preparation and readiness
- `/api/v1/resumes` — PDF resume analysis and history
- `/api/v1/interviews` — text mock interview lifecycle
- `/api/v1/admin` — protected administration APIs

See [server/API.md](server/API.md) for endpoint details and a Postman testing order.

## Security highlights

- Passwords are hashed with bcrypt and excluded from normal API responses.
- JWTs protect private APIs; student/admin authorization is enforced server-side.
- Ownership checks protect resumes and interviews.
- Resume uploads are PDF-only, size-limited to 4 MB, validated by file signature, and processed in memory.
- Production seeding is blocked.
- Helmet security headers and configurable general/auth API rate limits are enabled.
- Production startup requires MongoDB, CORS, and JWT environment variables; CORS only permits configured `CLIENT_URL` origins.
- `.env` files, logs, build output, uploads, and dependencies are ignored by Git.

## Future scope — not currently implemented

- AI-enhanced interview feedback
- Voice and video interviews
- Coding assessments/compiler
- Job matching
- Placement-cell dashboard
- Recruiter portal
- Notifications
- Gamification

## License

This project is intended as an academic and portfolio-ready placement platform.
