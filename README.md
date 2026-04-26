# evolution-unfiltered-site

Backend repository for [evolutionunfiltered.com](https://evolutionunfiltered.com).

The site itself runs on WordPress (Hostinger). This repo holds the **Substack feed ingestion pipeline** that powers the notes/posts stream embedded on the WordPress site, and the small WordPress plugin that renders it.

## What this repo does

- Pulls notes (via Substack's internal API) and publication posts (via RSS) from configured Substack accounts every 6 hours via a GitHub Action.
- Normalizes both into a single `content/substack/data/feed.json`.
- WordPress site fetches that JSON via the `eu-notes-feed` plugin's shortcode and renders it as cards.

## Layout

```
config/substack-sources.json                     Substack source list (handles + filters)
scripts/ingest_substack_notes.mjs                Node 22+ ingestion script (no deps)
.github/workflows/refresh-substack-notes.yml     6-hour cron + manual dispatch
content/substack/data/feed.json                  Live unified feed (auto-committed)
content/substack/data/sample-feed.json           Hand-curated test fixture
wordpress-plugin/eu-notes-feed/                  WP plugin source
strategy/notes-ingestion.md                      Pipeline architecture notes
```

## Public feed URL

```
https://raw.githubusercontent.com/cye0407/evolution-unfiltered-site/master/content/substack/data/feed.json
```

This is the URL passed to the `[eu_notes_feed url="..."]` shortcode on the WordPress site.

## Local development

```bash
node scripts/ingest_substack_notes.mjs
```

Writes `content/substack/data/feed.json`. No npm install needed (uses native fetch + crypto).

## Sources

Configured in `config/substack-sources.json`. Each source has:

- `publication_subdomain` — for `<sub>.substack.com/feed` (posts)
- `profile_handle` — for `substack.com/@<handle>` (notes via internal API)
- `include_notes` / `include_posts` — toggles
- `post_tag_filter` (optional) — case-insensitive tag whitelist for posts

## Note: legacy Next.js scaffold

The `app/`, `data/`, `next.config.ts`, `package.json`, etc. are leftovers from an abandoned plan to replace the WordPress site with Next.js. They are not used by anything and can be cleaned up at any time.
