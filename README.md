# TGIF Dashboard App

TGIF Dashboard App is a planned modern cross-platform desktop monitoring client for the TGIF Network. The project is currently in the research and architecture phase, with detailed reverse-engineering notes captured before production implementation begins.

## Goals

- Monitor currently active TGIF talkgroups in real time.
- Identify meaningful live conversations with two or more active callsigns.
- Enrich live activity with talkgroup profiles, directory data, callsign details, statistics, and net schedules.
- Keep a local activity history suitable for future notifications, favorites, and search.
- Build a maintainable Tauri + TypeScript application with a clear protocol/domain boundary.

## Current Status

Research complete. First MVP implementation is now in place.

The repository contains protocol analysis, endpoint documentation, sample HTML/JavaScript/JSON/WebSocket captures, data model proposals, architecture notes, and a working TypeScript/Tauri-ready MVP dashboard.

## Roadmap

- Build a non-UI Socket.IO protocol prototype.
- Normalize `lastheard`, `lastheard_backlog`, and talkgroup directory events.
- Implement metadata fetchers and cache rules.
- Implement the conversation engine.
- Build the first Tauri + TypeScript desktop UI.
- Add favorites, notifications, local history, and offline metadata support.

See [docs/roadmap.md](docs/roadmap.md) for the detailed research-driven roadmap.
See [docs/mvp.md](docs/mvp.md) for the current implementation status.

## Architecture Overview

The planned application is organized around a strict data pipeline:

```text
Socket.IO / HTTP sources
  -> Protocol Client
  -> Normalizer
  -> Event Bus
  -> Conversation Engine
  -> Store
  -> UI / Notifications / History
  -> Persistence
```

See [docs/architecture.md](docs/architecture.md) for responsibilities and diagrams.

## Documentation

- [Protocol specification](docs/protocol.md)
- [Architecture proposal](docs/architecture.md)
- [MVP implementation notes](docs/mvp.md)
- [Roadmap](docs/roadmap.md)
- [Research index](docs/research/)
- [Original research summary](docs/tgif-research.md)
- [Raw samples](docs/samples/)

Key research topics:

- [Socket.IO events](docs/research/socket-events.md)
- [Engine.IO behavior](docs/research/engineio.md)
- [Active talkgroups page](docs/research/activetg.md)
- [Talkgroup directory](docs/research/talkgroup-directory.md)
- [Talkgroup profiles](docs/research/tgprofile.md)
- [Callsign API](docs/research/callsign-api.md)
- [Conversation engine design](docs/research/conversation-engine.md)
- [Data model](docs/research/data-model.md)

## Screenshots

Screenshots will be added after the first application UI exists.

## Development Setup

Install dependencies:

```bash
npm install
```

Run the web development UI:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Build the web app:

```bash
npm run build
```

Run the Tauri desktop shell:

```bash
npm run tauri:dev
```

Prerequisites:

- Node.js
- npm
- Rust toolchain
- Tauri prerequisites for the target operating system

## License

License not selected yet. See [LICENSE](LICENSE).
