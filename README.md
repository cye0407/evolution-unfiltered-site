# evolution-unfiltered-site

New deployable website for `evolutionunfiltered.com`, intended for Vercel.

## Purpose
- Replace the current WordPress site with a code-first Next.js site.
- Preserve the important published WordPress URLs.
- Add a structured `/notes` route backed by normalized local JSON.

## Current status
- Minimal Next.js scaffold created.
- Core migration routes stubbed:
  - `/`
  - `/start-here`
  - `/the-story`
  - `/voices`
  - `/listen`
  - `/emergence-pr`
  - `/notes`

## Data
- Notes JSON currently lives at `data/substack/notes.json`.
- During migration, copy the normalized outputs from the content repo into this folder or later automate the sync.

## Next steps
1. Install dependencies.
2. Start replacing placeholders with migrated WordPress content.
3. Add the real notes data sync.
4. Connect the repo to Vercel.
