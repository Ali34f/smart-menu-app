# Smart Menu App

**Allergen-aware digital menu for restaurant safety**

A full-stack web application for restaurants to manage menus, allergens, and staff workflows, and for guests to browse a **QR-linked public menu** with allergen filtering. The interface is responsive and works well on phones and tablets in the dining room.

Built for **University of Plymouth | COMP3000 Computing Project | 2025/2026**.

---

## Overview

Smart Menu helps diners see what they can eat safely. Staff maintain dishes, ingredients, and allergen metadata in a dashboard; guests open the menu from a table QR code, filter by allergens, and (in demo flow) place a simple order. Role-based access keeps owner, manager, and staff actions appropriate to each user.

---

## Features (high level)

- **Staff dashboard** — Menu, ingredients, allergens, staff, QR codes, reports, settings, notifications  
- **Public menu** — Guest-facing menu with allergen filter and analytics-friendly tracking hooks  
- **Auth** — Login, registration, password reset flow, platform vs restaurant roles  
- **API** — REST backend with JWT, rate limiting on sensitive routes, file uploads for menu imagery  
- **DevOps** — Docker Compose for MongoDB, API, and frontend; GitHub Actions CI (tests + frontend build + compose check)

---

## Technologies used

### Frontend

- **React 19** with **TypeScript** — UI and type-safe components  
- **Create React App** (`react-scripts`) — dev server and production build  
- **Tailwind CSS** — styling (with PostCSS / Autoprefixer)  
- **React Router** — client-side routing  
- **Axios** — HTTP calls to the API  
- **Zustand** — lightweight client state  
- **React Hook Form** — forms  
- **Framer Motion** — animations  
- **@dnd-kit** — drag-and-drop (e.g. menu ordering)  
- **Recharts** — charts on reports / dashboard  
- **jsPDF** — PDF export where used  
- **react-hot-toast** — notifications  
- **Material Design Icons** (`@mdi/react`) and **Lucide** — icons  
- **QRCode** (`qrcode`) — QR generation in the browser where needed  

### Backend

- **Node.js** with **Express 5** — REST API  
- **Mongoose** — MongoDB ODM and schemas  
- **JWT** (`jsonwebtoken`) — authenticated sessions  
- **bcryptjs** — password hashing  
- **Helmet**, **CORS** — HTTP security and cross-origin rules  
- **express-validator** — request validation  
- **express-rate-limit** — brute-force / abuse protection on auth routes  
- **Multer** — multipart uploads (e.g. menu images)  
- **Nodemailer** — email (e.g. password reset)  
- **Speakeasy** — TOTP / 2FA-related flows where enabled  
- **QRCode** — server-side QR generation where used  
- **dotenv** — environment configuration  
- **Morgan** — HTTP request logging (non-test environments)  

### Database & data

- **MongoDB 7** — primary data store (via Docker or local install)  

### Testing

- **Jest** — backend unit and integration tests (**Supertest** for HTTP)  
- **React Testing Library** — frontend component tests    

### DevOps & delivery

- **Docker** & **Docker Compose** — MongoDB, API, and frontend containers  
- **nginx** — serves the built React app in the production frontend image  
- **GitHub Actions** — CI (tests, build, compose validation)  

---

## Screenshots

Add PNG or JPEG files under `docs/screenshots/` and keep the filenames below (or update the paths to match yours).

| Screen | File |
|--------|------|
| Staff dashboard | `docs/screenshots/dashboard.png` |
| Menu management | `docs/screenshots/menu.png` |
| Public / guest menu | `docs/screenshots/public-menu.png` |
| Allergen filter (guest) | `docs/screenshots/allergen-filter.png` |
| Login | `docs/screenshots/login.png` |

![Staff dashboard](docs/screenshots/dashboard.png)

![Public menu](docs/screenshots/public-menu.png)

*If images are missing locally, the links above break until you add the files—this is expected.*

---

## Quick start (Docker)

**Prerequisites:** Docker and Docker Compose, and a `backend/.env` (copy from `backend/.env.example` and adjust secrets).

```bash
cp backend/.env.example backend/.env # then edit JWT_SECRET, MONGODB_URI, etc.
docker compose up --build
```

- **Frontend:** http://localhost:3000  
- **API:** http://localhost:5002  
- **MongoDB:** `localhost:27018` (host) → container `27017`

---

## Local development (without Docker)

1. Install and run MongoDB, or point `MONGODB_URI` at your instance.  
2. **Backend:** `cd backend && npm install && cp .env.example .env` (configure), then `node server.js` or your process manager.  
3. **Frontend:** `cd frontend && npm install && npm start` — uses proxy to the API in dev.

---

## Tests

```bash
cd backend && npm test
cd frontend && npm test
```

---

## CI

GitHub Actions runs backend tests, frontend tests and production build, and a quick `docker compose config` check on pushes/PRs to `main` / `master`.

---

## Author

University of Plymouth — COMP3000 (2025/2026). Add your name and student ID here if your module requires it.
