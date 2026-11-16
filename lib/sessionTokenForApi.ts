/**
 * Session token for embedded app → backend authentication.
 * @see https://shopify.dev/docs/apps/build/authentication-authorization/session-tokens
 *
 * - Session token is a JWT (1 min lifetime); must be fetched on each request (no caching).
 * - Frontend calls App Bridge to get token, sends it in Authorization header to backend.
 * - Backend verifies JWT with app secret and uses payload (e.g. dest = shop domain).
 */

let appBridgeRef: any = null;
let appBridgeReadyResolve: ((value: boolean) => void) | null = null;
let appBridgeReadyPromise: Promise<boolean> | null = null;

export function setAppBridge(app: any): void {
  appBridgeRef = app;
  if (app && appBridgeReadyResolve) {
    appBridgeReadyResolve(true);
  }
}

/** Check if App Bridge is ready */
export function isAppBridgeReady(): boolean {
  return appBridgeRef !== null;
}

/** Wait for App Bridge to be ready (max 5 seconds) */
export async function waitForAppBridge(): Promise<boolean> {
  if (appBridgeRef) return true;
  
  if (!appBridgeReadyPromise) {
    appBridgeReadyPromise = new Promise((resolve) => {
      appBridgeReadyResolve = resolve;
      // Timeout after 5 seconds
      setTimeout(() => resolve(false), 5000);
    });
  }
  
  return appBridgeReadyPromise;
}

/** Get a fresh session token from App Bridge. Call on each API request (tokens expire in 1 min). */
export async function getSessionTokenForApi(): Promise<string | null> {
  // Wait for App Bridge if not ready yet (up to 5 seconds)
  if (!appBridgeRef) {
    const ready = await waitForAppBridge();
    if (!ready) {
      console.warn('[SessionToken] App Bridge not ready after 5s timeout');
      return null;
    }
  }
  
  try {
    const { getSessionToken } = await import('@shopify/app-bridge/utilities');
    return await getSessionToken(appBridgeRef);
  } catch (e) {
    console.error('[SessionToken] Failed to get session token:', e);
    return null;
  }
}

/** Redirect top window to URL (for OAuth). Top window so it works when app is in Shopify iframe. */
export function redirectToOAuthUrl(url: string): void {
  try {
    if (typeof window !== 'undefined' && window.top) {
      window.top.location.href = url;
    } else {
      window.location.href = url;
    }
  } catch {
    window.location.href = url;
  }
}
