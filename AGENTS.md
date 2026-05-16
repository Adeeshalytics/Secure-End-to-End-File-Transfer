# AGENTS.md

Mandatory rules for all future AI-assisted development sessions on this secure academic evaluation system.

## Project Mission

Build a demonstrable, production-minded, secure academic file sharing and evaluation system for students, examiners, project evaluators, course administrators, and an optional AI Viva Examiner.

The system must preserve end-to-end encryption, integrity verification, non-repudiation, RBAC boundaries, and zero-trust storage. Academic files, rubrics, submissions, and evaluations must remain confidential from the backend.

## Non-Negotiable Security Rules

1. Never decrypt files server-side.
2. Never send plaintext files, rubrics, evaluations, feedback, or submission content to the Django backend.
3. Never store plaintext files in PostgreSQL, object storage, logs, cache, analytics, crash reports, or temporary backend files.
4. Never store user private keys server-side.
5. Never log private keys, plaintext, AES file keys, JWTs, refresh tokens, wrapped key ciphertext, or decrypted material.
6. Browser-side encryption is mandatory for academic content.
7. Use AES-256-GCM only for file/content encryption.
8. Use RSA-OAEP with SHA-256 only for file encryption key wrapping.
9. Use RSA-PSS with SHA-256 only for digital signatures.
10. Use SHA-256 for content hashes, manifest hashes, public key fingerprints, and audit hash chaining.
11. Never invent custom cryptography, custom padding, custom signature schemes, or custom key derivation.
12. Use platform cryptography APIs, preferably browser Web Crypto API for frontend cryptography.
13. Keep JWT authentication separate from cryptographic trust. JWT proves session authorization; signatures prove authorship.
14. Maintain zero-trust architecture. Assume database, object storage, backend operators, and network paths may be compromised.
15. Treat AI Viva Examiner access to plaintext as a special explicit trust-boundary decision. AI must either run client-side, run in a confidential environment, or be modeled as a cryptographic recipient.

## Mandatory Project-State Rule

After every major implementation step, update `PROJECT_STATE.md`.

The update must capture:

- what changed
- what was implemented
- what remains pending
- security or architecture decisions made
- verification performed
- new blockers or risks

Do not leave `PROJECT_STATE.md` stale after schema changes, route changes, frontend workflow changes, crypto-related changes, auth/RBAC changes, or demonstration-flow changes.

## Security Reasoning Rule

For every security-relevant implementation, explain the reasoning in either:

- code comments for non-obvious local logic
- documentation
- `PROJECT_STATE.md`
- the final response to the user

Security reasoning should answer:

- what asset is being protected
- who is trusted
- who is not trusted
- what attack is mitigated
- what residual risk remains

## Architecture Principles

1. Preserve the ciphertext-only backend boundary.
2. Keep RBAC and cryptographic authorization separate.
3. Keep modules small, explicit, and testable.
4. Prefer boring, auditable code over clever abstractions.
5. Avoid unnecessary complexity unless it directly improves security, correctness, or demonstration value.
6. Prioritize demonstrable security properties for academic viva and project evaluation.
7. Keep implementation aligned with academic project goals, not generic enterprise sprawl.
8. Use clear service boundaries:
   - frontend crypto
   - backend auth
   - backend RBAC
   - metadata persistence
   - object storage
   - audit logging
   - AI examiner boundary
9. Avoid mixing plaintext UX state with backend persistence.
10. Prefer explicit API contracts for manifests, signatures, hashes, and wrapped keys.

## Backend Rules

1. Backend code lives under `backend/`.
2. Django apps live under `backend/apps/`.
3. Shared backend utilities live under `backend/common/`.
4. Backend APIs must validate authentication and authorization.
5. Backend APIs must not accept plaintext academic content.
6. Backend APIs may store:
   - ciphertext object references
   - hashes
   - signed manifests
   - public keys
   - signatures
   - wrapped file keys
   - RBAC metadata
   - audit metadata
7. Backend serializers must mark server-owned fields read-only.
8. Backend views must enforce object-level RBAC before returning metadata or ciphertext references.
9. Audit logging must avoid secrets and sensitive cryptographic material.
10. Migrations must be generated and committed for model changes.
11. Add tests for auth, RBAC, metadata validation, audit logs, and security invariants.

## Frontend Rules

1. Frontend code lives under `frontend/`.
2. Domain features live under `frontend/features/`.
3. Shared frontend utilities live under `frontend/lib/`.
4. Cryptographic code must remain isolated under:
   - `frontend/lib/crypto`
   - `frontend/features/crypto`
5. The browser owns plaintext handling.
6. The browser owns encryption, decryption, signing, verification, and key unwrap operations.
7. Private keys must remain client-side.
8. Any key export, key backup, or device enrollment workflow must be explicit and security-reviewed.
9. Use TypeScript strict mode.
10. Provide clear loading, error, and verification-failure states for security workflows.
11. Do not rely on frontend-only RBAC for security. Backend authorization is mandatory.

## Database Rules

The database may store only security-safe records:

- user metadata
- role assignments
- course and assignment metadata
- public keys
- key fingerprints
- encrypted file metadata
- signed manifests
- signatures
- per-recipient wrapped file keys
- audit records

The database must not store:

- plaintext files
- plaintext rubrics
- plaintext evaluations
- plaintext feedback
- private keys
- raw AES file encryption keys
- decrypted AI context

## Cryptographic Design Rules

1. Every file must use a unique 256-bit file encryption key.
2. Every AES-GCM encryption must use a unique IV for the file key.
3. Signed manifests must bind files to their academic context:
   - file ID
   - uploader ID
   - course ID
   - assignment ID
   - submission ID when applicable
   - file type
   - hashes
   - timestamp
   - schema version
4. Download flows must verify signatures and hashes before trusting decrypted content.
5. Recipient access must be represented by per-recipient wrapped file keys.
6. Revocation must be represented explicitly. Do not pretend old recipients can be made unable to decrypt content they already downloaded.
7. Public key changes require fingerprinting, auditability, and future key-rotation policy.

## RBAC Rules

Maintain role boundaries for:

- `student`
- `examiner`
- `project_evaluator`
- `course_admin`
- `system_admin`
- `ai_examiner_service`

RBAC must control:

- who can list courses
- who can view assignments
- who can create submissions
- who can view submission metadata
- who can request encrypted file metadata
- who can upload rubrics
- who can create or finalize evaluations
- who can view audit logs
- who can manage keys and access grants

Object-level RBAC is required before production or final demonstration.

## Demonstration Priorities

Prioritize workflows that show security properties clearly:

1. User authentication.
2. Role-based dashboards.
3. Public key registration.
4. Browser-side encrypted student upload.
5. Server stores ciphertext metadata only.
6. Examiner receives wrapped key and ciphertext.
7. Browser-side signature/hash verification.
8. Browser-side decryption.
9. Signed evaluation finalization.
10. Tamper-evident audit log view.

## Coding Conventions

1. Keep files focused and reasonably small.
2. Use descriptive names for security artifacts.
3. Prefer explicit serializers, DTOs, and TypeScript interfaces.
4. Avoid broad utility modules that hide security decisions.
5. Do not introduce large dependencies without a clear security or productivity reason.
6. Keep comments concise and use them mainly for security invariants or non-obvious logic.
7. Do not mix generated build output with source files.
8. Run relevant verification after changes:
   - backend: `python manage.py check`
   - backend schema: `python manage.py makemigrations --check`
   - frontend: `npm run typecheck`
   - frontend build when UI/routes change: `npm run build`
9. Document any verification that could not be run.

## Current Implementation Reality

The project currently has a runnable scaffold, not a complete product.

Current crypto files are placeholders. They are intentionally not secure implementations yet.

Do not present the frontend or backend as complete until:

- browser cryptography is implemented and tested
- object-level RBAC is implemented
- upload/download workflows are implemented
- key registration is implemented
- evaluations are signed
- security tests exist
- demonstration flow is end-to-end

