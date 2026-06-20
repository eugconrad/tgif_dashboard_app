import type { ActivityEvent, ActivityEventSource, LastheardPayload } from './types';

export function normalizeLastheardPayload(
  payload: unknown,
  source: ActivityEventSource,
  receivedAt = Date.now()
): ActivityEvent | null {
  if (!isRecord(payload)) {
    return null;
  }

  const raw = payload as LastheardPayload;
  const talkgroupId = toNumber(raw.talkgroup);
  const repeaterId = toNumber(raw.repeater_id);
  const radioId = toNumber(raw.radio_id);
  const streamId = toNumber(raw.streamid);
  const callsign = cleanString(raw.callsign);
  const shortName = cleanString(raw.shortname);
  const name = cleanString(raw.name);
  const tgifTimestamp = toNumber(raw.timestamp);
  const eventTime = tgifTimestamp ? tgifTimestamp * 1000 : receivedAt;
  const participantKey = getParticipantKey(callsign, radioId, streamId);

  const kind =
    source === 'socket-lastheard-backlog'
      ? 'backlog-tx'
      : repeaterId === 0
        ? 'tx-stop'
        : talkgroupId
          ? 'tx'
          : 'unknown';

  return {
    id: makeEventId(raw, source, receivedAt),
    kind,
    source,
    receivedAt,
    tgifTimestamp,
    talkgroupId,
    talkgroupName: cleanTalkgroupName(raw.talkgroup_name),
    callsign,
    participantKey,
    radioId,
    repeaterId,
    streamId,
    shortName,
    name,
    rssi: toNumber(raw.rssi),
    ber: toNumber(raw.ber),
    securityLevel: cleanString(raw.security_level),
    latitude: toNumber(raw.latitude),
    longitude: toNumber(raw.longitude),
    raw
  };

  function makeEventId(data: LastheardPayload, eventSource: ActivityEventSource, fallbackTime: number) {
    return [
      eventSource,
      data.streamid ?? 'stream',
      data.timestamp ?? Math.round(fallbackTime / 1000),
      data.repeater_id ?? 'repeater',
      data.callsign ?? 'unknown'
    ].join(':');
  }

  function getParticipantKey(call: string | null, rid: number | null, sid: number | null) {
    if (call) return `callsign:${call.toUpperCase()}`;
    if (rid && rid > 0) return `radio:${rid}`;
    if (sid && sid > 0) return `stream:${sid}`;
    return null;
  }
}

export function normalizeBacklog(payload: unknown, receivedAt = Date.now()): ActivityEvent[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((item) => normalizeLastheardPayload(item, 'socket-lastheard-backlog', receivedAt))
    .filter((event): event is ActivityEvent => Boolean(event));
}

export function isTransmissionEvent(event: ActivityEvent) {
  return event.kind === 'tx' || event.kind === 'backlog-tx';
}

function cleanTalkgroupName(value: unknown) {
  const cleaned = cleanString(value);
  if (!cleaned || cleaned === 'Unk') return null;
  return cleaned;
}

function cleanString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
