'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import apiClient from '@/lib/axios';

const SelectPackagePage = dynamic(() => import('@/app/select-package/page'), { ssr: false });

interface SubscriptionGuardProps {
    children: React.ReactNode;
}

export default function SubscriptionGuard({ children }: SubscriptionGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [checking, setChecking] = useState(true);
    const [allowed, setAllowed] = useState(true); // Default to true to avoid blank screen
    const [isEmbedded, setIsEmbedded] = useState(false);
    const hasChecked = useRef(false);
    const isShopifyEmbedded = useRef(false);
    const checkSubscriptionRef = useRef<() => Promise<void>>(() => Promise.resolve());

    useEffect(() => {
        // Check if we're in Shopify embedded mode
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const embedded = params.has('host') || window.self !== window.top;
            isShopifyEmbedded.current = embedded;
            setIsEmbedded(embedded);
        }
        
        checkSubscription();
    }, [pathname]);

    // When subscription is activated (embedded view), re-check so we show dashboard without URL change
    useEffect(() => {
        const onActivated = () => {
            hasChecked.current = false;
            checkSubscriptionRef.current();
        };
        window.addEventListener('subscription-activated', onActivated);
        return () => window.removeEventListener('subscription-activated', onActivated);
    }, []);

    const checkSubscription = async () => {
        checkSubscriptionRef.current = checkSubscription;

        // Skip check for public routes (edit privacy-policy is viewable without login)
        const publicRoutes = ['/login', '/register', '/set-password', '/select-package', '/edit/privacy-policy', '/privacy-policy'];
        if (publicRoutes.some((r) => pathname === r || pathname?.startsWith(r + '/'))) {
            // Clear redirect throttle when on select-package so future dashboard visit works
            if (typeof window !== 'undefined' && pathname?.startsWith('/select-package')) {
                sessionStorage.removeItem('subscription_redirect_ts');
            }
            setAllowed(true);
            setChecking(false);
            return;
        }

        // Check if we're in the middle of OAuth callback (token in URL)
        // Let the page handle the token first before checking subscription
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get('token');
            if (urlToken) {
                // OAuth callback in progress - allow page to handle token first
                console.log('[SubscriptionGuard] OAuth callback detected, allowing page to process token');
                setAllowed(true);
                setChecking(false);
                return;
            }
        }

        // If already checked once and allowed, don't block again
        if (hasChecked.current && allowed) {
            setChecking(false);
            return;
        }

        try {
            // Check user role from local storage first for fast response
            const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    if (user.role === 'admin') {
                        setAllowed(true);
                        setChecking(false);
                        hasChecked.current = true;
                        return;
                    }
                } catch (e) {
                    // Invalid JSON, ignore
                }
            }

            // For embedded mode, wait for App Bridge before making API calls
            // Session token will be used automatically via axios interceptor
            if (isShopifyEmbedded.current) {
                const { waitForAppBridge } = await import('@/lib/sessionTokenForApi');
                const ready = await waitForAppBridge();
                if (!ready) {
                    console.warn('[SubscriptionGuard] App Bridge not ready, allowing render');
                    setAllowed(true);
                    setChecking(false);
                    return;
                }
            } else {
                // Standalone mode: check localStorage token
                const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
                if (!token) {
                    // No token, let auth handle it - allow rendering to avoid blank screen
                    setAllowed(true);
                    setChecking(false);
                    return;
                }
            }

            // API call to check subscription (session token or auth_token via axios)
            const response = await apiClient.get('/subscription/check');

            if (response.data.hasActiveSubscription) {
                setAllowed(true);
                hasChecked.current = true;
            } else {
                // No active subscription
                if (isShopifyEmbedded.current) {
                    // EMBEDDED: Don't change URL – parent stays .../apps/new-public-app-10
                    // Show package selection at same route (content swap, no router.push)
                    console.log('[SubscriptionGuard] No subscription – showing package view at same URL');
                    setAllowed(false);
                    setChecking(false);
                    return;
                }
                // Standalone: full redirect to select-package page
                const params = new URLSearchParams(window.location.search);
                const host = params.get('host') || (typeof window !== 'undefined' ? sessionStorage.getItem('shopify_host') : null);
                const shop = params.get('shop') || (typeof window !== 'undefined' ? sessionStorage.getItem('shopify_shop') : null);
                const queryParams = new URLSearchParams();
                if (host) queryParams.set('host', host);
                if (shop) queryParams.set('shop', shop);
                const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
                window.location.href = `${window.location.origin}/select-package${query}`;
                setAllowed(false);
                return;
            }
        } catch (error: any) {
            console.error('Subscription check error:', error);
            // On error, allow to avoid blank screen - auth will handle 401
            setAllowed(true);
        } finally {
            setChecking(false);
        }
    };

    // IMPORTANT: Always render children while checking to avoid blank screen
    // The page itself handles its own loading state
    // This prevents the blank screen issue in Shopify embedded apps
    if (checking) {
        // Return children anyway to avoid blank screen
        return <>{children}</>;
    }

    // Embedded + no subscription: show package selection at SAME URL (parent stays .../apps/APP_ID)
    if (!allowed && isEmbedded) {
        return <SelectPackagePage />;
    }

    // Standalone + no subscription + not on select-package: show redirecting (full redirect will happen)
    if (!allowed && pathname !== '/select-package') {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: 'linear-gradient(to bottom right, #f3f4f6, #e5e7eb)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid #e5e7eb',
                        borderTop: '4px solid #3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto'
                    }}></div>
                    <p style={{ marginTop: '16px', color: '#6b7280' }}>Redirecting...</p>
                </div>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return <>{children}</>;
}
