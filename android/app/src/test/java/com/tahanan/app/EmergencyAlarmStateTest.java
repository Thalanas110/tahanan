package com.tahanan.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class EmergencyAlarmStateTest {

    @Test
    public void rememberOriginalVolume_keepsFirstValueUntilConsumed() {
        EmergencyAlarmState<FakeAlarmPlayer> state = new EmergencyAlarmState<>();

        state.rememberOriginalVolume(3);
        state.rememberOriginalVolume(7);

        assertEquals(3, state.consumeOriginalVolume());
        assertEquals(-1, state.consumeOriginalVolume());
    }

    @Test
    public void replacePlayer_stopsAndReleasesPreviousPlayer() {
        EmergencyAlarmState<FakeAlarmPlayer> state = new EmergencyAlarmState<>();
        FakeAlarmPlayer first = new FakeAlarmPlayer(true);
        FakeAlarmPlayer second = new FakeAlarmPlayer(false);

        state.replacePlayer(first);
        state.replacePlayer(second);

        assertTrue(first.stopped);
        assertTrue(first.released);
        assertFalse(second.stopped);
        assertFalse(second.released);
    }

    @Test
    public void stopAndClearPlayer_releasesActivePlayerAndReturnsIt() {
        EmergencyAlarmState<FakeAlarmPlayer> state = new EmergencyAlarmState<>();
        FakeAlarmPlayer player = new FakeAlarmPlayer(true);

        state.replacePlayer(player);
        FakeAlarmPlayer cleared = state.stopAndClearPlayer();

        assertEquals(player, cleared);
        assertTrue(player.stopped);
        assertTrue(player.released);
        assertNull(state.stopAndClearPlayer());
    }

    private static final class FakeAlarmPlayer implements EmergencyAlarmState.ManagedAlarmPlayer {
        private final boolean playing;
        private boolean stopped;
        private boolean released;

        private FakeAlarmPlayer(boolean playing) {
            this.playing = playing;
        }

        @Override
        public boolean isPlaying() {
            return playing;
        }

        @Override
        public void stop() {
            stopped = true;
        }

        @Override
        public void release() {
            released = true;
        }
    }
}
