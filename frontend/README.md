# Vape Store Workspace

This repository is split into a dedicated frontend and backend:

- `frontend/`: React + Vite storefront
- `backend/`: Node.js + Express + MongoDB API
- `api/[...path].js`: Vercel serverless bridge

## Quick Start

From the repository root:

```bash
npm run dev
```

That starts:

- the Vite frontend from `frontend/`
- the Express backend from `backend/`

You can also run each side independently:

```bash
cd frontend
npm install
npm run dev
```

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

## MongoDB Atlas + Vercel Setup

1. Create a MongoDB Atlas cluster, then create a database user with read and write access.
2. In Atlas, open `Network Access` and allow your IP address or `0.0.0.0/0` for testing.
3. Copy your Atlas connection string and replace the placeholders with your real username, password, and database name.
4. Add `MONGODB_URI` in Vercel under `Project Settings -> Environment Variables` for the environments you use.
5. For local development, create either a repository-root `.env` or `backend/.env`. Both are now supported by the backend loader.
6. Start the app and request `/api/health`. A healthy MongoDB connection now returns `message: "MongoDB connection is active."` and `database.connected: true`.
7. On Vercel, check the function logs for the backend bootstrap message if you want to confirm the connection at deployment time.

## Frontend Notes

- The Vite dev server proxies `/api` requests to `http://localhost:5000`
- Route components live under `frontend/src/pages/`
- Reusable UI lives under `frontend/src/components/`
- Session and API logic are separated into `frontend/src/services/` and `frontend/src/api/`

## Backend Notes

- The canonical Express runtime lives under `backend/src/app/`
- MongoDB Atlas is the primary persistent database in production
- If MongoDB is unavailable on Vercel, the API can fall back to the runtime store backed by Vercel Blob
- Uploaded assets use the configured external object storage provider independently from the primary database choice
- Development can use `STORAGE_PROVIDER=mock` only when `ENABLE_DEV_MOCK_STORAGE=true`

Important backend environment variables:

- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_ORIGIN`
- `PHONE_DATA_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NOTIFICATION_EMAIL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `MONGO_FALLBACK_RETRY_DELAY_MS`

Optional feature-specific variables:

- `STORAGE_PROVIDER`
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`
- `BLOB_READ_WRITE_TOKEN`
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER`

Default local values are defined in `backend/.env.example`.
Root-level local defaults can also be defined in `.env.example`.

## Vercel Deployment

The repository-level `vercel.json` is already wired to:

- install dependencies from `frontend/` and `backend/`
- build the frontend from `frontend/`
- publish `frontend/dist`
- expose the backend through `/api/[...path].js`

Required production environment variables in Vercel:

- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_ORIGIN`
- `PHONE_DATA_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Add provider-specific variables only when that feature is enabled:

- uploads via `cloudinary`: `STORAGE_PROVIDER=cloudinary`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- uploads via `vercel-blob`: `STORAGE_PROVIDER=vercel-blob`, `BLOB_READ_WRITE_TOKEN`
- MongoDB fallback persistence on Vercel Blob: `BLOB_READ_WRITE_TOKEN`
- phone verification via Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`

## Project Guide

- [Project Structure](../docs/project-structure.md)
- [Manual Review](../docs/manual-review.md)
