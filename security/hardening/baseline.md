# Security Hardening Baseline

- Use TLS 1.3 in every deployed environment.
- Keep JWT access tokens short-lived.
- Store refresh tokens only in secure, HTTP-only cookies in production.
- Require MFA for examiners, project evaluators, and administrators.
- Never log plaintext, secrets, private keys, JWTs, or wrapped key ciphertext.
- Enforce strict CORS and CSP.
- Use immutable object storage and server-side access logs.
- Rotate Django `SECRET_KEY`, database credentials, and object storage credentials through a managed secrets store.

