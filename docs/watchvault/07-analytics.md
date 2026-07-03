# 7. Analytics & Statistics

## 7.1 Computation strategy

Two-tier: a **daily rollup table** (`user_stats_daily`, see [03-database-schema.md](03-database-schema.md)) populated by a nightly background job from raw `user_episode_progress`/`user_movie_progress` timestamps, plus **on-demand aggregation queries** for anything sliceable by a filter the rollup doesn't pre-bake (genre, network, actor). This avoids two failure modes: recomputing "all-time hours watched" from scratch on every dashboard load (slow as history grows), and trying to pre-materialize every possible cross-tab (combinatorial, unnecessary at personal-library scale).

Runtime for an episode/movie counts toward "hours watched" using the catalog's `runtime_minutes`; if missing (some TMDb entries lack runtime), it falls back to a per-content-type default (30 min episode / 100 min movie) rather than silently undercounting — flagged in the UI as an estimate.

## 7.2 Metrics catalog

| Metric | Source | Notes |
|---|---|---|
| Hours watched | `runtime_minutes × watch_count` summed over progress rows | Distinguishes rewatches (see 7.3) |
| Episodes watched | count of `user_episode_progress` rows with `watch_count > 0` | Unique episodes, not counting rewatches twice unless a "including rewatches" toggle is on |
| Movies watched | count of `user_movie_progress` rows with `watch_count > 0` | |
| Shows completed | count of `user_show_status` where `status = completed` | Completed = every aired episode watched, computed when the last episode of an ended/current season is marked |
| Monthly/yearly activity | `user_stats_daily` grouped by month/year | Backs the activity bar chart |
| Favorite genres | join watched episodes/movies → shows/movies → genres, count | Top N by watch count, not just tracked count — reflects actual viewing, not aspirational watchlisting |
| Favorite actors | join watched content → cast, count appearances | Filterable by role (lead vs. any-billing) as a v1.x refinement |
| Favorite networks | join watched shows → network, count | |
| Streaks | consecutive days present in `user_stats_daily` with `episodes_watched + movies_watched > 0` | Current streak + longest streak; heatmap view mirrors a GitHub contributions graph |
| Binge sessions (future) | cluster of ≥3 episodes of the same show marked watched within a short time window | Needs event-level timestamps, not just the daily rollup — deferred to when raw progress history depth justifies it |

## 7.3 Rewatches — an explicit design decision

TV Time's stats conflate "watched" as a boolean, which undercounts genuine rewatch-heavy viewing (a real use case — comfort shows, rewatching before a new season). `user_episode_progress.watch_count` and `last_watched_at` are tracked precisely so hours-watched can optionally include rewatches (toggle in the Statistics page, default **on** for "hours watched" since that reflects reality, default **off** for "episodes watched" progress bars on show cards, since a progress bar answering "have I seen this yet" shouldn't be inflated by rewatch count).

## 7.4 Presentation

All chart types specified concretely so the UX doc's placeholders have a real implementation target:
- **KPI tiles**: hours watched, episodes watched, movies watched, shows completed — big number + range-over-range delta ("+12% vs. last month").
- **Activity bar chart**: stacked bar (episodes vs. movies) per month/week depending on selected range granularity.
- **Genre donut/bar**: top 8 genres by watch count, remainder bucketed as "Other."
- **Streak heatmap**: calendar-grid heatmap, intensity by minutes watched that day.
- **Top networks / top actors**: ranked lists with small avatar/logo, watch count, and a "view all" drill-in that lists the specific shows/movies contributing to that count (traceability matters more than a bare number here).

## 7.5 Year-in-review (future feature, specified now so the data model doesn't need to change later)

A generated shareable summary card for a calendar year: total hours, top show, top genre, longest streak, "compared to last year" deltas. Purely a read/aggregation feature over existing tables — no new schema required, which is why it's deferred to Future (see [09-future-roadmap.md](09-future-roadmap.md)) rather than treated as a data-model risk.
