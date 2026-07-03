# 5. API Design

REST over HTTPS, JSON bodies, versioned under `/api/v1`. Auth via `Authorization: Bearer <jwt>` except where noted. Every list endpoint supports `page`/`pageSize` pagination and returns `{ data, meta: { page, pageSize, total } }`.

## 5.1 Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Create first admin account (disabled after first user exists unless admin opens registration) |
| POST | `/api/v1/auth/login` | Email+password → access token + refresh cookie |
| POST | `/api/v1/auth/refresh` | Exchange refresh cookie for new access token |
| POST | `/api/v1/auth/logout` | Revoke refresh token |
| POST | `/api/v1/auth/webauthn/register` | Register a passkey (v1.x) |
| POST | `/api/v1/auth/webauthn/login` | Passkey login (v1.x) |

## 5.2 User profile

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/me` | Current user profile + headline stats |
| PATCH | `/api/v1/me` | Update display name, timezone, avatar |
| PATCH | `/api/v1/me/password` | Change password |
| GET | `/api/v1/me/notifications/preferences` | Get notification settings |
| PUT | `/api/v1/me/notifications/preferences` | Update notification settings |
| DELETE | `/api/v1/me` | Request account deletion (soft delete + grace period) |

## 5.3 Shows

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/shows/search?q=` | Search catalog (fulltext + TMDb fallback if not cached) |
| GET | `/api/v1/shows/{id}` | Show detail incl. seasons summary, cast, external IDs |
| GET | `/api/v1/shows/{id}/seasons/{seasonNumber}` | Season detail with episode list |
| GET | `/api/v1/shows/trending` | Trending shelf (TMDb-backed, cached) |
| GET | `/api/v1/library/shows?status=&sort=` | Current user's tracked shows |
| PUT | `/api/v1/library/shows/{showId}/status` | Set/update tracking status (idempotent upsert) |
| DELETE | `/api/v1/library/shows/{showId}/status` | Untrack (does not delete history) |

## 5.4 Episodes / watch progress

| Method | Path | Description |
|---|---|---|
| PUT | `/api/v1/episodes/{episodeId}/watched` | Mark watched (idempotent; increments `watch_count`, sets timestamps) |
| DELETE | `/api/v1/episodes/{episodeId}/watched` | Unmark most recent watch |
| PUT | `/api/v1/shows/{showId}/seasons/{seasonNumber}/watched` | Bulk mark season watched |
| PUT | `/api/v1/shows/{showId}/watched-up-to/{episodeId}` | Bulk mark all episodes up to and including this one |

## 5.5 Movies

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/movies/search?q=` | Search catalog |
| GET | `/api/v1/movies/{id}` | Movie detail |
| GET | `/api/v1/movies/trending` | Trending shelf |
| GET | `/api/v1/library/movies?status=` | Current user's movie library |
| PUT | `/api/v1/library/movies/{movieId}/watched` | Mark watched (idempotent) |
| PUT | `/api/v1/library/movies/{movieId}/status` | Set Want-to-Watch / Watched |

## 5.6 Ratings & reviews

| Method | Path | Description |
|---|---|---|
| PUT | `/api/v1/ratings/{targetType}/{targetId}` | Upsert rating (1–10) |
| DELETE | `/api/v1/ratings/{targetType}/{targetId}` | Remove rating |
| GET | `/api/v1/reviews/{targetType}/{targetId}` | Get current user's review/notes for a target |
| PUT | `/api/v1/reviews/{targetType}/{targetId}` | Upsert review/notes |
| DELETE | `/api/v1/reviews/{targetType}/{targetId}` | Delete review |

`targetType` ∈ `{show, episode, movie}` mirroring the polymorphic schema in [03-database-schema.md](03-database-schema.md).

## 5.7 Lists & watchlist

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/lists` | All custom lists (watchlist flagged via `isWatchlist`) |
| POST | `/api/v1/lists` | Create list |
| PATCH | `/api/v1/lists/{listId}` | Rename/update list |
| DELETE | `/api/v1/lists/{listId}` | Delete list |
| GET | `/api/v1/lists/{listId}/items` | List items, ordered |
| POST | `/api/v1/lists/{listId}/items` | Add item `{ itemType, itemId }` |
| PATCH | `/api/v1/lists/{listId}/items/{itemId}/order` | Reorder (drag-drop persistence) |
| DELETE | `/api/v1/lists/{listId}/items/{itemId}` | Remove item |

## 5.8 Calendar

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/calendar?from=&to=` | Upcoming episodes/premieres for tracked shows in range |
| GET | `/calendar/{icsToken}.ics` | Unauthenticated (token-secured) ICS feed for calendar apps |
| POST | `/api/v1/me/calendar-token/regenerate` | Rotate the ICS token |

## 5.9 Statistics

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/stats/summary?range=` | KPI tiles (hours/episodes/movies/shows) for a range |
| GET | `/api/v1/stats/activity?range=&granularity=` | Time-series for the activity chart |
| GET | `/api/v1/stats/genres?range=` | Genre breakdown |
| GET | `/api/v1/stats/networks?range=` | Top networks |
| GET | `/api/v1/stats/actors?range=` | Top actors (derived from watched-content cast) |
| GET | `/api/v1/stats/streaks` | Current streak, longest streak, heatmap data |

## 5.10 Import

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/import/jobs` | Upload export file (multipart), creates `import_jobs` row, returns job ID |
| GET | `/api/v1/import/jobs/{jobId}` | Poll job status/progress |
| GET | `/api/v1/import/jobs/{jobId}/matches?confidence=unmatched` | List rows needing manual review |
| PATCH | `/api/v1/import/jobs/{jobId}/matches/{matchId}` | Resolve a match (`{ matchedShowId }` or `{ skip: true }`) |
| POST | `/api/v1/import/jobs/{jobId}/apply` | Commit reviewed import into the live library |
| GET | `/api/v1/import/jobs` | Import history |

## 5.11 Export

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/export/jobs` | Request a full account data export |
| GET | `/api/v1/export/jobs/{jobId}` | Poll status |
| GET | `/api/v1/export/jobs/{jobId}/download` | Signed, time-limited download link |

## 5.12 Notifications

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/notifications?unread=` | List notifications |
| PATCH | `/api/v1/notifications/{id}/read` | Mark read |
| POST | `/api/v1/notifications/read-all` | Mark all read |
| POST | `/api/v1/push/subscribe` | Register web-push subscription |

## 5.13 Admin

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/admin/users` | List users (admin only) |
| POST | `/api/v1/admin/users` | Create/invite user |
| PATCH | `/api/v1/admin/users/{id}` | Disable/enable, reset password |
| GET | `/api/v1/admin/jobs` | Background job queue status |
| POST | `/api/v1/admin/jobs/{id}/retry` | Retry failed job |
| GET | `/api/v1/admin/health` | DB size, storage usage, last sync/backup timestamps |

## 5.14 Cross-cutting conventions

- **Idempotency by design**: all "mark watched"/"set status" endpoints are `PUT` upserts keyed by the natural unique constraint (`user_id` + target), not `POST` "create another event" — this is the API-level enforcement of the anti-duplicate-state principle from the architecture doc.
- **Error shape**: `{ error: { code, message, details? } }` with standard HTTP status codes; validation errors return field-level `details`.
- **Rate limiting**: auth endpoints limited per-IP; catalog search endpoints limited per-user to protect the TMDb quota behind them.
- **ETags/If-Match** on mutation endpoints for optimistic-concurrency-sensitive resources (list reordering, review edits) to make the "optimistic UI + server reconciliation" pattern in the UX doc safe against last-write-wins surprises.
