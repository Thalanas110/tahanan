# SOS Alarm Acknowledge and Bundled Sound Design

## Summary

This change adjusts the SOS alert flow so that:

1. The alarm stops as soon as an SOS is acknowledged.
2. The Android native alarm uses the same bundled app sound that the web overlay already uses, instead of the device's default alarm tone.

The goal is to remove the delay between acknowledgment and silence, and to make the SOS experience consistent across web and Android.

## Current State

### Web behavior

- The global emergency overlay mounts a hidden `<audio>` element that plays `/Military Alarm - Sound FX Copyright Free.mp3`.
- The overlay stops playback when there is no longer an active partner SOS event.
- Acknowledge currently depends on the event status changing and propagating back through queries/realtime before the stop path runs.

### Android native behavior

- `EmergencyAlarmPlugin` currently controls the native alarm lifecycle.
- The plugin now has shared playback state, but it still selects the device's default alarm or ringtone URI.
- The push path can trigger native playback before the user opens the app, which is correct, but the sound source is inconsistent with the web app.

## Problems

### Delayed silence after acknowledgment

When the responder acknowledges an SOS, the alarm may continue until the client receives the updated event state. That creates an avoidable delay between the user's action and the result they expect.

### Inconsistent sound source

The web app already uses a bundled alarm file, while Android native playback uses the phone's system alarm sound. This makes the SOS experience inconsistent and prevents the app from owning the sound behavior.

## Proposed Design

### 1. Stop the alarm immediately on acknowledge

When the responder taps an acknowledge action:

- Stop the web audio element immediately.
- Call `EmergencyAlarm.stopAlarm()` immediately.
- Then continue with the existing acknowledge mutation flow.

This immediate stop should happen in the user action handler, not only in the derived-state effect.

### 2. Stop the alarm immediately on resolve

When the active SOS is resolved from the emergency page:

- Stop the web audio element immediately.
- Call `EmergencyAlarm.stopAlarm()` immediately.
- Then continue with the resolve mutation flow.

This ensures the same direct behavior regardless of whether the responder acknowledges first or closes the alert from the page.

### 3. Keep state-driven stop logic as fallback

The existing effect-driven stop behavior should remain in place.

That fallback is still valuable when:

- Realtime or query refresh updates the SOS state from another screen.
- The user reopens the app after the event has already moved out of `active`.
- The acknowledge request succeeds after the immediate stop path has already silenced the device.

The immediate stop path handles the user's direct action. The reactive stop path handles eventual consistency and cross-screen updates.

### 4. Use the bundled app sound on Android native

Android native playback should stop using `RingtoneManager` and should instead play the same bundled alarm sound already used by the web overlay:

- Source file: `/Military Alarm - Sound FX Copyright Free.mp3`
- Android copy: ship the same audio file as an Android raw resource
- Native playback: resolve the raw resource URI and feed it into `MediaPlayer`

This keeps one canonical SOS sound across platforms.

### 5. Preserve the existing native lifecycle improvements

The recent shared alarm-state design should remain intact:

- one active native player
- deterministic stop and release
- restore original alarm volume when playback stops

Only the source URI changes. The lifecycle and cleanup rules do not.

## Architecture and Component Changes

### Web UI logic

Update the emergency interaction handlers in the global overlay and emergency page so the alarm is stopped before or alongside the acknowledge/resolve mutation.

Likely touchpoints:

- `src/components/logic/GlobalEmergencyAlert.ts`
- `src/components/GlobalEmergencyAlert.tsx`
- `src/pages/emergency.tsx`
- `src/pages/logic/emergency.ts`

The stop helper should be centralized enough to avoid duplicating the same `pause/reset/stopAlarm` sequence in multiple handlers.

### Native Android alarm plugin

Update `EmergencyAlarmPlugin` so `triggerAlarmNatively()` uses an app resource URI rather than the device default alarm/ringtone URI.

Likely touchpoints:

- `android/app/src/main/java/com/tahanan/app/EmergencyAlarmPlugin.java`
- `android/app/src/main/res/raw/<alarm-file>.mp3`

If the raw resource name must be sanitized for Android naming rules, the original public web file path can remain unchanged while the Android resource uses a normalized filename.

## Data Flow

### Acknowledge flow

1. User taps acknowledge.
2. Client immediately stops local web/native alarm playback.
3. Client sends acknowledge mutation.
4. Query/realtime state updates to `acknowledged`.
5. Existing fallback effect observes no active partner event and remains silent.

### Resolve flow

1. User taps resolve.
2. Client immediately stops local web/native alarm playback.
3. Client sends resolve mutation.
4. Query/realtime state updates to `resolved`.
5. Existing fallback effect remains silent.

### Background Android flow

1. Android receives SOS FCM payload.
2. `SosMessagingService` triggers native playback.
3. User opens the app and acknowledges or resolves the alert.
4. Foreground app calls the native stop path immediately.

## Error Handling

### Immediate stop failures

If stopping local playback throws:

- Log the failure.
- Continue with the acknowledge or resolve mutation.

The mutation should not be blocked by a local playback cleanup issue.

### Mutation failures after local stop

If the local stop succeeds but acknowledge/resolve fails:

- The UI should surface the existing mutation error behavior.
- The fallback state effect may re-trigger playback if the SOS remains active and the event query still reports it as active.

This behavior is acceptable because the server remains the source of truth for whether the alert is still active.

## Testing Strategy

### Web behavior

Add focused tests for any extracted stop helper or interaction logic to prove:

- acknowledge triggers immediate stop behavior
- resolve triggers immediate stop behavior
- the fallback state-driven logic still silences when the active event disappears

### Android behavior

Extend Android unit coverage around the native alarm helper where practical, and verify that switching to a bundled raw resource does not regress:

- player replacement
- stop/release behavior
- volume restore behavior

### Integration verification

Run:

- TypeScript typecheck
- existing node tests
- Android unit tests
- Capacitor Android sync
- Android debug assemble

Manual verification should confirm:

1. SOS received while app is open
2. SOS received while app is backgrounded
3. acknowledge stops sound immediately
4. resolve stops sound immediately
5. Android native sound matches the bundled web sound

## Scope Boundaries

This change does not introduce:

- a new notification payload type for stop commands
- a backend-triggered "silence" push on acknowledge
- a redesign of the emergency event model

The server remains unchanged except where already necessary for current SOS delivery. This is a client/native behavior fix.

## Implementation Notes

- Prefer one shared client-side stop helper for web audio reset plus `EmergencyAlarm.stopAlarm()`.
- Keep the reactive effect as a safety net rather than removing it.
- Use the exact existing SOS sound asset as the canonical source, with Android-specific filename normalization only if required by raw resource rules.
