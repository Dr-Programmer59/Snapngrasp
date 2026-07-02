# SnapNGrasp API

AI-driven study app backend with Canvas LMS integration, OCR, TTS, and progress tracking.

## Tech Stack

- **Runtime**: Node.js 18+ / TypeScript
- **Framework**: Express.js
- **Database & Auth**: Supabase (PostgreSQL + Auth + Storage)
- **Integrations**: Google Vision OCR, Canvas LMS API
- **Monitoring**: Sentry
- **Hosting**: Render (server), Supabase (DB/Storage/Auth)

## Installation

```bash
npm install
```

Or install all dependencies at once:

```bash
npm i express cors helmet compression pino pino-pretty morgan dotenv zod axios multer express-rate-limit @supabase/supabase-js @google-cloud/vision @sentry/node @sentry/profiling-node && npm i -D typescript ts-node nodemon jest ts-jest @types/jest supertest @types/supertest @types/node @types/express @types/multer eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in required environment variables:
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_APPLICATION_CREDENTIALS` (path to GCP service account JSON)
   - `CANVAS_API_BASE_URL` and `CANVAS_API_TOKEN`
   - `SENTRY_DSN` (optional, for error monitoring)
   - `CORS_ORIGIN` (your mobile app URL)

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production server
- `npm test` - Run tests with Jest
- `npm run lint` - Lint code with ESLint
- `npm run typecheck` - Type check without emitting files

## Development

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Supabase credentials
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

# Start development server
npm run dev
```

Server will start on `http://localhost:8080` (or the PORT specified in `.env`)

### Quick Test

```bash
# Health check
curl http://localhost:8080/api/health

# Should return:
# {"status":"ok","timestamp":"...","version":"1.0.0"}
```

## Production Build

```bash
npm run build
npm start
```

## Project Structure

```
snapngrasp-api/
├── src/
│   ├── app.ts              # Express app setup
│   ├── server.ts           # HTTP server entry point
│   ├── routes/
│   │   ├── index.ts        # Route aggregator ✅
│   │   ├── auth.routes.ts  # Auth endpoints ✅
│   │   └── onboarding.routes.ts  # Onboarding ✅
│   ├── controllers/
│   │   ├── auth.controller.ts  # Auth handlers ✅
│   │   └── onboarding.controller.ts  # Onboarding ✅
│   ├── models/             # Domain types (to be created)
│   ├── services/
│   │   └── supabase.service.ts  # Supabase client ✅
│   ├── middlewares/
│   │   └── auth.middleware.ts  # JWT validation ✅
│   ├── utils/
│   │   ├── logger.ts       # Pino logger ✅
│   │   └── env.ts          # Zod env validation ✅
│   ├── config/             # Configuration files
│   ├── jobs/               # Background jobs (future)
│   └── views/              # Templates (if needed)
├── docs/
│   ├── AUTH_README.md      # Auth setup guide ✅
│   ├── auth_security.md    # Security review ✅
│   ├── auth_e2e.md         # E2E test checklist ✅
│   └── Auth_Collection.json  # Postman collection ✅
├── tests/                  # Test files (to be created)
└── dist/                   # Compiled output (generated)
```

## API Endpoints

### Health
- `GET /api/health` - Health check

### Authentication ✅ IMPLEMENTED
- `GET /api/auth/validate` - Validate JWT token
- `POST /api/auth/logout` - Device sign-out
- `POST /api/auth/logout-all` - Revoke all tokens
- `POST /api/auth/email/signup` - Email signup
- `POST /api/auth/email/login` - Email login
- `GET /api/auth/oauth/url` - Get OAuth URL (Google/Apple)

**📖 See [docs/AUTH_README.md](docs/AUTH_README.md) for complete authentication guide**

### Onboarding ✅ IMPLEMENTED
- `POST /api/onboarding/complete` - Complete onboarding with learning style
- `POST /api/onboarding/set-style` - Update learning style

### Uploads (To Be Implemented)
- `POST /api/uploads/file` - Upload & OCR images/PDFs

### Study
- `POST /study/flashcards` - Generate flashcards
- `POST /study/quizzes` - Generate quizzes
- `POST /study/explanations` - Generate explanations

### Voice
- `POST /voice/tts` - Text-to-speech synthesis

### Visual
- `POST /visual/diagram` - Visual study mode

### Progress
- `GET /progress/summary` - Get user progress

### Canvas LMS
- `GET /canvas/assignments` - Sync Canvas assignments

### Admin
- `GET /admin/stats` - Platform statistics
- `DELETE /admin/content/:id` - Remove content

## Documentation

- **[Authentication Setup](docs/AUTH_README.md)** - Complete auth & onboarding guide
- **[Security Review](docs/auth_security.md)** - RLS, admin roles, token management
- **[E2E Tests](docs/auth_e2e.md)** - Acceptance criteria checklist
- **[Postman Collection](docs/Auth_Collection.json)** - Import-ready API tests

## Testing

### Import Postman Collection

1. Open Postman
2. Import → Upload Files → `docs/Auth_Collection.json`
3. Set environment variable `base_url` to `http://localhost:8080/api`
4. Run collection

### Manual Testing

```bash
# 1. Signup
curl -X POST http://localhost:8080/api/auth/email/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","display_name":"Test"}'

# 2. Login
curl -X POST http://localhost:8080/api/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'

# Copy the access_token from response

# 3. Validate
curl -X GET http://localhost:8080/api/auth/validate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 4. Complete onboarding
curl -X POST http://localhost:8080/api/onboarding/complete \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"learning_style":"visual","display_name":"Test User"}'
```

## License

MIT
