package com.tahanan.app;

final class EmergencyAlarmState<T extends EmergencyAlarmState.ManagedAlarmPlayer> {

    interface ManagedAlarmPlayer {
        boolean isPlaying();
        void stop();
        void release();
    }

    private T player;
    private int originalVolume = -1;

    synchronized void rememberOriginalVolume(int volume) {
        if (originalVolume == -1) {
            originalVolume = volume;
        }
    }

    synchronized int consumeOriginalVolume() {
        int rememberedVolume = originalVolume;
        originalVolume = -1;
        return rememberedVolume;
    }

    synchronized void replacePlayer(T nextPlayer) {
        releasePlayer(player);
        player = nextPlayer;
    }

    synchronized T stopAndClearPlayer() {
        T activePlayer = player;
        releasePlayer(activePlayer);
        player = null;
        return activePlayer;
    }

    private void releasePlayer(T managedPlayer) {
        if (managedPlayer == null) {
            return;
        }

        if (managedPlayer.isPlaying()) {
            managedPlayer.stop();
        }
        managedPlayer.release();
    }
}
