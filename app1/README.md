# Vape Store App

React + Vite storefront with a new Node.js + Express + MongoDB backend.

## What It Includes

- JWT user registration and login
- Active-session sync through `/api/auth/me` after login or page refresh
- Seeded admin account with protected admin APIs
- Product and category management APIs
- Cart API backed by MongoDB
- Checkout flow that stores shipping details and order snapshots
- User order history and admin order management
- Admin email notification support through Nodemailer
- Local file-storage fallback for backend development when MongoDB is unavailable
- Production API prefers MongoDB-only mode and can use optional emergency in-memory fallback via env flag

## Frontend

```bash
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:5000`.

## Vercel Deployment

This project is a Vite app, not Create React App.

- Build command: `npm run build`
- Output directory: `dist`
- SPA routes are handled through the repository-level [`vercel.json`](../vercel.json)
- The `/api` backend is exposed through a Vercel serverless function in [`/api/[...path].js`](../api/%5B...path%5D.js)

If you deploy the whole repository to Vercel, the included `vercel.json` already points Vercel to the nested `app1` frontend and keeps client-side routing working.

For the backend to work on Vercel, add these environment variables in the Vercel project settings:

- `MONGODB_URI`
- `DATABASE_URL` (optional alias)
- `MONGO_URI` (optional alias)
- `MONGODB_URL` (optional alias)
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
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

If you use a custom domain instead of `*.vercel.app`, also set:

- `CLIENT_ORIGIN`

## Backend

```bash
cd server
npm install
copy .env.example .env
npm run dev
```

Important backend environment variables:

- `MONGODB_URI`: MongoDB connection string
- `DATABASE_URL` / `MONGO_URI` / `MONGODB_URL`: accepted aliases for MongoDB connection string
- `MONGO_SERVER_SELECTION_TIMEOUT_MS`: Mongo initial server selection timeout (default `15000` in production)
- `MONGO_CONNECT_RETRIES`: retry count before failing startup (default `2` in production)
- `MONGO_CONNECT_RETRY_DELAY_MS`: retry delay in milliseconds (default `1500`)
- `ALLOW_PRODUCTION_MEMORY_FALLBACK`: set to `true` only for emergency temporary access when MongoDB is down
- `JWT_SECRET`: secret used to sign auth tokens
- `ADMIN_USERNAME`: seeded admin username
- `ADMIN_EMAIL`: seeded admin login email
- `ADMIN_PASSWORD`: seeded admin password
- `ADMIN_NOTIFICATION_EMAIL`: inbox that receives new-order emails
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: email delivery settings

## Default Admin Seed

The backend seeds one admin account and default categories on startup if they do not already exist.

The default seed values come from `server/.env.example`:

- Email: `admin@example.com`
- Password: `Admin@12345`
- Username: `store-admin`

Change those values in `server/.env` before running in a real environment.

## API Summary

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:categoryId`
- `DELETE /api/categories/:categoryId`
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/:productId`
- `DELETE /api/products/:productId`
- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:itemId`
- `DELETE /api/cart/items/:itemId`
- `POST /api/orders/checkout`
- `GET /api/orders/me`
- `GET /api/orders`
- `PATCH /api/orders/mark-seen`
- `PATCH /api/orders/:orderId/status`
- `DELETE /api/orders/:orderId`

## Verification

The frontend codebase passes:

- `npm run lint`

`npm run build` may fail in restricted Windows sandbox environments because Vite attempts an OS-level spawn while resolving paths. Re-run it in a normal local shell to verify the production build outside the sandbox if needed.

## Project Guide

- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
