# Transimex Blog API — Integration Guide

REST API for showing the Transimex blog (articles, categories, comments) on the main website.
All content is managed from the Transimex admin panel; this API is read-only for articles and allows visitors to submit comments.

- **Base URL:** `https://<transimex-app-domain>/api/public/blog`
- **Format:** JSON (`Content-Type: application/json`), UTF-8
- **Languages:** every article is bilingual (`en`, `fr`)

---

## 1. Authentication

Every request needs the API key we give you, sent in **one** of these headers:

```
x-api-key: <BLOG_PUBLIC_API_KEY>
```
or
```
Authorization: Bearer <BLOG_PUBLIC_API_KEY>
```

> **Server-side only.** Call this API from the website's backend (Next.js server components / route handlers / API routes, PHP, Node, etc.). **Never put the key in browser JavaScript or a `NEXT_PUBLIC_*` variable** — anyone could copy it and post comments as your site. Cache responses on your side where you can and proxy comment submissions through your own backend.

Missing/invalid key → `401`. If the key is not configured on our server → `503`.

### Optional headers

| Header | When | Purpose |
|---|---|---|
| `X-Client-IP` | Comment & view POSTs | The **visitor's** IP address. Rate-limits are applied per visitor. If omitted, all visitors share one bucket (10 writes/min) and could block each other. |

---

## 2. Response format

**Success** — always `"success": true` plus endpoint-specific fields:
```json
{ "success": true, "...": "..." }
```

**Error** — always `"success": false` with a machine-readable `code`:
```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "Article not found." }
}
```

| HTTP | `error.code` | Meaning |
|---|---|---|
| 400 | `INVALID_PARAM` / `INVALID_JSON` | Bad query parameter or malformed body |
| 401 | `UNAUTHORIZED` | Missing/invalid API key |
| 403 | `COMMENTS_DISABLED` | Commenting is turned off for that article |
| 404 | `NOT_FOUND` | Article doesn't exist, is a draft, or is scheduled for the future |
| 422 | `VALIDATION_FAILED` | Comment fields invalid (`error.fields` lists them) |
| 429 | `RATE_LIMITED` | Slow down; see `Retry-After` header / `error.retryAfterSeconds` |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 503 | `API_DISABLED` | API key not configured on the server |

### Rate limits
- Reads: **300 requests / minute** per API key.
- Writes (comments, views): **10 / minute** per visitor (`X-Client-IP`).

### Language handling
Most endpoints accept `?lang=en` or `?lang=fr`.
- **With `lang`:** text fields are plain strings (`"title": "Hello"`).
- **Without `lang`:** text fields are objects (`"title": { "en": "Hello", "fr": "Bonjour" }`).

An unknown `lang` value returns `400`. If a French field is empty, the English text is returned as a fallback.

### Dates
All timestamps are ISO-8601 UTC strings (`2026-09-30T14:05:00.000Z`). Format them for display on your side.

---

## 3. Article object

```json
{
  "id": "6650f1c2a1b2c3d4e5f60718",
  "slug": "ocean-freight-trends-2026",
  "title": "Ocean Freight Trends 2026",
  "excerpt": "What shippers should expect this year…",
  "metaTitle": "Ocean Freight Trends 2026 | Transimex",
  "metaDescription": "A look at rates, capacity and…",
  "author": "Transimex Logistics Editorial",
  "category": "Industry Insights",
  "tags": ["ocean", "rates"],
  "featuredImage": "https://…/image.jpg",
  "publishedAt": "2026-09-30T14:05:00.000Z",
  "updatedAt": "2026-10-01T09:12:44.000Z",
  "views": 128,
  "allowComments": true,
  "commentsCount": 4,
  "readingTimeMinutes": 5,
  "content": "<p>Full article HTML…</p>"
}
```

Notes
- `content` is **HTML** written in the admin editor. It appears **only** on the single-article endpoint, not in lists. Render it as HTML (it is authored by Transimex staff). If you want belt and braces, sanitize it on your side.
- `commentsCount` counts only **approved** (publicly visible) comments.
- Without `?lang=`, `title`, `excerpt`, `metaTitle`, `metaDescription` and `content` are `{ "en", "fr" }` objects and `readingTimeMinutes` is `{ "en": 5, "fr": 5 }`.
- Only **published** articles are ever returned. Drafts and articles scheduled for a future date are invisible (404).

---

## 4. Endpoints

### 4.1 List articles
`GET /posts`

| Query | Default | Description |
|---|---|---|
| `lang` | – | `en` or `fr` |
| `page` | `1` | Page number |
| `limit` | `10` | Page size, 1–50 |
| `category` | – | Exact category name (case-insensitive) |
| `tag` | – | Exact tag (case-insensitive) |
| `q` | – | Search title / excerpt / tags (max 100 chars) |
| `sort` | `newest` | `newest`, `oldest`, `popular` (by views) |

```bash
curl -H "x-api-key: $BLOG_KEY" \
  "https://<domain>/api/public/blog/posts?lang=en&page=1&limit=6&category=Industry%20Insights"
```

```json
{
  "success": true,
  "posts": [ { "id": "…", "slug": "…", "title": "…", "…": "(article object without content)" } ],
  "pagination": {
    "page": 1, "limit": 6, "total": 14, "totalPages": 3,
    "hasNextPage": true, "hasPrevPage": false
  }
}
```

### 4.2 Get one article
`GET /posts/{slug}?lang=en`

Returns the full article plus previous/next navigation and up to 3 related articles (same category or shared tags). **Does not count a view** — see 4.5.

```json
{
  "success": true,
  "post": { "id": "…", "slug": "…", "title": "…", "content": "<p>…</p>", "…": "…" },
  "previous": { "slug": "older-post", "title": "…", "featuredImage": "…", "category": "…" },
  "next": null,
  "related": [ { "…": "(article object without content)" } ]
}
```
`previous` = next-older article, `next` = next-newer article; either can be `null`. `404 NOT_FOUND` for unknown/unpublished slugs.

### 4.3 List categories & tags
`GET /categories` — only those used by published articles, most-used first.

```json
{
  "success": true,
  "categories": [ { "name": "Industry Insights", "count": 8 } ],
  "tags": [ { "name": "ocean", "count": 5 } ]
}
```

### 4.4 Comments

#### List approved comments
`GET /posts/{slug}/comments`

| Query | Default | Description |
|---|---|---|
| `page` | `1` | Page number |
| `limit` | `20` | 1–100 |
| `order` | `oldest` | `oldest` or `newest` |

```json
{
  "success": true,
  "allowComments": true,
  "comments": [
    {
      "id": "6651aa…",
      "postSlug": "ocean-freight-trends-2026",
      "authorName": "Jane D.",
      "content": "Great article!",
      "createdAt": "2026-10-02T10:30:00.000Z",
      "adminReply": {
        "content": "Thanks Jane!",
        "repliedBy": "Transimex Logistics Editorial",
        "repliedAt": "2026-10-02T12:00:00.000Z"
      }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1, "hasNextPage": false, "hasPrevPage": false }
}
```
`adminReply` is `null` when the team has not replied. Commenter emails are **never** returned. When `allowComments` is `false`, hide your comment form.

#### Submit a comment
`POST /posts/{slug}/comments`

Headers: `x-api-key`, `Content-Type: application/json`, and `X-Client-IP: <visitor ip>`.

| Field | Required | Rules |
|---|---|---|
| `authorName` | yes | 1–80 chars |
| `authorEmail` | no | valid email, ≤120 chars (stored for the editorial team, never shown publicly) |
| `content` | yes | 1–2000 chars, **plain text** |
| `website` | no | **Honeypot.** Add a hidden input named `website` to your form and leave it empty; bots that fill it are silently discarded. |

```bash
curl -X POST -H "x-api-key: $BLOG_KEY" -H "Content-Type: application/json" \
  -H "X-Client-IP: 203.0.113.7" \
  -d '{"authorName":"Jane D.","authorEmail":"jane@example.com","content":"Great article!"}' \
  "https://<domain>/api/public/blog/posts/ocean-freight-trends-2026/comments"
```

`201 Created`:
```json
{
  "success": true,
  "status": "Approved",
  "message": "Comment published.",
  "comment": {
    "id": "6651aa…", "postSlug": "ocean-freight-trends-2026",
    "authorName": "Jane D.", "content": "Great article!",
    "createdAt": "2026-10-02T10:30:00.000Z", "adminReply": null
  }
}
```

- **Published immediately:** the comment is saved with `status: "Approved"` and appears in the comments list right away, so you can show it to the visitor straight after a `201`. Transimex admins can hide or delete any comment from the admin panel; deleted comments simply disappear from the list on your next fetch. (If Transimex switches to moderation mode, `status` is `"Pending"` and `message` is `"Thank you! Your comment is awaiting moderation."` — in that case don't display it yet.)
- **Render comment text as plain text (escape it).** Never inject `content` / `authorName` as HTML.
- Validation failure → `422`:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Please correct the highlighted fields.",
    "fields": { "authorName": "Name is required.", "content": "Comment cannot be empty." }
  }
}
```

### 4.5 Record a view
`POST /posts/{slug}/views` (no body)

Call once per article page view from your backend (ideally skip bots and repeat refreshes). Include `X-Client-IP`.

```json
{ "success": true, "views": 129 }
```

---

## 5. Integration checklist

1. Store the key in a **server-only** env var (e.g. `TRANSIMEX_BLOG_API_KEY`).
2. Blog index → `GET /posts?lang=…&page=…`; filters from `GET /categories`.
3. Article page → `GET /posts/{slug}` (use `metaTitle`/`metaDescription` for SEO, `featuredImage` for Open Graph).
4. Comments → `GET /posts/{slug}/comments`; form submits to **your** backend, which forwards to `POST …/comments` with the visitor IP in `X-Client-IP`.
5. Optionally fire `POST …/views` on page load.
6. Cache list/article responses for 30–60 s on your side (the API itself is rate-limited at 300/min).
7. Handle `404` (show your 404 page) and `429` (retry after `Retry-After` seconds).

### Next.js example (server-side)
```ts
// lib/blog.ts — runs on the server only
const BASE = process.env.TRANSIMEX_BLOG_URL!; // https://<domain>/api/public/blog
const headers = { "x-api-key": process.env.TRANSIMEX_BLOG_API_KEY! };

export async function getPosts(lang: "en" | "fr", page = 1) {
  const res = await fetch(`${BASE}/posts?lang=${lang}&page=${page}&limit=9`, {
    headers,
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Blog API ${res.status}`);
  return res.json();
}

export async function submitComment(slug: string, visitorIp: string, data: {
  authorName: string; authorEmail?: string; content: string; website?: string;
}) {
  const res = await fetch(`${BASE}/posts/${slug}/comments`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", "X-Client-IP": visitorIp },
    body: JSON.stringify(data),
  });
  return { status: res.status, body: await res.json() };
}
```
