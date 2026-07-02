# SnapNGrasp

SnapNGrasp is split into two apps:

- `Backend/` - Node.js + TypeScript API
- `Frontend/` - Expo React Native app

This repository is set up so both folders live at the top level.

## Prerequisites

- Node.js 18 or newer
- npm 9 or newer
- A Supabase project
- A backend host for deployment if you are not running locally
- Expo CLI / Expo Go for the mobile app

## Environment Files

Do not commit real secrets to GitHub. Create local `.env` files in each app folder.

### Backend/.env

Copy the sample file first:

```bash
cd Backend
copy .env.example .env
```

Then fill in the required values in `Backend/.env`.

Required or commonly used variables:

- `PORT`
- `NODE_ENV`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID`
- `CANVAS_API_BASE_URL`
- `CANVAS_API_TOKEN`
- `CORS_ORIGIN`
- `APPLE_IAP_SHARED_SECRET`
- `REVENUECAT_SECRET_API_KEY`

If you use Apple IAP or RevenueCat, also set the product IDs and entitlement names already listed in `Backend/.env.example`.

### Frontend/.env

Create a `.env` file inside `Frontend/`.

The frontend reads runtime variables through the `EXPO_PUBLIC_` prefix, so any value needed in the app must use that format.

Common frontend variables:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_BACKEND_URL`
- `EXPO_PUBLIC_AGENT_MODE`
- `EXPO_PUBLIC_AGENT_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- `EXPO_PUBLIC_APPLE_IAP_MONTHLY_PRODUCT_ID`
- `EXPO_PUBLIC_APPLE_IAP_YEARLY_PRODUCT_ID`
- `EXPO_PUBLIC_APPLE_IAP_PRO_PLUS_MONTHLY_PRODUCT_ID`
- `EXPO_PUBLIC_RC_ENTITLEMENT_PRO`
- `EXPO_PUBLIC_RC_ENTITLEMENT_PRO_PLUS`
- `EXPO_PUBLIC_PRIVACY_POLICY_URL`
- `EXPO_PUBLIC_TERMS_URL`

For local development, point the API URL at your backend server, for example:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_BACKEND_URL=http://localhost:8080
EXPO_PUBLIC_AGENT_MODE=private
```

## Run Locally

### Backend

```bash
cd Backend
npm install
npm run dev
```

Backend scripts:

- `npm run dev` - start the API in development mode
- `npm run build` - compile TypeScript
- `npm start` - run the compiled production build
- `npm run test` - run tests
- `npm run lint` - lint the codebase
- `npm run typecheck` - run TypeScript checks

The backend typically runs on `http://localhost:8080`.

### Frontend

```bash
cd Frontend
npm install
npm run start
```

Frontend scripts:

- `npm run start` - start the Expo dev server
- `npm run android` - open Android emulator/build
- `npm run ios` - open iOS simulator/build
- `npm run web` - start the web version
- `npm run lint` - lint the app

## Suggested Local Order

1. Start the backend first so the API is available.
2. Create `Frontend/.env` and point it at the backend URL.
3. Start the frontend after the backend is reachable.

## More Details

- Backend-specific setup: [Backend/README.md](Backend/README.md)
- Frontend environment notes: [Frontend/ENVIRONMENT_SETUP.md](Frontend/ENVIRONMENT_SETUP.md)
- Frontend troubleshooting: [Frontend/TROUBLESHOOTING_GUIDE.md](Frontend/TROUBLESHOOTING_GUIDE.md)
