# API Contract

This document is the source of truth for the frontend and backend API boundary.

## Conventions

- Base path: `/api`. The frontend reads it from `VITE_API_URL`.
- JSON in and out. Field names are camelCase.
- Authenticated endpoints need the user's Supabase access token:
  `Authorization: Bearer <access_token>`. Missing or invalid tokens get `401`.
- Errors use one shape:

  ```json
  { "error": { "code": "unauthorized", "message": "Sign in required." } }
  ```

  Codes: `unauthorized` (401), `invalid_request` (400), `not_found` (404),
  `internal_error` (500).
- Timestamps are ISO 8601 strings in UTC.

## Status

Defined below: health and LGU Facebook posts. Other endpoints (alerts,
locations, schedules, daily brief) are still to be defined before
implementation.

## GET /api/health

No auth. Returns `{ "ok": true }`.

## LGU Facebook posts

The signed-in user's subscribed LGU is `profiles.subscribed_mayor`, a slug
matching `lgu_sources.slug` (`cebu_city`, `lapu_lapu_city`, `mandaue_city`,
`cebu_province`).

### POST /api/lgu-posts/refresh

Call once after sign-in. The **backend** checks the subscribed LGU's official
Facebook page for its newest 2 posts and saves any it hasn't seen before; posts
already saved are ignored. The browser never contacts Facebook.

Throttling: each page is checked at most once per
`FB_REFRESH_INTERVAL_MINUTES` (default 10) however many users sign in, and only
one check per page runs at a time. If the check fails or is skipped, saved posts
are still returned, so this endpoint never blocks sign-in on Facebook.

Query: `limit` (optional, 1–10, default 2): how many saved posts to return.

Response `200`:

```json
{
  "status": "refreshed",
  "newPosts": 1,
  "source": {
    "slug": "mandaue_city",
    "displayName": "Mandaue City",
    "officialName": "Thadeo \"Jonkie\" Ouano",
    "officialTitle": "mayor",
    "fbPageUrl": "https://www.facebook.com/JonkieOuanoPH",
    "lastFetchedAt": "2026-10-16T08:00:00.000Z"
  },
  "posts": [
    {
      "id": "6b1d…",
      "fbPostId": "1647114683872212",
      "permalink": "https://www.facebook.com/JonkieOuanoPH/posts/pfbid02…",
      "caption": "CLASS ADVISORY | OCT 16 …",
      "postType": "album",
      "linkUrl": null,
      "postedAt": "2026-10-15T09:55:39.000Z",
      "firstSeenAt": "2026-10-16T08:00:00.000Z",
      "media": [
        {
          "type": "image",
          "url": "https://scontent…fbcdn.net/…jpg",
          "thumbnailUrl": "https://scontent…fbcdn.net/…jpg",
          "width": 1080,
          "height": 1080,
          "altText": "May be an image of text",
          "durationSeconds": null
        }
      ],
      "reactionCount": 4754,
      "commentCount": 1872,
      "shareCount": 686,
      "viewCount": null,
      "category": null
    }
  ]
}
```

| Field | Notes |
| --- | --- |
| `status` | `refreshed` (checked now), `fresh` (checked recently, nothing to do), `failed` (check failed; saved posts returned), `disabled` (`FB_SCRAPE_ENABLED=false`), `no_subscription` (user has no `subscribed_mayor`; `source` is null, `posts` empty), `unknown_source` (slug has no active page). |
| `newPosts` | How many posts this request saved. `0` unless `status` is `refreshed`. |
| `source` | `null` when the user has no subscription or the slug is unknown. |
| `posts` | Newest first by `postedAt`. Deleted posts are excluded. |
| `postType` | `text`, `photo`, `video`, `album`, `link`, `shared`, `event`, `other`. |
| `media[].url` | Image URL for `image`; the video's Facebook page URL for `video`. Facebook image URLs expire after some days. |
| `media[].thumbnailUrl` | Smaller image, or the video's thumbnail. |
| `media[].durationSeconds` | Videos only. |
| Counts | Engagement counts when the post was first saved. Counts only; comments are never stored. |
| `category` | Reserved for classification (`class_suspension`, `traffic`, …); currently `null`. |

### GET /api/lgu-posts/latest

Same auth, query and response as `refresh`, without `status` and `newPosts`,
and without checking Facebook: `{ "source": {…} | null, "posts": [...] }`.
Use it to re-read saved posts without triggering a check.
