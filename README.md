# Smart Menu

**Multi-tenant SaaS platform for restaurant menu and allergen management**

A full-stack web application where staff manage menus, ingredients, allergens, and team access from a dashboard, and guests open a **QR-linked public menu** with allergen filtering on mobile devices.

**University of Plymouth — COMP3000 Computing Project (2025/2026)**

---

## What it does

- **Staff** — Secure dashboard: menu CRUD, 14 UK-regulated allergens, ingredients, staff & roles, QR codes, reports, notifications, settings  
- **Guests** — Public menu (no login) with client-side allergen filtering  
- **Platform admin** — Optional workspace switcher to manage multiple restaurant tenants  
- **Architecture** — Shared-schema multi-tenancy (`restaurantId` scoping), JWT auth, REST API, MongoDB

---

## Tech stack


| Layer    | Technologies                                                 |
| -------- | ------------------------------------------------------------ |
| Frontend | React, TypeScript, React Router, Axios, Tailwind CSS         |
| Backend  | Node.js, Express, Mongoose, JWT, bcrypt                      |
| Database | MongoDB                                                      |
| Quality  | Jest, Supertest, React Testing Library                       |
| DevOps   | Docker Compose, GitHub Actions (tests, build, compose check) |


---

## Quick start (Docker)

**Prerequisites:** Docker and Docker Compose.

```bash
cp backend/.env.example backend/.env   # set JWT_SECRET, MONGODB_URI, etc.
docker compose up --build
```

- **Frontend:** [http://localhost:3000](http://localhost:3000)  
- **API:** [http://localhost:5002](http://localhost:5002)  
- **MongoDB (host):** localhost:27018

## Local development (no Docker)

1. Run MongoDB and set `MONGODB_URI` in `backend/.env`.
2. **Backend:** `cd backend && npm install && node server.js` (or `npx nodemon server.js` during development).
3. **Frontend:** `cd frontend && npm install && npm start`.

---

## Tests

```bash
cd backend && npm test
cd frontend && npm test -- --watchAll=false
```

CI runs the same on pushes/PRs to `main` and `master`.

---

## Important note

Allergen data reflects what the restaurant enters. The system does not guarantee allergen-free food or replace staff communication for severe allergies. Operators remain responsible for accuracy and food safety.

---

## Author

Jahin Khan 
BSc (Hons) Software Engineering 
University of Plymouth.
COMP3000 Final Year Project (2025/2026)

