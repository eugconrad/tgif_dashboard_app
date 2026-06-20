# Security, Etiquette, and Runtime Constraints

This document covers safety and operational constraints for a future client.

## Public Data

Observed public data includes:

- Live callsigns, radio IDs, talkgroups, timestamps, and approximate coordinates in Socket.IO events.
- Talkgroup directory and profile data.
- Callsign lookup data including optional image and location fields.

Even if public on TGIF pages, store and display this data respectfully. Provide local history controls and do not upload user monitoring history without explicit consent.

## Origin and CORS

Observed:

- Command-line polling and direct WebSocket probes succeeded without browser-origin evidence.
- Browser pages connect to same-origin `https://tgif.network`.
- HTTP API hosts include `api.tgif.network` and `dmr.g7lrr.com`.

Unknown:

- Final browser/mobile runtime CORS behavior for every HTTP endpoint.
- Whether TGIF may add stricter origin checks later.

Recommendation:

- Prefer official Socket.IO client behavior.
- Avoid spoofing headers unless necessary and documented.
- If CORS blocks a browser build, consider a small user-controlled backend/proxy with clear caching and rate limits.

## Authentication Boundaries

Do not call authenticated or admin endpoints unless the user explicitly implements an authenticated TGIF account feature later.

Endpoints to avoid in public monitor:

- `/tgcontrol.php`
- `/profile.php?tab=SelfCare`
- `selfcare:settg`
- Authenticated status/map/admin controls

The public monitoring app does not need account credentials.

## Rate Limiting and Polite Fetching

Rules:

- Keep one Socket.IO connection per running client instance.
- Do not reconnect in a tight loop. Use capped backoff with jitter.
- Do not bulk-fetch all profiles at runtime.
- Do not call callsign lookup for every event.
- Do not poll stats faster than every 5 minutes.
- Cache directory and profiles.

Suggested concurrency limits:

- Profiles: 1 to 2 concurrent requests.
- Callsign lookups: 2 concurrent requests.
- Stats: 1 request per cache key at a time.

## Scraping Etiquette

Profile pages are HTML, not an official API. Fetch only when needed:

- User opens profile.
- Favorite TG appears.
- Conversation score crosses a threshold and profile is missing.

Use conditional requests only if the server advertises validators in future tests. If not, rely on local TTL.

## Content Security

Descriptions and profile fields can contain HTML. Directory descriptions decode from base64 and may contain HTML fragments.

Requirements:

- Sanitize HTML before rendering.
- Escape text in UI.
- Do not execute profile scripts.
- Resolve image URLs safely under expected hosts.
- Treat external website fields as untrusted links.

## Data Sensitivity

Live events may include:

- Callsign.
- Radio ID.
- Latitude/longitude.
- Timestamps.
- Names.

Local persistence should:

- Be bounded.
- Be clearable.
- Avoid unnecessary export.
- Avoid syncing unless explicitly designed.

## Dependency Risk

TGIF currently uses older Socket.IO/Engine.IO behavior. A future app must pin or configure a compatible client. New Socket.IO clients may default to Engine.IO 4 and fail unless configured.
