# E-commerce Vanilla Node Starter

[![CI](https://github.com/DmytroHalynovych67724/1.0/actions/workflows/ci.yml/badge.svg)](https://github.com/DmytroHalynovych67724/1.0/actions/workflows/ci.yml)
[![Docker Publish](https://github.com/DmytroHalynovych67724/1.0/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/DmytroHalynovych67724/1.0/actions/workflows/docker-publish.yml)

A polished starter template for a Node.js + Express + Vanilla JavaScript e-commerce project.

## Quick start

### Windows

Double-click:

- [start-project.bat](start-project.bat) to start the app
- [stop-project.bat](stop-project.bat) to stop it

### Manual

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Scripts

- `npm run dev` - start the development server with nodemon
- `npm start` - start the production server
- `npm test` - run tests
- `npm run lint` - lint the codebase
- `npm run format` - format with Prettier

## Structure

```text
backend/        Express server and API routes
frontend/       Static HTML/CSS/JS assets
tests/          Automated tests
```

## API Endpoints (minimal)

	- `POST /api/products` — create product
	- `PUT /api/products/:id` — update product
	- `DELETE /api/products/:id` — delete product

Orders / Checkout endpoints:
- `POST /api/orders` — create order (protected). Body: `{ items: [{id, qty}], total }`
- `GET /api/orders/:id` — get order (protected, owner or admin)

Example curl (get products):
```
curl http://localhost:3000/api/products
```

Admin seed & login (demo):
```
# The seeder creates a demo admin: username `admin`, password `admin123`
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'
# Response: { "token": "..." }
```

Checkout example (create order):
```
TOKEN=<paste token here>
curl -X POST http://localhost:3000/api/orders -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"items":[{"id":"p1","qty":1}],"total":399}'
```

Get order:
```
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/orders/<order-id>
```
Example curl (get products):
```
curl http://localhost:3000/api/products
```

## Environment variables

- `PORT` — server port (default 3000)

Docker / production notes (SQLite persistence):

- Build image:
```
docker build -t ecommerce-starter .
```
- Run with volume for SQLite data (recommended):
```
docker run -p 3000:3000 -v $(pwd)/data:/usr/src/app/data ecommerce-starter
```
- Or use docker-compose (binds `./data` to container):
```
docker-compose up --build -d
```

CI / Publish Docker image

- The repo contains a GitHub Actions workflow that builds and publishes an image to GitHub Container Registry (GHCR) on pushes to `main`.
- By default the workflow pushes to GHCR at `ghcr.io/<your-org-or-username>/ecommerce-starter` using the repository's `GITHUB_TOKEN` (no extra secrets required).
- To also publish to Docker Hub, add repository secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` (token or password). The workflow will detect those secrets and push the same tags to Docker Hub.

How to enable (quick):

1. Push this repo to GitHub under your account or org.
2. (Optional) In GitHub repo Settings → Secrets → Actions, add `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` if you want Docker Hub publishing.
3. Push to `main` or run the workflow manually from the Actions tab.

Image examples after run:
- GHCR: `ghcr.io/<your-username>/ecommerce-starter:latest`
- Docker Hub (if configured): `<dockerhub-username>/ecommerce-starter:latest`

- `NODE_ENV` — `development|production`
- `JWT_SECRET` — secret for signing JWTs (default set in code, override in production)

## Production (PM2)

Start with PM2 using the included `ecosystem.config.js`:
```
npm install --no-audit --no-fund
npx pm2 start ecosystem.config.js
```

## Zwięzłe instrukcje po polsku

Projekt zawiera prosty prototyp serwisu e-commerce — katalog produktów, koszyk po stronie klienta oraz panel administracyjny.

1. Uruchom lokalnie:
```powershell
cd C:\Users\Dmytro\Desktop\1.0
npm install
npm run seed
npm run dev
# Otwórz http://localhost:3000
```

2. Panel administracyjny:
- Otwórz http://localhost:3000/admin.html
- Zarejestruj konto (POST /api/auth/register) lub użyj endpointu rejestracji z UI

3. Proponowany plan rozwoju (do dyplomu):
- Migracja DB do SQLite
- Implementacja zamówień i checkout
- Pełna dokumentacja OpenAPI

Propozycję tematu pracy dyplomowej dodałem do pliku `DIPLOMA_PROPOSAL.md`.

