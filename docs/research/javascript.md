# JavaScript Reverse Engineering

Research pass: 2026-06-20. This document inventories JavaScript loaded by `https://tgif.network/activetg.php` and useful related pages.

## Active Talkgroups Script Inventory

Loaded by `activetg.php`:

| Script | Source | Purpose | Notes |
| --- | --- | --- | --- |
| jQuery 3.5.1 | CDN | DOM, events, AJAX | Required by page scripts |
| Bootstrap bundle 4.5.0 | CDN | Navbar/dropdowns/modal behavior | Uses Popper included bundle |
| DataTables | `/assets/js/datatables.min.js` and CDN | Table/search behavior | Active page uses manual search rather than DataTables initialization |
| `/assets/js/socket.io.js` | TGIF | Socket.IO client | Older Engine.IO 3 compatible bundle |
| `/assets/js/togglermenu.js` | TGIF | Navbar toggle helper | Small script |
| Inline header countdown | page HTML | TGIF Nets dropdown countdown | Common across pages |
| Inline active TG script | page HTML | Socket connection, active TG rendering, callsign modal | Core monitoring code |
| Inline footer SelfCare wrapper | page HTML | Clipboard/window.name TG auto-inject and SelfCare redirect | Common across pages |

No dynamically inserted external script was observed on `activetg.php`.

## Socket.IO Calls

Observed across active and related pages:

| Expression | Page | Meaning |
| --- | --- | --- |
| `io('https://' + window.location.host)` | `activetg.php`, `talkgroups.php`, `index.php` | Default Socket.IO connection |
| `io('https://' + window.location.host, { transports: ['websocket'], ... })` | `lastheard.php` | WebSocket-only Socket.IO connection with reconnect config |
| `socket.emit('handshake', api_token)` | `activetg.php`, `lastheard.php` | Public handshake, token rendered as empty string |
| `socket.emit('cli-state', msg)` | `activetg.php`, `lastheard.php` | Requests `lastheard` backlog |
| `socket.emit('talkgroups', 'list')` | `talkgroups.php` | Requests full talkgroup list |
| `socket.emit('dmr', 'stats')` | `index.php` | Requests DMR stats, response not captured |
| `socket.once('selfcare:settg', ...)` | common footer | Waits for authenticated SelfCare set-TG completion |

Observed handlers:

| Handler | Page | Purpose |
| --- | --- | --- |
| `socket.on('connect', ...)` | active, lastheard, talkgroups | Emit initial request |
| `socket.on('status', ...)` | active, lastheard | Accept/reject handshake |
| `socket.on('lastheard', ...)` | active, lastheard, index | Process live activity |
| `socket.on('lastheard_backlog', ...)` | active, lastheard, index | Process backlog |
| `socket.on('talkgroups_list', ...)` | talkgroups | Render full TG list |
| `socket.on('disconnect', ...)` | lastheard | Reconnect status |
| `socket.on('error', ...)` | active, lastheard | Error logging |
| `socket.on('connect_error', ...)` | lastheard | Connect failure |
| `socket.on('connect_timeout', ...)` | lastheard | Connect timeout |
| `socket.on('reconnect', ...)` | lastheard | Reconnect event |

## HTTP/AJAX Calls

| Code | Endpoint | Method | Purpose |
| --- | --- | --- | --- |
| `$.getJSON('https://dmr.g7lrr.com/new/getcall.php?dmr_id=' + radio_id)` | `dmr.g7lrr.com/new/getcall.php` | GET | Callsign/radio profile modal |
| `$.ajax({ url: 'https://' + window.location.hostname + '/tgcontrol.php', type:'POST' })` | `/tgcontrol.php` | POST | Auth/admin ACL rule creation |
| `$.ajax({ url: 'https://api.tgif.network/dmr/userdb/' + callsign })` | `api.tgif.network/dmr/userdb/<callsign>` | GET | Resolve callsign to DMR IDs for ACL targeting |
| `fetch(window.location.pathname + '?' + params.toString())` | `/talkgroup_stats.php` | GET | Stats JSON refresh |
| `fetch(window.location.pathname + '?days=30&topN=50&export=json')` | `/talkgroup_stats.php` | GET | Background stats cache warm |
| `$.post('signin.php')` and `$.ajax({url:'signin.php', ...})` | `/signin.php` | POST | Auth pages, not needed for public monitor |

## Active Page Globals

| Name | Scope | Purpose |
| --- | --- | --- |
| `api_token` | global | Empty public token |
| `socket` | global | Socket.IO connection |
| `connection_state` | implicit global in active page | UI loading state |
| `modal`, `span` | global | Callsign modal controls |
| `tgCache` | footer closure | Cached TG value for SelfCare auto-inject |
| `TGIFCountdown` | `window` | Header/net countdown formatter |
| `__TGIF_HEADER_UI__` | `window` | Guard against duplicate header initialization |

## Active Page Helper Functions

| Function                        | Purpose                                  | Notes                                     |
| ------------------------------- | ---------------------------------------- | ----------------------------------------- |
| `int2ip(ipInt)`                 | Converts integer IP to dotted quad       | Present on active and lastheard pages     |
| `popitup(radio_id)`             | Fetches callsign profile and opens modal | Uses external `dmr.g7lrr.com` endpoint    |
| `addLastHeard(data)`            | Active TG DOM state update               | Core active talkgroup algorithm           |
| `getcalldiv(data)`              | Creates callsign button HTML             | Legacy styling when `security_level == 0` |
| Header `initTooltips()`         | Initializes Bootstrap tooltips           | Defensive checks                          |
| Header `setUserTimezone()`      | Displays local timezone                  | Uses `Intl.DateTimeFormat`                |
| Header `updateLiveCountdowns()` | Updates navbar live net countdowns       | Removes ended live-net entries            |
| Footer `resolveTG()`            | Reads TG from clipboard or `window.name` | Used for SelfCare join flow               |
| Footer `injectTG(input)`        | Fills `.tginput` fields                  | Triggers `input` event                    |

## Last Heard Page Helpers

Useful because they expose deeper protocol logic:

| Function | Purpose |
| --- | --- |
| `sigMeter(rssi, ber)` | Formats BER/RSSI into signal display and icons |
| `talkgroupLabel(data)` | Creates TG label/profile/admin link |
| `addLastHeardRow(data)` | Adds, updates, or clears Last Heard table row |
| `togglePause()` | Queues live events while paused |
| `formatTime(ts)` | Formats event timestamp |
| `clearTG(fTG)` | Removes rows for a TG unless stopped |

Last Heard limits table rows to about 1000 by removing row 0 when count exceeds 1000.

## Admin/Self-Care Helpers in `lastheard.js`

Loaded by Last Heard/admin flows, not by public active page in the captured HTML. It is still useful for endpoint discovery.

| Function | Purpose |
| --- | --- |
| `newAclEntry(scope, data)` | Posts ACL rule to `/tgcontrol.php` |
| `banUser(cli, dat, timespan, label, flags)` | Looks up callsign IDs then opens ACL flow |
| `banUserCB(...)` | Builds ACL form with IP and ID checkboxes |
| `quickBoot(cli, dat, timespan, label)` | Posts quick ban/boot rule |
| `createBanBtnEvent(...)` | Binds ban modal |
| `createMuteBtnEvent(...)` | Binds mute modal |
| `createBootBtnEvent(...)` | Binds boot action |
| `createAclBtnEvent(...)` | Opens admin ACL action chooser |
| `flagChanged`, `tbFocus`, `modalEventHandler` | ACL form helpers |

Observed ACL data shape:

```json
{
  "tgid": "<scope>",
  "flags": 3,
  "cidr": [],
  "uuid": [],
  "duration": 900,
  "label": "K5AL 15 Minute Ban",
  "action": "add"
}
```

Admin functions are authenticated or permission dependent. They are not required for the monitoring app.

## `lh_session_cache.js`

Provides a small in-memory cache keyed by radio/repeater IDs. Used to attach admin metadata to later ACL UI actions.

Important fields copied by cache:

- `callsign`
- `rptcallsign`
- `rptbaseid`
- `talkgroup`
- `r_uuid`
- `uuid`
- `ipstr`
- `security_level`
- `state`
- `flags`

## `tgrequest_bridge_types.js`

Contains mapping data:

- Language code to display name.
- Numeric country code to display country.
- Bridge type constants.

The profile and talkgroup list pages depend on `getLanguage(language).name` and `getCountry(country)`.

## Hidden/Secondary Features

- The common footer supports "join TG from calendar" using clipboard plus `window.name = 'TG_JOIN:<tgid>'`.
- The footer wraps `socket.emit` and waits for `selfcare:settg` acknowledgement before redirecting to `/nets/calendar.php`.
- `talkgroup_stats.php` uses localStorage cache key `tgstats_cache_<days>_<topN>`.
- `nets/calendar.php` embeds schedule data in `NET_DATA` and uses `window.location.replace` to add `tz=<local timezone>`.

## Parsing Guidance

- Do not parse UI-generated HTML for live callsigns. Use Socket.IO payloads.
- For profile pages, HTML parsing is required because no JSON profile endpoint was observed.
- Use TGIF's country/language maps if profile and Socket.IO list codes need display names.
- Preserve unknown fields from Socket.IO because admin/authenticated sessions may add object fields.
