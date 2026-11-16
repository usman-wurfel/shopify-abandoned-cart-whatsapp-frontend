'use client';

import '@shopify/polaris/build/esm/styles.css';
import './globals.css';
import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import { useEffect, useState, useRef } from 'react';
import AppNavigation from '@/components/Navigation';
import apiClient from '@/lib/axios';
import { getImageUrl } from '@/lib/config';
import { TimezoneProvider } from '@/contexts/TimezoneContext';
import { EmbeddedPathProvider } from '@/contexts/EmbeddedPathContext';
import SubscriptionGuard from '@/components/SubscriptionGuard';
import SessionTokenBridge from '@/components/SessionTokenBridge';
import RedirectToBackendWhenNeeded from '@/components/RedirectToBackendWhenNeeded';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<any>(null);
  const [isShopifyEmbedded, setIsShopifyEmbedded] = useState(false);
  const [redirectingToOAuth, setRedirectingToOAuth] = useState(false);
  /** Pehli load pe sirf redirect dikhao, full app mat – taake 2 reload feel na ho */
  const [needsBackendRedirect, setNeedsBackendRedirect] = useState(false);
  const initDone = useRef(false);

  useEffect(() => {
    // Prevent double initialization
    if (initDone.current) return;
    initDone.current = true;

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const shop = params.get('shop');
      let host = params.get('host');
      const fromBackend = params.get('from_backend');
      const token = params.get('token'); // OAuth callback token
      const authToken = localStorage.getItem('auth_token');

      if (!host && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        host = hashParams.get('host');
      }
      if (!host) {
        host = sessionStorage.getItem('shopify_host');
      }
      if (host) {
        sessionStorage.setItem('shopify_host', host);
      }
      if (shop) {
        sessionStorage.setItem('shopify_shop', shop);
      }

      const storedShop = shop || sessionStorage.getItem('shopify_shop');
      const inIframe = window.self !== window.top;
      const isEmbedded = inIframe || !!host;

      if (storedShop && isEmbedded && !fromBackend) {
        setNeedsBackendRedirect(true);
      }

      // 🔐 EARLY OAUTH CHECK: Only when NOT embedded. When embedded, we use session token.
      // Skip if we're coming back from OAuth callback (token in URL).
      if (storedShop && !authToken && !token && !isEmbedded) {
        console.log('[Shopify] No auth_token (standalone), redirecting to OAuth...', { shop: storedShop });
        setRedirectingToOAuth(true);
        const baseUrl = process.env.NEXT_PUBLIC_LARAVEL_URL || 'https://abandoned-cart.taskolia.com';
        const oauthUrl = `${baseUrl}/auth/shopify?shop=${encodeURIComponent(storedShop)}${host ? '&host=' + encodeURIComponent(host) : ''}`;
        import('@/lib/sessionTokenForApi').then(({ redirectToOAuthUrl }) => redirectToOAuthUrl(oauthUrl));
        return; // Stop further execution
      }

      // Only init App Bridge when we're actually IN the iframe (embedded in Shopify admin).
      // When we land after OAuth with host in URL but in TOP window, do NOT init App Bridge –
      // it would try to "embed" the app and cause redirect loops to admin.
      if (inIframe && host && process.env.NEXT_PUBLIC_SHOPIFY_API_KEY) {
        setIsShopifyEmbedded(true);
        setConfig({
          apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
          host: decodeURIComponent(host),
          forceRedirect: false,
        });
      } else if (inIframe && !host && process.env.NEXT_PUBLIC_SHOPIFY_API_KEY) {
        setIsShopifyEmbedded(true);
        const checkHost = setInterval(() => {
          const currentParams = new URLSearchParams(window.location.search);
          let currentHost = currentParams.get('host') ||
            (window.location.hash ? new URLSearchParams(window.location.hash.substring(1)).get('host') : null) ||
            sessionStorage.getItem('shopify_host');
          if (currentHost) {
            clearInterval(checkHost);
            sessionStorage.setItem('shopify_host', currentHost);
            setConfig({
              apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
              host: decodeURIComponent(currentHost),
              forceRedirect: false,
            });
          }
        }, 100);
        setTimeout(() => clearInterval(checkHost), 5000);
      }
    }
  }, []);

  useEffect(() => {
    const updateFavicon = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (!token) return;
        const response = await apiClient.get('/branding-settings');
        if (response.data?.favicon) {
          const faviconUrl = getImageUrl(response.data.favicon);
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
          }
          link.href = faviconUrl;
        }
      } catch (_) {}
    };
    updateFavicon();
  }, []);

  const appProvider = (
    <ErrorBoundary>
      <EmbeddedPathProvider isEmbedded={isShopifyEmbedded}>
        <TimezoneProvider>
          <AppProvider i18n={{}}>
            <AppNavigation>
              <SubscriptionGuard>
                {children}
              </SubscriptionGuard>
            </AppNavigation>
          </AppProvider>
        </TimezoneProvider>
      </EmbeddedPathProvider>
    </ErrorBoundary>
  );

  const [appBridgeTimeout, setAppBridgeTimeout] = useState(false);
  useEffect(() => {
    if (isShopifyEmbedded && !config) {
      const timeout = setTimeout(() => setAppBridgeTimeout(true), 3000);
      return () => clearTimeout(timeout);
    }
  }, [isShopifyEmbedded, config]);

  // Show loading while redirecting to OAuth
  if (redirectingToOAuth) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
        background: 'linear-gradient(to bottom right, #f3f4f6, #e5e7eb)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6', borderRadius: '50%', margin: '0 auto',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ marginTop: '16px', color: '#6b7280' }}>Connecting to Shopify...</p>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isShopifyEmbedded && !config && !appBridgeTimeout) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
        background: 'linear-gradient(to bottom right, #f3f4f6, #e5e7eb)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6', borderRadius: '50%', margin: '0 auto',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ marginTop: '16px', color: '#6b7280' }}>Initializing app...</p>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const redirectOnlyUI = (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
      background: 'linear-gradient(to bottom right, #f3f4f6, #e5e7eb)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px', height: '48px', border: '4px solid #e5e7eb',
          borderTop: '4px solid #3b82f6', borderRadius: '50%', margin: '0 auto',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading app...</p>
      </div>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return config ? (
    <ErrorBoundary
      fallback={
        <div>
          <div style={{
            padding: '8px 16px',
            background: '#fef3c7',
            color: '#92400e',
            fontSize: '13px',
            textAlign: 'center'
          }}>
            App Bridge unavailable. In Partner Dashboard set App URL to: <strong>{typeof window !== 'undefined' ? window.location.origin : ''}</strong>
          </div>
          {appProvider}
        </div>
      }
    >
      <AppBridgeProvider config={config}>
        <SessionTokenBridge>
          <RedirectToBackendWhenNeeded>
            {needsBackendRedirect ? redirectOnlyUI : appProvider}
          </RedirectToBackendWhenNeeded>
        </SessionTokenBridge>
      </AppBridgeProvider>
    </ErrorBoundary>
  ) : (
    appProvider
  );
}
