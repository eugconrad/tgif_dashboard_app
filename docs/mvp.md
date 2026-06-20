# MVP Implementation

Status: first working MVP foundation.

This document describes what was implemented from the TGIF research and what remains incomplete.

## What Runs

The MVP is a Vite + React + TypeScript application with Tauri desktop configuration. The core TGIF logic is separated from the React UI so the visual layer can be redesigned later without rewriting protocol and conversation code.

Primary run commands:

```bash
npm install
npm run dev
npm test
npm run build
npm run tauri:dev
```

`npm run dev` starts the web UI. `npm run tauri:dev` starts the desktop shell once local Tauri prerequisites are available.

## Implemented Research

Implemented from `docs/protocol.md`, `docs/research/websocket.md`, and `docs/research/socket-events.md`:

- Socket.IO v2-compatible client using `socket.io-client@2.5.0`.
- Connects to `https://tgif.network` with WebSocket transport.
- Emits `handshake` with an empty public token.
- Waits for `status == 200`.
- Emits `cli-state` with `{"scope":"*","page":"lastheard","action":"lh-backlog"}`.
- Handles `lastheard_backlog`.
- Handles live `lastheard`.
- Handles disconnect, reconnect, connect errors, malformed payloads, and manual reconnect.
- Suppresses duplicate live/backlog events, repeated stream updates, and short-window repeated TX updates from the same participant before they reach the Activity Log or conversation engine.

Implemented from `docs/research/data-model.md`:

- Normalized `ActivityEvent`.
- `ActiveTalkgroupState`.
- `CallsignActivity`.
- `ConversationMetrics`.
- Directory/profile/statistics/callsign metadata models.

Implemented from `docs/research/conversation-engine.md`:

- 10 minute active window.
- 5 minute conversation window.
- 60 second stale grace.
- Participant counting.
- Speaker-change counting.
- Conversation score with explainable reasons.
- Stop events from `repeater_id == 0` are not counted as new transmissions.
- Backlog events seed state but are tagged separately.

Implemented from `docs/research/talkgroup-directory.md`, `docs/research/tgprofile.md`, `docs/research/statistics.md`, and `docs/research/callsign-api.md`:

- Directory JSON loading and local cache.
- Base64 description decoding.
- Lazy profile HTML fetch and parser.
- Profile image extraction from `setTalkgroupImage()`.
- 30 day stats loading and cache.
- Lazy callsign lookup on participant action.

## UI

The MVP dashboard shows:

- TGIF connection state.
- Active talkgroup count.
- Conversation count.
- Malformed payload count.
- Search by TG ID, TG name, callsign, or display name.
- Filter by all, conversations, or favorites.
- Sort by priority, recency, or participants.
- Prioritized active TG list.
- Selected talkgroup details.
- Conversation reasons and score.
- Participants and TX counts.
- Lazy profile enrichment.
- Lazy callsign enrichment.
- Recent activity log.
- Persistent favorites.

The UI is intentionally not final-polished. It is a working product foundation, not a clone of the TGIF website.

## Persistence

Stored in `localStorage`:

- Favorites.
- Talkgroup directory cache.
- Talkgroup profile cache.
- Talkgroup stats cache.
- Callsign lookup cache.

No database is used in the MVP.

## Tests

Tests cover:

- `lastheard` normalization.
- `repeater_id == 0` stop event handling.
- Backlog normalization.
- Duplicate and repeated-update suppression.
- Conversation detection with multiple callsigns.
- Single-station activity not being classified as a conversation.
- Stale retention expiry.
- Directory parsing using saved TGIF samples.
- Profile parsing using saved TGIF samples.
- Statistics parsing using saved TGIF samples.

## Assumptions

- The public empty-token `handshake` remains accepted by TGIF.
- Browser/WebView WebSocket connections to TGIF remain allowed.
- HTTP enrichment endpoints may fail due network/CORS and must be non-fatal.
- `repeater_id == 0` continues to indicate stop/clear-style events as observed in TGIF JavaScript.
- Conversation detection is client-derived, not an official TGIF status.

## Known Limitations

- The app does not yet persist full local activity history.
- The app does not yet support notifications.
- The app does not yet include a backend/proxy fallback for CORS-restricted endpoints.
- Net calendar data is not yet integrated.
- Talkgroup profile parsing is HTML-based and may need maintenance if TGIF markup changes.
- Tauri packaging has not been visually polished with icons or installer metadata.
- npm reports dependency audit findings in transitive packages; these should be reviewed before release.

## Next Steps

1. Add a small protocol diagnostics panel for raw connection and event counts.
2. Add net calendar enrichment for scheduled nets.
3. Add configurable conversation thresholds.
4. Add local activity history retention and export controls.
5. Add notification rules for favorites and high-score conversations.
6. Review dependency audit results and upgrade safely.
