# WebSocket Research

Research pass: 2026-06-20. Raw samples are in `docs/samples/websocket/`.

## Endpoint

| Item | Value | Confidence |
| --- | --- | --- |
| Direct WebSocket URL | `wss://tgif.network/socket.io/?EIO=3&transport=websocket` | Verified |
| Socket.IO origin page | `https://tgif.network/activetg.php` | Verified |
| Socket.IO namespace | default namespace `/` | Observed |
| Engine.IO version | 3 | Verified |

The official `activetg.php` page calls:

```js
var socket = io('https://' + window.location.host);
```

The official `lastheard.php` page calls:

```js
var socket = io('https://' + window.location.host, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  pingInterval: 10000,
  pingTimeout: 5000
});
```

## Captured Direct WebSocket Open

Sample from `docs/samples/websocket/websocket-samples.jsonl`:

```text
0{"sid":"WKQyzokVRQP6gs23BX2z","upgrades":[],"pingInterval":25000,"pingTimeout":5000}40
```

Meaning:

- Engine.IO open packet.
- Server assigns a session ID.
- Direct WebSocket has no upgrades.
- The trailing `40` is Socket.IO namespace connect.

## Headers and Origin

No custom origin requirement was observed during command-line probes. This is not a guarantee for every runtime.

Recommendations:

- Browser app: connect from normal secure origin and let the Socket.IO client set browser headers.
- Desktop/mobile app: set a conventional `Origin: https://tgif.network` only if the client library requires or allows it and if server behavior changes.
- Do not bypass server policy. If future probes fail due origin restrictions, document the exact failure.

## Message Framing

TGIF uses Socket.IO event frames over Engine.IO:

```text
42["eventName", payload]
```

Polling payloads are length-prefixed:

```text
16:42["status",200]
```

WebSocket payloads are individual Engine.IO packets and are not wrapped in the polling length prefix.

## Observed Incoming Message Types

- Engine.IO open packet.
- Socket.IO namespace connect (`40`).
- `status`.
- `lastheard`.
- `lastheard_backlog`.
- `talkgroups_list`.

## Observed Outgoing Message Types

- `handshake`.
- `cli-state`.
- `talkgroups`.
- `dmr` on the home page, not yet captured with response.

## Active TG Detection

Observed official logic:

- `lastheard` with `repeater_id != 0` adds or refreshes a callsign within a talkgroup.
- `lastheard` with `repeater_id == 0` is ignored as a new item and used to clear/update existing stream UI.
- `activetg.php` removes each stream/callsign DOM item after 600,000 ms.
- If a talkgroup row has no remaining callsign divs, the row is removed.

Therefore a future client can define:

- TGIF-active: at least one valid `lastheard` event with `repeater_id != 0` inside the active window.
- Stale: no active participant events remain inside the stale window.

## Sample Payloads

Normal live event:

```json
{
  "talkgroup": 59650,
  "radio_id": 3205803,
  "repeater_id": 320580372,
  "streamid": 1065874006,
  "callsign": "K5AL",
  "shortname": "Bob",
  "talkgroup_name": "Texas-DFW Linked Systems",
  "timestamp": 1781957457
}
```

Stop/clear style event:

```json
{
  "talkgroup": 52909,
  "radio_id": 0,
  "repeater_id": 0,
  "streamid": 3937411666,
  "timestamp": 1781957460
}
```

## Update Frequency

The server pushes events as network activity occurs. No fixed interval was observed for `lastheard` events. Heartbeat timing is fixed by Engine.IO open values:

- `pingInterval`: 25 seconds from the server open packet.
- `pingTimeout`: 5 seconds from the server open packet.

## Full Snapshot vs Incremental

Observed:

- `lastheard_backlog` is a snapshot-like array for initial state.
- `lastheard` is incremental live activity.
- `talkgroups_list` is a full list response to `talkgroups` request.

Unknown:

- Server-side backlog retention duration.
- Whether server can emit other full snapshots.
