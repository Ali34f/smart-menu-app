# Docker Run Guide (Smart Menu)

This project runs with 3 containers:
- `mongo` (database)
- `backend` (Node/Express API on `:5002`)
- `frontend` (React build served by Nginx on `:3000`)

## 1) First-time run

From the project root (`smart-menu-app`):

```bash
docker compose up --build -d
```

Check status:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs -f
```

Open app:
- Frontend: `http://localhost:3000`
- API health: `http://localhost:5002/api/health`

By default, Docker uses local Mongo in the `mongo` service.  
If you want Atlas instead, add a root `.env` file (same folder as `docker-compose.yml`) with:

```bash
MONGODB_URI=your-atlas-uri
FRONTEND_URL=http://localhost:3000
```

## 2) If you change code

### Rebuild everything
Use when you changed multiple services:

```bash
docker compose up --build -d
```

### Rebuild only backend
Use when only API code changed:

```bash
docker compose up --build -d backend
```

### Rebuild only frontend
Use when only React code changed:

```bash
docker compose up --build -d frontend
```

## 3) Useful commands to avoid mistakes

### Verify containers are healthy
```bash
docker compose ps
```

### Check backend errors quickly
```bash
docker compose logs -f backend
```

### Check frontend startup/build errors
```bash
docker compose logs -f frontend
```

### Stop everything
```bash
docker compose down
```

### Stop and remove volumes (full reset)
This deletes Mongo data too:

```bash
docker compose down -v
```

## 4) Common safe workflow

1. Make code changes
2. Rebuild the changed service (`backend` or `frontend`)
3. Run `docker compose ps`
4. Run `docker compose logs -f <service>` to confirm no errors
5. Test in browser

## 5) Production notes

Before production:
- Set a strong `JWT_SECRET`
- Set `NODE_ENV=production`
- Use a managed MongoDB or secure internal Mongo network
- Move secrets to env files or secret manager (do not hardcode)
