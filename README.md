# EBMA AI Superadmin Portal

Standalone Next.js application for EBMA account access and the superadmin console. The app keeps the existing App Router, components, hooks, and library structure so its login, signup, OAuth callback, admin modules, and shared platform features work independently from `ebma_ai_frontend`.

## Configuration

Set `NEXT_PUBLIC_API_BASE_URL` in `.env` to the EBMA backend API base URL (without a trailing slash). Authentication and portal data are served by that backend. OAuth provider credentials and other private service keys must remain configured on the backend; they are not browser environment variables.

`.env.example` contains the local development default.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use `npm run build` to create the production build and `npm start` to serve it.
