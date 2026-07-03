# 9. Future Features, Open Risks, Edge Cases & Roadmap

## 9.1 Beyond-parity future features

Features that go past what TV Time offers, in roughly ascending order of effort:

| Feature | Value | Effort | Notes |
|---|---|---|---|
| ICS calendar subscription | High | Low | Already spec'd as v1 nice-to-have — cheaper and more useful than push notifications for most users |
| Watch streaks + heatmap | Medium | Low | Pure derived data, no new integration |
| Year-in-review generator | High (delight) | Low-Medium | Pure aggregation over existing schema |
| PWA installability | High | Low-Medium | Mostly a manifest + service worker shell on top of the responsive web app |
| Multiple user profiles / household sharing | High | Medium | Schema already supports it (§2.4 of architecture doc) — mainly an invite flow + a per-item "shared or personal" flag |
| Smart collections (auto-updating lists, e.g. "Unwatched from 2024") | Medium | Medium | Saved-filter-as-list, needs a small query-builder |
| AI recommendations | Medium | Medium-High | Needs either a lightweight collaborative-filtering job over ratings, or an LLM-based "because you liked X" prompt over TMDb metadata — the latter is cheaper to build first |
| Plex/Jellyfin/Emby integration (auto-mark-watched from home media server playback) | High (for home-server users) | Medium-High | Webhook receiver matching played media against the catalog by external ID |
| Calendar sync (two-way, not just ICS subscribe) | Low-Medium | Medium | Genuine two-way sync (vs. read-only ICS) is a bigger integration than the value justifies for most users |
| Discord integration (activity posts, bot commands) | Low-Medium | Medium | Fun, niche; webhook-based posting is cheap, a full bot is not worth it at this scale |
| True offline mode (mark watched with no connection, sync later) | Medium | High | Needs local-first sync design (conflict resolution) — the one feature that would push toward a SPA rewrite (§6.2) |
| Native iOS/Android apps | Medium | High | Only worth it once the PWA has proven multi-year real usage; the REST API already supports this without backend changes |
| Automatic episode detection (recognize what's playing from a connected TV/streaming account) | Low (for a personal tool) | Very High | Effectively requires per-platform integrations with Netflix/etc., which don't offer this kind of API — not realistically buildable |
| Custom dashboards (user-arranged widgets) | Low | Medium | Polish feature, low urgency for a 1–5 user deployment |

## 9.2 Deliberately excluded (revisit only if the use case genuinely changes)

Repeating from [01-feature-analysis.md](01-feature-analysis.md) §1.4/1.6 because it's a scope decision, not a backlog item: public social feed, following other users, forums, leaderboards, and the "DNA" personality quiz. These are TV Time's ad-supported-consumer-app-era additions, not gaps in a personal tracker. If a real multi-friend-group social use case emerges later, it should be scoped as its own project decision (with real privacy/moderation design), not quietly bolted onto WatchVault's schema.

## 9.3 Missing requirements & edge cases surfaced during this design pass

These didn't fit cleanly into any single deliverable above but need explicit answers before/during build:

1. **Show renamed/merged/split in the catalog.** TMDb IDs occasionally get merged (duplicate entries consolidated) or a show's metadata changes structurally (season renumbering for anthology shows). The nightly TMDb sync job needs an explicit reconciliation step, not just a naive re-fetch, or user watch history can silently detach from its show.
2. **Timezone correctness for air dates and calendar.** Air dates from TMDb are dates, not timestamps, and networks air in their own timezone — "today" on the calendar needs a documented convention (recommend: treat air date as the announced date in the show's origin country, displayed as-is, with a note rather than false-precision timezone conversion).
3. **What does "completed" mean for an ongoing show?** A currently-airing show can never be "completed" in the same sense as an ended series. §7.2 defines completed as "every *aired* episode watched," which needs a UI distinction ("Caught up" vs. "Completed") so users aren't confused why an active show shows as done.
4. **Deleting a show from the catalog while users still have history against it.** Handled at the schema level via `ON DELETE RESTRICT` (§3.4), but needs an actual admin-facing "orphaned catalog cleanup" job and policy (never auto-delete a catalog row with any user history attached, regardless of how stale).
5. **Import re-run / partial retry.** If an import is applied and then the user runs a second import (e.g., an updated GDPR export with more recent data), the pipeline needs explicit "merge, don't duplicate" semantics — this falls out naturally from the idempotent upsert design in the API (§5.14) but should be tested as its own scenario, not assumed.
6. **Backup verification, not just backup creation.** §2.3's scheduled `mysqldump` is worthless if nobody ever confirms it restores. v1 should include a documented (even if manual, initially) restore drill, not just a cron job that's assumed to work.
7. **Single-admin bus factor.** In a true single-user deployment, if the admin account is locked out (lost password, lost 2FA/passkey device), there's no second admin to recover it. Needs either an documented server-side recovery path (CLI password reset tool run on the host) from day one, or this becomes a real support problem the first time it happens.
8. **Content with no runtime/air-date data.** Some TMDb entries are thin (indie/regional content). Statistics (§7.1) and the calendar both need graceful fallback behavior already spec'd, but the Import Wizard's matching step also needs to handle "matched the show, but season/episode numbering doesn't align" without corrupting progress state.
9. **Rate-limit exhaustion during import.** Bulk imports create/verify potentially thousands of catalog rows against TMDb in a short window. The import job needs its own backoff/retry against TMDb's rate limit, independent of the nightly sync job's pacing, or a large import can starve normal app usage of TMDb quota.

## 9.4 Phased delivery roadmap

**Phase 0 — Before any code (do now):** Request the TV Time GDPR export (see [08-migration-strategy.md](08-migration-strategy.md) §8.2). This is time-sensitive and independent of everything else.

**Phase 1 — Core tracking loop (MVP):**
Auth (single admin account), catalog sync from TMDb, show/movie tracking with status, episode watch-marking (including bulk), Home/Continue-Watching, show/movie detail pages, search, basic Watchlist. This alone is a usable TV Time replacement for the core daily habit.

**Phase 2 — Data ownership completeness:**
Import Wizard (all Essential-classified import matching/review flow), full account export, calendar view + ICS feed, ratings, custom lists (unlimited). This phase is what makes the migration off TV Time actually complete, not just "usable going forward."

**Phase 3 — Depth & polish:**
Statistics dashboard, reviews/notes, notification preferences + email/push delivery, admin panel, PWA installability, dark/light theming.

**Phase 4 — Beyond parity (pick based on real usage):**
Streaks, year-in-review, multi-profile/household sharing, smart collections. Revisit the §9.1 table against actual usage patterns after 2–3 months of real Phase 1–3 usage rather than building these speculatively.

**Ongoing, not a phase:** backups + restore verification, security patching, TMDb sync reliability monitoring — these are operational requirements from day one of Phase 1, not deferred work.

## 9.5 Final note on scope discipline

The single biggest risk to this project isn't technical — it's scope creep toward rebuilding all of TV Time's ad-supported-app feature surface, including the parts (§9.2) that exist for TV Time's business model, not for tracking what you watched. Every feature in this design package traces back to the Phase 1/2 core loop or an explicit, justified extension of it; the discipline going forward should be the same test applied to any new feature request: *does this help answer "what did I watch and what's next," or does it serve a growth/engagement/monetization goal WatchVault doesn't have?*
