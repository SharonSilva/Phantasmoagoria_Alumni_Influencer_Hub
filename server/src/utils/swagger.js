'use strict';

const swaggerUi = require('swagger-ui-express');

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title:       'Alumni Influencers API',
    version:     '1.0.0',
    description: `
## Phantasmagoria Ltd × University of Eastminster

A RESTful Web API serving the Alumni Influencers AR platform.

### Authentication

Two authentication schemes are supported:

1. **JWT Bearer Token** – For alumni/admin user sessions.
   Obtain via \`POST /api/auth/login\`.
   Pass as: \`Authorization: Bearer <token>\`

2. **API Key** – For developer/client applications (AR client, mobile app, etc.).
   Pass as: \`X-API-Key: <key>\`

### CSRF Protection

All state-changing requests (POST, PATCH, PUT, DELETE) require a CSRF token.

**How to get one:**
1. Call \`GET /api/csrf-token\` with your Bearer token
2. Copy the \`csrfToken\` value from the response
3. Click **Authorize** and paste it into the **csrfToken** field
4. Swagger will send it automatically as \`X-CSRF-Token\` on every request

>  CSRF tokens are **single-use**. If you get a 403, fetch a new one and re-authorize.

### Quick Start (seed credentials)
All seed users have password \`Password1!\`

| Email | Role | Wallet |
|-------|------|--------|
| \`priya.sharma@alumni.eastminster.ac.uk\` | alumni | £500 |
| \`liam.chen@alumni.eastminster.ac.uk\` | alumni | £750 |
| \`carlos.mendez@alumni.eastminster.ac.uk\` | alumni | £800 |
| \`admin@eastminster.ac.uk\` | admin | — |

### Seed API Keys

| Key Value | Name | Scopes | Active |
|-----------|------|--------|--------|
| \`east_arkey_prod_abc123xyz\` | AR Client | read:featured, read:alumni_of_day | ✓ |
| \`east_mobile_v2_def456uvw\` | Mobile App v2 | read:featured, read:alumni, read:alumni_of_day, read:sponsors, read:events, read:donations | ✓ |
| \`east_revoked_ghi789rst\` | Revoked Test Key | read:featured | ✗ |
| \`east_analytics_dashboard_k4\` | Analytics Dashboard | read:alumni, read:analytics | ✓ |

### Available Scopes

| Scope | Grants Access To |
|-------|-----------------|
| \`read:featured\` | GET /api/public/featured |
| \`read:alumni\` | GET /api/alumni, GET /api/alumni/:id |
| \`read:alumni_of_day\` | AR featured endpoint |
| \`read:sponsors\` | GET /api/public/sponsors |
| \`read:events\` | GET /api/public/events |
| \`read:analytics\` | GET /api/dashboard/*, GET /api/charts/*, GET /api/usage/stats, GET /api/usage/endpoints |
| \`read:donations\` | Donation data for mobile app |
    `,
    contact: { name: 'Phantasmagoria Ltd', email: 'api@phantasmagoria.co.uk' },
  },
  servers: [{ url: 'http://localhost:3000', description: 'Development' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http', scheme: 'bearer', bearerFormat: 'JWT',
        description: 'JWT from POST /api/auth/login',
      },
      apiKeyAuth: {
        type: 'apiKey', in: 'header', name: 'X-API-Key',
        description: 'API key — required scope depends on endpoint.',
      },
      csrfToken: {
        type: 'apiKey', in: 'header', name: 'X-CSRF-Token',
        description: 'Single-use CSRF token from GET /api/csrf-token. Required for all POST/PATCH/PUT/DELETE.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors:  { type: 'array', items: { type: 'object' } },
        },
      },
      User: {
        type: 'object',
        properties: {
          id:            { type: 'string' },
          email:         { type: 'string', format: 'email' },
          name:          { type: 'string' },
          role:          { type: 'string', enum: ['alumni', 'admin'] },
          emailVerified: { type: 'boolean' },
          createdAt:     { type: 'string', format: 'date-time' },
        },
      },
      Profile: {
        type: 'object',
        properties: {
          id:               { type: 'string' },
          userId:           { type: 'string' },
          graduationYear:   { type: 'integer' },
          bio:              { type: 'string' },
          linkedInUrl:      { type: 'string', format: 'uri' },
          photoUrl:         { type: 'string' },
          currentRole:      { type: 'string' },
          currentEmployer:  { type: 'string' },
          location:         { type: 'string' },
          walletBalance:    { type: 'number' },
          appearanceCount:  { type: 'integer' },
          nextFeatureDate:  { type: 'string', format: 'date' },
          profileCompleted: { type: 'boolean' },
          programme:        { type: 'string' },
          industry:         { type: 'string' },
        },
      },
      Bid: {
        type: 'object',
        properties: {
          id:          { type: 'string' },
          userId:      { type: 'string' },
          bidDate:     { type: 'string', format: 'date' },
          status:      { type: 'string', enum: ['active', 'won', 'lost', 'cancelled'] },
          submittedAt: { type: 'string', format: 'date-time' },
          amount:      { type: 'number', description: 'Hidden during active auction — only shown after resolution' },
        },
      },
      Winner: {
        type: 'object',
        properties: {
          id:            { type: 'string' },
          userId:        { type: 'string' },
          displayDate:   { type: 'string', format: 'date' },
          bidAmount:     { type: 'number' },
          sponsorPayout: { type: 'number' },
          createdAt:     { type: 'string', format: 'date-time' },
        },
      },
      ApiKey: {
        type: 'object',
        properties: {
          id:         { type: 'string' },
          name:       { type: 'string' },
          key:        { type: 'string', description: 'Shown only at creation — save immediately' },
          scopes:     { type: 'array', items: { type: 'string' } },
          active:     { type: 'boolean' },
          createdAt:  { type: 'string', format: 'date-time' },
          lastUsedAt: { type: 'string', format: 'date-time' },
        },
      },
      ChartResponse: {
        type: 'object',
        description: 'Standardised shape returned by all /api/charts/* endpoints',
        properties: {
          type:       { type: 'string', enum: ['bar', 'line', 'pie', 'doughnut', 'radar'] },
          labels:     { type: 'array', items: { type: 'string' } },
          datasets:   { type: 'array', items: { type: 'object' } },
          percentages:{ type: 'array', items: { type: 'number' }, description: 'Percentage of total per point — shown in tooltips' },
          insights:   { type: 'array', items: { type: 'string', enum: ['critical', 'significant', 'emerging'] }, description: 'critical=30%+, significant=15-30%, emerging=<15%' },
        },
      },
      DashboardMetrics: {
        type: 'object',
        properties: {
          metrics: {
            type: 'object',
            properties: {
              totalAlumni:    { type: 'integer' },
              totalBids:      { type: 'integer' },
              activeBids:     { type: 'integer' },
              totalWinners:   { type: 'integer' },
              monthlyWinners: { type: 'integer' },
              totalSponsors:  { type: 'integer' },
            },
          },
          breakdown: {
            type: 'object',
            properties: {
              byProgramme:      { type: 'object', description: 'programme → count' },
              byIndustry:       { type: 'object', description: 'industry → count' },
              byGraduationYear: { type: 'object', description: 'year → count' },
            },
          },
          recentWinners: { type: 'array', items: { $ref: '#/components/schemas/Winner' } },
          topBidders: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                userId:      { type: 'string' },
                name:        { type: 'string' },
                totalBids:   { type: 'integer' },
                totalAmount: { type: 'number' },
                avgBid:      { type: 'number' },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    { name: 'Auth',                     description: 'Registration, login, email verification, password reset, CSRF' },
    { name: 'Profile',                  description: 'Alumni profile management — core fields' },
    { name: 'Profile - Degrees',        description: 'Degree entries' },
    { name: 'Profile - Certifications', description: 'Professional certification entries' },
    { name: 'Profile - Licences',       description: 'Professional licence entries' },
    { name: 'Profile - Courses',        description: 'Short professional course entries' },
    { name: 'Profile - Employment',     description: 'Employment history entries' },
    { name: 'Alumni Directory',         description: 'Authenticated alumni directory — requires read:alumni scope (key k4)' },
    { name: 'Bidding',                  description: 'Daily blind bidding — amounts hidden during active window' },
    { name: 'Winners',                  description: 'Alumni of the Day history' },
    { name: 'Sponsors',                 description: 'Sponsor organisations and offer management — admin only' },
    { name: 'Events',                   description: 'University events — attendance unlocks 4th bid slot' },
    { name: 'Wallet',                   description: 'Sponsorship earnings and transaction log' },
    { name: 'Analytics Dashboard',      description: 'Aggregate metrics — requires read:analytics scope (key k4)' },
    { name: 'Analytics Charts',         description: 'All 8 chart endpoints — requires read:analytics (key k4). All kebab-case paths.' },
    { name: 'Usage Statistics',         description: 'API key usage logs and endpoint stats — /api/usage/*' },
    { name: 'API Keys',                 description: 'API key management — admin + JWT only' },
    { name: 'Public API',               description: 'Client-facing endpoints via API key — no JWT required' },
  ],
  paths: {

    // AUTH

    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new alumni account',
        description: 'Email must end with @alumni.eastminster.ac.uk or @eastminster.ac.uk. Password: min 8 chars, uppercase, number, special char. Validated independently client-side AND server-side.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['email', 'password', 'name'],
            properties: {
              email:    { type: 'string', example: 'jane.doe@alumni.eastminster.ac.uk' },
              password: { type: 'string', example: 'Password1@' },
              name:     { type: 'string', example: 'Jane Doe' },
            },
          }}},
        },
        responses: {
          201: { description: '{ userId } — password never in response. Verification email sent.' },
          400: { description: 'Validation error' },
          409: { description: 'Email already registered' },
        },
      },
    },

    '/api/auth/verify-email': {
      get: {
        tags: ['Auth'],
        summary: 'Verify email via token',
        description: 'Token: crypto.randomBytes(32), bcrypt-hashed before storage, single-use, 24h expiry. Two-step cross-user validation.',
        parameters: [{ in: 'query', name: 'token', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Email verified' },
          400: { description: 'Invalid/expired/already-used token' },
        },
      },
    },

    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login — returns JWT + CSRF token',
        description: 'Generic error for all failures prevents enumeration. bcrypt.compare() is constant-time. csrfToken returned for first state-changing request.',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['email', 'password'],
          properties: {
            email:    { type: 'string', example: 'priya.sharma@alumni.eastminster.ac.uk' },
            password: { type: 'string', example: 'Password1!' },
          },
        }}}},
        responses: {
          200: { description: '{ user: { id, email, name, role, emailVerified }, token, csrfToken }' },
          401: { description: '\'Invalid email or password\' — same for all failures' },
        },
      },
    },

    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout — server-side session revocation',
        description: 'Session.revokeByTokenId() — JWT invalid immediately regardless of expiry.',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        responses: { 200: { description: 'Logged out' } },
      },
    },

    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset — always 200',
        description: 'Always 200 with same message — prevents email enumeration. 30 min expiry. Old tokens invalidated before new one created.',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['email'],
          properties: { email: { type: 'string', example: 'priya.sharma@alumni.eastminster.ac.uk' } },
        }}}},
        responses: { 200: { description: '\'If that email is registered, a reset link has been sent.\'' } },
      },
    },

    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        description: 'Same strength rules as registration. Token consumed BEFORE password update (race condition prevention).',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['token', 'password'],
          properties: {
            token:    { type: 'string' },
            password: { type: 'string', example: 'NewPass1@' },
          },
        }}}},
        responses: {
          200: { description: 'Password reset' },
          400: { description: 'Invalid/expired token or weak password' },
        },
      },
    },

    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get own user info',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'User object — password stripped' } },
      },
    },

    '/api/csrf-token': {
      get: {
        tags: ['Auth'],
        summary: 'Get a fresh single-use CSRF token',
        description: 'crypto.randomBytes(32) stored in server-side Map. Single-use — deleted after first validation.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: '{ success: true, data: { csrfToken: "64-char-hex" } }' },
          401: { description: 'Not authenticated' },
        },
      },
    },

    // PROFILE

    '/api/profile': {
      get: {
        tags: ['Profile'],
        summary: 'Get own full profile with all sub-resources',
        description: 'Returns profile + degrees + certifications + licences + courses + employmentHistory + sponsorships. Admin returns 404.',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Full profile object' } },
      },
      put: {
        tags: ['Profile'],
        summary: 'Update core profile fields',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            bio:             { type: 'string', maxLength: 500 },
            linkedInUrl:     { type: 'string', format: 'uri' },
            currentRole:     { type: 'string' },
            currentEmployer: { type: 'string' },
            location:        { type: 'string' },
            graduationYear:  { type: 'integer', minimum: 1990 },
            programme:       { type: 'string' },
            industry:        { type: 'string' },
          },
        }}}},
        responses: { 200: { description: 'Updated profile' } },
      },
    },

    '/api/profile/photo': {
      post: {
        tags: ['Profile'],
        summary: 'Upload profile photo',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { content: { 'multipart/form-data': { schema: {
          type: 'object', properties: { photo: { type: 'string', format: 'binary' } },
        }}}},
        responses: { 200: { description: 'Photo uploaded' } },
      },
    },

    '/api/profile/completion': {
      get: {
        tags: ['Profile'],
        summary: 'Profile completion percentage',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: '{ completionPercent, missingFields }' } },
      },
    },

    '/api/profile/degrees': {
      get:  { tags: ['Profile - Degrees'], summary: 'List degrees', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } },
      post: {
        tags: ['Profile - Degrees'], summary: 'Add degree',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['title', 'institution'],
          properties: {
            title:         { type: 'string', example: 'BSc Computer Science' },
            institution:   { type: 'string', example: 'University of Eastminster' },
            url:           { type: 'string' },
            completedDate: { type: 'string', example: '2020-06-15' },
          },
        }}}},
        responses: { 201: { description: 'Created' } },
      },
    },

    '/api/profile/degrees/{id}': {
      put: {
        tags: ['Profile - Degrees'], summary: 'Update degree',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
          title: { type: 'string' }, institution: { type: 'string' }, url: { type: 'string' }, completedDate: { type: 'string' },
        }}}}},
        responses: { 200: { description: 'Updated' } },
      },
      delete: { tags: ['Profile - Degrees'], summary: 'Delete degree', security: [{ bearerAuth: [] }, { csrfToken: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },

    '/api/profile/certifications': {
      get:  { tags: ['Profile - Certifications'], summary: 'List certifications', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } },
      post: {
        tags: ['Profile - Certifications'], summary: 'Add certification',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'issuer'],
          properties: {
            name:          { type: 'string', example: 'AWS Solutions Architect Associate' },
            issuer:        { type: 'string', example: 'Amazon Web Services' },
            url:           { type: 'string' },
            completedDate: { type: 'string', example: '2023-06-01' },
          }}}}},
        responses: { 201: { description: 'Created' } },
      },
    },

    '/api/profile/certifications/{id}': {
      put: {
        tags: ['Profile - Certifications'], summary: 'Update certification',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
          name: { type: 'string' }, issuer: { type: 'string' }, url: { type: 'string' }, completedDate: { type: 'string' },
        }}}}},
        responses: { 200: { description: 'Updated' } },
      },
      delete: { tags: ['Profile - Certifications'], summary: 'Delete certification', security: [{ bearerAuth: [] }, { csrfToken: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },

    '/api/profile/licences': {
      get:  { tags: ['Profile - Licences'], summary: 'List licences', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } },
      post: {
        tags: ['Profile - Licences'], summary: 'Add licence',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'awardingBody'],
          properties: {
            name:          { type: 'string', example: 'Chartered Engineer' },
            awardingBody:  { type: 'string', example: 'Engineering Council UK' },
            url:           { type: 'string' },
            completedDate: { type: 'string', example: '2022-01-01' },
          }}}}},
        responses: { 201: { description: 'Created' } },
      },
    },

    '/api/profile/licences/{id}': {
      put: {
        tags: ['Profile - Licences'], summary: 'Update licence',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
          name: { type: 'string' }, awardingBody: { type: 'string' }, url: { type: 'string' }, completedDate: { type: 'string' },
        }}}}},
        responses: { 200: { description: 'Updated' } },
      },
      delete: { tags: ['Profile - Licences'], summary: 'Delete licence', security: [{ bearerAuth: [] }, { csrfToken: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },

    '/api/profile/courses': {
      get:  { tags: ['Profile - Courses'], summary: 'List courses', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } },
      post: {
        tags: ['Profile - Courses'], summary: 'Add course',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'provider'],
          properties: {
            name:          { type: 'string', example: 'Kubernetes Administrator' },
            provider:      { type: 'string', example: 'CNCF' },
            url:           { type: 'string' },
            completedDate: { type: 'string', example: '2023-03-15' },
          }}}}},
        responses: { 201: { description: 'Created' } },
      },
    },

    '/api/profile/courses/{id}': {
      put: {
        tags: ['Profile - Courses'], summary: 'Update course',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
          name: { type: 'string' }, provider: { type: 'string' }, url: { type: 'string' }, completedDate: { type: 'string' },
        }}}}},
        responses: { 200: { description: 'Updated' } },
      },
      delete: { tags: ['Profile - Courses'], summary: 'Delete course', security: [{ bearerAuth: [] }, { csrfToken: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },

    '/api/profile/employment': {
      get:  { tags: ['Profile - Employment'], summary: 'List employment history', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } },
      post: {
        tags: ['Profile - Employment'], summary: 'Add employment record',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['jobTitle', 'employer', 'startDate'],
          properties: {
            jobTitle:  { type: 'string', example: 'Junior Developer' },
            employer:  { type: 'string', example: 'TechStartup Ltd' },
            startDate: { type: 'string', example: '2017-06-01' },
            endDate:   { type: 'string', example: '2018-08-31' },
            current:   { type: 'boolean', example: false },
          }}}}},
        responses: { 201: { description: 'Created' } },
      },
    },

    '/api/profile/employment/{id}': {
      put: {
        tags: ['Profile - Employment'], summary: 'Update employment record',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
          jobTitle: { type: 'string' }, employer: { type: 'string' }, startDate: { type: 'string' }, endDate: { type: 'string' }, current: { type: 'boolean' },
        }}}}},
        responses: { 200: { description: 'Updated' } },
      },
      delete: { tags: ['Profile - Employment'], summary: 'Delete employment record', security: [{ bearerAuth: [] }, { csrfToken: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },

    // ALUMNI DIRECTORY

    '/api/alumni': {
      get: {
        tags: ['Alumni Directory'],
        summary: 'Browse full alumni directory with server-side filtering',
        description: 'Requires **read:alumni** scope — use key k4 (east_analytics_dashboard_k4). Mounted at /api/alumni via authenticateKey([\'read:alumni\']).',
        security: [{ apiKeyAuth: [] }],
        parameters: [
          { in: 'query', name: 'search',    schema: { type: 'string' } },
          { in: 'query', name: 'programme', schema: { type: 'string' }, example: 'BSc Computer Science' },
          { in: 'query', name: 'industry',  schema: { type: 'string' }, example: 'Technology' },
          { in: 'query', name: 'year',      schema: { type: 'integer' }, example: 2020 },
          { in: 'query', name: 'page',      schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit',     schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          200: { description: '{ data: Profile[], pagination: { page, limit, total, totalPages, hasNextPage } }' },
          401: { description: 'Missing X-API-Key' },
          403: { description: 'Insufficient scope — requires read:alumni' },
        },
      },
    },

    '/api/alumni/{id}': {
      get: {
        tags: ['Alumni Directory'],
        summary: 'Get single alumni profile by profile ID',
        security: [{ apiKeyAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, example: 'p1' }],
        responses: {
          200: { description: 'Full alumni profile' },
          403: { description: 'Insufficient scope' },
          404: { description: 'Not found' },
        },
      },
    },

    // BIDDING
    '/api/bids/tomorrow': {
      get: {
        tags: ['Bidding'],
        summary: "Tomorrow's slot info — no bid amount returned",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: '{ slotDate, biddingOpen, biddingClosesAt, myBidToday: { id, status, isCurrentlyWinning } | null }' } },
      },
    },

    '/api/bids': {
      post: {
        tags: ['Bidding'],
        summary: 'Place a blind bid',
        description: '6 gates: alumni role → window open → no dup today → monthly limit → wallet balance → valid amount. Amount never returned.',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['amount'],
          properties: { amount: { type: 'number', example: 250, minimum: 1 } },
        }}}},
        responses: {
          201: { description: '{ bid:{id,bidDate,status}, feedback:{isCurrentlyWinning,message}, monthlyStatus:{winsThisMonth,maxAllowed,slotsRemaining} }' },
          400: { description: 'Bidding closed / monthly limit / insufficient balance' },
          403: { description: 'Only alumni can bid' },
          409: { description: 'Already bid today — use PATCH to increase' },
        },
      },
    },

    '/api/bids/{id}': {
      patch: {
        tags: ['Bidding'],
        summary: 'Increase bid — strictly higher only',
        description: '8 gates including: new amount must be STRICTLY greater (equal rejected — uses <= not <). submittedAt preserved for tiebreaker.',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['amount'], properties: { amount: { type: 'number', example: 350 } } } } } },
        responses: {
          200: { description: '{ bid, feedback:{isCurrentlyWinning,message} }' },
          400: { description: 'Window closed / not strictly higher / insufficient balance' },
          403: { description: 'Not your bid' },
          404: { description: 'Not found' },
        },
      },
      delete: {
        tags: ['Bidding'],
        summary: 'Cancel active bid',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Bid cancelled' } },
      },
    },

    '/api/bids/status':  { get: { tags: ['Bidding'], summary: 'Blind win/lose status — boolean only', security: [{ bearerAuth: [] }], responses: { 200: { description: '{ hasBidToday, isCurrentlyWinning, message }' } } } },
    '/api/bids/history': { get: { tags: ['Bidding'], summary: 'Own bid history — amount hidden during active window', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Bids array' } } } },
    '/api/bids/monthly': { get: { tags: ['Bidding'], summary: 'Monthly limit status', security: [{ bearerAuth: [] }], responses: { 200: { description: '{ winsThisMonth, maxAllowed, slotsRemaining, hasEventBonus }' } } } },

    '/api/bids/resolve': {
      post: {
        tags: ['Bidding'],
        summary: '(Admin) Manually trigger auction resolution',
        description: 'Normally runs at 18:00 UTC via cron. Manual trigger for testing/viva demo. Idempotent — skips if winner already selected. Requires JWT + admin (not API key).',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        responses: {
          200: { description: '{ winner:{userId,displayDate,bidAmount,sponsorPayout}, loserIds, resolved }' },
          403: { description: 'Admin access required' },
        },
      },
    },

    // WINNERS

    '/api/winners/today': { get: { tags: ['Winners'], summary: "Today's Alumni of the Day", security: [{ bearerAuth: [] }], responses: { 200: { description: 'Winner or null' } } } },
    '/api/winners':       { get: { tags: ['Winners'], summary: 'Full winner history', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array sorted by displayDate desc' } } } },

    // SPONSORS

    '/api/sponsors': {
      get: { tags: ['Sponsors'], summary: 'List sponsors', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } },
      post: {
        tags: ['Sponsors'], summary: '(Admin) Create sponsor',
        description: '⚠️ Entire /api/sponsors mount requires JWT + admin. Alumni cannot access any /api/sponsors route.',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'category'],
          properties: {
            name:        { type: 'string', example: 'Microsoft Azure' },
            category:    { type: 'string', example: 'Cloud Certification' },
            description: { type: 'string' },
          },
        }}}},
        responses: { 201: { description: 'Created' } },
      },
    },

    '/api/sponsors/{id}/offers': {
      post: {
        tags: ['Sponsors'],
        summary: '(Admin) Make offer to alumni',
        description: '**Workflow:**\n1. Login admin → POST /api/auth/login\n2. Get profile IDs → GET /api/alumni (X-API-Key: east_analytics_dashboard_k4)\n3. Fresh CSRF → GET /api/csrf-token\n4. Authorize both tokens\n5. POST with sponsorId (s1=AWS, s2=Google, s3=ISC², s4=Offensive Security, s5=Scrum Alliance)',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Sponsor ID — seed: s1 to s5' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['profileId', 'certificationName', 'offerAmount'],
          properties: {
            profileId:         { type: 'string', example: 'p1' },
            certificationName: { type: 'string', example: 'AWS Solutions Architect Associate' },
            offerAmount:       { type: 'number', example: 300 },
          },
        }}}},
        responses: {
          201: { description: '{ id, sponsorId, profileId, certificationName, offerAmount, status:"pending" }' },
          404: { description: 'Sponsor or profile not found' },
        },
      },
    },

    '/api/sponsors/offers/{id}/respond': {
      patch: {
        tags: ['Sponsors'],
        summary: 'Accept or decline offer',
        description: '⚠️ **Known limitation:** The entire /api/sponsors mount requires admin JWT. Alumni accepting offers must be tested via curl directly rather than through this Swagger endpoint. The respond controller itself only requires authenticate() but the mount-level requireAdmin blocks it.',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Offer ID from POST response' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['decision'], properties: { decision: { type: 'string', enum: ['accepted', 'declined'] } } } } } },
        responses: {
          200: { description: 'Responded — walletBalance updated if accepted' },
          403: { description: 'Admin access required at mount level' },
        },
      },
    },

    // EVENTS

    '/api/events': {
      get: { tags: ['Events'], summary: 'List events', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } },
      post: {
        tags: ['Events'], summary: '(Admin) Create event',
        description: 'unlocksExtraBid:true means attendees get a 4th monthly bid slot.',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title', 'date', 'location'],
          properties: {
            title:           { type: 'string', example: 'Spring Networking Evening' },
            date:            { type: 'string', example: '2026-04-30' },
            location:        { type: 'string', example: 'London Campus' },
            description:     { type: 'string' },
            unlocksExtraBid: { type: 'boolean', example: true },
          },
        }}}},
        responses: { 201: { description: 'Created' } },
      },
    },

    '/api/events/{id}/register': {
      post: {
        tags: ['Events'],
        summary: 'Register for event — unlocks 4th bid slot if unlocksExtraBid:true',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Seed event e1 has unlocksExtraBid:true' }],
        responses: { 201: { description: 'Registered' } },
      },
    },

    // WALLET 

    '/api/wallet': {
      get: {
        tags: ['Wallet'],
        summary: 'Wallet balance and transaction log',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: '{ walletBalance, transactions: [{ type, amount, description, date }] }' } },
      },
    },

    // ANALYTICS DASHBOARD 

    '/api/dashboard': {
      get: {
        tags: ['Analytics Dashboard'],
        summary: 'Dashboard aggregate metrics',
        description: 'Requires **read:analytics** scope — key k4 (east_analytics_dashboard_k4). Returns 6 metrics, breakdowns, recentWinners, topBidders.',
        security: [{ apiKeyAuth: [] }],
        responses: {
          200: {
            description: 'Full dashboard metrics',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/DashboardMetrics' } } },
          },
          403: { description: 'Insufficient scope — requires read:analytics' },
        },
      },
    },

    '/api/dashboard/alumni-stats': {
      get: {
        tags: ['Analytics Dashboard'],
        summary: 'Alumni statistics breakdown',
        description: 'Requires **read:analytics** scope.',
        security: [{ apiKeyAuth: [] }],
        responses: { 200: { description: 'Detailed alumni statistics' } },
      },
    },

    '/api/dashboard/bidding-analytics': {
      get: {
        tags: ['Analytics Dashboard'],
        summary: 'Bidding analytics and trends',
        description: 'Requires **read:analytics** scope.',
        security: [{ apiKeyAuth: [] }],
        responses: { 200: { description: 'Bidding analytics data' } },
      },
    },

    // ANALYTICS CHARTS (all kebab-case paths) 

    '/api/charts/skills-gap': {
      get: {
        tags: ['Analytics Charts'],
        summary: 'Skills Gap Analysis — certifications by issuer (bar)',
        description: '**Scope:** read:analytics\n\nAggregates db.certifications by issuer. Colour-coded insights: critical=30%+, significant=15-30%, emerging=<15%. Implements **Scenario 1** — curriculum gap detection from independently acquired certifications.',
        security: [{ apiKeyAuth: [] }],
        responses: {
          200: {
            description: 'ChartResponse — type:bar',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ChartResponse' } } },
          },
          403: { description: 'Insufficient scope' },
        },
      },
    },

    '/api/charts/industry-distribution': {
      get: {
        tags: ['Analytics Charts'],
        summary: 'Industry Distribution — alumni by sector (doughnut)',
        description: '**Scope:** read:analytics\n\nAggregates db.profiles by industry. Frontend renders this twice: as doughnut (chart 2) and overriding to pie (chart 3) using the same endpoint.',
        security: [{ apiKeyAuth: [] }],
        responses: { 200: { description: 'ChartResponse — type:doughnut' } },
      },
    },

    '/api/charts/programme-distribution': {
      get: {
        tags: ['Analytics Charts'],
        summary: 'Programme Distribution — alumni by degree programme (bar)',
        description: '**Scope:** read:analytics\n\nAggregates db.profiles by programme field.',
        security: [{ apiKeyAuth: [] }],
        responses: { 200: { description: 'ChartResponse — type:bar' } },
      },
    },

    '/api/charts/graduation-years': {
      get: {
        tags: ['Analytics Charts'],
        summary: 'Graduation Year Trends — alumni by year (line)',
        description: '**Scope:** read:analytics\n\nTime-series of cohort sizes sorted ascending by year.',
        security: [{ apiKeyAuth: [] }],
        responses: { 200: { description: 'ChartResponse — type:line' } },
      },
    },

    '/api/charts/bidding-trends': {
      get: {
        tags: ['Analytics Charts'],
        summary: 'Daily Bidding Trends — bids per day last 7 days (line)',
        description: '**Scope:** read:analytics\n\nPowers bidMomentumPct — compares first-half vs second-half average to detect engagement trend.',
        security: [{ apiKeyAuth: [] }],
        responses: { 200: { description: 'ChartResponse — type:line, 7 data points' } },
      },
    },

    '/api/charts/sponsorships': {
      get: {
        tags: ['Analytics Charts'],
        summary: 'Sponsorship Distribution — offer value by organisation (doughnut)',
        description: '**Scope:** read:analytics\n\nSums offerAmount per sponsor organisation.',
        security: [{ apiKeyAuth: [] }],
        responses: { 200: { description: 'ChartResponse — type:doughnut' } },
      },
    },

    '/api/charts/career-trends': {
      get: {
        tags: ['Analytics Charts'],
        summary: 'Career Trends Over Time — employment starts by year (line)',
        description: '**Scope:** read:analytics\n\nAggregates db.employmentHistory by startDate year.',
        security: [{ apiKeyAuth: [] }],
        responses: { 200: { description: 'ChartResponse — type:line' } },
      },
    },

    '/api/charts/certifications': {
      get: {
        tags: ['Analytics Charts'],
        summary: 'Top Certifications Held — top 8 across all alumni (radar)',
        description: '**Scope:** read:analytics\n\nTop 8 certifications by count. Each radar axis = one certification. Implements **Scenario 4** — Agile/Scrum trend detection.',
        security: [{ apiKeyAuth: [] }],
        responses: { 200: { description: 'ChartResponse — type:radar, 8 axes' } },
      },
    },

    //USAGE STATISTICS — mounted at /api/usage 

    '/api/usage/stats': {
      get: {
        tags: ['Usage Statistics'],
        summary: 'All API key usage statistics',
        description: 'Requires **read:analytics** scope (API key auth). Returns all keys with totalRequests and requestsToday. Powers the Live Usage Logs table in the Security Audit Trail page.',
        security: [{ apiKeyAuth: [] }],
        responses: {
          200: { description: 'Array of { keyName, scopes, totalRequests, requestsToday, lastUsedAt, active }' },
          403: { description: 'Insufficient scope — requires read:analytics' },
        },
      },
    },

    '/api/usage/endpoints': {
      get: {
        tags: ['Usage Statistics'],
        summary: 'Endpoint usage statistics — most accessed endpoints',
        description: 'Requires **read:analytics** scope (API key auth). Aggregates db.apiUsageLogs by endpoint. Powers the Most Accessed Endpoints table in the Security Audit Trail page.',
        security: [{ apiKeyAuth: [] }],
        responses: {
          200: { description: '{ endpoint: hitCount } object — top 10 sorted by hits descending' },
          403: { description: 'Insufficient scope' },
        },
      },
    },

    '/api/usage/key/{keyId}': {
      get: {
        tags: ['Usage Statistics'],
        summary: 'Usage logs for a specific key — admin only',
        description: 'Requires JWT Bearer + admin role (not API key).',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'keyId', required: true, schema: { type: 'string' }, description: 'Key ID e.g. k1, k2, k4' }],
        responses: {
          200: { description: 'Array of { endpoint, method, timestamp, statusCode }' },
          403: { description: 'Admin access required' },
        },
      },
    },

    '/api/usage/report': {
      get: {
        tags: ['Usage Statistics'],
        summary: 'Usage report for date range — admin only',
        description: 'Requires JWT Bearer + admin role.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'from', schema: { type: 'string', format: 'date' }, description: 'Start date e.g. 2026-04-01' },
          { in: 'query', name: 'to',   schema: { type: 'string', format: 'date' }, description: 'End date e.g. 2026-04-30' },
        ],
        responses: {
          200: { description: 'Usage report for specified date range' },
          403: { description: 'Admin access required' },
        },
      },
    },

    // API KEYS 

    '/api/keys': {
      get: { tags: ['API Keys'], summary: 'List all API keys', security: [{ bearerAuth: [] }], responses: { 200: { description: 'ApiKey array' } } },
      post: {
        tags: ['API Keys'],
        summary: 'Generate new API key — admin + JWT only',
        description: 'Key: crypto.randomBytes(16) prefixed "east_". **Save immediately** — shown only once.',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'],
          properties: {
            name:   { type: 'string', example: 'Demo Mobile Client' },
            scopes: { type: 'array', items: { type: 'string', enum: ['read:featured', 'read:alumni', 'read:alumni_of_day', 'read:sponsors', 'read:events', 'read:analytics', 'read:donations'] }, example: ['read:featured', 'read:alumni'] },
          },
        }}}},
        responses: { 201: { description: '{ id, name, key, scopes, active, createdAt } — key shown once only' } },
      },
    },

    '/api/keys/{id}': {
      get:    { tags: ['API Keys'], summary: 'Key details + stats', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'k1, k2, k3, or k4' }], responses: { 200: { description: 'ApiKey' } } },
      delete: {
        tags: ['API Keys'], summary: 'Revoke key — instant',
        description: 'Sets active:false. Next request with this key returns 403 immediately.',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Revoked' } },
      },
    },

    '/api/keys/{id}/stats': {
      get: {
        tags: ['API Keys'],
        summary: 'Detailed usage logs for a key',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Usage logs array' } },
      },
    },

    // PUBLIC API 

    '/api/public/featured': {
      get: {
        tags: ['Public API'],
        summary: "Today's Alumni of the Day — AR Client",
        description: 'Requires **read:featured** scope — key k1 (east_arkey_prod_abc123xyz). Returns profile where nextFeatureDate === today(). Set by resolveAuction() at 18:00 UTC. Key k4 CANNOT access this endpoint.',
        security: [{ apiKeyAuth: [] }],
        responses: {
          200: { description: 'Featured alumni profile or { featured: null }' },
          403: { description: 'Insufficient scope — key k4 cannot access this' },
        },
      },
    },

    '/api/public/alumni': {
      get: {
        tags: ['Public API'],
        summary: 'Public alumni directory — read:alumni scope',
        security: [{ apiKeyAuth: [] }],
        responses: { 200: { description: 'Paginated alumni (public fields only)' } },
      },
    },

    '/api/public/alumni/{id}': {
      get: {
        tags: ['Public API'],
        summary: 'Single public alumni profile',
        security: [{ apiKeyAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Public profile' }, 404: { description: 'Not found' } },
      },
    },

    '/api/public/sponsors': {
      get: {
        tags: ['Public API'],
        summary: 'Sponsor list — read:sponsors scope (key k2)',
        security: [{ apiKeyAuth: [] }],
        responses: { 200: { description: 'Sponsors array' } },
      },
    },

    '/api/public/events': {
      get: {
        tags: ['Public API'],
        summary: 'Upcoming events — read:events scope (key k2)',
        security: [{ apiKeyAuth: [] }],
        responses: { 200: { description: 'Events array' } },
      },
    },
  },
};

module.exports = { swaggerUi, swaggerSpec };