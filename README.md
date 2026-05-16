# Secure Academic File Sharing and Evaluation System

Production-grade scaffold for an end-to-end encrypted academic submission, rubric, and evaluation platform.

## Stack

- Frontend: Next.js, TypeScript
- Backend: Django REST Framework
- Database: PostgreSQL
- Auth: JWT access/refresh tokens
- Security posture: browser-side encryption placeholders, zero-trust storage, RBAC-first APIs

## Repository Layout

```text
backend/    Django REST API, RBAC, metadata models, audit logging
frontend/   Next.js app, auth flow, RBAC guards, crypto service placeholders
docs/       Architecture, crypto protocol, API contracts, threat model
infra/      Docker and local infrastructure
security/   Hardening notes and operational security material
```

## Local Development

1. Copy environment templates:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

2. Start PostgreSQL:

```bash
docker compose up -d postgres
```

3. Start the backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

4. Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000

Backend API: http://localhost:8000/api/v1
