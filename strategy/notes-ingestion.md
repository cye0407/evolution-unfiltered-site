# Notes ingestion for evolutionunfiltered.com

## What this does
- Uses OpenRSS only as an ingestion layer.
- Pulls multiple Substack profile feeds through `https://openrss.org/substack.com/@username`.
- Writes normalized local JSON into `content/substack/data/`.
- Keeps this repository, not OpenRSS, as the source of truth.
- Uses only built-in Node.js APIs, so there are no package dependencies.

## Files
- `config/substack-sources.json`: the list of Substack sources to ingest.
- `scripts/ingest_substack_notes.mjs`: fetches feeds, classifies items, and writes JSON.
- `content/substack/data/all-items.json`: combined feed history for all fetched item types.
- `content/substack/data/notes.json`: notes-only feed for the website.
- `.github/workflows/refresh-substack-notes.yml`: scheduled refresh every 6 hours plus manual runs.

## Schema
Each normalized note uses this shape:

```json
{
  "id": "evolution-unfiltered-4d0df0f4f267f0ea",
  "source_id": "evolution-unfiltered",
  "source_name": "Evolution Unfiltered",
  "source_username": "evolutionunfiltered",
  "title": "A fresh note from Evi",
  "content": "LUCA is still everyone's problematic ancestor.",
  "content_html": "<p>LUCA is still everyone&rsquo;s problematic ancestor.</p>",
  "date": "2026-04-24T09:15:00+00:00",
  "type": "note",
  "arc": null,
  "character": "Evi",
  "tags": ["note"],
  "url": "https://substack.com/@evolutionunfiltered/note/n-987654",
  "guid": "https://substack.com/@evolutionunfiltered/note/n-987654",
  "fetched_at": "2026-04-24T10:00:00+00:00"
}
```

## Website consumption
- `/notes`: read `content/substack/data/notes.json`, sort descending by `date`, and render the stream.
- Filters: use `source_id`, `character`, `arc`, and `tags`.
- Timeline views: group by `arc` once you begin assigning arc metadata.

## Narrative layer
- `character` and `arc` are included now so notes can become reusable narrative assets instead of disposable social fragments.
- Start with source-level defaults in `config/substack-sources.json`.
- If you need finer control later, add a post-enrichment step that maps note IDs to episode arcs, characters, or canon status.

## Local usage
Run:

```bash
node scripts/ingest_substack_notes.mjs
```

To test without network access, point a source at `scripts/fixtures/sample-openrss-substack.xml` using `feed_path`.
