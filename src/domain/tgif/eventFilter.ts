import { isTransmissionEvent } from './normalizer';
import type { ActivityEvent } from './types';

export interface ActivityEventFilterConfig {
  participantRepeatSuppressMs: number;
  maxTrackedKeys: number;
}

export interface ActivityEventFilterResult {
  accepted: ActivityEvent[];
  suppressed: number;
}

export class ActivityEventFilter {
  private readonly config: ActivityEventFilterConfig;
  private readonly seenEventIds = new Set<string>();
  private readonly seenTxStreams = new Set<string>();
  private readonly seenStopStreams = new Set<string>();
  private readonly lastAcceptedParticipantTx = new Map<string, number>();

  constructor(config: Partial<ActivityEventFilterConfig> = {}) {
    this.config = {
      participantRepeatSuppressMs: 15_000,
      maxTrackedKeys: 5000,
      ...config
    };
  }

  filter(events: ActivityEvent[]): ActivityEventFilterResult {
    const accepted: ActivityEvent[] = [];
    let suppressed = 0;

    for (const event of events) {
      if (this.shouldAccept(event)) {
        accepted.push(event);
      } else {
        suppressed++;
      }
    }

    this.trim();
    return { accepted, suppressed };
  }

  private shouldAccept(event: ActivityEvent) {
    if (this.seenEventIds.has(event.id)) return false;
    this.seenEventIds.add(event.id);

    if (isTransmissionEvent(event)) {
      if (this.isRepeatedParticipantTx(event)) return false;

      const streamKey = getStreamKey('tx', event);
      if (streamKey) {
        if (this.seenTxStreams.has(streamKey)) return false;
        this.seenTxStreams.add(streamKey);
      }

      const participantKey = getParticipantTxKey(event);
      if (participantKey) {
        this.lastAcceptedParticipantTx.set(participantKey, getEventTime(event));
      }

      return true;
    }

    if (event.kind === 'tx-stop') {
      const streamKey = getStreamKey('stop', event);
      if (!streamKey) return true;
      if (this.seenStopStreams.has(streamKey)) return false;
      this.seenStopStreams.add(streamKey);
    }

    return true;
  }

  private isRepeatedParticipantTx(event: ActivityEvent) {
    const participantKey = getParticipantTxKey(event);
    if (!participantKey) return false;

    const eventTime = getEventTime(event);
    const lastAccepted = this.lastAcceptedParticipantTx.get(participantKey);
    return typeof lastAccepted === 'number' && eventTime - lastAccepted < this.config.participantRepeatSuppressMs;
  }

  private trim() {
    trimSet(this.seenEventIds, this.config.maxTrackedKeys);
    trimSet(this.seenTxStreams, this.config.maxTrackedKeys);
    trimSet(this.seenStopStreams, this.config.maxTrackedKeys);
    trimMap(this.lastAcceptedParticipantTx, this.config.maxTrackedKeys);
  }
}

function getStreamKey(prefix: 'tx' | 'stop', event: ActivityEvent) {
  if (!event.talkgroupId || !event.streamId) return null;
  return [prefix, event.talkgroupId, event.streamId, event.participantKey ?? 'unknown'].join(':');
}

function getParticipantTxKey(event: ActivityEvent) {
  if (!event.talkgroupId) return null;
  const identity = event.participantKey ?? (event.radioId ? `radio:${event.radioId}` : null);
  if (!identity) return null;
  return [event.talkgroupId, identity].join(':');
}

function getEventTime(event: ActivityEvent) {
  return event.tgifTimestamp ? event.tgifTimestamp * 1000 : event.receivedAt;
}

function trimSet<T>(set: Set<T>, maxSize: number) {
  while (set.size > maxSize) {
    const first = set.values().next().value as T | undefined;
    if (typeof first === 'undefined') return;
    set.delete(first);
  }
}

function trimMap<K, V>(map: Map<K, V>, maxSize: number) {
  while (map.size > maxSize) {
    const first = map.keys().next().value as K | undefined;
    if (typeof first === 'undefined') return;
    map.delete(first);
  }
}
