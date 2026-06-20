import { describe, expect, it } from 'vitest';
import { normalizeBacklog, normalizeLastheardPayload } from './normalizer';

const payload = {
  latitude: '32.75891',
  longitude: '-97.37514',
  timestamp: 1781957457,
  talkgroup: 59650,
  radio_id: 3205803,
  repeater_id: 320580372,
  streamid: 1065874006,
  rssi: 0,
  ber: 0,
  security_level: '1',
  admin: 'no',
  callsign: 'K5AL',
  name: 'Bob ',
  shortname: 'Bob',
  rptbaseid: 3205803,
  rptcallsign: 'K5AL',
  talkgroup_name: 'Texas-DFW Linked Systems'
};

describe('normalizeLastheardPayload', () => {
  it('normalizes a live transmission event', () => {
    const event = normalizeLastheardPayload(payload, 'socket-lastheard', 1000);

    expect(event?.kind).toBe('tx');
    expect(event?.talkgroupId).toBe(59650);
    expect(event?.participantKey).toBe('callsign:K5AL');
    expect(event?.talkgroupName).toBe('Texas-DFW Linked Systems');
    expect(event?.latitude).toBe(32.75891);
  });

  it('marks repeater_id zero as stop event', () => {
    const event = normalizeLastheardPayload({ ...payload, repeater_id: 0 }, 'socket-lastheard', 1000);

    expect(event?.kind).toBe('tx-stop');
  });

  it('normalizes backlog arrays', () => {
    const events = normalizeBacklog([payload], 1000);

    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('backlog-tx');
  });
});
