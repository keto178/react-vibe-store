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

## Frontend Notes

- The Vite dev server proxies `/api` requests to `http://localhost:5000`
- Route components live under `frontend/src/pages/`
- Reusable UI lives under `frontend/src/components/`
- Session and API logic are separated into `frontend/src/services/` and `frontend/src/api/`

## Backend Notes

- The canonical Express runtime lives under `backend/src/app/`
- MongoDB Atlas is the required persistent database
- Uploaded assets must use the configured external storage provider
- Development can use `STORAGE_PROVIDER=mock` only when `ENABLE_DEV_MOCK_STORAGE=true`

Important backend environment variables:

- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_ORIGIN`
- `STORAGE_PROVIDER`
- `PHONE_DATA_SECRET`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
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
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`
- `BLOB_READ_WRITE_TOKEN`

Default local values are defined in `backend/.env.example`.

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
- `STORAGE_PROVIDER`
- `PHONE_DATA_SECRET`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `ADMIN_USERNAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Add provider-specific variables for the chosen storage adapter:

- `cloudinary`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `vercel-blob`: `BLOB_READ_WRITE_TOKEN`

## Project Guide

- [Project Structure](../docs/project-structure.md)
- [Manual Review](../docs/manual-review.md)
