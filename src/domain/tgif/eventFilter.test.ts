import { describe, expect, it } from 'vitest';
import { ActivityEventFilter } from './eventFilter';
import { normalizeLastheardPayload } from './normalizer';

function tx(callsign: string, timestamp: number, streamid: number) {
  const event = normalizeLastheardPayload(
    {
      timestamp,
      talkgroup: 30165,
      radio_id: 1000 + streamid,
      repeater_id: 2000 + streamid,
      streamid,
      callsign,
      shortname: callsign,
      talkgroup_name: 'Brazil'
    },
    'socket-lastheard',
    timestamp * 1000
  );
  if (!event) throw new Error('failed to normalize fixture');
  return event;
}

function stop(timestamp: number, streamid: number) {
  const event = normalizeLastheardPayload(
    {
      timestamp,
      talkgroup: 30165,
      radio_id: 0,
      repeater_id: 0,
      streamid
    },
    'socket-lastheard',
    timestamp * 1000
  );
  if (!event) throw new Error('failed to normalize fixture');
  return event;
}

describe('ActivityEventFilter', () => {
  it('suppresses exact duplicate events', () => {
    const filter = new ActivityEventFilter();
    const event = tx('PY1OL', 1000, 1);

    expect(filter.filter([event, event])).toMatchObject({
      accepted: [event],
      suppressed: 1
    });
  });

  it('suppresses repeated updates for the same participant inside the repeat window', () => {
    const filter = new ActivityEventFilter({ participantRepeatSuppressMs: 15_000 });
    const result = filter.filter([
      tx('PY1OL', 1000, 1),
      tx('PY1OL', 1001, 2),
      tx('PY1OL', 1002, 3),
      tx('PY1OL', 1016, 4)
    ]);

    expect(result.accepted.map((event) => event.streamId)).toEqual([1, 4]);
    expect(result.suppressed).toBe(2);
  });

  it('does not suppress another participant in the same talkgroup', () => {
    const filter = new ActivityEventFilter({ participantRepeatSuppressMs: 15_000 });
    const result = filter.filter([tx('PY1OL', 1000, 1), tx('PP1JR', 1001, 2)]);

    expect(result.accepted).toHaveLength(2);
  });

  it('suppresses duplicate stop events for the same stream', () => {
    const filter = new ActivityEventFilter();
    const result = filter.filter([stop(1000, 10), stop(1000, 10)]);

    expect(result.accepted).toHaveLength(1);
    expect(result.suppressed).toBe(1);
  });
});
