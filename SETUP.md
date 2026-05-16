# Setup Guide — Run This First

## Prerequisites

- Python 3.11+ installed
- Node.js 18+ installed
- Docker Desktop running (for PostgreSQL)

---

## Step 1: Start PostgreSQL

```bash
docker-compose up -d
```

Wait ~5 seconds for PostgreSQL to be ready.

---

## Step 2: Backend Setup

```bash
cd backend
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py seed_demo
```

Expected seed output:
```
  Roles ensured: ['student', 'examiner', 'project_evaluator', 'course_admin', 'system_admin']
  Users ensured: ['alice', 'bob', 'admin']
  Course ensured: IS-501 — Information Security
  Assignment ensured: Secure File Sharing System

Demo seed complete.

Demo accounts (username / password / role):
  alice       DemoPassword1!  (student)
  bob         DemoPassword1!  (examiner)
  admin       DemoPassword1!  (course_admin)
```

Then start the backend:
```bash
python manage.py runserver
```

Backend runs at: http://localhost:8000

---

## Step 3: Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:3000

---

## Demo Flow

### Golden path for the evaluator:

1. Open http://localhost:3000/login
2. Click **alice** (student) — auto-fills credentials
3. Go to **Keys** → click **Generate and Register Key Pair** → wait ~2 seconds
4. Go to **Submissions** → select the assignment → pick a PDF/DOCX → click **Encrypt and Upload**
5. Watch the status: Encrypting… → Uploading… → Done (shows file ID + ciphertext hash)
6. Sign out → log in as **bob** (examiner)
7. Go to **Keys** → click **Generate and Register Key Pair**
   - Note: bob must register keys BEFORE alice uploads to receive a wrapped key
   - For demo: re-upload after bob registers keys, OR have alice upload after step 7
8. Go to **Submissions** → find the file → click **Decrypt + Download**
9. Browser decrypts locally, file downloads
10. Go to **Audit Log** → see hash-chained events → chain verification shows green

### What to show during viva:

**Confidentiality:** Show the `backend/media/ciphertext/` folder — binary gibberish, no readable content.

**Integrity:** In Django admin, edit an AuditLog entry's hash → audit page shows "HASH CHAIN BROKEN".

**Non-repudiation:** Each file has an RSA-PSS signature in the Signature table, tied to the signer's registered public key.

**Key separation:** The server only stores wrapped (RSA-OAEP encrypted) AES keys. Without the recipient's private key, the wrapped key reveals nothing.

**Authentication:** JWT (10-min access tokens, 7-day refresh, blacklisted on rotation).

---

## Demo Account Credentials

| Username | Password | Role |
|----------|----------|------|
| alice | DemoPassword1! | Student |
| bob | DemoPassword1! | Examiner |
| admin | DemoPassword1! | Course Admin |

---

## Troubleshooting

**CORS error in browser:** Ensure `backend/.env` has `CORS_ALLOWED_ORIGINS=http://localhost:3000`.

**"No wrapped key" on download:** Bob must register his key pair BEFORE the file is uploaded. Re-upload after bob registers.

**Migration error:** Run `python manage.py makemigrations accounts assignments courses rbac files keys submissions evaluations audit` then `python manage.py migrate`.

**Port conflict:** Backend uses 8000, frontend uses 3000. Kill any processes using those ports first.
