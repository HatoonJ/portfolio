# 6. Technology Stack & External Integrations

## 6.1 Recommended stack

| Layer | Choice | Why |
|---|---|---|
| Backend | **ASP.NET Core Web API (.NET 8 LTS)** | Requested by brief; also genuinely well-suited: mature, single-binary deployable, strong typed data layer, long support window (LTS), excellent background-job story (Hangfire), first-party health checks and rate limiting middleware — all things a self-hosted app leans on. |
| ORM | **Entity Framework Core** | Migrations-as-code fits the "no manual DDL against prod" deployment principle; LINQ keeps the repository layer readable. |
| Database | **MySQL 8** | Requested by brief; also a reasonable pick over Postgres here mainly for hosting familiarity/ubiquity on cheap shared and VPS hosting — functionally either would work fine at this scale. |
| Frontend rendering | **Server-rendered Razor Pages/MVC views + Bootstrap 5, progressively enhanced with vanilla JS/fetch for the interactive bits (mark-watched, drag-reorder)** | See §6.2 for the SPA trade-off; this is the recommended default. |
| Frontend framework (if going SPA) | **Vue 3** if a full client-rendered app is preferred over Razor | See §6.2. |
| CSS | **Bootstrap 5** | Requested; also minimizes bespoke CSS surface for a solo-maintained project. |
| Background jobs | **Hangfire** (MySQL storage) | No extra infrastructure (Redis, message broker) — jobs live in the same database, which matches the "modest hardware" deployment goal. |
| Auth | **ASP.NET Core Identity (customized) + JWT** | Batteries-included password hashing, lockout policies, and email-confirmation plumbing without hand-rolling auth. |
| Containerization | **Docker + Docker Compose** | The actual deployment target described in the architecture doc. |
| Reverse proxy / TLS | **Caddy** | Automatic HTTPS with zero manual cert management — appropriate for a project whose target operator is one person running it at home. |
| Logging | **Serilog → file + stdout** | Simple, no external log aggregator required at this scale. |

## 6.2 Server-rendered vs. SPA — the one real architectural fork

The brief allows either; here's the actual trade-off rather than a default:

- **Razor + Bootstrap + light JS (recommended for v1):** Faster to build correctly with one person maintaining both front and back end; SEO is irrelevant (private app) so server-rendering buys nothing there, but it *does* buy simpler auth (cookie session, no token-in-JS-storage XSS surface to reason about), simpler deployment (one process, no separate build pipeline), and it's easier to keep the "server is source of truth" principle honest because there's no client-side state cache to accidentally treat as authoritative.
- **Vue/React SPA against the REST API:** Justified if a genuinely offline-capable PWA is a near-term goal (a SPA with a service worker and local-first sync is a much more natural fit than progressively-enhanced Razor), or if native mobile apps are on a realistic 12-month roadmap and code/logic reuse against the same REST API matters.
- **Recommendation:** ship v1 as Razor + Bootstrap + fetch-based interactivity. The REST API in [05-api-design.md](05-api-design.md) is fully specified either way, so nothing is lost if a SPA rewrite of just the frontend becomes worthwhile once offline mode (a Future feature) is actually being scheduled — the backend doesn't change.

## 6.3 Metadata & content integrations

| Service | Role | Notes |
|---|---|---|
| **TMDb (The Movie Database)** | Primary catalog source — shows, movies, seasons, episodes, cast, images, trending | Free API, generous rate limits (~50 req/s), best-maintained community metadata, has both TV and movie coverage in one API (unlike TVDB, which is TV-only, or OMDb, which is thin). Chosen as canonical source. |
| **TheTVDB (TVDB)** | Secondary — ID cross-reference only | TV Time's own data (and many GDPR exports) reference TVDB IDs for shows; storing TVDB IDs alongside TMDb IDs in `show_external_ids` is what makes import matching reliable without needing TVDB as a live dependency. |
| **IMDb** | ID storage only, no live API | IMDb has no public free API; IDs are stored (sourced via TMDb's `external_ids` endpoint, which already returns IMDb IDs) purely so a show/movie page can deep-link to IMDb if desired. |
| **Trakt.tv** | Optional two-way sync (v1.x/future) | Same problem space as this project, but cloud-hosted; offering *optional* Trakt sync lets a user keep Trakt's mobile-checkin convenience while WatchVault remains the system of record — this is opt-in, never a dependency. |
| **OMDb** | Not integrated | Rate-limited free tier and coverage fully subsumed by TMDb; no functional gap it fills here. |
| **TVMaze** | Not integrated initially, candidate fallback | Could serve as a secondary air-date source if TMDb data for a given show is stale/thin; not justified for v1 given TMDb's coverage is already strong. |
| **YouTube (trailers)** | Embedded via TMDb's `videos` endpoint, which returns YouTube keys | No direct YouTube API integration needed — TMDb already aggregates this. |
| **JustWatch-style "where to watch"** | Future — TMDb also exposes a `watch/providers` endpoint (region-restricted) | Cheap to add later since it rides on the existing TMDb integration; deferred because it's a "nice context" feature, not core tracking. |

## 6.4 Notification integrations

- **Email**: any SMTP provider (self-hosted Postfix, or a transactional provider like a personal SES/Mailgun account) — configured, not hard-coded, since this varies per self-hoster.
- **Web Push**: standard VAPID-based browser push, tied to the PWA — avoids needing a native push gateway (APNs/FCM) until/unless native apps are built.

## 6.5 Rate-limit & caching posture for external APIs

- TMDb responses for a given show/episode are cached in the local catalog tables and only re-synced on a schedule (nightly job) or on-demand ("refresh" button on a show page), never fetched live on every page view — this keeps the app usable if TMDb is briefly down and keeps the app within free-tier rate limits regardless of how many users are browsing.
- Search-as-you-type against the catalog hits the local fulltext index first; TMDb is only queried when a search returns no local matches (a show nobody has tracked yet), which is also the trigger to cache that show's metadata for next time.

## 6.6 When this stack would need to change

Worth stating plainly rather than pretending the stack is forever: MySQL fulltext search is adequate for a personal library (hundreds to low thousands of titles) but would not scale to a public multi-tenant catalog-search product; if WatchVault ever grew into a multi-household hosted SaaS rather than a self-hosted personal tool, that's the point to introduce a dedicated search index (e.g., Meilisearch) and reconsider Hangfire-on-MySQL versus a real message queue. Nothing in the schema or API design blocks that migration — it's a scaling concern, not a rewrite trigger.
