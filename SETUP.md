# SecureEval — Setup Guide

End-to-end encrypted academic file exchange. This guide gets you from `git clone` to a working demo in ~10 minutes.

## Prerequisites

Install these first:
- **Docker Desktop** — for PostgreSQL
- **Python 3.12+** — backend
- **Node.js 18+** — frontend
- **Git**

Verify:
```powershell
docker --version
python --version
node --version
```

## Step 1 — Clone

```powershell
git clone <repo-url> secureeval
cd secureeval
```

## Step 2 — Database (PostgreSQL via Docker)

Start the Postgres container:
```powershell
docker compose up -d postgres
```

Verify it's running:
```powershell
docker ps
```
You should see a `postgres:16-alpine` container with port `5432:5432`.

> No `docker-compose.yml`? Run a one-line container instead:
> ```powershell
> docker run -d --name secureeval-pg -e POSTGRES_USER=secure_eval -e POSTGRES_PASSWORD=change-me-local-only -e POSTGRES_DB=secure_academic_eval -p 5432:5432 postgres:16-alpine
> ```

## Step 3 — Backend (Django on port 8001)

Open a new PowerShell terminal:

```powershell
cd backend

# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

### Create `backend/.env`

The file is gitignored. Create it with this content:

```env
DJANGO_SECRET_KEY=dev-only-replace-with-managed-secret-key-at-least-32-bytes
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000

DATABASE_URL=postgres://secure_eval:change-me-local-only@localhost:5432/secure_academic_eval

JWT_ACCESS_TOKEN_MINUTES=60
JWT_REFRESH_TOKEN_DAYS=7

SECURE_PROXY_SSL_HEADER=
```

### Run migrations and seed demo data

```powershell
python manage.py migrate
python manage.py seed_demo
```

This creates:
- 3 demo users: `alice` (student), `bob` (examiner), `admin` (course_admin + Django superuser)
- 5 roles
- 1 course (IS-501) + 1 assignment
- All with password: `DemoPassword1!`

### Start the backend

```powershell
python manage.py runserver 8001
```

Backend should be at `http://localhost:8001/` and admin at `http://localhost:8001/admin/`.

## Step 4 — Frontend (Next.js on port 3000)

Open another PowerShell terminal:

```powershell
cd frontend
npm install
```

### Create `frontend/.env.local`

The file is gitignored. Create it with this content:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api/v1
NEXT_PUBLIC_APP_NAME=Secure Academic Evaluation
```

### Start the frontend

```powershell
npm run dev
```

Open `http://localhost:3000` — login screen should appear.

## Step 5 — Verify everything works

1. Click any demo account button on the login screen (alice / bob / admin)
2. Password is already `DemoPassword1!` — should auto-fill and log in
3. Go to **My Keys** → **Generate & Register Key Pair**
4. As alice, upload a file in **Submissions**
5. As bob (different browser window), decrypt it

## Demo accounts

| Username | Password | Role | What they can do |
|---|---|---|---|
| `alice` | `DemoPassword1!` | student | Upload submissions, view rubrics |
| `bob` | `DemoPassword1!` | examiner | Decrypt submissions, upload rubrics |
| `admin` | `DemoPassword1!` | course_admin + Django superuser | Audit log + `/admin/` access |

## Troubleshooting

| Problem | Fix |
|---|---|
| `connection refused` from Django to Postgres | Make sure `docker ps` shows the postgres container running on port 5432 |
| Port 8000 already in use | We use 8001 specifically to avoid conflicts; verify `runserver 8001` |
| Frontend "API failed" errors | Confirm `frontend/.env.local` has `localhost:8001` and the backend is actually running |
| Login says "Invalid username or password" | Re-run `python manage.py seed_demo` (idempotent — safe to run anytime) |
| `/admin/` shows yellow error page | Make sure `pip install -r requirements.txt` ran successfully; Django must be ≥ 5.1 |
| Decrypt fails with "tamper detected" or "key mismatch" | The submission was made with old keys. Have alice re-upload after key generation, OR run a clean reset (see below) |

## Clean reset (wipe everything and start fresh)

```powershell
# In the backend terminal (Ctrl+C the server first)
python manage.py shell -c "from apps.files.models import SecureFile, EncryptedFileKey, FileManifest, Signature; from apps.keys.models import UserPublicKey; from apps.audit.models import AuditLog; Signature.objects.all().delete(); FileManifest.objects.all().delete(); EncryptedFileKey.objects.all().delete(); SecureFile.objects.all().delete(); UserPublicKey.objects.all().delete(); AuditLog.objects.all().delete(); print('Cleared')"

Remove-Item -Recurse -Force media\ciphertext -ErrorAction SilentlyContinue
```

Then in **both browser windows**: DevTools (F12) → Application → Storage → Clear site data.

## Read next

- [`DEMO_GUIDE.md`](DEMO_GUIDE.md) — the full demo script and talking points
