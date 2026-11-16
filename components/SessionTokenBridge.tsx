'use client';

import { useEffect } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { setAppBridge } from '@/lib/sessionTokenForApi';

/**
 * Sets App Bridge instance for session token API calls (embedded app).
 * Must be rendered inside AppBridgeProvider.
 * @see https://shopify.dev/docs/apps/build/authentication-authorization/session-tokens
 */
export default function SessionTokenBridge({ children }: { children: React.ReactNode }) {
  const app = useAppBridge();

  useEffect(() => {
    if (app) {
      setAppBridge(app);
    }
    return () => setAppBridge(null);
  }, [app]);

  return <>{children}</>;
}
