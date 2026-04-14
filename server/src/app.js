require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const { seed } = require('./db');
const { swaggerUi, swaggerSpec } = require('./utils/swagger');

// ============= MIDDLEWARE IMPORTS =============
const { apiLimiter, authLimiter, bidLimiter } = require('./middleware/rateLimitMiddleware');
const { sanitizeInputs } = require('./middleware/validationMiddleware');
const { errorHandler, asyncHandler } = require('./middleware/errorHandler');
const setupResponseHandlers = require('./middleware/responseHandler');
const { authenticate, authenticateKey, requireAdmin, validateCsrf } = require('./middleware/authMiddleware');

// ============= ROUTE IMPORTS =============
const authRouter = require('./routes/auth');
const profileRouter = require('./routes/profile');
const bidsRouter = require('./routes/bids');
const winnersRouter = require('./routes/winners');
const sponsorsRouter = require('./routes/sponsors');
const eventsRouter = require('./routes/events');
const walletRouter = require('./routes/wallet');
const apiKeysRouter = require('./routes/apiKeys');
const publicRouter = require('./routes/public');
const dashboardRouter = require('./routes/dashboard');
const chartsRouter = require('./routes/charts');
const alumniRouter = require('./routes/alumni');
const exportRouter = require('./routes/export');
const usageRouter = require('./routes/usage');

const app = express();
const PORT = process.env.PORT || 3000;

// ============= SECURITY MIDDLEWARE =============

// 1. Helmet Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

// 2. CORS Configuration
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*' ? '*' : corsOrigin.split(','),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-CSRF-Token'],
  credentials: true
}));

// ============= BODY PARSING MIDDLEWARE =============

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ============= CUSTOM MIDDLEWARE =============

// 3. Response Handler (must be before routes)
app.use(setupResponseHandlers);

// 4. Input Sanitization (prevent XSS)
app.use(sanitizeInputs);

// 5. Request Logging
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ============= STATIC FILES =============

app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// ============= SWAGGER DOCUMENTATION =============

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Alumni Influencers API Docs',
  customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
  swaggerOptions: { persistAuthorization: true },
}));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// ============= RATE LIMITING =============

// Apply general API rate limit
app.use('/api', apiLimiter);

// Apply stricter limits to auth endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Apply bid rate limiter
app.use('/api/bids/create', bidLimiter);

// ============= PUBLIC ROUTES (No Auth Required) =============

app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);

// CSRF Token endpoint (public, no auth needed)
app.get('/api/csrf-token', (req, res) => {
  const { generateCsrfToken } = require('./middleware/authMiddleware');
  const token = generateCsrfToken(req.user?.id || 'guest');
  res.success({ csrfToken: token });
});

// ============= PROTECTED ROUTES (Require Authentication) =============

// User must be authenticated for these routes
app.use('/api/profile', authenticate, profileRouter);
app.use('/api/bids', authenticate, bidsRouter);
app.use('/api/winners', authenticate, winnersRouter);
app.use('/api/wallet', authenticate, walletRouter);
app.use('/api/events', authenticate, eventsRouter);

// API Key authenticated routes (can use JWT or API Key)
app.use('/api/dashboard', authenticateKey(['read:analytics']), dashboardRouter);
app.use('/api/charts', authenticateKey(['read:analytics']), chartsRouter);
app.use('/api/alumni', authenticateKey(['read:alumni']), alumniRouter);
app.use('/api/export', authenticateKey(['read:analytics', 'read:alumni']), exportRouter);

// Admin only routes
app.use('/api/sponsors', authenticate, requireAdmin, sponsorsRouter);
app.use('/api/keys', authenticate, requireAdmin, apiKeysRouter);

// Usage stats (admin only)
app.use('/api/usage', authenticate, requireAdmin, usageRouter);

// ============= PASSWORD RESET REDIRECT =============

app.get('/api/auth/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ============= CATCH-ALL: Serve Frontend for Non-API Routes =============

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ============= 404 HANDLER =============

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`
  });
});

// ============= GLOBAL ERROR HANDLER (MUST BE LAST) =============

app.use(errorHandler);

// ============= CRON JOBS =============

const WINNER_HOUR = process.env.WINNER_SELECT_HOUR_UTC || '0';
if (process.env.NODE_ENV !== 'test') {
  cron.schedule(`0 ${WINNER_HOUR} * * *`, async () => {
    console.log(`[CRON] Automated winner selection at ${new Date().toISOString()}`);
    try {
      const Bid = require('./models/Bid');
      const User = require('./models/User');
      const { db, dateStr } = require('./db');
      const { sendWinnerNotification, sendLostBidNotification } = require('./utils/email');

      const displayDate = dateStr(1);
      if (db.winners.find(w => w.displayDate === displayDate)) {
        return console.log('[CRON] Winner already selected, skipping.');
      }

      const result = Bid.resolveAuction();
      if (!result.winner) return console.log('[CRON] No winner selected:', result);

      const winUser = User.findById(result.winner.userId);
      if (winUser) {
        sendWinnerNotification(winUser.email, winUser.name, result.winner.displayDate).catch(() => {});
      }

      (result.loserIds || []).forEach(uid => {
        const u = User.findById(uid);
        if (u) {
          sendLostBidNotification(u.email, u.name, result.winner.displayDate).catch(() => {});
        }
      });

      console.log(`[CRON] Winner: ${winUser?.name} for ${result.winner.displayDate}`);
    } catch (err) {
      console.error('[CRON ERROR]', err.message);
    }
  });
  console.log(`[CRON] Winner selection scheduled at ${WINNER_HOUR}:00 UTC daily`);
}

// ============= SERVER STARTUP =============

async function start() {
  try {
    await seed();
    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        console.log(`\n  ✅ Alumni Influencers API → http://localhost:${PORT}`);
        console.log(`  ✅ Web App → http://localhost:${PORT}`);
        console.log(`  ✅ Swagger Docs → http://localhost:${PORT}/api-docs`);
        console.log(`\n  Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    }
  } catch (err) {
    console.error('[STARTUP ERROR]', err);
    process.exit(1);
  }
}

start();

module.exports = app;