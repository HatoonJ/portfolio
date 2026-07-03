# 4. UI/UX Design & Functional Specification

Design language: clean, content-forward, poster-art-driven grids (like TV Time) but without copying its iconography, color system, or copyrighted art. Bootstrap 5 grid + utility classes, a neutral dark-mode-first theme (most usage is evening TV-watching), accent color left as a configurable CSS variable so the self-hoster can re-skin trivially.

Every screen below is specified for **desktop (≥992px)**, **tablet (576–992px)**, and **mobile (<576px)**, since responsive behavior was a stated requirement, not a follow-on.

## 4.1 Global navigation

- **Desktop:** persistent left sidebar (Home, Shows, Movies, Calendar, Discover, Lists, Stats) + top bar (search, notifications bell, avatar menu).
- **Tablet:** collapsed icon-only sidebar, expandable on tap.
- **Mobile:** sidebar becomes a bottom tab bar (Home, Discover, Calendar, Lists, Profile) — 5 items max, matching thumb-reach patterns; search is a top-bar icon that expands to full-width overlay.
- Global search is available from every screen (Cmd/Ctrl+K desktop shortcut) and searches shows, movies, and people in one query with tabbed results.

## 4.2 Home / Dashboard

**Purpose:** answer "what do I watch next" in under one second — this is the screen a returning user lands on.

Sections, top to bottom:
1. **Continue Watching** — horizontal-scroll (desktop: grid) of shows with an unwatched, already-aired next episode. Card shows poster, show title, "S2E4 · The Reckoning", a one-tap "Mark watched" button on hover (desktop) or long-press (mobile).
2. **Coming Up** — next 7 days of episodes/premieres from tracked shows, chronological, with countdown chips ("in 2 days").
3. **Recently Added to Watchlist** — small shelf, links to full Watchlist page.
4. **This Week in Numbers** — compact stat strip (episodes watched, hours watched, current streak) linking to full Statistics page.

Empty state (new user, nothing tracked yet): replaces sections 1–3 with a single prompt — "Track your first show" → Discover page, plus a prominent "Import from TV Time" call-to-action, since for this product's actual target user (you, migrating), import is the real day-one action, not organic discovery.

Interactions: marking an episode watched from the Home screen optimistically updates the UI, then confirms against the server response (server remains authoritative — see architecture §2.4); on conflict/error the card visibly reverts with a toast, never a silent failure.

## 4.3 TV Shows (library)

- Filter/sort bar: status (Watching / Plan to Watch / Completed / Dropped / All), sort by (Last watched, Alphabetical, Next air date, Date added).
- Grid of poster cards (responsive: 6 cols desktop → 4 tablet → 3 mobile), each showing progress bar (episodes watched / total) and a status badge.
- Card overflow menu (⋯): change status, rate, add to custom list, untrack, view details.
- Bulk actions toolbar appears when the user long-presses/checks multiple cards (bulk status change — needed heavily during import backfill).

## 4.4 Movies (library)

- Same layout pattern as Shows but simplified: no episode progress bar, just Watched / Want to Watch toggle and rating.
- Sort by: Date watched, Alphabetical, Release date, Rating.

## 4.5 Show detail page

- Header: backdrop image, poster, title, network, status badge, overall show rating (yours + optionally aggregate if later synced from a provider).
- Action row: Track/Untrack toggle, status dropdown, rate (stars), add to list.
- Season selector (tabs on desktop, dropdown on mobile) → episode list: each row = still thumbnail, episode number/title, air date, watched checkbox, per-episode rating, notes/review icon.
- "Mark all previous as watched" affordance when checking a mid-season episode (prompts: "Mark episodes 1–4 watched too?") — directly supports fast backfill after import.
- Cast section (horizontal scroll of actor cards) — sourced from TMDb, read-only.

## 4.6 Movie detail page

- Same header pattern as show detail, simplified action row (Watched toggle, rate, add to list), cast section, "similar movies" shelf (future/TMDb-provided).

## 4.7 Calendar

- Month view (desktop/tablet) / agenda list view (mobile, since a 7-column month grid doesn't fit usefully under 400px wide) of upcoming episodes and premieres across tracked shows.
- Each entry: poster thumbnail, show + episode title, air time (localized to user's timezone from `users.timezone`).
- "Subscribe" button surfaces the per-user ICS feed URL (with a regenerate-token action, since the URL itself is the auth mechanism for that feed).

## 4.8 Watchlist

- Distinct from "Plan to Watch" status — the Watchlist is the user's default `custom_lists` row (`is_watchlist = true`), a simple ranked queue of what to watch next across both shows and movies.
- Drag-to-reorder on desktop, up/down buttons or long-press drag on touch.
- "Start watching" action moves an item from Watchlist into active tracking with one tap.

## 4.9 Custom Lists

- Grid of list cards (name, item count, cover collage of first 4 posters) → list detail page (same poster-grid pattern as Shows/Movies, mixed content types allowed).
- Create/rename/delete list, drag-reorder items, remove item.
- No cap on number of lists (explicit contrast with TV Time's premium paywall — see [01-feature-analysis.md](01-feature-analysis.md)).

## 4.10 Discover

- Trending Shows / Trending Movies shelves (TMDb-sourced), Genre browse chips, "Popular this month".
- Card tap → detail page with an immediate Track/Watchlist action, no dead-end browsing.

## 4.11 Search

- Unified search bar → tabbed results (Shows / Movies / People), each result card shows a one-tap track/add action inline so search-to-track is a single interaction.
- Recent searches shown on empty query state.

## 4.12 User Profile

- Avatar, display name, join date, headline stats (shows completed, episodes watched, hours watched, current streak).
- Tabs: Activity (personal watch history timeline — private, not a social feed), Favorites, Reviews written.

## 4.13 Statistics

- Time range selector: This Month / This Year / All Time / Custom range.
- KPI tiles: hours watched, episodes watched, movies watched, shows completed.
- Charts (see [07-analytics.md](07-analytics.md) for data model): monthly activity bar chart, genre breakdown donut, top networks list, top actors list (derived from cast data on watched content), streak calendar heatmap (GitHub-contributions-style).
- Year-in-review generator (future, see roadmap) surfaces here as a shareable-image export.

## 4.14 Settings

- Sections: Account (email, password, passkeys), Notifications (channel toggles), Appearance (theme), Data (export archive, delete account), Calendar (ICS link + regenerate), Integrations (TMDb key status if self-managed, Trakt connect if enabled), Admin (only visible to `role = admin`: manage users, view job queue/health).

## 4.15 Import Wizard

A dedicated multi-step flow, not a buried settings toggle — this is a first-class screen given the migration urgency:

1. **Upload** — drag-drop the TV Time GDPR export zip (or CSV/JSON fallback).
2. **Parsing** — progress screen (backed by the async `import_jobs` row), shows live counts as rows are matched against the catalog.
3. **Review matches** — table of ambiguous/unmatched shows with search-to-fix inline (backed by `import_row_matches`), so the user resolves edge cases once rather than the import silently dropping data.
4. **Confirm & apply** — final counts summary ("142 shows, 3,204 episodes, 89 movies will be imported") with an explicit confirm step before writing to the live library.
5. **Done** — summary screen linking straight to Home, which now reflects the imported state.

Full workflow detail in [08-migration-strategy.md](08-migration-strategy.md).

## 4.16 Admin Panel

Visible only to `role = admin`, relevant even in a 1–2 user deployment since "admin" is just "the person who set up the server":
- User list (invite/create additional users, reset password, disable account).
- Background job monitor (queued/running/failed jobs, manual retry).
- System health (DB size, storage used, last TMDb sync time, last backup time).
- App-wide settings (TMDb API key, SMTP config, registration open/closed).

## 4.17 Cross-cutting interaction patterns

- **Optimistic UI + server reconciliation** everywhere a watched-state toggle exists, per the architecture's "server is truth" principle — the UI never claims success the server hasn't confirmed for more than a brief optimistic window.
- **Undo, not confirm, for low-risk actions** (unmark watched, remove from list) via a toast with an Undo button; **explicit confirm dialogs** reserved for destructive/hard-to-reverse actions (delete list, delete account, untrack with history wipe).
- **Keyboard navigation** on desktop for power users (arrow keys through episode lists, `w` to mark watched) — a genuine improvement over TV Time's mobile-only interaction model now that this is a first-class web app.
