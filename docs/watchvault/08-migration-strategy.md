# 8. Data Migration Strategy — Getting Your Data Out of TV Time

## 8.1 Reality check

TV Time has never published a public, documented export API. Any migration plan has to be built around that constraint, ranked by reliability, and designed so the importer is tolerant of imperfect/partial source data rather than assuming a clean, stable schema. Below is the ranked strategy; the Import Wizard ([04-ux-design.md](04-ux-design.md) §4.15) and import API ([05-api-design.md](05-api-design.md) §5.10) are both built around **path 1** as primary, with the importer's schema-tolerant design absorbing whichever of the fallback paths actually gets used in practice.

## 8.2 Path 1 (primary): GDPR / CCPA data export request

Every service operating in the EU or California is legally required to provide a personal data export on request. This is the most legitimate, ToS-compliant, and durable path, and should be the first thing done — **today**, independent of when WatchVault is actually built — since export requests can take days to fulfill and TV Time's continued operation is exactly the thing in question.

**Action items (do this now, not after the app is built):**
1. In the TV Time app: Settings → Privacy/Data → "Request my data" (or equivalent — exact menu wording has changed across app versions). If not present in-app, email TV Time's privacy contact directly citing GDPR Art. 15 / CCPA as applicable, requesting a full export of account data including watch history, ratings, reviews, and lists.
2. Expect a delivery as an email link to a downloadable archive (commonly CSV and/or JSON files bundled in a zip) within the legally mandated window (typically ≤30 days).
3. **Download and archive the raw export immediately upon receipt**, unmodified, in at least two locations (local disk + one off-site copy) before doing anything else with it. This raw archive is the source of truth for every later import attempt — treat it like a backup, not a scratch file.

**Design implication:** because the exact file/column layout of TV Time's export has changed over time and isn't publicly documented, the importer is built schema-tolerant rather than hard-coded to one exact format:
- Accepts a zip, a folder of CSVs, or individual CSV/JSON files.
- Column-mapping step (part of the Import Wizard) lets the user confirm which source column means "show name," "episode watched date," etc., with sensible auto-detected defaults (header-name heuristics: `show`, `series`, `title`; `watched_at`, `date_watched`, `timestamp`) — so a future TV Time export with renamed columns doesn't break the tool, it just asks for confirmation.
- Matching against the local catalog uses fuzzy title matching plus, where the export includes them, TVDB/TMDb/IMDb IDs (which TV Time exports have historically included for at least some rows) — this is exactly why [03-database-schema.md](03-database-schema.md) stores all three external-ID types on every catalog row.

## 8.3 Path 2: Undocumented/reverse-engineered API

TV Time's mobile app talks to a backend API that is not publicly documented or supported, and using it outside the app carries real risk: it can break without notice, may violate TV Time's Terms of Service, and — this is a hard line for this project — **should never be used to scrape anyone else's data, only your own authenticated session.**

**Recommendation: do not build this.** It's high-effort, fragile (unversioned, can change or get rate-limited/blocked at any time), and legally murkier than the GDPR path for no real benefit — the GDPR export already gets the same data through a channel TV Time is obligated to support. This path is listed for completeness, not because it's advised.

## 8.4 Path 3: Community bridge via Trakt

A pragmatic middle path: TV Time and Trakt.tv both have (or have had) sync integrations with each other, and third-party browser extensions/scripts exist in the self-hosting/tracker community specifically to migrate watch history between trackers via each service's own logged-in session (not scraping — driving your own authenticated browser session, same trust model as manually clicking through the export yourself).

If such a bridge is available and working at the time of migration: TV Time → Trakt (via the community tool) → WatchVault imports from Trakt's actual documented, versioned API (see [06-tech-stack-and-integrations.md](06-tech-stack-and-integrations.md) §6.3 — Trakt sync is already a planned optional integration). This turns an unreliable scrape into an import against a stable, documented API, at the cost of an extra hop and trusting a third-party tool with read access to your TV Time session. Treat this as a **fallback if the GDPR export is thin or delayed**, not the primary plan — verify whatever specific community tool exists at migration time is actively maintained before trusting it with your account session.

## 8.5 Path 4: Manual/CSV import assistant

For anything the automated matching can't resolve — shows the export references that don't cleanly match the TMDb catalog, or a small number of items the user wants to hand-enter — a plain CSV template (`show_title, season, episode, watched_date, rating`) is documented and accepted by the same import pipeline as the GDPR export, reusing the exact same matching/review UI. This is also the practical answer for "TV Time shut down before I could export" — a best-effort manual reconstruction from memory or from screenshots is still meaningfully better than starting from zero, and it costs nothing extra to support since the importer already needs a generic CSV path.

## 8.6 Path 5: Browser automation (self-scrape, last resort)

If neither an export nor a Trakt bridge is available (e.g., TV Time disables data-export requests before shutting down), a locally-run browser automation script (Playwright, run by the user against their own logged-in TV Time web session, never headless-farmed against multiple accounts) can walk the user's own show list and watch-history pages and emit CSV/JSON in the Path 4 format. This is explicitly scoped as **personal, one-time, self-directed data retrieval of your own account** — not a scraping service, not something offered to other users, and something to attempt only if paths 1–4 are genuinely exhausted, given ToS and fragility concerns similar to Path 3.

## 8.7 What the Import Wizard does regardless of source path

Because every path above ultimately produces the same shape of data (a list of shows/movies with watched episodes, dates, and optionally ratings), the wizard in [04-ux-design.md](04-ux-design.md) §4.15 and the `import_jobs`/`import_row_matches` tables in [03-database-schema.md](03-database-schema.md) are source-agnostic:

1. Upload (zip/CSV/JSON, any of the above paths).
2. Parse into a normalized intermediate row set.
3. Match each show/movie against the local catalog (exact external-ID match → fuzzy title match → unmatched).
4. Surface unmatched/low-confidence rows for manual resolution — never silently drop data.
5. Apply: bulk-write `user_show_status`, `user_episode_progress`, `user_movie_progress`, `ratings` rows, then trigger the nightly stats rollup immediately (rather than waiting for the next scheduled run) so the user's statistics reflect their real history right after import completes.

## 8.8 Open risk

The single biggest risk to this entire migration plan is **time** — if TV Time shuts down before an export is requested, Path 1 (the reliable path) is gone and everything falls back to weaker options. This is why §8.2's action item is written as "do this now," independent of the rest of the WatchVault build timeline in [09-future-roadmap.md](09-future-roadmap.md).
