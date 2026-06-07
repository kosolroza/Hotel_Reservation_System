# 🏨 Grand Luxe Hotel — Hotel Reservation System

A full-stack hotel reservation system built with **React + TypeScript** frontend and **FastAPI** Python backend, featuring a **Telegram Bot** for real-time payment approval.

> 🌐 **Live Demo:** [hotel-reservation-system-ojf1.vercel.app](https://hotel-reservation-system-ojf1.vercel.app)  
> ⚙️ **API Docs:** [hotel-reservation-system-2cfr.onrender.com/docs](https://hotel-reservation-system-2cfr.onrender.com/docs)

---

## 👥 Team Members

| Name | Student ID |
|------|------------|
| KHOEURNKOSOL Roza | e20230259 |
| KHORN Chanraksmey | e20231232 |
| KHON Solida | e20230142 |
| CHHEN Soklai | e20230392 |
| KHOEURB So Kheang | e20230360 |

**Lecturer:** Mr. KHEAN Vesal  
**Department:** Applied Mathematics and Statistics — Institute of Technology of Cambodia

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Database Design](#database-design)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Screenshots](#screenshots)

---

## 🎯 Overview

The **Grand Luxe Hotel Reservation System** is a production-ready web application that digitizes the entire hotel booking process — from room browsing to payment confirmation. It solves key problems faced by hotels and guests:

**For Hotels:**
- Eliminates double-booking and scheduling conflicts
- Centralizes guest and reservation data
- Real-time payment verification via Telegram Bot
- Automated reports and analytics dashboard

**For Guests:**
- Browse and filter rooms online
- Book instantly with promo code support
- Upload payment slip for bank transfer verification
- Track booking status in real-time

---

## ✨ Features

### Guest Portal
- 🔐 **Authentication** — JWT-based register/login with bcrypt password hashing
- 🛏️ **Room Browsing** — Filter by date, type, price, and availability
- 📅 **Booking Flow** — Multi-step booking with guest info, promo codes, and tax calculation
- 💳 **Payment** — ABA Bank QR code payment + manual slip upload
- 📋 **My Bookings** — View upcoming, active, past, and cancelled bookings
- ⭐ **Reviews** — Submit feedback after checkout (1 review per reservation)

### Admin Portal
- 📊 **Dashboard** — Revenue charts, occupancy rate, booking stats
- 🏠 **Room Management** — Add, edit, remove rooms and amenities
- 👥 **Guest Management** — View all guests and their history
- 👔 **Staff Management** — Add/manage hotel staff with department and salary
- 🎫 **Promotions** — Create and manage promo codes
- 💰 **Payment Management** — View and verify all payments
- 📈 **Reports** — Export booking and revenue reports

### 🤖 Telegram Bot (Unique Feature)
- Admin receives instant booking alert when guest uploads payment slip
- Alert includes: booking reference, guest name, amount, payment photo
- Admin taps ✅ **Approve** or ❌ **Reject** directly from Telegram
- Database updates automatically — no admin panel login needed

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 19 + TypeScript | UI framework with type safety |
| Vite | Build tool |
| Tailwind CSS | Styling |
| TanStack React Query | Server state management |
| React Router DOM v6 | Client-side routing |
| shadcn/ui + Radix UI | UI components |
| Zustand | Global state management |
| React Hook Form + Zod | Form handling and validation |
| Axios | HTTP client |

### Backend
| Technology | Purpose |
|-----------|---------|
| FastAPI | Async Python web framework |
| SQLAlchemy (Async ORM) | Database abstraction layer |
| Pydantic v2 | Data validation and schemas |
| JWT (HS256) | Authentication tokens |
| bcrypt | Password hashing |
| Uvicorn | ASGI server |
| aiomysql | Async MySQL driver |
| uv | Python package manager |

### Database & Tools
| Technology | Purpose |
|-----------|---------|
| MySQL | Primary relational database |
| Telegram Bot API | Real-time payment notifications |
| GitHub | Version control |
| Swagger / OpenAPI | Auto-generated API documentation |

---

## 🏗️ System Architecture

```
👤 User (Browser)
      ↓
🌐 Vercel (Frontend — React + TypeScript)
      ↓ API calls (Axios)
⚙️ Render (Backend — FastAPI)
      ↓ SQLAlchemy ORM
🗄️ Filess.io (MySQL Database)

⚙️ Render (Backend — FastAPI)
      ↓ Telegram webhook
🤖 Telegram Bot (Payment approval)
```

### Backend Layered Architecture

```
HTTP Request
    ↓ LAYER 1 — FastAPI Router
    ↓ LAYER 2 — Authentication (OAuth2 + JWT)
    ↓ LAYER 3 — Business Logic (Service Layer)
    ↓ LAYER 4 — Data Access (SQLAlchemy + aiomysql)
    ↓ LAYER 5 — Standardized Response
```

---

## 🗄️ Database Design

### Tables
| Table | Description |
|-------|-------------|
| `users` | All users (guests, staff, admin) |
| `room_types` | Room categories (Standard, Deluxe, Suite...) |
| `rooms` | Individual rooms with floor, price, status |
| `amenities` | Room amenities (WiFi, AC, TV...) |
| `room_amenities` | Many-to-many junction table |
| `reservations` | All bookings with status lifecycle |
| `payments` | Payment records linked to reservations |
| `feedbacks` | Guest reviews (1:1 per reservation) |
| `staff` | Staff profiles linked to users |
| `promotions` | Promo codes with discount and validity |

### Key Relationships
```
users → reservations    (1 : Many)
users → staff           (1 : 1)
users → feedbacks       (1 : Many)
room_types → rooms      (1 : Many)
rooms ↔ amenities       (Many : Many)
rooms → reservations    (1 : Many)
reservations → payments (1 : 1)
reservations → feedbacks(1 : 1)
```

### Key Design Decisions
- `DECIMAL(10,2)` for all price/payment fields — prevents floating point errors
- `JSON` type for room images — flexible multiple image storage
- Separate `reservation_status` and `payment_status` — booking can exist without payment
- Async SQLAlchemy sessions — handles concurrent requests efficiently

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.13+
- MySQL 8.0+
- uv (Python package manager)

### Clone the Repository
```bash
git clone https://github.com/kosolroza/Hotel_Reservation_System.git
cd Hotel_Reservation_System
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env and set VITE_API_URL
npm run dev
```

### Backend Setup
```bash
cd backend
uv sync
cp .env.example .env
# Edit .env with your database and other credentials
uv run uvicorn app.main:app --reload
```

### Seed the Database
```bash
cd backend
uv run python seed.py
```

This creates:
- Admin account: `admin@hotel.com` / `Admin@123`
- Guest account: `guest@hotel.com` / `Guest@123`
- 10 rooms across 5 room types
- Promo codes: `WELCOME10`, `SUMMER20`, `VIP30`

---

## ⚙️ Environment Variables

### Backend `.env`
```env
# Database
DATABASE_URL=mysql+aiomysql://user:password@host:port/dbname

# JWT
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# App
APP_NAME=Hotel Reservation API
DEBUG=false
FRONTEND_URL=https://your-frontend.vercel.app

# Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880

# Tax
TAX_RATE=0.12

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_CHAT_ID=your_chat_id

# Backend URL
BACKEND_URL=https://your-backend.onrender.com
```

### Frontend `.env`
```env
VITE_API_URL=https://your-backend.onrender.com/api/v1
```

---

## 📖 API Documentation

Once the backend is running, visit:
```
http://localhost:8000/docs
```

### Key Endpoints

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login and get JWT token |
| GET | `/api/v1/auth/me` | Get current user |
| PUT | `/api/v1/auth/me` | Update profile |

#### Rooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/rooms` | Get all rooms (with filters) |
| GET | `/api/v1/rooms/{id}` | Get room detail |
| POST | `/api/v1/admin/rooms` | Create room (admin) |
| PUT | `/api/v1/admin/rooms/{id}` | Update room (admin) |

#### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/bookings` | Create booking |
| GET | `/api/v1/bookings/my` | Get my bookings |
| DELETE | `/api/v1/bookings/{id}/cancel` | Cancel booking |

#### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/payments/upload-slip` | Upload payment slip |
| GET | `/api/v1/payments/my` | Get my payments |

#### Telegram Webhook
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/telegram/webhook` | Telegram bot webhook |

---

## 🌐 Deployment

This project is deployed entirely for **$0/month**:

| Service | Platform | Cost |
|---------|----------|------|
| Frontend | Vercel | 🆓 Free |
| Backend | Render | 🆓 Free |
| Database | Filess.io | 🆓 Free |

### Deploy Frontend (Vercel)
1. Push frontend to GitHub
2. Connect repo to [vercel.com](https://vercel.com)
3. Add environment variable `VITE_API_URL`
4. Deploy ✅

### Deploy Backend (Render)
1. Connect repo to [render.com](https://render.com)
2. Set Root Directory to `backend`
3. Build Command: `pip install uv && uv sync`
4. Start Command: `uv run uvicorn app.main:app --host 0.0.0.0 --port 8000`
5. Add all environment variables
6. Deploy ✅

### Set Telegram Webhook
```bash
curl "https://api.telegram.org/bot{YOUR_TOKEN}/setWebhook?url=https://your-backend.onrender.com/api/v1/telegram/webhook"
```

---

## 📸 Screenshots

### Guest Portal
- Homepage with room search
- Room detail with booking panel
- Booking confirmation and payment

### Admin Portal
- Dashboard with revenue charts
- Booking management
- Staff management
- Payment management

### Telegram Bot
- Payment alert with booking details
- Approve/Reject inline buttons

---

## 📄 License

This project is developed for educational purposes at the **Institute of Technology of Cambodia (ITC)**.

---

## 🙏 Acknowledgements

- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Telegram Bot API](https://core.telegram.org/bots/api)

---

*Built with ❤️ by Group Hotel Reservation — ITC 2026*
