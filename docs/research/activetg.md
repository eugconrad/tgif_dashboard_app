# Active Talkgroups Page Analysis

Target: `https://tgif.network/activetg.php`

Sample: `docs/samples/html/activetg.html`

## Purpose

The page displays active talkgroups and active callsigns per talkgroup. It is mostly client-rendered after initial static HTML loads.

## Dependencies

CSS/frameworks:

- Bootstrap 4.5 from CDN.
- Font Awesome 5.7.2 and Font Awesome 4.7.0 from CDN.
- DataTables CSS from `/assets/css/datatables.min.css` and CDN.
- TGIF theme CSS from `/assets/css/themes/default.css`, `/assets/css/themes/globals.css`, `/assets/css/header2.css`, `/assets/css/tgifmodal.css`.

JavaScript:

- jQuery 3.5.1 from CDN.
- Bootstrap bundle 4.5.0 from CDN.
- DataTables from `/assets/js/datatables.min.js` and CDN.
- `/assets/js/socket.io.js`.
- `/assets/js/togglermenu.js`.
- Inline active TG renderer and Socket.IO logic.
- Common footer SelfCare auto-inject wrapper.

## HTML Structure

Main elements:

- Navigation bar with Monitoring, TGIF Nets, Help, Registration menus.
- `#stationInfo` modal for callsign lookup details.
- Search input `#lhSearch`.
- Table `#lastheard` with columns:
  - Talkgroup
  - Active Callsigns
- `#wait` message: "Data will populate as traffic comes in to the network. Please wait."

The table `tbody` is empty in static HTML. Active data is rendered by JavaScript.

## Search Behavior

Search input `#lhSearch`:

- Runs on `keyup`.
- Strips leading `(` and trailing `)` from the query.
- Replaces the first space with `\s`.
- Builds a case-insensitive RegExp.
- Shows/hides table rows based on full row text.
- Updates the current URL query parameter `search` through `history.replaceState`.

No server-side search is used for `activetg.php`.

## Socket Initialization

```js
var api_token = '';
var socket = io('https://' + window.location.host);
```

On connect:

- Shows wait message.
- Sets `connection_state = 1`.
- Emits `handshake` with `api_token`.
- Starts a 5-second fallback that displays `None` if `connection_state < 3`.

On `status`:

- If `data == 200`, sets `connection_state = 2`.
- Emits:

```json
{"scope":"*","page":"lastheard","action":"lh-backlog"}
```

via event `cli-state`.

## Rendering Logic

`addLastHeard(data)` is the core active TG renderer.

Rules:

- `tgid = data.talkgroup`.
- If an element for the same stream exists and `data.repeater_id == 0`, clear button background and return.
- If `data.repeater_id == 0` and no matching stream exists, return.
- If the talkgroup row exists:
  - If same callsign exists, remove it and prepend a fresh callsign entry.
  - If new callsign, prepend a callsign entry.
  - Schedule removal of that stream entry after 600,000 ms.
  - Remove the TG row if no callsign entries remain.
- If the talkgroup row does not exist and `repeater_id != 0`:
  - Create row `tr#tg_<tgid>`.
  - Render `TG <id>` plus a profile link unless `talkgroup_name == "Unk"`.
  - Add the callsign entry.
  - Schedule the same 600,000 ms removal.

## Active Status

Official active status is DOM/window-based:

- Active participant: callsign div exists under a TG row.
- Stale participant: stream div removed after 10 minutes.
- Active TG: row has at least one callsign div.
- Inactive TG: row removed when participant div count reaches zero.

This is an observed UI rule, not necessarily a server-side definition.

## Backlog Handling

On `lastheard_backlog`, the active page:

```js
datarecords.forEach(function (data) {
  addLastHeard(data);
  data.repeater_id = 0;
  addLastHeard(data);
});
```

This renders each backlog record and then immediately applies the clear path. The timeout still controls removal.

## Callsign Rendering

`getcalldiv(data)`:

- If `Number(data.security_level) == 0`, renders a legacy-styled button with just the callsign.
- Otherwise renders a button with `callsign - shortname`.
- Button click calls `popitup(data.radio_id)`.

`popitup(radio_id)` fetches:

```text
https://dmr.g7lrr.com/new/getcall.php?dmr_id=<radio_id>
```

and renders radio ID, callsign, name, city, state, country, QRZ link, and optional image.

## Server-Side vs Client-Side Rendering

- Static page, navbar, modal, search input, and table header are server-rendered.
- Active talkgroup rows are client-rendered from Socket.IO data.
- Profile links are generated client-side from `data.talkgroup` and `data.talkgroup_name`.

## Embedded Data

Embedded directly:

- Empty `api_token`.
- Header/net countdown script.
- Common SelfCare footer wrapper.
- No active talkgroup data embedded in the initial HTML.

Fetched dynamically:

- Socket.IO live/backlog events.
- Callsign profile JSON through `dmr.g7lrr.com` when user clicks a callsign.

## Implementation Notes

A future app should not copy the DOM timeout rule blindly as business truth. Use it as a starting point:

- Active window: 10 minutes, because official UI uses 600,000 ms.
- Conversation window: shorter rolling window, documented in `conversation-engine.md`.
- Stop events with `repeater_id == 0` should mark a stream as ended but not necessarily erase all recent participant history.
