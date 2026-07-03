# WatchVault — A Self-Hosted TV Time Replacement

**Status:** Architecture & product design (pre-implementation). No code has been written yet, per the design brief.

## Why this document exists

TV Time (owner: Whip Media / formerly Sony Pictures Television) has faced repeated shutdown rumors and its owner has publicly wound down consumer operations. Relying on a closed, ad-supported, VC-owned tracker for years of personal watch history is a single point of failure: if it disappears, so does your data. This project — codenamed **WatchVault** — specs out a self-hosted replacement you own outright: your database, your server, your export format, forever.

This is a **design package**, not a build. It is meant to be read in order, or dipped into by section. It covers:

| # | Document | Contents |
|---|----------|----------|
| 1 | [01-feature-analysis.md](01-feature-analysis.md) | Every TV Time feature, classified Essential / Nice-to-have / Future, with rationale |
| 2 | [02-architecture.md](02-architecture.md) | System architecture: frontend, backend, DB, auth, storage, jobs, deployment |
| 3 | [03-database-schema.md](03-database-schema.md) | Normalized MySQL schema, ER diagram, indexes, constraints |
| 4 | [04-ux-design.md](04-ux-design.md) | Every screen, layout, component, and interaction — functional spec included |
| 5 | [05-api-design.md](05-api-design.md) | REST API surface for every domain (auth, shows, movies, ratings, lists, import…) |
| 6 | [06-tech-stack-and-integrations.md](06-tech-stack-and-integrations.md) | Stack recommendation + justification; TMDb/Trakt/etc. integrations |
| 7 | [07-analytics.md](07-analytics.md) | Statistics engine: what's tracked, how it's computed, how it's shown |
| 8 | [08-migration-strategy.md](08-migration-strategy.md) | How to get your data OUT of TV Time and INTO WatchVault |
| 9 | [09-future-roadmap.md](09-future-roadmap.md) | Beyond-parity features, open risks, edge cases, phased delivery plan |

## Product thesis

TV Time's core loop is genuinely good: **"what did I watch, what's next, what's coming."** The rest — social feed, DNA quiz, ads, premium paywall, forums — is monetization scaffolding bolted onto that loop. WatchVault keeps the loop, drops the scaffolding that doesn't serve a single-user (or small-household) self-hosted deployment, and adds the things a closed SaaS product structurally can't offer: guaranteed data portability, no ads, no dark patterns around premium features, and direct API access to your own history.

## Working name & framing

- **App name:** WatchVault (placeholder — trivially renamed later, used consistently in this doc set)
- **Deployment model:** single-tenant self-hosted first (Docker Compose on a home server / small VPS), with the schema and auth model designed so multi-user/family mode is additive, not a rewrite
- **Primary user:** you, on day one. Architecture should not block a second user (spouse, roommate) or eventually a small friend group later without a rewrite.

## Key assumptions challenged vs. TV Time

TV Time's design choices were shaped by ad revenue and a mobile-app-store business model. Several of those choices are worth **not** copying:

1. **Social feed as the home screen** — TV Time defaults to a social activity feed. For a self-hosted single/family app, the home screen should default to *your* "Up Next" and calendar, not a feed. Social features (if any) become opt-in, not the default surface.
2. **DNA / personality quiz** — a marketing gimmick with no tracking utility. Classified as *not building* (see feature analysis) rather than "future enhancement," to be explicit that it's out of scope by design, not by priority.
3. **Ad-driven "watch trailer to unlock" patterns and premium paywalls** — irrelevant to a self-hosted app with no monetization pressure; every feature TV Time paywalls (e.g., unlimited custom lists, calendar widgets) is simply available.
4. **Client-authoritative watched-state with fragile sync** — TV Time users routinely report progress "resetting" or duplicating across devices. WatchVault treats the server as the single source of truth with idempotent, timestamped mutations (see [03-database-schema.md](03-database-schema.md) and [05-api-design.md](05-api-design.md)) specifically to avoid this class of bug.
5. **One-way relationship with metadata providers** — TV Time locks users into its own catalog. WatchVault treats TMDb as the canonical catalog cache but stores *external IDs* for TVDB/IMDb/Trakt on every show/movie/episode so the catalog is never a second lock-in.

## How to read the rest of this package

If you only read two documents, read **02-architecture.md** (what you're building) and **09-future-roadmap.md** (what order to build it in, and what's still unresolved). The feature analysis (01) is the source of truth that architecture, schema, UX, and API all trace back to — when in doubt about scope, that's the file to check first.
