# Project State

Last updated: 2026-05-16

## 1. Final Project Goal

Build a production-grade secure academic file sharing and evaluation system for students, examiners, project evaluators, course administrators, and an optional AI Viva Examiner. The system must support end-to-end encrypted file exchange, signed academic submissions, signed evaluations, RBAC-controlled access, non-repudiation, and zero-trust storage where the server never sees plaintext academic materials.

## 2. Security Architecture Summary

Browser-first cryptography with a ciphertext-only backend.

- The Next.js browser client encrypts, decrypts, hashes, signs, and verifies content using the Web Crypto API.
- The Django REST backend authenticates users (JWT), enforces RBAC, stores metadata, routes ciphertext, stores wrapped file keys, and records audit logs.
- PostgreSQL stores metadata, public keys, signatures, manifests, wrapped file keys, RBAC state, and audit records.
- Local filesystem (MEDIA_ROOT) stores ciphertext only — no plaintext.

## 3. Current Implementation Status

Status: Phase 2 complete — functional end-to-end encrypted file sharing system.

## 4. Completed Modules

### Backend
- Django project under `backend/config` with JWT auth, CORS, audit middleware.
- All Django apps: accounts, authn, rbac, courses, assignments, keys, files, submissions, evaluations, audit.
- User registration endpoint (`POST /api/v1/auth/register/`).
- Key registration with automatic SHA-256 fingerprint computation.
- `GET /api/v1/keys/for-user/{user_id}/` — fetch any user's active public keys.
- `GET /api/v1/keys/examiner-keys/` — fetch all examiner encryption keys for recipient wrapping.
- `GET /api/v1/keys/my-keys/` — fetch own active keys.
- `POST /api/v1/files/upload/` — multipart upload: ciphertext blob + JSON metadata (IV, hashes, wrapped keys, signature, manifest). Creates SecureFile, FileManifest, Signature, EncryptedFileKey records atomically.
- `GET /api/v1/files/{id}/download/` — returns ciphertext (base64) + caller's wrapped AES key. Only returns if caller has a non-revoked EncryptedFileKey.
- Object-level access control: SecureFile queryset filtered to files where caller is a recipient.
- Tamper-evident audit log hash chain (SHA-256 chaining via AuditRequestMiddleware).
- Audit log visible to all authenticated users (own logs) and admins (all logs).
- `seed_demo` management command: roles, demo users (alice/bob/admin), IS-501 course, assignment.
- Local filesystem ciphertext storage in `backend/media/ciphertext/`.

### Frontend
- Next.js app router with TypeScript strict mode.
- Full Web Crypto API implementation in `frontend/lib/crypto/crypto-service.ts`:
  - RSA-OAEP-SHA256 2048-bit key pair generation.
  - RSA-PSS-SHA256 2048-bit signing key pair generation.
  - AES-256-GCM file encryption (96-bit IV, 128-bit auth tag).
  - RSA-OAEP AES key wrapping for multiple recipients.
  - RSA-OAEP AES key unwrapping.
  - RSA-PSS manifest signing with canonical JSON.
  - RSA-PSS manifest verification.
  - IndexedDB private key storage (CryptoKey objects, never raw bytes exported).
- Key lifecycle in `frontend/features/crypto/key-lifecycle.ts`:
  - Generate key pairs → register public keys → store private keys in IndexedDB.
  - Session storage for registered key IDs and fingerprints.
- `/keys` page: generate, view, reset key pairs.
- `/submissions` page: encrypt-and-upload flow + download-and-decrypt flow.
  - Upload: AES-256-GCM encryption → RSA-OAEP key wrapping for self + all examiners → RSA-PSS manifest signing → multipart upload.
  - Download: fetch ciphertext + wrapped key → RSA-OAEP unwrap → AES-GCM decrypt → browser download.
- `/audit` page: hash chain verification with tamper detection display.
- `/dashboard` page: live crypto status panel.
- `/login` page: quick-login buttons for demo accounts.
- Authenticated API client with JSON and multipart request helpers.
- Auth provider re-hydrates user from stored token on mount.

## 5. Pending / Nice-to-Have

- Django migrations must be generated and applied before first run (see SETUP.md).
- Rubric upload flow (same mechanism as submission upload, different file_type).
- Evaluation signing flow (examiner uploads signed evaluation, student can download).
- Submission finalization workflow.
- Production refresh-cookie hardening (currently sessionStorage).
- MFA / device management.
- CI/CD security checks.
- Deployment manifests.

## 6. Cryptographic Decisions (Implemented)

- AES-256-GCM: file encryption (confidentiality + integrity per-block authenticated encryption).
- RSA-OAEP-SHA256 (2048-bit): AES key wrapping per recipient.
- RSA-PSS-SHA256 (2048-bit): digital signatures on file manifests.
- SHA-256: plaintext hash, ciphertext hash, public key fingerprinting, audit log chain.
- JWT: API authentication only (not for cryptographic trust).
- CryptoKey objects stored in IndexedDB — private keys never exported as raw bytes.

## 7. Tech Stack

Frontend: Next.js 14, React 18, TypeScript, lucide-react, Web Crypto API (built-in).
Backend: Django 5, Django REST Framework, djangorestframework-simplejwt, django-cors-headers, dj-database-url, psycopg 3.
Database: PostgreSQL 16 via Docker Compose.
Storage: Local filesystem (MEDIA_ROOT/ciphertext/) for demo — swap to S3 for production.

## 8. Important Rules

- Backend, database, and object storage are not trusted with plaintext.
- Private keys must never be sent to the backend.
- RBAC gates metadata access; cryptographic access is controlled by wrapped file keys.
- Update this file after every major implementation step.

## 9. Demo Sequence (May 18 Evaluation)

See SETUP.md for full instructions.

1. Alice (student) logs in → generates RSA key pair → public keys registered.
2. Bob (examiner) logs in → generates RSA key pair → public keys registered.
3. Alice uploads a file: browser encrypts AES-256-GCM, wraps AES key for Alice + Bob (RSA-OAEP), signs manifest (RSA-PSS), uploads ciphertext to backend.
4. Backend stores: SecureFile (ciphertext_sha256, IV), EncryptedFileKey (wrapped keys × 2), Signature (RSA-PSS), FileManifest, AuditLog entries.
5. Bob downloads: fetches ciphertext + his wrapped key, unwraps AES key (RSA-OAEP), decrypts (AES-GCM), file downloads.
6. Audit log page shows tamper-evident chain with SHA-256 linking.
7. Tamper demo: edit an audit entry in admin → chain shows BROKEN.
8. Key separation demo: show database has only wrapped keys (ciphertext), not raw AES keys.

## 10. Viva Preparation

Key arguments:
- End-to-end encryption: server only stores ciphertext, wrapped keys, and metadata. Never plaintext.
- Separation of duties: RBAC controls who can request ciphertext; wrapped keys control who can decrypt.
- Non-repudiation: RSA-PSS signature on every file manifest, tied to registered key fingerprint.
- Integrity: AES-GCM authenticated encryption detects tampering of ciphertext; SHA-256 hash chain detects audit log tampering.
- Authentication: JWT with short-lived access tokens (60 min) and rotating refresh tokens (7 days, blacklisted after rotation).
- Key transparency: public key fingerprints (SHA-256) visible and independently verifiable.
- Largest residual risk: malicious frontend delivery (mitigated by CSP, build integrity, HTTPS).
