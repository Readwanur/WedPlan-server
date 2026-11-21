# WedPlan Server — Express.js & MongoDB Backend API

WedPlan Server is the RESTful Express.js and MongoDB backend for **WedPlan — Wedding Planning Platform**. It provides JWT authentication and role-based access control (`customer`, `vendor`, `admin`), wedding service CRUD with Free Plan active-listing limits, customer booking request workflows with duplicate date protection, admin user and service moderation, ImgBB image hosting integration, and Stripe Checkout subscription payments with webhook verification.

---

## Project Links

- **Live Website Link**: *(Add deployed client URL here)*
- **Server Repository Link**: *(Add GitHub Server Repo URL here)*
- **Client Repository Link**: *(Add GitHub Client Repo URL here)*

---

## Important Features

- **JWT Authentication & Role-Based Authorization**: Exchanges verified Better Auth sessions from MongoDB for signed JWTs (`verifyJWT`, `verifyNotBlocked`, and `requireRole("admin" | "vendor" | "customer")` middlewares).
- **Wedding Services API (`/api/services`)**:
  - Public endpoint returning only `approved` and `isActive` services with advanced search, category filtering, location filtering, and ascending/descending price sorting.
  - Protected vendor endpoints for adding, updating, deleting, and toggling availability of services with server-side enforcement of the Free Plan 3-active-services limit.
- **Booking Request System (`/api/bookings`)**:
  - Protected customer endpoints to create booking requests (preventing duplicate active bookings for the same service and event date, self-booking, and admin booking) and cancel `Pending` bookings.
  - Protected vendor endpoints to view incoming booking requests and finalize `Accepted` or `Rejected` status decisions.
- **Admin Operations & Moderation (`/api/admin`)**:
  - Real-time platform statistics (`totalUsers`, `totalVendors`, `totalCustomers`, `totalServices`, `pendingServices`, `totalTransactions`).
  - User search, role filtering, details inspection, and account blocking/unblocking.
  - Service approval (`approved`, `rejected`, `pending`) and removal of inappropriate listings.
  - Read-only financial transaction ledger (`/api/admin/transactions`).
- **Stripe Checkout & Webhook Verification (`/api/payments`)**:
  - Creates Stripe Checkout Sessions (Test Mode) for the $49 USD Premium Vendor Plan.
  - Verifies Stripe webhook signatures (`checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`) before activating Premium access and recording transactions in the `transactions` collection.
- **ImgBB Image Upload (`/api/upload`)**:
  - Server-side proxy for uploading profile avatars and service gallery images to ImgBB.

---

## Technology Stack

- **Runtime & Framework**: Node.js, Express.js v5
- **Database**: MongoDB (`user`, `services`, `bookings`, `transactions`)
- **Authentication & Security**: Better Auth (Crypto & Session Verification), `jsonwebtoken` (JWT), `cors`
- **Payments & Media**: `stripe` (Stripe Checkout & Webhooks), ImgBB API

---

## Environment Variables

Create a `.env` file in the root of `wedplan-server` (never commit `.env` to Git):

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
BETTER_AUTH_SECRET=your_better_auth_secret
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
IMGBB_API_KEY=your_imgbb_api_key
```

---

## Installation & How to Run Locally

1. **Install dependencies**:
   ```bash
   cd wedplan-server
   npm install
   ```

2. **Seed initial database records (Admin, Vendors, Customers, Services, Bookings, Transactions)**:
   ```bash
   npm run seed
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   The API server will run on `http://localhost:5000`.

---

## Evaluation & Demo Credentials

- **Admin Account**: `admin@wedplan.com` / `Admin123`
- **Vendor Account (Free Plan)**: `contact@emeraldhospitality.com` / `Vendor123`
- **Vendor Account (Premium Plan)**: `studio@frameandfocus.bd` / `Vendor123`
- **Customer Account**: `customer@wedplan.com` / `Customer123`
