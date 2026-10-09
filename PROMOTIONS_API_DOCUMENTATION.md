# Transimex Promotions API — Integration Guide

REST API for the promotional popup on the main website. Everything (destination, dates, image, text, button, timing, activation) is managed in the Transimex admin panel under **Promotions & Popups**; this API is read-only.

- **Endpoint:** `GET https://<transimex-app-domain>/api/public/promotions`
- **Format:** JSON, UTF-8
- **Languages:** every promotion is bilingual (`en`, `fr`)

---

## 1. Authentication

Send the API key in **one** of these headers:

```
x-api-key: <key>
```
or
```
Authorization: Bearer <key>
```

It is the same key as the Blog API (`BLOG_PUBLIC_API_KEY`).

> **Server-side only.** Call this from the website's backend (Next.js server component / route handler, etc.) and pass the result to the page. Never put the key in browser JavaScript or a `NEXT_PUBLIC_*` variable.

Missing/invalid key → `401`. No key configured on our server → `503`. Limit: 300 requests/minute per key.

---

## 2. Request

| Query param | Values | Notes |
|---|---|---|
| `lang` | `en` \| `fr` | Recommended. Returns plain strings for that language. Invalid value → `400`. |
| `limit` | `1`–`50` (default `10`) | Use `limit=1` to get only the promotion to display. |

Only promotions that are **active right now** are returned (activated in the admin, and inside their optional start/end window), sorted by `priority` (lowest first), then most recently updated. **Show the first item.** An empty array means: show no popup.

Responses are cacheable for ~30 seconds (`Cache-Control: private, max-age=30`), so activating/deactivating in the admin reaches the site within about a minute.

---

## 3. Response (`?lang=fr`)

```json
{
  "success": true,
  "promotions": [
    {
      "id": "6ac8fd71ef0b916f8346c12f",
      "updatedAt": "2026-10-09T14:42:57.045Z",
      "priority": 1,
      "delaySeconds": 7,
      "startsAt": null,
      "endsAt": "2026-10-16T23:59:59.000Z",
      "departureDate": "2026-10-16",
      "departureDateFormatted": "16 octobre 2026",
      "showFlags": true,
      "destination": {
        "city": "Douala",
        "countryCode": "CM",
        "countryName": "Cameroun",
        "flagUrl": "https://<domain>/flags/cm.svg"
      },
      "ports": [
        { "label": "Matadi", "countryCode": "CD", "countryName": "RD Congo", "flagUrl": "https://<domain>/flags/cd.svg" }
      ],
      "cta": { "url": "/quote", "label": "Obtenir un devis" },
      "image": { "url": "https://<domain>/api/public/promotions/media/…", "width": 1200, "height": 900 },
      "title": "Prochain chargement – Douala",
      "description": "Départ le 16 octobre 2026 vers Douala, Cameroun.",
      "badge": "Dernières places disponibles !",
      "footer": "Transport fiable. Service professionnel. Partout en Afrique.",
      "imageAlt": "Prochain chargement – Douala"
    }
  ]
}
```

Field notes:

- **Text is final.** `title`, `description`, `badge`, `footer`, `cta.label` already have the admin's placeholders (`{{date}}`, `{{destination}}`, `{{city}}`, `{{country}}`) resolved in that language, so dates and country names are always identical in EN and FR. Render them as-is. `description` may contain line breaks (`\n`).
- **`image`** is `null` when no image was uploaded **for that language**. It is always WebP.
- **Flags** are only present (`flagUrl` non-null) when `showFlags` is `true` and the country is set. They are small local SVGs served with a 30-day cache. Treat them as optional: hide the `<img>` on error.
- **Chips:** the destination followed by `ports` make the "DOUALA | MATADI | TEMA …" row in the mockup. Render the destination (if `city` is non-empty) then each port.
- **CTA link (`cta.url`):** Provided as a relative path (e.g. `"/quote"`) or an absolute URL. On the main website, the front-end developer prepends their site's base URL / locale route to link the button or clickable banner to their quote page.
- `delaySeconds`, `startsAt`, `endsAt`, `priority` are configuration values; only `delaySeconds` matters to the front end.
- Without `lang`, the response is bilingual: each promotion is `{ id, updatedAt, priority, delaySeconds, startsAt, endsAt, departureDate, showFlags, en: {…}, fr: {…} }` where `en`/`fr` have the exact shape above.

Errors use `{ "success": false, "error": { "code": "…", "message": "…" } }` (`INVALID_PARAM`, `UNAUTHORIZED`, `RATE_LIMITED`, `INTERNAL_ERROR`, `API_DISABLED`).

---

## 4. Popup behaviour the website should implement

1. **Language:** request with the site's current language (`lang`). Re-fetch or re-render when the visitor switches.
2. **Delay:** open the popup `delaySeconds` after the page loads (`0` = immediately). Cancel the timer if the visitor navigates away.
3. **Image mode:** if `image` is not `null`, show the image (use `width`/`height` to reserve space; `alt` = `imageAlt`), wrapped in a link to `cta.url`. Always show a visible **close button**.
4. **Text fallback (owned by the front end):** show the text version — logo, `title` (+ destination flag), `description`, `badge`, the chips, a `cta.label` button linking to `cta.url`, and `footer` — when **either** `image` is `null` **or** the `<img>` fires `onerror`. Never render a blank popup.
5. **Dismissal:** remember a close in `localStorage`/cookie keyed by `id` + `updatedAt`, so editing the promotion in the admin shows it again, while a closed one does not reappear on every page.
6. **Non-intrusive:** do not lock navigation; close on the close button, `Esc` and backdrop click; make it responsive (the admin preview uses ~680px wide on desktop and 360px on mobile).
7. **Failure:** if the API call fails or returns an empty list, show nothing and do not retry in a loop.

The admin panel's **Preview** button (list and editor, EN/FR, image/text fallback, desktop/mobile) is a reference rendering built from this same data.

---

## 5. Images

Uploads in the admin are converted to **WebP** automatically:

- **Lossless (default):** pixel-identical to the original.
- **Near-lossless (optional):** visually identical, smaller files for photos.
- Images already in WebP are stored untouched. Metadata is stripped; images wider/taller than 2400px are downscaled to 2400px on the long edge. Images are served with `Cache-Control: public, max-age=31536000, immutable` (a replaced image gets a new URL).

---

## 6. Setup checklist (our side)

- `BLOG_PUBLIC_API_KEY` (shared with the Blog API).
- Cloudflare R2 credentials (`CLOUDFLARE_R2_*`). Images are stored only in R2. Optionally set `CLOUDFLARE_R2_PUBLIC_URL` to serve them straight from a public R2 domain; otherwise this app streams them from R2.
- `APP_URL` should be the public base URL of this app; it is used to build absolute image and flag URLs (falls back to the request origin).
- Staff need the **Promotions & Popups** permission (Super Admin has it by default; grant it to others in Staff & Access).
