# Engine.IO and Socket.IO Transport Notes

Research pass: 2026-06-20.

## Version

TGIF uses Engine.IO protocol version 3 with Socket.IO v2-style framing.

Evidence:

- Official script: `/assets/js/socket.io.js`, an older Socket.IO client bundle.
- URL probes use `EIO=3`.
- Server accepted `https://tgif.network/socket.io/?EIO=3&transport=polling`.

## Polling Handshake

Request:

```text
GET https://tgif.network/socket.io/?EIO=3&transport=polling
```

Observed response:

```text
96:0{"sid":"nDBPUs49yo0HxIiXBYdM","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":5000}2:40
```

Breakdown:

- `96:`: Engine.IO polling payload length prefix for the open packet.
- `0{...}`: Engine.IO open packet.
- `2:40`: second polling packet, length 2, Socket.IO namespace connect.

## Polling Client Event

Observed handshake POST body:

```text
18:42["handshake",""]
```

Server response:

```text
ok
```

Next polling read returned:

```text
16:42["status",200]
```

## WebSocket Handshake

Request:

```text
GET wss://tgif.network/socket.io/?EIO=3&transport=websocket
```

Observed initial payload:

```text
0{"sid":"WKQyzokVRQP6gs23BX2z","upgrades":[],"pingInterval":25000,"pingTimeout":5000}40
```

## Upgrade

The polling handshake advertises `upgrades:["websocket"]`. Official `activetg.php` allows default Socket.IO transport selection, so the library may start with polling and upgrade. Official `lastheard.php` forces WebSocket transport.

Recommended client behavior:

- Prefer WebSocket transport if the library supports Socket.IO v2/EIO3.
- Keep polling support for diagnostics and fallback.
- Do not implement raw WebSocket parsing by hand unless the selected runtime lacks a maintained Socket.IO v2-compatible client.

## Heartbeat

Observed server values:

- `pingInterval`: 25000 ms.
- `pingTimeout`: 5000 ms.

Official `lastheard.php` passes client options `pingInterval: 10000` and `pingTimeout: 5000`, but the Engine.IO open packet defines the server heartbeat values actually observed.

## Reconnect Behavior

Official `lastheard.php` configuration:

```js
reconnection: true,
reconnectionAttempts: Infinity,
reconnectionDelay: 1000,
reconnectionDelayMax: 5000,
timeout: 20000
```

Official disconnect handler:

- Sets connection state to disconnected.
- Shows "Reconnecting".
- If reason is `io server disconnect`, calls `socket.connect()` manually.
- Otherwise relies on automatic reconnect.

Recommended application policy:

- Use exponential or capped reconnect with jitter.
- After reconnect, re-emit `handshake`.
- After `status == 200`, re-request backlog via `cli-state`.
- Deduplicate events by `(streamid, timestamp, repeater_id, callsign)` to avoid double-counting backlog after reconnect.

## Packet Cheat Sheet

| Packet | Meaning |
| --- | --- |
| `0{...}` | Engine.IO open |
| `2` | Engine.IO ping |
| `3` | Engine.IO pong |
| `4...` | Engine.IO message |
| `40` | Socket.IO namespace connect |
| `42[...]` | Socket.IO event |

## Risks

- Socket.IO v2/EIO3 is old. Newer client libraries may default to EIO4 and fail unless configured.
- A future TGIF upgrade could change packet framing.
- Polling length-prefixed payload parsing differs from WebSocket packet parsing.
