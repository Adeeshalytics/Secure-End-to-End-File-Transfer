# SecureEval — End-to-End Encrypted Academic File Exchange

A demonstrably zero-trust file-sharing system for academic workflows. Students upload assignments, examiners decrypt them, course admins audit everything — and **the server cannot read any of it, ever**.

Built for the *Information Security* course final project (May 2026). All cryptographic operations run in the browser using the Web Crypto API. The server holds only ciphertext, RSA-wrapped keys, signatures, and a tamper-evident audit chain.

---

## What it proves

| Property | Mechanism |
|---|---|
| **Confidentiality** | AES-256-GCM file encryption — browser only |
| **Integrity** | AES-GCM 128-bit auth tag rejects any byte modification |
| **Authenticity** | RSA-PSS-SHA256 signed manifest tied to registered public key fingerprint |
| **Non-repudiation** | Signature + manifest + key fingerprint = unrepudiable triple |
| **Per-recipient access control** | RSA-OAEP wrapped AES key, one per recipient |
| **Tamper-evident audit** | SHA-256 hash chain across every write operation |

---

## Tech stack

- **Frontend** — Next.js 15 (App Router), TypeScript strict, lucide-react icons
- **Crypto** — Web Crypto API (browser-native; non-exportable `CryptoKey` objects)
- **Backend** — Django 5.1+ REST Framework with simplejwt
- **Database** — PostgreSQL 16 (via Docker)
- **Auth** — JWT (60-min access + 7-day rotating refresh + blacklist)

---

## Cryptographic primitives

| Purpose | Algorithm | Parameters |
|---|---|---|
| File encryption | AES-256-GCM | 256-bit key, 96-bit random IV, 128-bit auth tag |
| Key wrapping | RSA-OAEP-SHA256 | 2048-bit modulus |
| Signing | RSA-PSS-SHA256 | 2048-bit modulus, 32-byte salt |
| Hashing | SHA-256 | Plaintext + ciphertext + key fingerprints + audit chain |
| Canonical JSON | sorted keys, compact | Deterministic bytes for manifest signing |

---

## Quick start

See **[SETUP.md](SETUP.md)** for the step-by-step guide (about 10 minutes from `git clone` to running demo).

TL;DR:

```powershell
# 1. PostgreSQL via Docker
docker compose up -d postgres

# 2. Backend (terminal 1)
cd backend
python -m venv .venv && .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Create backend/.env (see SETUP.md for contents)
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 8001

# 3. Frontend (terminal 2)
cd frontend
npm install
# Create frontend/.env.local with NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api/v1
npm run dev
```

Then open `http://localhost:3000` and click any demo account button.

---

## Demo accounts

`seed_demo` creates these automatically. Password for all: `DemoPassword1!`

| Username | Role | Sidebar colour | Use for |
|---|---|---|---|
| `alice` | student | 🟣 Dark slate + purple accents | Uploading submissions |
| `bob` | examiner | 🔵 Material light blue + orange avatar | Decrypting submissions, uploading rubrics |
| `admin` | course_admin + Django superuser | 🟢 Dark emerald | Audit log full chain verification, `/admin/` panel |

---

## Repository layout

```
.
├── backend/                Django REST API
│   ├── apps/
│   │   ├── accounts/       User profiles + seed_demo management command
│   │   ├── audit/          Tamper-evident SHA-256 hash chain
│   │   ├── authn/          JWT login, registration, /auth/me
│   │   ├── files/          Encrypted file upload/download, EncryptedFileKey
│   │   ├── keys/           UserPublicKey registry (RSA-OAEP + RSA-PSS)
│   │   ├── rbac/           Role + RoleAssignment with revocation
│   │   └── ...
│   └── config/             Settings, URLs, WSGI
├── frontend/
│   ├── app/                Next.js App Router pages (login, dashboard, keys, submissions, rubrics, audit, evaluations)
│   ├── components/         AppShell (sidebar + mobile drawer)
│   ├── features/           auth-provider, key-lifecycle
│   └── lib/                api client (with auto-refresh), crypto-service (Web Crypto)
├── DEMO_GUIDE.md           Full 5-act demo walkthrough + viva Q&A
├── SETUP.md                Step-by-step setup from fresh clone
└── README.md               You are here
```

---

## The 5-act demo

See **[DEMO_GUIDE.md](DEMO_GUIDE.md)** for the full walkthrough with talking points and prepared Q&A.

1. **Key Generation** — RSA-2048 pairs in the browser; private keys never transmitted
2. **Encrypted Submission** — Alice uploads; only ciphertext reaches the server
3. **Cross-Role Decryption** — Bob decrypts with his RSA private key; server holds no decryption capability
4. **Tamper Detection** — Modify one byte of the IV in Django Admin → AES-GCM auth tag rejects → tamper visible
5. **Audit Hash Chain** — Modify an audit entry → chain breaks visibly → admin sees red banner

Total runtime: ~18 minutes including Q&A buffer.

---

## Security boundary

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER  (trusted with plaintext + private keys)           │
│  • Generate RSA-2048 key pairs                              │
│  • IndexedDB stores non-exportable CryptoKey objects        │
│  • AES-256-GCM encryption/decryption                        │
│  • RSA-OAEP key wrapping for each recipient                 │
│  • RSA-PSS manifest signing                                 │
└─────────────────────────────────────────────────────────────┘
                          │ HTTPS + JWT
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  DJANGO API  (untrusted with plaintext)                     │
│  • JWT auth, RBAC, metadata validation                      │
│  • Validates ciphertext SHA-256 on upload                   │
│  • Returns wrapped keys & signatures untouched              │
│  • Appends SHA-256 audit chain entries on every write       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  POSTGRES + DISK  (sees only ciphertext)                    │
│  • media/ciphertext/<uuid>.enc — AES-256-GCM blobs          │
│  • EncryptedFileKey — wrapped AES keys per recipient        │
│  • Signature + FileManifest — RSA-PSS signed metadata       │
│  • AuditLog — tamper-evident hash chain                     │
└─────────────────────────────────────────────────────────────┘
```

The server is a **dumb pipe**. Compromising the server — even with full database access — yields no plaintext.

---

## Project context

Built for the **IS course final project**, evaluated 18 May 2026. Aligned with my FYP on secure academic evaluation workflows. Implements the brief's requirements:

- ✅ Secure communication between two untrusted entities (browser ↔ server)
- ✅ Encryption, hashing, key wrapping, authentication, signing
- ✅ Threat model + mitigation analysis
- ✅ Design justifications for every primitive choice

See [DEMO_GUIDE.md](DEMO_GUIDE.md) §8 for the full prepared Q&A covering threat model, algorithm choices, key management, and audit design.

---

## License

This is a course project. Use freely for learning. No warranty.
