import { describe, expect, it } from 'vitest';
import { ConversationEngine } from './conversationEngine';
import { normalizeLastheardPayload } from './normalizer';

function event(callsign: string, timestampSeconds: number, streamid: number) {
  const normalized = normalizeLastheardPayload(
    {
      timestamp: timestampSeconds,
      talkgroup: 31665,
      radio_id: streamid,
      repeater_id: streamid * 10,
      streamid,
      callsign,
      shortname: callsign,
      talkgroup_name: 'TGIF The Mothership'
    },
    'socket-lastheard',
    timestampSeconds * 1000
  );
  if (!normalized) throw new Error('failed to normalize fixture');
  return normalized;
}

describe('ConversationEngine', () => {
  it('detects a conversation with multiple callsigns and speaker changes', () => {
    const engine = new ConversationEngine();
    engine.ingest(event('K4WZV', 1000, 1));
    engine.ingest(event('K5AL', 1010, 2));
    engine.ingest(event('K4WZV', 1020, 3));

    const state = engine.getState(31665, 1030 * 1000);

    expect(state?.isConversation).toBe(true);
    expect(state?.metrics.participantCount).toBe(2);
    expect(state?.metrics.speakerChangeCount).toBe(2);
  });

  it('does not treat a single station as conversation', () => {
    const engine = new ConversationEngine();
    engine.ingest(event('K4WZV', 1000, 1));
    engine.ingest(event('K4WZV', 1010, 2));

    const state = engine.getState(31665, 1020 * 1000);

    expect(state?.isActive).toBe(true);
    expect(state?.isConversation).toBe(false);
  });

  it('expires stale activity after retention', () => {
    const engine = new ConversationEngine({ retentionMs: 1000 });
    engine.ingest(event('K4WZV', 1000, 1));

    const states = engine.getStates(1002 * 1000);

    expect(states).toHaveLength(0);
  });
});
