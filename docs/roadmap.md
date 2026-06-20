# Research-Driven Roadmap

This roadmap keeps implementation behind verified protocol knowledge. It is intentionally documentation-first.

## Phase 0: Completed Research Baseline

Deliverables now present:

- Active TG page analysis.
- JavaScript inventory.
- Engine.IO and Socket.IO protocol notes.
- WebSocket and polling samples.
- Talkgroup directory analysis.
- 100-profile sample summary.
- Callsign lookup samples.
- Statistics endpoint samples.
- Endpoint catalog.
- Conversation engine proposal.

## Phase 1: Protocol Prototype

Goal: build a small non-UI protocol harness that connects to TGIF and writes normalized events to a local log.

Scope:

- Socket.IO client with explicit Engine.IO 3 support.
- `handshake` and `cli-state` behavior.
- Parse `lastheard`, `lastheard_backlog`, and `talkgroups_list`.
- Preserve raw frames.
- Add deterministic unit tests using `docs/samples/websocket/`.

Exit criteria:

- Harness reconnects and resumes.
- Backlog and live events normalize to the same domain shape.
- Stop/clear events are recognized by `repeater_id == 0`.

## Phase 2: Metadata Fetchers

Goal: build polite fetchers for directory, profile, callsign, stats, and calendar data.

Scope:

- Directory JSON fetcher with daily cache.
- Profile parser tested against the 100-profile sample.
- Callsign lookup cache with valid miss handling.
- Statistics fetcher with long TTL and no aggressive polling.
- Calendar parser for embedded `NET_DATA`.

Exit criteria:

- Profile parser handles missing image, missing website, placeholder website, missing description, and non-English descriptions.
- Fetchers never refetch the same resource repeatedly during normal app startup.

## Phase 3: Domain Store and Conversation Engine

Goal: derive active talkgroup and conversation state from normalized activity.

Scope:

- Activity event log.
- Rolling participant windows.
- Speaker-change counts.
- Conversation scoring.
- Stale timeouts.
- Favorite/notification selectors without UI.

Exit criteria:

- Given recorded samples, state transitions are deterministic.
- Conversation scoring is explainable from event log data.

## Phase 4: Minimal Client UI

Goal: present live state without adding new protocol behavior.

Scope:

- Active talkgroups list.
- Conversation-priority sort.
- Profile details with cached enrichment.
- Local activity history.

Exit criteria:

- UI consumes store projections only.
- UI does not parse raw Socket.IO frames.

## Phase 5: Product Features

Scope:

- Favorites.
- Notifications.
- History search.
- Offline metadata cache.
- User-configurable conversation scoring.

## Guardrails

- Do not scrape profile pages in bulk at runtime.
- Do not poll statistics faster than the official page cadence.
- Cache callsigns and profiles.
- Keep protocol assumptions marked and testable.
