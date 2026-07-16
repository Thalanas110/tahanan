export type EmergencyAudioHandle = Pick<HTMLAudioElement, 'pause' | 'currentTime'>;
export type EmergencyAlarmLogger = (message: string, error: unknown) => void;

let boundEmergencyAudio: EmergencyAudioHandle | null = null;

export function bindEmergencyAudio(audio: EmergencyAudioHandle | null): () => void {
  boundEmergencyAudio = audio;

  return () => {
    if (boundEmergencyAudio === audio) {
      boundEmergencyAudio = null;
    }
  };
}

export function resetEmergencyAudio(audio: EmergencyAudioHandle | null): void {
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
}

export async function stopEmergencyAlertPlayback(
  stopNativeAlarm: () => Promise<void>,
  logError: EmergencyAlarmLogger = (message, error) => console.error(message, error),
): Promise<void> {
  try {
    resetEmergencyAudio(boundEmergencyAudio);
  } catch (error) {
    logError('Failed to stop emergency web audio', error);
  }

  try {
    await stopNativeAlarm();
  } catch (error) {
    logError('Failed to stop native emergency alarm', error);
  }
}

export async function runAfterStoppingEmergencyAlert<T>(
  stopAlert: () => Promise<void>,
  action: () => T | Promise<T>,
): Promise<T> {
  await stopAlert();
  return await action();
}
