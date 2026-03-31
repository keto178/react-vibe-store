# Project Structure

This repository is organized around a React storefront and a production-hardened Express API built for MongoDB Atlas and external object storage.

## Root

- `frontend/`
  React + Vite storefront application.
- `backend/`
  Express + MongoDB API package.
- `api/[...path].js`
  Vercel serverless bridge that bootstraps the backend app.
- `scripts/`
  Workspace-level helper scripts such as the combined local dev runner.
- `docs/`
  Architecture notes and review items.
- `legacy/`
  Local artifacts intentionally kept outside the active runtime.

## Frontend

- `frontend/src/app/`
  App shell and top-level layout wiring.
- `frontend/src/pages/`
  Route-level screens such as home, auth, cart, shipping, orders, phone verification, and dashboard.
- `frontend/src/components/`
  Reusable UI pieces grouped by concern like `layout/` and `catalog/`.
- `frontend/src/hooks/`
  Session and app-store hooks.
- `frontend/src/api/`
  HTTP client layer for `/api` calls.
- `frontend/src/services/`
  Frontend domain services such as session persistence.
- `frontend/src/utils/`
  Formatting, storage cleanup, cart, and runtime-health helpers.
- `frontend/src/routes/`
  Route table and protection logic.

## Backend

- `backend/src/config/`
  Environment validation and database connection wrappers.
- `backend/src/app/`
  Canonical backend runtime.
- `backend/src/app/routes/`
  API route registration.
- `backend/src/app/controllers/`
  Thin HTTP handlers.
- `backend/src/app/services/`
  Business workflows for auth, catalog, cart, checkout, uploads, and health.
- `backend/src/app/repositories/`
  MongoDB-backed repositories for users, categories, products, carts, and orders.
- `backend/src/app/models/`
  Mongoose models.
- `backend/src/app/middleware/`
  Request context, auth, async, and error middleware.
- `backend/src/app/utils/`
  Shared serializers and order helpers.
- `backend/src/adapters/database/`
  Mongoose connection and transaction adapter.
- `backend/src/adapters/objectStorage/`
  Cloudinary, Vercel Blob, and explicitly gated dev mock storage providers.
- `backend/src/services/`
  Compatibility facades and integration helpers such as email, SMS, and phone encryption.

## Notes

- Production startup now fails fast if MongoDB, JWT, phone-encryption, or object-storage configuration is missing.
- Critical business data no longer uses file, memory, or blob-JSON fallback persistence.
- Root-level backend `routes/`, `controllers/`, `models/`, `middleware/`, and selected `services/` files are compatibility shims that point to the canonical `backend/src/app/` implementation.
