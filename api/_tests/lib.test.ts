import { describe, expect, it } from 'vitest';
import { hashValue, isBot } from '../_lib/request.js';

describe('hashValue', () => {
  it('is deterministic for the same day, salt and value', () => {
    const d = new Date('2026-01-01T10:00:00Z');
    expect(hashValue('1.2.3.4', 'salt-salt-salt-salt', d)).toBe(hashValue('1.2.3.4', 'salt-salt-salt-salt', d));
  });
  it('changes with the salt, the value and the day', () => {
    const d = new Date('2026-01-01T10:00:00Z');
    const base = hashValue('1.2.3.4', 'salt-salt-salt-salt', d);
    expect(hashValue('1.2.3.4', 'other-other-other', d)).not.toBe(base);
    expect(hashValue('1.2.3.5', 'salt-salt-salt-salt', d)).not.toBe(base);
    expect(hashValue('1.2.3.4', 'salt-salt-salt-salt', new Date('2026-01-02T10:00:00Z'))).not.toBe(base);
  });
  it('never contains the input', () => {
    expect(hashValue('203.0.113.7', 'salt-salt-salt-salt')).not.toContain('203.0.113.7');
  });
});

describe('isBot', () => {
  it.each(['Googlebot/2.1', 'HeadlessChrome/120', 'Slackbot-LinkExpanding', '', '   '])('flags %j', (ua) => {
    expect(isBot(ua)).toBe(true);
  });
  it('lets ordinary browsers through', () => {
    expect(isBot('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120 Safari/537.36')).toBe(false);
  });
});
