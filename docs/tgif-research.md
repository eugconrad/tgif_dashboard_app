# TGIF Network Active Talkgroup Research

Research date: 2026-06-20. Target page: `https://tgif.network/activetg.php`.

## Overview

TGIF active talkgroups are rendered by a static PHP/HTML page shell plus Socket.IO events from the same host. The active page does not embed active talkgroup rows in the initial HTML. It creates an empty two-column table and fills it from `lastheard` events.

The site uses Socket.IO client `v2.4.0` over Engine.IO protocol `EIO=3`. The page connects to `https://tgif.network` and Socket.IO resolves that to `/socket.io/`. Direct WebSocket opens at:

```text
wss://tgif.network/socket.io/?EIO=3&transport=websocket
```

For controlled capture, Engine.IO polling was also verified:

```text
https://tgif.network/socket.io/?EIO=3&transport=polling
```

## Data Sources

- Active state: Socket.IO `lastheard` events.
- Optional initial/history state: page JS requests `cli-state` `{ scope: "*", page: "lastheard", action: "lh-backlog" }`; `lastheard.php` and `activetg.php` both have `lastheard_backlog` handlers. A `lastheard_backlog` payload was verified in source code but was not observed during the short traffic capture.
- Talkgroup profile: `https://tgif.network/tgprofile.php?id=<tgid>`.
- Talkgroup directory: `https://api.tgif.network/dmr/talkgroups/json`.
- Activity stats: `https://tgif.network/talkgroup_stats.php?...&export=json`.
- Callsign/radio detail modal: external `https://dmr.g7lrr.com/new/getcall.php?dmr_id=<radio_id>`.

Raw samples are in `docs/samples/`.

## Active Talkgroup Page Analysis

`activetg.php` returns a full HTML page with:

- Bootstrap 4.5 CSS/JS from CDN.
- jQuery 3.5.1 from CDN.
- Font Awesome 5.7.2 and 4.7.0.
- DataTables CSS/JS, both local `/assets/css/datatables.min.css`, `/assets/js/datatables.min.js` and CDN DataTables 1.10.21 assets.
- First-party CSS: `/assets/css/themes/default.css`, `/assets/css/themes/globals.css`, `/assets/css/header2.css`, `/assets/css/tgifmodal.css`.
- First-party JS: `/assets/js/togglermenu.js`, `/assets/js/socket.io.js`.

The visible active table is:

```html
<input id="lhSearch" type="text" placeholder="Search..">
<table id="lastheard" class="table table-bordered table-striped compact">
  <thead>
    <th>Talkgroup</th>
    <th>Active Callsigns</th>
  </thead>
  <tbody></tbody>
</table>
<div id="wait">Data will populate as traffic comes in to the network. Please wait.</div>
```

Rendering is mixed:

- Server-side: nav/header/footer, styles, empty table, modal shell.
- Client-side: all active talkgroup rows and callsign buttons.

The page embeds no active talkgroup data. Data is fetched dynamically by Socket.IO.

Search behavior:

- `#lhSearch` keyup builds a case-insensitive `RegExp` from the input.
- It strips one leading `(` and one trailing `)`.
- It replaces the first plain space with `\s`.
- It hides table rows whose text does not match.
- It updates the URL `search` query param with `history.replaceState`.
- No initial code was found that reads `search` from the URL on page load.

## JavaScript Analysis

Important globals/functions in `activetg.php`:

- `api_token = ''`
- `connection_state`
- `socket = io('https://' + window.location.host)`
- `addLastHeard(data)`
- `getcalldiv(data)`
- `popitup(radio_id)`
- `int2ip(ipInt)`

Connection flow:

1. On `connect`, show wait text, set `connection_state = 1`, emit `handshake` with empty token.
2. On `status` event with `200`, set `connection_state = 2`, emit:

```js
{ "scope": "*", "page": "lastheard", "action": "lh-backlog" }
```

3. On `lastheard`, hide wait text and call `addLastHeard(data)`.
4. On `lastheard_backlog`, iterate records, call `addLastHeard(data)`, then set `data.repeater_id = 0` and call `addLastHeard(data)` again.

Active status logic in `activetg.php`:

- `data.talkgroup` becomes row id `tg_<tgid>`.
- `data.callsign` becomes a child div id under that talkgroup row.
- `data.streamid` becomes the child div class.
- If an event has `repeater_id == 0`, it is treated as a stream stop/update:
  - If the same streamid already exists under the talkgroup, remove highlighting and return.
  - If no matching stream exists, ignore it.
- If `repeater_id != 0`:
  - Create or update the talkgroup row.
  - Add/prepend a callsign button.
  - Remove that streamid div after `600000` ms.
  - Remove the talkgroup row when it has no callsign divs left.

The page therefore defines an active talkgroup as a talkgroup with at least one child callsign/stream div that has not expired after 10 minutes.

## WebSocket Analysis

Socket.IO client version: `2.4.0`.

Engine.IO protocol:

- `EIO=3`
- Open packet includes `pingInterval: 25000`, `pingTimeout: 5000`.
- Socket.IO packet examples:
  - `40` namespace connect.
  - `42["handshake",""]`
  - `42["status",200]`
  - `42["cli-state",{"scope":"*","page":"lastheard","action":"lh-backlog"}]`
  - `42["lastheard",{...}]`

Direct `wss` open was verified with curl. Generic Node `WebSocket` failed before open in this environment; curl succeeded. Polling transport was used to send client events and capture payloads.

No special token was required for passive data in the page flow; `api_token` is an empty string. Browser origin requirements were not fully proven. Since the official page is same-origin, a future app should prefer a backend/proxy or document any CORS/origin behavior during implementation.

Observed incoming event types:

- `status`: numeric `200` after handshake.
- `lastheard`: incremental transmission/state events.

Event type verified in source but not captured in the short observation:

- `lastheard_backlog`: array of last-heard records.

Observed update frequency was bursty, from multiple messages per second on busy talkgroups to seconds between events. The short capture was intentionally limited.

## Message Schemas

Observed `lastheard` event with callsign data:

```ts
interface LastheardEventPayload {
  latitude: string;
  longitude: string;
  timestamp: number;
  talkgroup: number;
  radio_id: number;
  repeater_id: number;
  streamid: number;
  rssi: number;
  ber: number;
  security_level: string;
  admin: "no" | string | Record<string, unknown>;
  callsign?: string;
  name?: string;
  shortname?: string;
  rptbaseid?: number;
  rptcallsign?: string;
  talkgroup_name?: string;
}
```

Observed stop/partial event:

```json
{
  "latitude": "14.01326",
  "longitude": "100.62270",
  "timestamp": 1781957460,
  "talkgroup": 52909,
  "security_level": "1",
  "radio_id": 0,
  "repeater_id": 0,
  "streamid": 3937411666,
  "rssi": 0,
  "ber": 0,
  "admin": "no"
}
```

Interpretation verified from page code:

- `talkgroup`: TG ID.
- `talkgroup_name`: display name, sometimes `"Unk"`.
- `callsign`: station callsign when known.
- `shortname`/`name`: display name fields for callsign button.
- `radio_id`: DMR radio ID.
- `repeater_id`: non-zero for active keyed event; zero is not used to create active rows.
- `streamid`: stable id for the current stream/transmission; used for dedupe/removal.
- `timestamp`: Unix seconds.
- `rssi`/`ber`: signal metadata.

## Sample WebSocket Messages

Representative raw frames are saved in `docs/samples/websocket-samples.jsonl`.

Normal event:

```json
["lastheard",{"timestamp":1781957457,"talkgroup":59650,"radio_id":3205803,"repeater_id":320580372,"streamid":1065874006,"callsign":"K5AL","shortname":"Bob","talkgroup_name":"Texas-DFW Linked Systems"}]
```

Partial/zero-repeater event:

```json
["lastheard",{"timestamp":1781957460,"talkgroup":52909,"radio_id":0,"repeater_id":0,"streamid":3937411666,"rssi":0,"ber":0,"admin":"no"}]
```

Same stream later with callsign data:

```json
["lastheard",{"timestamp":1781957462,"talkgroup":52909,"radio_id":5200075,"repeater_id":520007540,"streamid":3937411666,"callsign":"HS1ZHY","shortname":"Nopadol","talkgroup_name":"E20AE Clubstation"}]
```

## Talkgroup Profile Page Analysis

URL pattern:

```text
https://tgif.network/tgprofile.php?id=<tgid>
```

Profile HTML is server-rendered with some client-side country/language/image filling.

For `id=296`, observed:

- Title/name: `Hitachi Digipeater (VHF)`.
- Trustee section label: `Talkgroup Trustee`.
- Trustee callsign: `JG1XWV`.
- Contact details: `jg1xwv@jarl.com`.
- Talkgroup ID: `296`.
- `var country = "98";`
- `var language = "ja";`
- Website: `https://xlx297.sub.h-sol.jp/`.
- Description: HTML, including Japanese text and links.
- Image path in JS: `avatars/talkgroups/6811cd52823a94.33945658_nqflpmigjehko.jpeg`.

Other sampled IDs:

- `31665`: normal profile, country `211`, language `en`, PNG image, longer HTML description.
- `373`: normal profile, country `98`, language `ja`, website rendered as `https://`, empty description.
- `52909`: normal profile, country `197`, language `en`, website `N/A`, empty image path.
- `26223`: empty response body; live data showed `talkgroup_name: "Unk"`.

Country/language names are resolved by `/assets/js/tgrequest_bridge_types.js`:

- `getCountry(id)`
- `getLanguage(lang_code)`

Parsing reliability:

- The profile HTML is not semantic enough for a pure selector-only parser; labels are embedded in `h4` text.
- `Talkgroup ID` has an `id="tgid"` selector.
- Country/language raw codes are best parsed from inline `var country` and `var language`, then mapped locally.
- Website can be an `<a>`, plain `N/A`, or malformed placeholder like `https://`.
- Image path is assigned inside `setTalkgroupImage()`, not in the initial `img src`.
- Descriptions may contain nested block HTML inside a `<p>`, links, non-English text, and HTML entities. Parse as HTML fragment and preserve UTF-8.

## Related Endpoints

Detailed endpoint notes are in `docs/samples/endpoint-notes.md`.

Endpoints likely needed for the app:

- `wss://tgif.network/socket.io/?EIO=3&transport=websocket` for live monitoring.
- `https://tgif.network/tgprofile.php?id=<tgid>` for profile enrichment.
- `https://api.tgif.network/dmr/talkgroups/json` for talkgroup directory/cache.
- `https://tgif.network/talkgroup_stats.php?days=30&topN=...&export=json` for optional popularity/history context.

Optional:

- `https://dmr.g7lrr.com/new/getcall.php?dmr_id=<radio_id>` for callsign/radio details.
- QRZ callsign links for user-facing external lookup.

Not needed for passive monitoring:

- `tgcontrol.php`, sign-in/self-care endpoints, legal/help pages.

## Parsing Strategy

Live stream:

1. Connect with Socket.IO v2/Engine.IO 3.
2. On connect, emit `handshake` with `""`.
3. On `status === 200`, emit `cli-state` backlog request.
4. Process `lastheard_backlog` if received as an array.
5. Process each `lastheard` event incrementally.
6. Treat `talkgroup` as numeric TG ID and `streamid` as stream/transmission key.
7. Only create active callsign entries when `repeater_id != 0` and a callsign is present.
8. Use `repeater_id == 0` as a stop/partial update only for an existing `streamid`; do not create new active entries from it.
9. Expire callsign/stream entries after a local stale timeout. The site uses 10 minutes.

Profile enrichment:

1. Fetch profile only when needed and cache by TG ID.
2. Parse title from `<h2><strong>`.
3. Parse `Talkgroup ID` from `#tgid`.
4. Parse trustee callsign/contact from text labels.
5. Parse `country` and `language` inline variables.
6. Resolve country/language with a local copy of the mapping from `tgrequest_bridge_types.js` or a standard maintained mapping after validation.
7. Parse image URL from `image.src = "..."`; convert relative path to `https://tgif.network/...`.
8. Preserve description as sanitized HTML plus derived plain text.

## Data Model Proposal

Suggested future file:

```text
src/domain/tgif/types.ts
```

Proposed TypeScript interfaces based only on observed data:

```ts
export type TgifId = number;
export type Callsign = string;
export type StreamId = number;

export interface Talkgroup {
  id: TgifId;
  name?: string;
  website?: string;
  descriptionEncoded?: string;
  source: "socket" | "directory" | "profile";
  fetchedAt: string;
}

export interface TalkgroupProfile {
  id: TgifId;
  title?: string;
  trusteeCallsign?: Callsign;
  contactDetails?: string;
  countryCode?: string;
  countryName?: string;
  languageCode?: string;
  languageName?: string;
  website?: string;
  imageUrl?: string;
  descriptionHtml?: string;
  descriptionText?: string;
  fetchedAt: string;
  missing?: boolean;
}

export interface CallsignActivity {
  callsign: Callsign;
  radioId?: number;
  repeaterId?: number;
  displayName?: string;
  fullName?: string;
  rptBaseId?: number;
  rptCallsign?: string;
  securityLevel?: string;
  streamId: StreamId;
  firstSeenAt: number;
  lastSeenAt: number;
  lastRssi?: number;
  lastBer?: number;
  active: boolean;
}

export interface ActiveTalkgroupState {
  talkgroupId: TgifId;
  talkgroupName?: string;
  streams: Record<StreamId, CallsignActivity>;
  participants: Record<Callsign, CallsignActivity>;
  firstSeenAt: number;
  lastEventAt: number;
  lastTxAt?: number;
  activeCallsignCount: number;
  isActive: boolean;
  isConversation: boolean;
  metrics: ConversationMetrics;
}

export interface ActivityEvent {
  id: string;
  receivedAt: string;
  timestamp: number;
  type: "tx" | "stop" | "partial" | "backlog";
  talkgroupId: TgifId;
  talkgroupName?: string;
  streamId: StreamId;
  callsign?: Callsign;
  radioId?: number;
  repeaterId?: number;
  rssi?: number;
  ber?: number;
  raw: LastheardPayload;
}

export interface ConversationMetrics {
  windowSeconds: number;
  uniqueCallsigns: number;
  eventCount: number;
  speakerChanges: number;
  lastSpeaker?: Callsign;
  lastTxAt?: number;
  score: number;
}

export interface LastheardPayload {
  latitude: string;
  longitude: string;
  timestamp: number;
  talkgroup: number;
  radio_id: number;
  repeater_id: number;
  streamid: number;
  rssi: number;
  ber: number;
  security_level?: string;
  admin?: "no" | string | Record<string, unknown>;
  callsign?: string;
  name?: string;
  shortname?: string;
  rptbaseid?: number;
  rptcallsign?: string;
  talkgroup_name?: string;
}

export type WebSocketMessage =
  | { event: "status"; data: number }
  | { event: "lastheard"; data: LastheardPayload }
  | { event: "lastheard_backlog"; data: LastheardPayload[] }
  | { event: string; data: unknown };
```

## Conversation Detection Logic

Future app requirements:

- TGIF active group: at least 1 callsign active/recently heard.
- User-interesting conversation: 2+ unique callsigns in a rolling time window.

Proposed logic:

- Maintain a rolling event log per TG.
- Ignore events with no `callsign` for participant counting.
- Treat `repeater_id != 0` plus callsign as a TX/active event.
- Treat `repeater_id == 0` as a stream stop/partial event. Update stream metadata if already known; do not add participant by itself.
- Active window: start with 10 minutes because the official active page expires entries after `600000` ms.
- Conversation window: start with 5 minutes for "currently interesting" scoring, while keeping 10 minutes for active/stale state.
- Stale timeout: mark stream/callsign inactive after 10 minutes without a qualifying TX event, or sooner if a reliable stop event is later proven.
- Participant count: unique callsigns with qualifying TX events in the conversation window.
- Speaker changes: increment when consecutive qualifying TX events in a TG have different callsigns.
- Conversation state: `uniqueCallsigns >= 2` in the conversation window.
- Sorting priority:
  1. conversation score descending,
  2. activeCallsignCount descending,
  3. lastTxAt descending,
  4. known talkgroup name/profile completeness.

Initial score proposal:

```text
score =
  uniqueCallsigns * 10
  + speakerChanges * 3
  + min(eventCount, 20)
  - agePenaltySeconds / 60
```

Do not overfit this. The official page only verifies active/stale behavior, not "conversation" semantics.

## Risks and Unknowns

- `lastheard_backlog` is present in page code but was not captured during the short observation. Treat as supported by source code, not traffic-proven here.
- Direct `wss` opened with curl, but sending events over direct `wss` was not completed in the non-interactive curl run. Polling transport verified the same Socket.IO event payloads.
- Origin/CORS behavior for a packaged cross-platform app is not fully verified.
- Profile pages are HTML, not a stable JSON API.
- Some profile pages return empty bodies.
- Talkgroup directory JSON descriptions appear base64-encoded; profile HTML descriptions are already decoded/rendered.
- Country/language mappings are client-side JS data and may change.
- Timestamps and field names should be treated as observed schema, not an official contract.
- The app should avoid heavy scraping and cache profile/directory data.

## Recommended Next Steps

1. Implement a small TGIF domain module, starting with Socket.IO connection and event normalization.
2. Add fixtures from `docs/samples/websocket-samples.jsonl` and profile HTML samples.
3. Build parsers with tests before UI work.
4. Cache `talkgroups-api.json` data and profile lookups.
5. Add conservative conversation detection using 5-minute conversation and 10-minute active windows.
6. Re-verify `lastheard_backlog` with a browser devtools capture or a proper Socket.IO v2 client during implementation.
