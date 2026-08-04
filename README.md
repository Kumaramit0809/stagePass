# StagePass — Full Stack Event Booking Platform

React + Express + MySQL + Razorpay + Google OAuth

## Project Structure

```
stagepass/
├── backend/    Express API (controllers, routes, middleware, config)
└── frontend/   React + Tailwind CSS
```

## Prerequisites

- Node.js 18+
- MySQL 8.0+
- Razorpay account (test mode)
- Google Cloud Console project (OAuth credentials)

## Setup

**Backend**
```bash
cd backend
npm install
cp .env.example .env    # fill in your own values
npm run migrate         # creates the database and tables
npm run seed             # adds sample events, venues, and an admin user
npm run dev
```
Runs at `http://localhost:5000`

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env    # fill in your own values
npm run dev
```
Runs at `http://localhost:5173`

See `.env.example` in each folder for the required variables.

## Google OAuth & Razorpay

- Google OAuth credentials: [console.cloud.google.com](https://console.cloud.google.com) → create OAuth 2.0 credentials → add `http://localhost:5173` as an authorized origin
- Razorpay test keys: [razorpay.com](https://razorpay.com) → Dashboard → Settings → API Keys (Test Mode)

## API Overview

| Area | Examples |
|------|----------|
| Auth | register, login, Google OAuth, current user |
| Events | list, detail, seat map, hold seats |
| Orders | create, verify payment, promo codes, my bookings |
| Admin | dashboard stats, manage events/users/orders/venues |

Full route list is in `backend/src/routes/index.js`.

## Key Features

- Email/password + Google OAuth authentication
- Event discovery with genre filters and search
- Interactive seat map with a real-time seat hold system
- Razorpay payments (UPI, cards, wallets, net banking)
- Promo code support
- Admin panel for events, users, and orders