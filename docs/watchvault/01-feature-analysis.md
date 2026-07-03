# 1. Feature Analysis — TV Time Inventory & Classification

Legend: **E** = Essential (v1 launch-blocking), **N** = Nice-to-have (v1.x, high value but not launch-blocking), **F** = Future enhancement (v2+ or opportunistic), **X** = Explicitly not building (see rationale).

## 1.1 Core tracking

| Feature | Class | Notes |
|---|---|---|
| Add show to library / track a show | E | The whole product depends on this |
| Mark episode watched / unwatched | E | Must support single-tap and bulk ("watch all of season") |
| "Up Next" episode per show | E | Core home-screen primitive |
| Auto-advance to next episode after marking watched | E | Reduces friction; TV Time's biggest UX win |
| Bulk mark season/series as watched | E | Needed for backfilling migrated history |
| Watch progress bar (episodes watched / total) per show | E | |
| Drop / stop tracking a show | E | Distinct from "delete" — keeps history, stops "up next" surfacing |
| Track movies (watched / want to watch) | E | TV Time added this later; users expect parity |
| Rewatch tracking (watch count per episode, not just boolean) | N | Needed for accurate "hours watched" stats on rewatches |
| Multiple watch sources / where-to-watch per show (streaming availability) | N | Requires JustWatch-style provider; see integrations |
| Episode air-date countdown ("airs in 3 days") | E | |
| Season premiere / finale flags | N | Nice signal on calendar & show page |
| Show status (Returning, Ended, Canceled, In Production) | E | Sourced from TMDb |
| "Continue watching" shelf | E | Shows with an unwatched next episode already aired |
| "Coming up" / upcoming episodes shelf | E | Shows with a next episode not yet aired |

## 1.2 Discovery & search

| Feature | Class | Notes |
|---|---|---|
| Search shows/movies by title | E | |
| Show/movie detail page (synopsis, cast, seasons, ratings) | E | |
| Trending / popular shows | N | Pulled from TMDb trending endpoint |
| Genre browse | N | |
| Recommendations ("Because you watched X") | F | Needs a recommendation model — see roadmap |
| Actor/crew detail pages, filmography | F | Nice depth feature, low priority for v1 |
| "Similar shows" | F | TMDb provides this cheaply; low effort, but not core loop |

## 1.3 Organization

| Feature | Class | Notes |
|---|---|---|
| Watchlist ("Plan to watch") | E | |
| Custom lists (arbitrary, user-named, ordered) | E | TV Time paywalls unlimited lists — WatchVault doesn't |
| Favorites / pin shows | N | |
| Followed shows vs. tracked shows distinction | N | TV Time conflates "follow" and "track"; WatchVault can simplify to one concept — see UX doc |
| Archive / hide completed shows from active list | N | |
| Tags/labels on shows (user-defined) | F | Power-user feature |

## 1.4 Ratings, reviews, social

| Feature | Class | Notes |
|---|---|---|
| Rate an episode (thumbs / stars) | E | |
| Rate a show overall | N | |
| Rate a movie | E | |
| Written review/comment per episode | N | TV Time's episode comment threads are essentially a mini-forum; single-user deployments don't need threading, just personal notes |
| Public social feed of friends' activity | X | Out of scope — no social graph in v1; see 1.6 |
| Follow other users | X | Requires multi-tenant social infra disproportionate to value for a self-hosted tool |
| Forums / community discussion per show | X | Moderation burden with zero benefit for a personal tool |
| Spoiler-tagged comments | X | Only relevant if public comments exist; irrelevant if comments are private notes |
| "DNA" personality quiz based on viewing habits | X | Marketing gimmick, not a tracking feature — deliberately excluded, not deferred |

## 1.5 Notifications & calendar

| Feature | Class | Notes |
|---|---|---|
| Calendar view of upcoming episodes/premieres | E | |
| Push/email notification: new episode aired | N | Requires notification service — see architecture |
| Push/email notification: show renewed/canceled | F | |
| ICS calendar feed (subscribe from Apple/Google Calendar) | N | Cheap to build, high value, avoids building a push infra dependency for v1 |
| In-app notification center / history | N | |
| "Streak" reminders (haven't watched in N days) | F | |

## 1.6 Social & gamification (TV Time-specific)

| Feature | Class | Notes |
|---|---|---|
| Friends list / following | X | See 1.4 rationale |
| Achievements / badges | F | Fun, zero-risk to add later; not core |
| Watch streaks | N | Purely computed from existing watch-history data — cheap add, good motivational hook, no social graph needed |
| Leaderboards | X | Requires multi-user competitive framing that doesn't fit a personal/family tool |

## 1.7 Statistics

| Feature | Class | Notes |
|---|---|---|
| Total hours watched | E | |
| Episodes watched count | E | |
| Movies watched count | E | |
| Shows completed count | E | |
| Monthly/yearly activity breakdown | N | |
| Favorite genres/networks/actors (derived) | N | |
| Binge patterns (busiest day/week, longest binge session) | F | |
| Year-in-review / "Wrapped"-style annual summary | F | High delight, low urgency |

## 1.8 Account & data

| Feature | Class | Notes |
|---|---|---|
| Local account (email/password or passkey) | E | |
| Data export (JSON/CSV, full account dump) | E | This is the entire point of self-hosting — must ship in v1 |
| Data import from TV Time GDPR export | E | See migration strategy |
| Multi-profile / household support | F | Additive to schema from day one, built in v2 |
| Theming (light/dark) | N | |
| Widgets (iOS/Android home screen) | F | Requires native shell or PWA + platform widget API; out of scope until PWA is solid |

## 1.9 Platform

| Feature | Class | Notes |
|---|---|---|
| Responsive web app (desktop/tablet/mobile) | E | This IS the platform — no native apps in v1 |
| Installable PWA (offline shell, add-to-home-screen) | N | Cheap once the web app is responsive; big usability win on mobile |
| True offline mode (mark watched with no connection, sync later) | F | Needs a local-first sync design — nontrivial, deferred |
| Native iOS/Android apps | F | Only worth it once the web app has multi-year proven usage |

## 1.10 Summary counts

- **Essential (v1):** 24 features — the tracking loop, search/discovery basics, lists, ratings, calendar, statistics core, and — non-negotiably — import/export.
- **Nice-to-have:** 19 features — mostly UX polish and lower-stakes automation (notifications, ICS feed, streaks, richer stats).
- **Future:** 12 features — recommendations, gamification, offline mode, native apps, year-in-review.
- **Explicitly excluded:** 6 features — the social graph, forums, DNA quiz, leaderboards. These are called out separately from "future" because they are TV Time's monetization-era additions, not gaps in parity; revisit only if a genuine multi-user social use case appears.
