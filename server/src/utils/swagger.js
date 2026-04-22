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
   Generate via admin panel or \`POST /api/keys\`.
   Pass as: \`X-API-Key: <key>\`

### CSRF Protection

All state-changing requests (POST, PATCH, PUT, DELETE) require a CSRF token.

**How to get one:**
1. Call \`GET /api/csrf-token\` with your Bearer token
2. Copy the \`csrfToken\` value from the response
3. Click **Authorize** and paste it into the **csrfToken** field
4. Swagger will now send it automatically as \`X-CSRF-Token\` on every request

> CSRF tokens are **single-use**. If you get a 403 CSRF error, fetch a new one from \`GET /api/csrf-token\` and re-authorize.

### Quick Start (seed credentials)
All seed users have password \`Password1!\`

| Email | Role |
|-------|------|
| \`priya.sharma@alumni.eastminster.ac.uk\` | alumni |
| \`liam.chen@alumni.eastminster.ac.uk\` | alumni (high wallet) |
| \`admin@eastminster.ac.uk\` | admin |

Seed API Key (read:featured): \`east_arkey_prod_abc123xyz\`
    `,
    contact: {
      name: 'Phantasmagoria Ltd',
      email: 'api@phantasmagoria.co.uk',
    },
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Development' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type:         'http',
        scheme:       'bearer',
        bearerFormat: 'JWT',
        description:  'JWT obtained from POST /api/auth/login',
      },
      apiKeyAuth: {
        type: 'apiKey',
        in:   'header',
        name: 'X-API-Key',
        description: 'Developer API key from POST /api/keys',
      },
      //  CSRF token scheme
      csrfToken: {
        type: 'apiKey',
        in:   'header',
        name: 'X-CSRF-Token',
        description: 'Single-use CSRF token obtained from GET /api/csrf-token. Required for all state-changing requests (POST, PATCH, PUT, DELETE). Fetch a fresh one before each mutating request.',
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
          id:            { type: 'string', format: 'uuid' },
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
          id:              { type: 'string' },
          userId:          { type: 'string' },
          graduationYear:  { type: 'integer' },
          bio:             { type: 'string' },
          linkedInUrl:     { type: 'string', format: 'uri' },
          photoUrl:        { type: 'string' },
          currentRole:     { type: 'string' },
          currentEmployer: { type: 'string' },
          location:        { type: 'string' },
          walletBalance:   { type: 'number' },
          appearanceCount: { type: 'integer' },
          isActiveToday:   { type: 'boolean' },
        },
      },
      Degree: {
        type: 'object',
        properties: {
          id:            { type: 'string' },
          profileId:     { type: 'string' },
          title:         { type: 'string', example: 'BSc Computer Science' },
          institution:   { type: 'string', example: 'University of Eastminster' },
          url:           { type: 'string', format: 'uri' },
          completedDate: { type: 'string', format: 'date' },
        },
      },
      Certification: {
        type: 'object',
        properties: {
          id:            { type: 'string' },
          profileId:     { type: 'string' },
          name:          { type: 'string', example: 'AWS Solutions Architect' },
          issuer:        { type: 'string', example: 'Amazon Web Services' },
          url:           { type: 'string', format: 'uri' },
          completedDate: { type: 'string', format: 'date' },
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
        },
      },
      Winner: {
        type: 'object',
        properties: {
          id:          { type: 'string' },
          userId:      { type: 'string' },
          displayDate: { type: 'string', format: 'date' },
          bidAmount:   { type: 'number' },
          createdAt:   { type: 'string', format: 'date-time' },
        },
      },
      ApiKey: {
        type: 'object',
        properties: {
          id:          { type: 'string' },
          name:        { type: 'string' },
          key:         { type: 'string', description: 'Full key (shown only at creation)' },
          scopes:      { type: 'array', items: { type: 'string' } },
          active:      { type: 'boolean' },
          createdAt:   { type: 'string', format: 'date-time' },
          lastUsedAt:  { type: 'string', format: 'date-time' },
          usageCount:  { type: 'integer' },
        },
      },
    },
  },
  tags: [
    { name: 'Auth',       description: 'Registration, login, email verification, password reset' },
    { name: 'Profile',    description: 'Alumni profile management (core + sub-resources)' },
    { name: 'Profile - Degrees',        description: 'Degree entries' },
    { name: 'Profile - Certifications', description: 'Professional certification entries' },
    { name: 'Profile - Licences',       description: 'Professional licence entries' },
    { name: 'Profile - Courses',        description: 'Short professional course entries' },
    { name: 'Profile - Employment',     description: 'Employment history entries' },
    { name: 'Bidding',    description: 'Daily blind bidding system' },
    { name: 'Winners',    description: 'Alumni of the Day history' },
    { name: 'Sponsors',   description: 'Sponsoring organisations and offer management' },
    { name: 'Events',     description: 'University alumni events (unlock extra bid)' },
    { name: 'Wallet',     description: 'Sponsorship earnings and bid transaction log' },
    { name: 'API Keys',   description: 'Developer API key management (admin only)' },
    { name: 'Public API', description: 'Client-facing endpoints accessed via API key' },
  ],
  paths: {
    // AUTH 
    '/api/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Register a new alumni account',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['email', 'password', 'name'],
            properties: {
              email:    { type: 'string', example: 'jane.doe@alumni.eastminster.ac.uk' },
              password: { type: 'string', example: 'Password1@', description: 'Min 8 chars, 1 uppercase, 1 number, 1 special char' },
              name:     { type: 'string', example: 'Jane Doe' },
            },
          }}},
        },
        responses: {
          201: { description: 'Registered — verification email sent' },
          400: { description: 'Validation error' },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/api/auth/verify-email': {
      get: {
        tags: ['Auth'], summary: 'Verify email via token link',
        parameters: [{ in: 'query', name: 'token', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Email verified' }, 400: { description: 'Invalid/expired token' } },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Login – returns JWT + CSRF token',
        description: 'Returns a JWT token and a CSRF token. Use the JWT as Bearer token and the csrfToken as X-CSRF-Token for your first state-changing request.',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['email', 'password'],
          properties: {
            email:    { type: 'string', example: 'priya.sharma@alumni.eastminster.ac.uk' },
            password: { type: 'string', example: 'Password1!' },
          },
        }}}},
        responses: { 200: { description: 'JWT + csrfToken returned' }, 401: { description: 'Invalid credentials or unverified email' } },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'], summary: 'Logout',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        responses: { 200: { description: 'Logged out' } },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'], summary: 'Request password reset email',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['email'],
          properties: { email: { type: 'string', example: 'priya.sharma@alumni.eastminster.ac.uk' } },
        }}}},
        responses: { 200: { description: 'Reset email sent (always 200 to prevent enumeration)' } },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'], summary: 'Reset password with token',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['token', 'password'],
          properties: { token: { type: 'string' }, password: { type: 'string', example: 'NewPass1@' } },
        }}}},
        responses: { 200: { description: 'Password reset' }, 400: { description: 'Invalid/expired token' } },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'], summary: 'Get own user info',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'User object' } },
      },
    },
    // CSRF token endpoint 
    '/api/csrf-token': {
      get: {
        tags: ['Auth'],
        summary: 'Get a fresh CSRF token',
        description: 'Returns a single-use CSRF token. **Use immediately** — authorize Swagger with it then make your state-changing request. CSRF tokens are consumed on use; fetch a new one for each mutation.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'CSRF token — paste into Authorize → csrfToken field',
          },
          401: { description: 'Not authenticated' },
        },
      },
    },

    //PROFILE 
    '/api/profile': {
      get: {
        tags: ['Profile'], summary: 'Get own full profile',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Full profile including all sub-resources' } },
      },
      put: {
        tags: ['Profile'], summary: 'Update core profile fields',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            bio: { type: 'string' }, linkedInUrl: { type: 'string' },
            currentRole: { type: 'string' }, currentEmployer: { type: 'string' },
            location: { type: 'string' }, graduationYear: { type: 'integer' },
          },
        }}}},
        responses: { 200: { description: 'Updated profile' } },
      },
    },
    '/api/profile/photo': {
      post: {
        tags: ['Profile'], summary: 'Upload profile photo',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { content: { 'multipart/form-data': { schema: {
          type: 'object', properties: { photo: { type: 'string', format: 'binary' } },
        }}}},
        responses: { 200: { description: 'Photo uploaded' } },
      },
    },
    '/api/profile/completion': {
      get: { tags: ['Profile'], summary: 'Profile completion status', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Completion %' } } },
    },
    '/api/profile/degrees': {
      get:  { tags: ['Profile - Degrees'], summary: 'List own degrees', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Degrees array' } } },
      post: { tags: ['Profile - Degrees'], summary: 'Add a degree entry', security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Degree' } } } },
        responses: { 201: { description: 'Degree created' } } },
    },
    '/api/profile/degrees/{id}': {
      put: {
        tags: ['Profile - Degrees'], summary: 'Update a degree',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
          title:         { type: 'string', example: 'MSc Advanced Artificial Intelligence' },
          institution:   { type: 'string', example: 'University of Eastminster' },
          url:           { type: 'string', example: 'https://eastminster.ac.uk/courses/msc-ai' },
          completedDate: { type: 'string', example: '2020-09-01' },
        }}}}},
        responses: { 200: { description: 'Updated' } },
      },
      delete: { tags: ['Profile - Degrees'], summary: 'Delete a degree', security: [{ bearerAuth: [] }, { csrfToken: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },
    '/api/profile/certifications': {
      get:  { tags: ['Profile - Certifications'], summary: 'List certifications', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } },
      post: {
        tags: ['Profile - Certifications'], summary: 'Add certification', security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'issuer'],
          properties: {
            name:          { type: 'string', example: 'AWS Solutions Architect' },
            issuer:        { type: 'string', example: 'Amazon Web Services' },
            url:           { type: 'string', example: 'https://aws.amazon.com/certification' },
            completedDate: { type: 'string', example: '2023-06-01' },
          }}}}},
        responses: { 201: { description: 'Created' } },
      },
    },
    '/api/profile/certifications/{id}': {
      put: {
        tags: ['Profile - Certifications'], summary: 'Update', security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
          name:          { type: 'string', example: 'AWS Solutions Architect Professional' },
          issuer:        { type: 'string', example: 'Amazon Web Services' },
          url:           { type: 'string', example: 'https://aws.amazon.com/certification' },
          completedDate: { type: 'string', example: '2023-06-01' },
        }}}}},
        responses: { 200: { description: 'Updated' } },
      },
      delete: { tags: ['Profile - Certifications'], summary: 'Delete', security: [{ bearerAuth: [] }, { csrfToken: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },
    '/api/profile/licences': {
      get:  { tags: ['Profile - Licences'], summary: 'List licences', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } },
      post: {
        tags: ['Profile - Licences'], summary: 'Add licence', security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'awardingBody'],
          properties: {
            name:          { type: 'string', example: 'Chartered Engineer' },
            awardingBody:  { type: 'string', example: 'Engineering Council UK' },
            url:           { type: 'string', example: 'https://www.engc.org.uk/ceng' },
            completedDate: { type: 'string', example: '2022-01-01' },
          }}}}},
        responses: { 201: { description: 'Created' } },
      },
    },
    '/api/profile/licences/{id}': {
      put: {
        tags: ['Profile - Licences'], summary: 'Update', security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
          name:          { type: 'string', example: 'Chartered Engineer (CEng)' },
          awardingBody:  { type: 'string', example: 'Engineering Council UK' },
          url:           { type: 'string', example: 'https://www.engc.org.uk/ceng' },
          completedDate: { type: 'string', example: '2022-01-01' },
        }}}}},
        responses: { 200: { description: 'Updated' } },
      },
      delete: { tags: ['Profile - Licences'], summary: 'Delete', security: [{ bearerAuth: [] }, { csrfToken: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },
    '/api/profile/courses': {
      get:  { tags: ['Profile - Courses'], summary: 'List courses', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } },
      post: {
        tags: ['Profile - Courses'], summary: 'Add course', security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'provider'],
          properties: {
            name:          { type: 'string', example: 'Kubernetes Administrator' },
            provider:      { type: 'string', example: 'CNCF' },
            url:           { type: 'string', example: 'https://cncf.io/ckad' },
            completedDate: { type: 'string', example: '2023-03-15' },
          }}}}},
        responses: { 201: { description: 'Created' } },
      },
    },
    '/api/profile/courses/{id}': {
      put: {
        tags: ['Profile - Courses'], summary: 'Update', security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
          name:          { type: 'string', example: 'Kubernetes Administrator' },
          provider:      { type: 'string', example: 'Linux Foundation' },
          url:           { type: 'string', example: 'https://cncf.io/ckad' },
          completedDate: { type: 'string', example: '2023-03-15' },
        }}}}},
        responses: { 200: { description: 'Updated' } },
      },
      delete: { tags: ['Profile - Courses'], summary: 'Delete', security: [{ bearerAuth: [] }, { csrfToken: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },
    '/api/profile/employment': {
      get:  { tags: ['Profile - Employment'], summary: 'List employment history', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } },
      post: {
        tags: ['Profile - Employment'], summary: 'Add employment record', security: [{ bearerAuth: [] }, { csrfToken: [] }],
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
        tags: ['Profile - Employment'], summary: 'Update', security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: {
          jobTitle:  { type: 'string', example: 'Software Engineer' },
          employer:  { type: 'string', example: 'TechStartup Ltd' },
          startDate: { type: 'string', example: '2017-06-01' },
          endDate:   { type: 'string', example: '2018-08-31' },
          current:   { type: 'boolean', example: false },
        }}}}},
        responses: { 200: { description: 'Updated' } },
      },
      delete: { tags: ['Profile - Employment'], summary: 'Delete', security: [{ bearerAuth: [] }, { csrfToken: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },

    // BIDDING
    '/api/bids/tomorrow': {
      get: { tags: ['Bidding'], summary: "View tomorrow's slot info", security: [{ bearerAuth: [] }], responses: { 200: { description: 'Slot info' } } },
    },
    '/api/bids': {
      post: {
        tags: ['Bidding'], summary: 'Place a bid',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['amount'],
          properties: { amount: { type: 'number', example: 250, minimum: 1 } },
        }}}},
        responses: { 201: { description: 'Bid placed + blind feedback' }, 400: { description: 'Closed / limit / balance' }, 409: { description: 'Already bid today' } },
      },
    },
    '/api/bids/{id}': {
      patch:  { tags: ['Bidding'], summary: 'Increase bid amount', security: [{ bearerAuth: [] }, { csrfToken: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { amount: { type: 'number' } } } } } }, responses: { 200: { description: 'Updated' } } },
      delete: { tags: ['Bidding'], summary: 'Cancel bid', security: [{ bearerAuth: [] }, { csrfToken: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Cancelled' } } },
    },
    '/api/bids/status':  { get: { tags: ['Bidding'], summary: 'Blind win/lose status', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Status' } } } },
    '/api/bids/history': { get: { tags: ['Bidding'], summary: 'Own bid history',       security: [{ bearerAuth: [] }], responses: { 200: { description: 'Bids array' } } } },
    '/api/bids/monthly': { get: { tags: ['Bidding'], summary: 'Monthly limit status (X/3)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Monthly stats' } } } },
    '/api/bids/resolve': { post: { tags: ['Bidding'], summary: '(Admin) Resolve daily auction', security: [{ bearerAuth: [] }, { csrfToken: [] }], responses: { 200: { description: 'Winner selected' } } } },

    // WINNERS
    '/api/winners/today': { get: { tags: ['Winners'], summary: "Today's Alumni of the Day", security: [{ bearerAuth: [] }], responses: { 200: { description: 'Winner' } } } },
    '/api/winners':       { get: { tags: ['Winners'], summary: 'Winner history',            security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } } },

    // SPONSORS
    '/api/sponsors': {
      get: { tags: ['Sponsors'], summary: 'List sponsors', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } },
      post: {
        tags: ['Sponsors'], summary: '(Admin) Create sponsor', security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object',
          required: ['name', 'category'],
          properties: {
            name:        { type: 'string', example: 'Microsoft Azure' },
            category:    { type: 'string', example: 'Cloud Certification' },
            description: { type: 'string', example: 'Azure cloud platform certifications' },
          },
        }}}},
        responses: { 201: { description: 'Created' } },
      },
    },
    '/api/sponsors/{id}/offers': {
      post: {
        tags: ['Sponsors'],
        summary: '(Admin) Make offer to alumni',
        description: '**Step 1:** Login as admin via POST /api/auth/login\n\n**Step 2:** Call GET /api/csrf-token and copy the csrfToken\n\n**Step 3:** Click Authorize and paste the csrfToken into the csrfToken field\n\n**Step 4:** Use sponsor ID (e.g. `s1`) as the path parameter and the alumni profile ID in the body',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Sponsor ID — use s1, s2, s3, s4, or s5 from seed data' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object',
          required: ['profileId', 'certificationName', 'offerAmount'],
          properties: {
            profileId:         { type: 'string', example: 'p1', description: 'Alumni profile ID — get from GET /api/alumni' },
            certificationName: { type: 'string', example: 'AWS Solutions Architect' },
            offerAmount:       { type: 'number', example: 200 },
          },
        }}}},
        responses: { 201: { description: 'Offer created — copy the offer id for the respond endpoint' } },
      },
    },
    '/api/sponsors/offers/{id}/respond': {
      patch: {
        tags: ['Sponsors'],
        summary: 'Accept or decline sponsorship offer',
        description: 'Call this as the **alumni user** (not admin). Login as the alumni, get a fresh CSRF token, then accept or decline.',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'Offer ID from POST /api/sponsors/{id}/offers response' }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { decision: { type: 'string', enum: ['accepted', 'declined'] } } } } } },
        responses: { 200: { description: 'Responded — wallet updated if accepted' } },
      },
    },

    // EVENTS
    '/api/events': {
      get: { tags: ['Events'], summary: 'List events', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Array' } } },
      post: {
        tags: ['Events'], summary: '(Admin) Create event', security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object',
          required: ['title', 'date', 'location'],
          properties: {
            title:           { type: 'string', example: 'Spring Networking Evening' },
            date:            { type: 'string', example: '2026-04-15' },
            location:        { type: 'string', example: 'London Campus' },
            description:     { type: 'string', example: 'Alumni mixer for tech graduates' },
            unlocksExtraBid: { type: 'boolean', example: true },
          },
        }}}},
        responses: { 201: { description: 'Created' } },
      },
    },
    '/api/events/{id}/register': {
      post: {
        tags: ['Events'], summary: 'Register for event',
        security: [{ bearerAuth: [] }, { csrfToken: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 201: { description: 'Registered' } },
      },
    },

    // WALLET
    '/api/wallet': { get: { tags: ['Wallet'], summary: 'Wallet balance + transactions', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Wallet data' } } } },

    //API KEYS 
    '/api/keys': {
      get: { tags: ['API Keys'], summary: 'List all API keys', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Keys array' } } },
      post: {
        tags: ['API Keys'], summary: 'Generate new API key', security: [{ bearerAuth: [] }, { csrfToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object',
          required: ['name'],
          properties: {
            name:   { type: 'string', example: 'Demo Mobile Client' },
            scopes: { type: 'array', items: { type: 'string' }, example: ['read:featured', 'read:alumni'] },
          },
        }}}},
        responses: { 201: { description: 'Key generated (save it now)' } },
      },
    },
    '/api/keys/{id}': {
      get:    { tags: ['API Keys'], summary: 'Key details + stats', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Key detail' } } },
      delete: { tags: ['API Keys'], summary: 'Revoke key', security: [{ bearerAuth: [] }, { csrfToken: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Revoked' } } },
    },
    '/api/keys/{id}/stats': { get: { tags: ['API Keys'], summary: 'Usage logs with timestamps', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Stats' } } } },

    // PUBLIC
    '/api/public/featured':    { get: { tags: ['Public API'], summary: "Today's Alumni of the Day (AR Client endpoint)", security: [{ apiKeyAuth: [] }], responses: { 200: { description: 'Featured alumnus' } } } },
    '/api/public/alumni':      { get: { tags: ['Public API'], summary: 'Browse alumni directory', security: [{ apiKeyAuth: [] }], responses: { 200: { description: 'Alumni list' } } } },
    '/api/public/alumni/{id}': { get: { tags: ['Public API'], summary: 'Single alumni public profile', security: [{ apiKeyAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Profile' } } } },
    '/api/public/sponsors':    { get: { tags: ['Public API'], summary: 'Sponsor list', security: [{ apiKeyAuth: [] }], responses: { 200: { description: 'Sponsors' } } } },
    '/api/public/events':      { get: { tags: ['Public API'], summary: 'Upcoming alumni events', security: [{ apiKeyAuth: [] }], responses: { 200: { description: 'Events' } } } },
  },
};

module.exports = { swaggerUi, swaggerSpec };