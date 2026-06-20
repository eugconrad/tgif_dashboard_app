# Talkgroup Directory

Endpoint: `https://api.tgif.network/dmr/talkgroups/json`

Samples:

- Raw JSON: `docs/samples/json/talkgroups-api.json`
- Raw CSV: `docs/samples/json/talkgroups-api.csv`
- Analysis summary: `docs/samples/json/talkgroup-directory-summary.json`

## Purpose

This endpoint is the best public source for the full talkgroup directory. It is more stable and polite than scraping profile pages.

## JSON Shape

Observed item:

```ts
interface DirectoryTalkgroup {
  id: string;
  name: string;
  website: string;
  description: string;
}
```

All 3045 sampled entries had these four fields.

## Field Meanings

| Field | Type | Meaning | Notes |
| --- | --- | --- | --- |
| `id` | string | Talkgroup ID | Unique in sample |
| `name` | string | Talkgroup display name | Names are not unique |
| `website` | string | Website or free text | Often blank or placeholder |
| `description` | string | Usually base64 encoded description | Can decode to plain text or HTML |

## Summary Counts

From `talkgroup-directory-summary.json`:

- Entries: 3045
- Unique IDs: 3045
- Missing/blank website: 2051
- Placeholder website: 131
- With usable-looking website: 863
- Base64-decodable descriptions: 2888
- Descriptions that look like HTML after decoding: 925
- Descriptions containing non-ASCII after decoding: 313

## Duplicates

IDs were unique. Names were not unique.

Examples of duplicate normalized names:

- `dragon dragon dragon`
- `testing/experimentation`
- `8075amc`
- `sv2snh`
- `tennessee`

Application data models must key talkgroups by TG ID, not by name.

## Encoding

The `description` field is usually base64. Decoded content can be:

- Plain text.
- HTML fragments.
- HTML entities such as `&nbsp;`.
- Non-English text.
- Markdown-like text inside HTML-ish content.

Parser guidance:

1. Attempt base64 decode with UTF-8.
2. If decode fails, preserve original string as `rawDescription`.
3. Store both sanitized plain text and sanitized HTML if the UI will render rich descriptions.
4. Never inject decoded HTML directly without sanitization.

## Website Field

The `website` field is not consistently normalized.

Observed conditions:

- Empty string.
- Placeholder values such as `https://`.
- URLs with or without scheme.
- Free text or whitespace around values.

Parser guidance:

- Trim whitespace.
- Treat empty, `N/A`, `http://`, and `https://` as missing.
- If a value lacks a scheme, store as text and derive a normalized URL only if URL parsing succeeds after adding `https://`.
- Preserve raw value.

## CSV Shape

Endpoint: `https://api.tgif.network/dmr/talkgroups/csv`

Observed header:

```csv
TG Number,TG Name
```

The CSV contains only ID and name. It is useful for export compatibility, not for rich metadata.

## Relationship to Socket.IO `talkgroups_list`

Socket.IO `talkgroups_list` contains richer fields:

- `language`
- `country`
- `request_timestamp`
- `desc`
- `trustee`
- `website`
- `bridge_data`

The public HTTP JSON directory is easier to fetch, but the Socket.IO list has better metadata. A future app can optionally request `talkgroups_list` once per session and merge it into the directory cache.

## Recommended Cache

- Fetch at startup only if no fresh cache exists.
- TTL: 24 hours.
- Keep last successful copy for offline use.
- Do not refetch repeatedly on connection reconnects.
