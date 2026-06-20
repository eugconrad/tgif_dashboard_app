# TGIF Client State Machine

This document proposes a complete state machine for a monitoring client, based on observed TGIF Socket.IO behavior.

## Connection State

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    Disconnected --> Connecting: start/connect
    Connecting --> EngineHandshake: Engine.IO open
    EngineHandshake --> SocketConnected: Socket.IO 40
    SocketConnected --> AppHandshake: emit handshake
    AppHandshake --> Authorized: status 200
    AppHandshake --> Failed: non-200 status or timeout
    Authorized --> BacklogRequested: emit cli-state lh-backlog
    BacklogRequested --> BacklogLoading: lastheard_backlog received
    BacklogLoading --> Live: backlog processed
    Authorized --> Live: live lastheard before backlog
    Live --> Live: lastheard
    Live --> Disconnected: disconnect/error
    Failed --> Disconnected: retry
    Disconnected --> Connecting: reconnect timer
```

## Activity State Per Stream

```mermaid
stateDiagram-v2
    [*] --> Unknown
    Unknown --> Active: lastheard repeater_id != 0
    Unknown --> IgnoredStop: lastheard repeater_id == 0
    Active --> Active: same streamid update
    Active --> Ended: same streamid repeater_id == 0
    Active --> Stale: no update before stale timeout
    Ended --> Recent: keep in rolling history
    Recent --> Expired: retention window passes
    Stale --> Expired: retention window passes
    IgnoredStop --> [*]
    Expired --> [*]
```

## Talkgroup State

```mermaid
stateDiagram-v2
    [*] --> Inactive
    Inactive --> Active: first participant in active window
    Active --> Conversational: >=2 participants in conversation window
    Conversational --> Active: participant count falls below 2
    Active --> Stale: no active participants
    Stale --> Inactive: stale timeout expires
    Stale --> Active: new participant event
    Conversational --> Stale: no active participants
```

## Reconnect State

```mermaid
sequenceDiagram
    participant App
    participant Socket
    participant Store
    App->>Socket: connect
    Socket-->>App: status 200
    App->>Socket: cli-state backlog
    Socket-->>App: backlog
    App->>Store: seed state
    Socket-->>App: live lastheard
    App->>Store: update state
    Socket--xApp: disconnect
    App->>Store: mark connection stale, keep activity windows
    App->>Socket: reconnect
    Socket-->>App: status 200
    App->>Socket: cli-state backlog
    Socket-->>App: backlog
    App->>Store: merge and deduplicate
```

## State Ownership

| State | Owner |
| --- | --- |
| Socket connected/disconnected | Protocol client |
| Authorized/failed | Protocol client |
| Backlog loaded | Protocol client plus activity store |
| Stream active/ended/stale | Activity store |
| Talkgroup active/conversational/stale | Conversation engine |
| Cache freshness | Cache layer |

## Deduplication

On reconnect, backlog may overlap live history. Deduplicate using:

```text
eventKey = streamid + ":" + timestamp + ":" + repeater_id + ":" + callsign
```

If `callsign` is missing, use an empty string. Preserve raw duplicates in debug logs only if needed.

## Timeout Defaults

These are recommendations, not server facts:

- Active participant window: 10 minutes, matching official `activetg.php`.
- Conversation window: 5 minutes for 2+ participants.
- Stale display grace: 30 to 60 seconds.
- Raw local event retention: 24 hours by default.
