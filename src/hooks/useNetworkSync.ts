import { useEffect, useRef } from 'react';
import { Network } from '@capacitor/network';
import { processSyncQueue } from '@/lib/syncQueue';
import { Capacitor } from '@capacitor/core';

export function useNetworkSync() {
  const isInitialRun = useRef(true);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let networkListener: any;

    const setupListener = async () => {
      // Check current status on mount
      const status = await Network.getStatus();
      if (status.connected) {
        processSyncQueue().catch(console.error);
      }

      // Listen for network changes
      networkListener = await Network.addListener('networkStatusChange', (status) => {
        console.log('Network status changed', status);
        if (status.connected) {
          processSyncQueue().catch(console.error);
        }
      });
    };

    setupListener().catch(console.error);

    return () => {
      if (networkListener) {
        networkListener.remove();
      }
    };
  }, []);
}
