import test from 'node:test';
import assert from 'node:assert/strict';
import { publishRealtimeEvent, subscribeToRealtimeChannel } from '../../src/lib/realtime/broker';
import { RealtimeEventPayload } from '../../src/lib/realtime/types';

test('Realtime: Event Publication & Schema Validation', async () => {
  let receivedEvent: RealtimeEventPayload | null = null;
  const testChannel = 'test:channel:01';

  const unsubscribe = subscribeToRealtimeChannel(testChannel, (evt) => {
    receivedEvent = evt;
  });

  const published = await publishRealtimeEvent({
    eventType: 'USER_REGISTERED',
    entityType: 'User',
    entityId: 'usr_realtime_01',
    channels: [testChannel as any],
    payload: {
      id: 'usr_realtime_01',
      name: 'Realtime Candidate',
      email: 'realtime@test.local',
      status: 'PENDING',
    },
  });

  assert.ok(published.eventId.startsWith('evt_'), 'Event ID must start with evt_');
  assert.strictEqual(published.eventType, 'USER_REGISTERED');
  assert.strictEqual(published.entityType, 'User');
  assert.strictEqual(published.version, 1);
  assert.ok(published.timestamp, 'Timestamp must exist');

  assert.ok(receivedEvent !== null, 'Subscriber must receive published event');
  if (receivedEvent) {
    const event: RealtimeEventPayload = receivedEvent;
    assert.strictEqual(event.eventId, published.eventId);
    assert.strictEqual(event.payload.status, 'PENDING');
  }

  unsubscribe();
});

test('Realtime: Channel Isolation', async () => {
  let receivedA = false;
  let receivedB = false;

  const unsubA = subscribeToRealtimeChannel('user:usr_channel_A', () => {
    receivedA = true;
  });

  const unsubB = subscribeToRealtimeChannel('user:usr_channel_B', () => {
    receivedB = true;
  });

  await publishRealtimeEvent({
    eventType: 'USER_APPROVED',
    entityType: 'User',
    entityId: 'usr_channel_A',
    channels: ['user:usr_channel_A' as any],
    payload: { status: 'APPROVED' },
  });

  assert.strictEqual(receivedA, true, 'User A subscriber must receive event');
  assert.strictEqual(receivedB, false, 'User B subscriber must NOT receive User A event');

  unsubA();
  unsubB();
});

test('Realtime: Sensitive Payload Sanitization', async () => {
  let capturedEvent: RealtimeEventPayload | null = null;
  const channel = 'test:sanitize:channel';

  const unsub = subscribeToRealtimeChannel(channel, (evt) => {
    capturedEvent = evt;
  });

  await publishRealtimeEvent({
    eventType: 'USER_REGISTERED',
    entityType: 'User',
    entityId: 'usr_secret_01',
    channels: [channel as any],
    payload: {
      id: 'usr_secret_01',
      email: 'sanitized@test.local',
      password: 'PlaintextPassword123!',
      passwordHash: '$2a$12$e0MYSECRET',
      sessionToken: 'jwt_secret_token_123',
      privateKey: 'SECRET_KEY_999',
      safeField: 'Safe Information',
    },
  });

  assert.ok(capturedEvent !== null);
  if (capturedEvent) {
    const event: RealtimeEventPayload = capturedEvent;
    assert.strictEqual(event.payload.safeField, 'Safe Information');
    assert.strictEqual(event.payload.email, 'sanitized@test.local');

    // Secrets must be stripped
    assert.strictEqual(event.payload.password, undefined, 'Password must be stripped');
    assert.strictEqual(event.payload.passwordHash, undefined, 'passwordHash must be stripped');
    assert.strictEqual(event.payload.sessionToken, undefined, 'sessionToken must be stripped');
    assert.strictEqual(event.payload.privateKey, undefined, 'privateKey must be stripped');
  }

  unsub();
});
