'use client';

import { useEffect, useRef } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';

/**
 * Embedded + shop+host but no from_backend => redirect to backend via App Bridge
 * so OAuth runs and token saves. (Direct window.top.location causes SecurityError.)
 * For single redirect only: set App URL in Partner Dashboard to backend.
 */
export default function RedirectToBackendWhenNeeded({ children }: { children: React.ReactNode }) {
  const app = useAppBridge();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!app || didRedirect.current || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const shop = params.get('shop') || sessionStorage.getItem('shopify_shop');
    const host = params.get('host') || sessionStorage.getItem('shopify_host');
    const fromBackend = params.get('from_backend');
    const backendUrl = process.env.NEXT_PUBLIC_LARAVEL_URL;

    if (!shop || fromBackend || !backendUrl) return;
    if (!host && window.self === window.top) return;

    didRedirect.current = true;
    const query = 'shop=' + encodeURIComponent(shop) + (host ? '&host=' + encodeURIComponent(host) : '');
    const target = backendUrl.replace(/\/$/, '') + '/?' + query;
    const redirect = Redirect.create(app);
    redirect.dispatch(Redirect.Action.REMOTE, target);
  }, [app]);

  return <>{children}</>;
}
