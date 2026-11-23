# Security notes for Replotre v2

### Implemented defenses

- Scrypt password hashes with random salts, constant-time verification; random 256-bit session tokens stored only as SHA-256 hashes in SQLite.
- Session cookie `HttpOnly; SameSite=Strict; Secure` when `NODE_ENV=production`; TLS termination at Caddy.
- CSRF protection through required custom request header plus strict `Origin` match when supplied. CORS is not enabled.
- Resource-scoped SQL queries verify `user_id` and `project_id` for assets, projects, renders and downloads; unauthorized objects return 404.
- SQL prepared statements and JSON/body-size validation; account, upload, AI and rendering rate and quota limits.
- Binary uploads streamed with size caps and magic byte validation, verified with FFprobe before acceptance; user filenames do not form filesystem paths.
- FFmpeg invoked with argument arrays, never a shell command. Filter parameters are tightly constrained. Text content comes from temporary text files rather than injected shell input.
- Security headers include CSP, HSTS (HTTPS mode), frame restrictions, nosniff, no-referrer cross-origin policy, and feature restrictions. Secrets stay server side.
- SQLite WAL and optimistic version-checked project saves; server-side assets in a private volume.

- SSE streams authenticate by session, scope replay to the account, revalidate authorization on heartbeat, and omit secrets/media/transcripts. Stream connection and replay limits bound resource use.
- Director edits are atomic, validate source ownership and numeric/media bounds, and reject stale versions. Retained project revisions support recovery.
- Source filenames, transcripts and frame descriptions are treated as untrusted provider context. Models only propose allowlisted operations; model-generated code is never run.
- Local upload analysis uses FFmpeg. External transcription and visual analysis occur only after explicit requests and consume the per-account AI request quota. Failed providers do not produce synthetic transcripts.

### Known limitations and mandatory hardening before general availability

- In-memory IP rate limits are **not** shared between server replicas and may penalize users behind a shared NAT. Keep single-node until replaced with a central rate limiter.
- Registration does **not** verify email ownership. Use invite-only access initially; add verification and self-service password recovery before open registration.
- No payments, explicit billing or account-wide processing budget; the free rate/storage caps are not a substitute for metered billing.
- Project deletion is implemented, but full account deletion / data portability / retention policy, notices, privacy policy and terms need product/compliance work.
- Single-instance SQLite storage and in-process render queue are not intended for horizontal scaling. Queued jobs resume after restart; interrupted active jobs become retryable failures.
- Video parsing and FFmpeg operate on user-provided media. Run the editor on a dedicated low-privilege host/container; patch FFmpeg regularly and consider additional isolation for high-risk public traffic.
- Password reset is not implemented. Users may lose access unless support is available to verify ownership through an established process.
- Backups, alerting, threat modeling, independent security review, abuse reporting, and load testing are operator responsibilities.

**Operational default:** use a strong `SIGNUP_INVITE_CODE`, HTTPS, frequent backups, limited customer count and monitoring. Treat this as a deployable early-access product, not a security certification or enterprise-readiness claim.
