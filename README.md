# StagePass — Full Stack Event Booking Platform

React + Express + MySQL + Razorpay + Google OAuth

---

## Project Structure

```
stagepass-fullstack/
├── backend/          Express + Node.js API
│   ├── src/
│   │   ├── config/   DB connection, migrations, seeds
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── routes/
│   └── package.json
└── frontend/         React + Tailwind CSS
    ├── src/
    │   ├── components/
    │   ├── context/
    │   ├── pages/
    │   └── services/
    └── package.json
```

---

## Prerequisites

- Node.js 18+
- MySQL 8.0+
- Razorpay account (test mode keys)
- Google Cloud Console project (OAuth credentials)

---

## 1. MySQL Setup

```sql
-- Just make sure MySQL is running.
-- The migration script creates the database automatically.
```

---

## 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=stagepass

JWT_SECRET=change_this_to_a_long_random_string

GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx

FRONTEND_URL=http://localhost:5173

ADMIN_EMAIL=admin@stagepass.com
ADMIN_PASSWORD=Admin@123456
```

Run migrations (creates all tables):
```bash
npm run migrate
```

Seed sample data (events, venues, admin user):
```bash
npm run seed
```

Start the API server:
```bash
npm run dev       # development (nodemon)
npm start         # production
```

API will be live at `http://localhost:5000`

---

## 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
VITE_RAZORPAY_KEY_ID=rzp_test_xxx
```

Start the dev server:
```bash
npm run dev
```

Frontend will be live at `http://localhost:5173`

---

## 4. Google OAuth Setup

1. Go to https://console.cloud.google.com
2. Create a new project or select existing
3. Enable "Google+ API" / "Google Identity"
4. Create OAuth 2.0 credentials (Web application)
5. Add `http://localhost:5173` to Authorized JavaScript Origins
6. Copy Client ID → `GOOGLE_CLIENT_ID` in both `.env` files

---

## 5. Razorpay Setup

1. Sign up at https://razorpay.com
2. Use Test Mode keys (no real money)
3. Copy Key ID and Key Secret to `.env` files
4. Test card: `4111 1111 1111 1111`, any future expiry, any CVV

---

## Default Admin Credentials

After running seed:
- **Email:** admin@stagepass.com
- **Password:** Admin@123456
- Admin panel: http://localhost:5173/admin

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | — | Register with email |
| POST | /api/auth/login | — | Login |
| POST | /api/auth/google | — | Google OAuth |
| GET | /api/auth/me | ✓ | Get current user |
| GET | /api/events | — | List events |
| GET | /api/events/:id | — | Event details |
| GET | /api/events/:id/seats | ✓ | Seat map |
| POST | /api/events/:id/hold-seats | ✓ | Hold seats (10 min) |
| POST | /api/orders/create | ✓ | Create Razorpay order |
| POST | /api/orders/verify-payment | ✓ | Verify payment |
| GET | /api/orders/my-bookings | ✓ | User's bookings |
| POST | /api/orders/validate-promo | ✓ | Validate promo code |
| GET | /api/admin/stats | Admin | Dashboard stats |
| GET | /api/admin/events | Admin | Manage events |
| POST | /api/admin/events | Admin | Create event |
| PUT | /api/admin/events/:id | Admin | Update event |
| GET | /api/admin/users | Admin | All users |
| GET | /api/admin/orders | Admin | All orders |

---

## Key Features

- **Auth:** Email/password + Google OAuth with JWT
- **Discovery:** Genre filters, search, AI-style nudges, availability indicators
- **Seat Map:** Interactive seat selection grouped by tier, real-time hold system (10-min lock)
- **Payments:** Full Razorpay integration — UPI, cards, wallets, net banking
- **Promo Codes:** FIRST50 (₹200 flat), WEEKEND20 (20%), VIP500 (₹500 flat)
- **Admin Panel:** Create/edit events with tier management, view users, monitor orders, revenue dashboard
- **Database:** 9 MySQL tables with transactions, seat locking, referential integrity
