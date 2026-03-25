# Vape Store App

React + Vite storefront with a new Node.js + Express + MongoDB backend.

## What It Includes

- JWT user registration and login
- Seeded admin account with protected admin APIs
- Product and category management APIs
- Cart API backed by MongoDB
- Checkout flow that stores shipping details and order snapshots
- User order history and admin order management
- Admin email notification support through Nodemailer

## Frontend

```bash
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:5000`.

## Backend

```bash
cd server
npm install
copy .env.example .env
npm run dev
```

Important backend environment variables:

- `MONGODB_URI`: MongoDB connection string
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

The current codebase passes:

- `npm run lint`
- `npm run build`

MongoDB was not listening on `127.0.0.1:27017` during verification, so the backend could not be started fully in this session.

## Project Guide

- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
