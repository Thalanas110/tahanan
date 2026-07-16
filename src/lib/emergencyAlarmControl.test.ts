import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bindEmergencyAudio,
  runAfterStoppingEmergencyAlert,
  stopEmergencyAlertPlayback,
  type EmergencyAudioHandle,
} from './emergencyAlarmControl.ts';

test('stopEmergencyAlertPlayback pauses and rewinds the bound audio before stopping native alarm', async () => {
  const calls: string[] = [];
  const audio: EmergencyAudioHandle = {
    currentTime: 18,
    pause() {
      calls.push('pause');
    },
  };

  const unbind = bindEmergencyAudio(audio);

  await stopEmergencyAlertPlayback(async () => {
    calls.push('native-stop');
  });

  unbind();

  assert.deepEqual(calls, ['pause', 'native-stop']);
  assert.equal(audio.currentTime, 0);
});

test('stopEmergencyAlertPlayback logs web-audio failures and still stops the native alarm', async () => {
  const calls: string[] = [];
  const errors: Array<{ message: string; error: unknown }> = [];
  const audio: EmergencyAudioHandle = {
    currentTime: 7,
    pause() {
      throw new Error('pause failed');
    },
  };

  const unbind = bindEmergencyAudio(audio);

  await stopEmergencyAlertPlayback(
    async () => {
      calls.push('native-stop');
    },
    (message, error) => {
      errors.push({ message, error });
    },
  );

  unbind();

  assert.deepEqual(calls, ['native-stop']);
  assert.equal(errors.length, 1);
  assert.equal(errors[0]?.message, 'Failed to stop emergency web audio');
});

test('runAfterStoppingEmergencyAlert always runs the SOS mutation after the local stop helper', async () => {
  const calls: string[] = [];

  await runAfterStoppingEmergencyAlert(
    async () => {
      calls.push('stop');
    },
    async () => {
      calls.push('mutate');
    },
  );

  assert.deepEqual(calls, ['stop', 'mutate']);
});
