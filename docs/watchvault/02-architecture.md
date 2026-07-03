# 2. System Architecture

## 2.1 Goals that shaped the design

- **Self-hostable on modest hardware** — a $5–10/mo VPS or a home NAS (Docker) should run this comfortably for 1–5 users.
- **Data ownership is a first-class feature, not an afterthought** — export must be a real, tested code path from day one, not a "someday" ticket.
- **Server is the source of truth** — no client-authoritative watched-state (this is where TV Time has known sync bugs).
- **Additive path to multi-user** — single-tenant now, household/multi-profile later, without a schema rewrite.
- **External catalog dependency is swappable** — the app must not hard-fail if TMDb is down; catalog data is cached locally.

## 2.2 High-level diagram

```
                                 ┌─────────────────────────┐
                                 │        Browser           │
                                 │  (Responsive Web / PWA)  │
                                 └────────────┬─────────────┘
                                              │ HTTPS (JSON)
                                 ┌────────────▼─────────────┐
                                 │      Reverse Proxy        │
                                 │   (Caddy / nginx, TLS)    │
                                 └────────────┬─────────────┘
                                              │
                          ┌───────────────────▼────────────────────┐
                          │        ASP.NET Core Web API             │
                          │  (Controllers → Services → Repos)       │
                          │  - AuthN/Z (JWT + refresh, cookies)     │
                          │  - Shows/Movies/Episodes                │
                          │  - Watch history / progress             │
                          │  - Ratings / reviews / lists             │
                          │  - Statistics engine                     │
                          │  - Import/export orchestration           │
                          └──────┬───────────────────┬──────────────┘
                                 │                    │
                     ┌───────────▼──────────┐  ┌──────▼───────────────┐
                     │   MySQL (EF Core)     │  │  Background Jobs      │
                     │  primary datastore    │  │  (Hangfire / Quartz)  │
                     └───────────────────────┘  │  - TMDb sync          │
                                                 │  - Import processing  │
                                                 │  - Notification send  │
                                                 │  - Stats aggregation  │
                                                 └──────┬────────────────┘
                                                        │
                          ┌─────────────────────────────┼─────────────────────┐
                          │                              │                     │
                 ┌────────▼────────┐          ┌──────────▼─────────┐  ┌────────▼────────┐
                 │  TMDb API        │          │  SMTP / Push        │  │  Object storage  │
                 │  (+ optional     │          │  (email, web push)  │  │  (avatars, export│
                 │   TVDB/Trakt)    │          │                     │  │   archives)      │
                 └──────────────────┘          └─────────────────────┘  └──────────────────┘
```

## 2.3 Component breakdown

### Frontend
- Server-rendered pages via Razor Views/Pages **or** a decoupled SPA (React/Vue) calling the REST API — recommendation and trade-off in [06-tech-stack-and-integrations.md](06-tech-stack-and-integrations.md).
- Bootstrap 5 for layout/components regardless of frontend approach, to minimize custom CSS.
- Responsive breakpoints: mobile (< 576px), tablet (576–992px), desktop (> 992px) — every screen in [04-ux-design.md](04-ux-design.md) is specified at all three.

### Backend — ASP.NET Core Web API
- Layered: **Controllers** (HTTP concerns only) → **Application services** (business logic, one per bounded context: Catalog, Tracking, Lists, Stats, Import, Notifications) → **Repositories** (EF Core, one DbContext).
- Bounded contexts map directly to the feature analysis groupings so ownership stays legible as the codebase grows.
- All mutation endpoints are idempotent where possible (e.g., `PUT /episodes/{id}/watched` not `POST /episodes/{id}/mark-watched-again`) specifically to avoid TV Time's duplicate/lost-progress class of bugs.

### Database — MySQL + EF Core
- Single relational store; no polyglot persistence needed at this scale. Full schema in [03-database-schema.md](03-database-schema.md).
- EF Core Migrations as the only path to schema change (no manual DDL against prod).

### Authentication
- Local email/password (Argon2id or ASP.NET Identity's default hasher) as the baseline — no dependency on a third party to log into your own data.
- JWT access token (short-lived, ~15 min) + rotating refresh token stored as an httpOnly cookie, to support both a same-origin web client and future mobile/native clients without redesign.
- Optional passkey/WebAuthn as a v1.x addition (self-hosted + passwordless is a strong pairing).
- Multi-user from the start at the *data model* level (every row is scoped by `user_id`), even though v1 ships with a single admin account created at first boot.

### File/object storage
- Local filesystem volume in the Docker Compose deployment (simplest possible default) for: user avatars, generated export archives (zip of JSON+CSV), uploaded TV Time GDPR export files pending processing.
- Storage is accessed through a thin abstraction (`IFileStore`) so it can swap to S3-compatible storage (MinIO, Backblaze B2) for VPS deployments without local persistent disks, with zero controller/service changes.

### Background jobs
- In-process job runner (Hangfire, backed by the same MySQL database — no extra infra) handles:
  - Nightly TMDb sync for tracked shows (new seasons, air dates, status changes).
  - Import job processing (GDPR export parsing runs async; user gets a progress screen, not a blocking request).
  - Notification dispatch (batched, so a hundred episode-airing events don't send a hundred emails).
  - Nightly statistics aggregation (pre-compute expensive rollups — see [07-analytics.md](07-analytics.md) — rather than calculating on every dashboard load).
  - Export archive generation (also async — large histories shouldn't tie up a request thread).

### Notification service
- Channels: email (SMTP, e.g., via any provider) and web push (VAPID) for the PWA. No SMS in v1 (unjustified cost/complexity for a self-hosted tool).
- ICS calendar feed endpoint (`/calendar/{user-token}.ics`) as a notification-adjacent feature that sidesteps building push infra just to tell someone "show airs Tuesday" — most users already have a calendar app.

### External APIs
- **TMDb** as primary catalog source (free, generous rate limits, best community metadata coverage). Full integration rationale in [06-tech-stack-and-integrations.md](06-tech-stack-and-integrations.md).
- All external IDs (TMDb, TVDB, IMDb, Trakt) stored per show/episode/movie so no single provider is a hard dependency, and so TV Time GDPR exports (which reference shows by TV Time's internal + sometimes TVDB IDs) can be matched during import.

### Deployment
- **Primary target:** Docker Compose — `api`, `db` (MySQL), `proxy` (Caddy, automatic HTTPS), optionally `minio` — a single `docker compose up` on a home server or a $5–10/mo VPS.
- **Backups:** scheduled `mysqldump` (or MySQL-native logical backup) to local disk + optional off-box copy (rsync/rclone to any remote); this is treated as a v1 requirement, not an afterthought, because "my data belongs to me" is meaningless without backups.
- **Updates:** versioned Docker images + EF Core migrations applied automatically on container start, with a documented rollback path (previous image tag + `migrate down`).
- **Observability:** structured logging (Serilog) to file/stdout, health check endpoint (`/health`) for the proxy and for uptime monitoring (e.g., Uptime Kuma, self-hosted alongside).

## 2.4 Multi-tenancy posture (important architectural decision)

Every table that holds user data carries a `user_id` foreign key from day one, and the API layer enforces row-level ownership on every query — **even though v1 ships as a single-admin-account deployment**. This is the one place where building "for the future" up front is justified: retrofitting tenant isolation onto a schema and query layer that assumed a single user is a rewrite, not an incremental change. Household/multi-profile support (v2, see [09-future-roadmap.md](09-future-roadmap.md)) then becomes "allow creating a second user row and inviting them," not a data model migration.

## 2.5 Security posture

- All traffic behind TLS (Caddy automatic certs, or bring-your-own via the user's existing reverse proxy).
- Rate limiting on auth endpoints (ASP.NET Core built-in rate limiting middleware) to blunt credential-stuffing against a self-hosted internet-facing instance.
- Secrets (DB password, JWT signing key, TMDb API key, SMTP creds) via environment variables / Docker secrets — never committed, never in the image.
- CSRF protection for cookie-based refresh flow; CORS locked to the deployment's configured origin(s).
- Import pipeline treats uploaded GDPR export files as untrusted input: strict schema validation before any DB write, size limits, and processing in a sandboxed background job rather than inline with the upload request.
