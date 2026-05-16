# Project State

Last updated: 2026-05-16

## 1. Final Project Goal

Build a production-grade secure academic file sharing and evaluation system for students, examiners, project evaluators, course administrators, and an optional AI Viva Examiner. The system must support end-to-end encrypted file exchange, signed academic submissions, signed evaluations, RBAC-controlled access, non-repudiation, and zero-trust storage where the server never sees plaintext academic materials.

## 2. Security Architecture Summary

The intended architecture is browser-first cryptography with a ciphertext-only backend.

- The Next.js browser client will encrypt, decrypt, hash, sign, and verify content.
- The Django REST backend authenticates users, enforces RBAC, stores metadata, routes ciphertext, stores wrapped file keys, and records audit logs.
- PostgreSQL stores metadata, public keys, signatures, manifests, wrapped file keys, RBAC state, and audit records.
- Object storage will store ciphertext only.
- AI Viva Examiner must be treated as an explicit trust boundary and cryptographic recipient if it needs plaintext.

## 3. Current Implementation Status

Status: initial scaffold complete.

The repository currently contains a root monorepo layout with a Django REST backend, Next.js TypeScript frontend, documentation folders, security notes, environment templates, and optional local PostgreSQL Docker Compose setup.

Cryptography is not implemented yet by design. Crypto boundaries are represented as placeholders and service contracts.

## 4. Completed Modules

- Root repository layout.
- `README.md` with local development commands.
- `.env.example` templates at root, backend, and frontend levels.
- `docker-compose.yml` for PostgreSQL.
- Django project under `backend/config`.
- Django REST Framework and SimpleJWT configuration.
- Initial Django apps:
  - `accounts`
  - `authn`
  - `rbac`
  - `courses`
  - `assignments`
  - `keys`
  - `files`
  - `submissions`
  - `evaluations`
  - `audit`
  - `ai_examiner`
- Initial backend models, serializers, and viewsets.
- Tamper-evident audit hash helper.
- Object storage placeholder requiring ciphertext-only handling.
- Next.js app router layout.
- Basic pages:
  - `/login`
  - `/dashboard`
  - `/submissions`
  - `/rubrics`
  - `/evaluations`
- Frontend auth provider and JWT API client.
- Frontend RBAC policy helper.
- Frontend crypto service placeholders.
- Architecture, API, crypto placeholder, threat model, and hardening docs.

## 5. Pending Modules

- Django migrations generated and committed.
- Database seed command for default roles.
- User registration and institutional onboarding flow.
- Secure key registration API with signed key registration statements.
- Browser crypto implementation using Web Crypto API.
- Client-side encrypted upload flow.
- Client-side verified download flow.
- Object storage implementation and signed upload/download targets.
- Fine-grained object-level permissions.
- Submission assignment workflows.
- Rubric workflows.
- Evaluation finalization workflow.
- AI Viva Examiner integration.
- MFA and device management.
- Refresh-token cookie hardening for production.
- Test suite.
- CI/CD security checks.
- Deployment manifests.

## 6. Current Cryptographic Decisions

Required future algorithms:

- AES-256-GCM for file encryption.
- RSA-OAEP with SHA-256 for wrapping file encryption keys.
- RSA-PSS with SHA-256 for digital signatures.
- SHA-256 for plaintext hashes, ciphertext hashes, manifest hashes, public key fingerprints, and audit log chaining.
- JWT for API authentication only, not for cryptographic trust.

Current rule: no cryptographic implementation has been added yet. Existing crypto files are placeholders and must not be mistaken for secure implementations.

## 7. Current Tech Stack

Frontend:

- Next.js 14
- React 18
- TypeScript
- lucide-react

Backend:

- Django 5
- Django REST Framework
- djangorestframework-simplejwt
- django-cors-headers
- dj-database-url
- psycopg 3
- python-dotenv
- gunicorn

Database:

- PostgreSQL 16 via Docker Compose for local development.

## 8. Current Database Structure Summary

Current model groups:

- User profile: institutional metadata and account status.
- RBAC: roles and scoped role assignments.
- Courses: course metadata.
- Assignments: assignment metadata with encrypted-description placeholder.
- Public keys: RSA-OAEP and RSA-PSS public key registry.
- Secure files: ciphertext metadata, hashes, AES-GCM IV/tag metadata, encrypted filename metadata.
- File manifests: signed manifest storage.
- Signatures: signed file, submission, and evaluation payloads.
- Encrypted file keys: per-recipient wrapped file keys.
- Submissions: student submission lifecycle and manifest hash.
- Evaluations: examiner evaluation lifecycle and ciphertext object reference.
- Audit logs: actor, action, resource, request metadata, and hash-chain fields.

## 9. Current API Structure Summary

Current route groups:

- `POST /api/v1/auth/token/`
- `POST /api/v1/auth/token/refresh/`
- `GET /api/v1/auth/me/`
- `/api/v1/courses/`
- `/api/v1/assignments/`
- `/api/v1/submissions/`
- `/api/v1/files/`
- `/api/v1/keys/`
- `/api/v1/evaluations/`
- `/api/v1/audit/`

The current routes are scaffold routes. Object-level access control must be strengthened before production use.

## 10. Current Frontend Structure Summary

Current frontend layout:

- `app/`: Next.js app router pages.
- `components/layout/`: application shell.
- `features/auth/`: login API and auth provider.
- `features/rbac/`: permission guard.
- `features/crypto/`: key lifecycle placeholder.
- `features/submissions/`: submission API placeholder.
- `lib/api/`: typed API client and pagination type.
- `lib/auth/`: temporary token storage.
- `lib/crypto/`: crypto types and placeholder service.
- `lib/rbac/`: role-to-permission mapping.
- `types/`: shared frontend TypeScript types.

Current auth token storage uses `sessionStorage` as a development scaffold. Production should prefer short-lived access tokens and secure HTTP-only refresh cookies.

## 11. Security Assumptions

- Backend, database, and object storage are not trusted with plaintext.
- Browsers are trusted only after the delivered frontend integrity problem is addressed.
- Private keys must never be sent to the backend.
- Public keys require fingerprinting, registration signatures, and rotation/revocation flows.
- RBAC gates server metadata and ciphertext access, but cryptographic access is controlled by wrapped file keys.
- AI services must not receive plaintext unless explicitly modeled as trusted cryptographic recipients.

## 12. Threat Model Summary

Primary threats:

- Server compromise.
- Database compromise.
- Object storage tampering.
- Malicious or compromised users.
- JWT theft.
- Public key substitution.
- Private key theft.
- Replay of old submissions or evaluations.
- Unauthorized recipient insertion.
- Malicious frontend JavaScript delivery.
- AI service plaintext exposure.

Primary mitigations planned:

- Browser-side encryption and signing.
- AES-GCM authentication.
- RSA-PSS signed manifests.
- SHA-256 hash verification.
- Per-recipient RSA-OAEP wrapped keys.
- RBAC and object-level authorization.
- Tamper-evident audit logs.
- Key transparency, key revocation, and device management.
- CSP, build integrity, and deployment hardening.

## 13. Important Implementation Rules

- Update this `PROJECT_STATE.md` after every major implementation step.
- The update must include what changed, what was implemented, what remains, and any architectural decisions made.
- Do not implement cryptography casually or with ad hoc primitives.
- Use browser Web Crypto APIs for future client-side cryptography.
- The server must never receive plaintext files, plaintext rubrics, plaintext evaluations, plaintext AES keys, or user private keys.
- Do not log secrets, JWTs, private keys, plaintext, wrapped key ciphertext, or decrypted material.
- Treat AI plaintext access as an explicit security exception requiring design approval.
- Keep RBAC and cryptographic authorization separate.
- Prefer small, auditable services over hidden cross-module behavior.

## 14. Important Coding Conventions

- Backend apps live under `backend/apps`.
- Shared backend utilities live under `backend/common`.
- Frontend domain features live under `frontend/features`.
- Shared frontend utilities live under `frontend/lib`.
- Use TypeScript strict mode.
- Keep crypto logic isolated under `frontend/lib/crypto` and `frontend/features/crypto`.
- Keep backend serializers explicit about read-only server-owned fields.
- Use clear model names for security artifacts: `UserPublicKey`, `SecureFile`, `FileManifest`, `Signature`, `EncryptedFileKey`.
- Avoid implementing production security behavior as UI-only checks.

## 15. Current Blockers / Issues

- Dependencies have not been installed.
- Django migrations have not been generated.
- No database has been initialized.
- No development servers are running.
- Frontend has not been typechecked because npm dependencies are not installed.
- Production object storage is not configured.
- Cryptography is intentionally not implemented yet.
- Object-level permissions are currently incomplete.
- Token storage is development-only.

## 16. Current Roadmap Phase

Current phase: Phase 1, security foundations and project scaffold.

Phase 1 goals:

- Stabilize backend app structure.
- Generate and validate migrations.
- Seed core roles.
- Harden baseline API permissions.
- Establish auth and RBAC workflows.

## 17. Next Recommended Tasks

1. Install backend and frontend dependencies.
2. Generate Django migrations.
3. Add a Django management command to seed default roles.
4. Add object-level RBAC filters for courses, assignments, submissions, files, and evaluations.
5. Add backend tests for auth, RBAC, file metadata creation, and audit logging.
6. Replace development token storage plan with production refresh-cookie design.
7. Design signed key registration before implementing any crypto.
8. Implement browser crypto only after API contracts and test vectors are defined.

## 18. Important Prompts Previously Used

Initial architecture prompt:

> Design a production-grade secure end-to-end encrypted academic file sharing and evaluation system for AI Viva Examiner, Project Evaluator, student uploads, and examiner rubrics using Next.js, Django REST, PostgreSQL, AES-256-GCM, RSA-OAEP, RSA-PSS, SHA-256, JWT auth, browser-side encryption, and a server that never sees plaintext.

Scaffold prompt:

> Generate the complete backend and frontend project scaffolding for the secure academic file sharing system. Requirements include Next.js with TypeScript, Django REST, PostgreSQL, JWT authentication, RBAC foundation, modular architecture, crypto service placeholders, secure environment variable handling, and optional Docker setup. Do not implement cryptography yet.

Project state prompt:

> Create a root-level PROJECT_STATE.md file that acts as persistent memory, architecture summary, implementation tracker, security decision log, and onboarding document for future Codex/AI sessions. It must always be updated after every major implementation step.

## 19. Demonstration Goals

Target demo sequence:

1. Student logs in.
2. Student registers public keys.
3. Student uploads a report that is encrypted in the browser.
4. Backend stores only ciphertext metadata, manifest, signature, and wrapped keys.
5. Examiner logs in.
6. Examiner downloads ciphertext.
7. Browser verifies signature and decrypts locally.
8. Examiner uploads encrypted rubric or evaluation.
9. Final evaluation is signed.
10. Audit log shows tamper-evident academic workflow events.

For the current scaffold demo, only navigation, auth route shape, model structure, and security boundaries are demonstrable.

## 20. Viva Preparation Notes

Key points to explain:

- End-to-end encryption means the server cannot decrypt academic files.
- JWT authenticates API access, but signatures prove authorship and non-repudiation.
- RBAC controls who can request metadata and ciphertext, while wrapped keys control who can decrypt.
- AES-GCM provides confidentiality and tamper detection for encrypted files.
- RSA-OAEP is used to share file keys with multiple recipients.
- RSA-PSS is used for upload and evaluation signatures.
- SHA-256 supports fingerprints, hash verification, and audit chaining.
- AI Viva Examiner is a special trust boundary and must be an explicit cryptographic recipient or run client-side/confidentially.
- The largest residual risk in browser E2EE is malicious frontend delivery, which must be mitigated through deployment integrity, CSP, and high-assurance client options.

