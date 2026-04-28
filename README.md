# Alumni Influencers Platform

**Phantasmagoria Ltd × University of Eastminster**  
A dual-server web platform that transforms the university's alumni network into a real-time curriculum intelligence engine through a sponsorship and blind bidding economy.

---

## Project Structure

```
Alumni-Influence-Hub/
├── app.js                  # Backend entry point (port 3000)
├── db.js                   # In-memory database — 18 collections, 8 Map indexes
├── .env                    # Environment variables (copy from .env.example)
├── .env.example            # Template — all variables documented
├── src/
│   ├── routes/             # 14 route files — auth, bids, profile, charts, etc.
│   ├── controllers/        # 11 controllers — business logic layer
│   ├── models/             # User, Bid, Profile, Token, Session, ApiKey
│   ├── middleware/         # Auth, validation, rate limiting, error handler
│   └── utils/
│       ├── swagger.js      # OpenAPI 3.0 spec — served at /api-docs
│       └── email.js        # Nodemailer transporter
├── public/                 # CW1 frontend SPA (served by backend)
│   ├── index.html
│   ├── app.js
│   └── style.css
├── client/                 # CW2 analytics dashboard (separate server, port 3001)
│   ├── index.js            # Client server entry point
│   ├── lib/boot.js         # Auto-loads controllers, maps routes
│   ├── controllers/        # Proxy controllers — inject API key server-side
│   └── public/             # Dashboard SPA
│       ├── app.js
│       └── style.css
└── uploads/                # Profile photo storage (must exist before start)
```

---

## Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher

Check your versions:

```bash
node --version
npm --version
```

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-username/Alumni-Influence-Hub.git
cd Alumni-Influence-Hub
```

### 2. Install backend dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and update any values you need. The defaults work for local development without any changes.

### 4. Create the uploads directory

```bash
mkdir -p uploads
```

### 5. Start the backend server

```bash
npm start
```

The backend starts on **http://localhost:3000**

You should see:

```
Alumni Influencers API → http://localhost:3000
Swagger Docs          → http://localhost:3000/api-docs
Environment: development
Database seeded — 19 alumni, 37 certifications, 34 employment records
```

### 6. Install client dependencies (CW2 dashboard)

Open a second terminal:

```bash
cd client
npm install
```

### 7. Set up client environment variables

```bash
cp .env.example .env
```

Update `ANALYTICS_API_KEY` if you changed it, otherwise the default works.

### 8. Start the client server

```bash
npm start
```

The analytics dashboard starts on **http://localhost:3001**

---

## Running Both Servers

You need **two terminal windows** running simultaneously:

| Terminal | Command | URL |
|----------|---------|-----|
| Terminal 1 | `npm start` (in root) | http://localhost:3000 |
| Terminal 2 | `npm start` (in client/) | http://localhost:3001 |

---

## Seed Credentials

All seed accounts use the password: `Password1!`

| Email | Role | Wallet | Notes |
|-------|------|--------|-------|
| `priya.sharma@alumni.eastminster.ac.uk` | alumni | £500 | AWS + TF certs |
| `liam.chen@alumni.eastminster.ac.uk` | alumni | £750 | At monthly win limit |
| `carlos.mendez@alumni.eastminster.ac.uk` | alumni | £800 | Top bidder |
| `james.okafor@alumni.eastminster.ac.uk` | alumni | £0 | CEng + MIET licences |
| `sofia.martinez@alumni.eastminster.ac.uk` | alumni | £0 | Pending sponsorship |
| `unverified@alumni.eastminster.ac.uk` | alumni | — | Login blocked (unverified) |
| `admin@eastminster.ac.uk` | admin | — | Manages keys + resolves auctions |

---

## Seed API Keys

| Key Value | Name | Scopes |
|-----------|------|--------|
| `east_arkey_prod_abc123xyz` | AR Client | read:featured, read:alumni_of_day |
| `east_mobile_v2_def456uvw` | Mobile App v2 | read:featured, read:alumni, read:alumni_of_day, read:sponsors, read:events, read:donations |
| `east_revoked_ghi789rst` | Revoked Test Key | read:featured — **revoked, returns 403** |
| `east_analytics_dashboard_k4` | Analytics Dashboard | read:alumni, read:analytics |

---

## API Documentation

Interactive Swagger UI is available at:

```
http://localhost:3000/api-docs
```

Raw OpenAPI 3.0 JSON spec:

```
http://localhost:3000/api-docs.json
```

### How to test in Swagger

1. Open `http://localhost:3000/api-docs`
2. Click **Authorize** (top right)
3. Paste an API key into `apiKeyAuth` — use `east_analytics_dashboard_k4` for analytics endpoints
4. For JWT-protected endpoints:
   - Call `POST /api/auth/login` with a seed email and `Password1!`
   - Copy the `token` from the response
   - Paste it into `bearerAuth` in the Authorize dialog
5. For state-changing requests (POST/PATCH/DELETE):
   - Call `GET /api/csrf-token` while authenticated
   - Copy the `csrfToken` from the response
   - Paste it into `csrfToken` in the Authorize dialog

> CSRF tokens are **single-use** — fetch a new one before each mutating request.

---

## Key Features

### CW1 — Backend API (port 3000)
- University-domain email registration with verification
- bcrypt password hashing (12 rounds)
- JWT authentication with server-side session revocation
- Complete alumni profile management (degrees, certifications, licences, courses, employment)
- Blind bidding auction system — amounts never exposed during active window
- Daily automated winner selection via cron job (18:00 UTC)
- Sponsorship wallet economy
- API key scoping with 7 permission levels
- 3NF in-memory database with O(1) Map indexes

### CW2 — Analytics Dashboard (port 3001)
- 9 interactive charts across 5 chart types (bar, line, doughnut, pie, radar)
- Curriculum intelligence engine detecting 4 brief scenarios
- Alumni directory with filtering, CSV export, and PDF export
- Security audit trail with live API usage logs
- Custom report generator with 10 selectable metrics
- API key injection server-side — browser never sees credentials

---

## Environment Variables

Copy `.env.example` to `.env`. All variables have working defaults for local development.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Backend server port |
| `NODE_ENV` | development | Set to `test` to disable cron and rate limits |
| `JWT_SECRET` | changeme-in-prod | **Change this in production** — 32+ random chars |
| `JWT_EXPIRES_IN` | 24h | JWT lifetime. Use `1h` in production |
| `CORS_ORIGIN` | http://localhost:3001 | Allowed origins. Never use `*` in production |
| `UNIVERSITY_DOMAIN` | alumni.eastminster.ac.uk | Required email domain for registration |
| `BID_CLOSE_HOUR_UTC` | 18 | UTC hour when bidding closes daily |
| `WINNER_SELECT_HOUR_UTC` | 18 | UTC hour for automated winner selection |
| `UPLOAD_DIR` | ./uploads | Profile photo storage directory |
| `MAX_FILE_SIZE_MB` | 5 | Max photo upload size in MB |
| `SMTP_HOST` | smtp.mailtrap.io | SMTP server for email sending |
| `SMTP_PORT` | 587 | 587 = STARTTLS, 465 = SSL |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password |
| `EMAIL_FROM` | Alumni Influencers | From name on outgoing emails |
| `CLIENT_URL` | http://localhost:3001 | Base URL for email verification links |
| `RESET_TOKEN_EXPIRES_MINUTES` | 30 | Password reset token validity |
| `API_KEY_PREFIX` | east_ | Prefix on all generated API keys |

---

## Client Environment Variables

In the `client/` directory, create `client/.env` from `client/.env.example`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Client server port |
| `BACKEND_URL` | http://localhost:3000/api | Backend API base URL |
| `ANALYTICS_API_KEY` | east_analytics_dashboard_k4 | API key injected server-side for analytics |
| `SESSION_SECRET` | changeme | Session signing secret — change in production |

---

## Troubleshooting

**Port already in use:**
```bash
# Find and kill the process on port 3000
lsof -ti:3000 | xargs kill -9
# Or for port 3001
lsof -ti:3001 | xargs kill -9
```

**`uploads` directory missing:**
```bash
mkdir -p uploads
```

**CSRF 403 errors in Swagger:**
Call `GET /api/csrf-token` again — CSRF tokens are single-use and expire after one request.

**Charts not loading on dashboard:**
Make sure both servers are running. The client server on port 3001 must be able to reach the backend on port 3000.

**Email sending fails:**
Email failures do not break the app — they are non-blocking. The system logs the error and continues. Set up a Mailtrap account for local email testing.

---

## Testing the Bidding System

1. Login as `priya.sharma@alumni.eastminster.ac.uk` / `Password1!` on the dashboard
2. Go to **Bidding** page
3. Place a bid (e.g. £100)
4. Login as a different alumni in another browser/incognito window and place a higher bid
5. To manually resolve the auction (instead of waiting for 18:00 UTC):
   - Login as `admin@eastminster.ac.uk` in Swagger
   - Call `POST /api/bids/resolve`
   - The winner is selected and wallet balances updated

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend runtime | Node.js v18+ |
| Backend framework | Express |
| Authentication | JWT (jsonwebtoken) + bcryptjs |
| Database | In-memory (plain JS arrays + Maps) |
| API documentation | Swagger UI Express + OpenAPI 3.0 |
| Email | Nodemailer |
| Scheduling | node-cron |
| File uploads | Multer |
| Input validation | express-validator + xss |
| Security headers | Helmet |
| Rate limiting | express-rate-limit |
| Client framework | Express (proxy server) |
| Frontend | Vanilla JS SPA + Chart.js |
| PDF export | html2pdf.js |

---

## License

University of Eastminster — 6COSC022W Advanced Server-Side Web Development  
Coursework submission — not for redistribution.