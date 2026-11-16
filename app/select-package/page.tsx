'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/axios';
import { branding } from '@/config/branding';
import { Package as PackageIcon, Check, Clock, Crown, Info } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import createApp from '@shopify/app-bridge';
import { Redirect } from '@shopify/app-bridge/actions';

interface Package {
    id: number;
    name: string;
    description: string | null;
    type: 'free' | 'paid';
    price: string;
    duration_days: number;
    is_active: boolean;
}

interface CurrentSubscription {
    id: number;
    package_id: number;
    package_type: 'free' | 'paid';
    expires_at: string;
    remaining_days: number;
}

export default function SelectPackagePage() {
    const router = useRouter();
    const [packages, setPackages] = useState<Package[]>([]);
    const [loading, setLoading] = useState(true);
    const [activating, setActivating] = useState<number | null>(null);
    const [user, setUser] = useState<any>(null);
    const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
    const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
    const [freeTrialUsed, setFreeTrialUsed] = useState(false);

    useEffect(() => {
        checkAuthAndFetch();
    }, []);

    const checkAuthAndFetch = async () => {
        try {
            // Store shop/host in sessionStorage for session token
            if (typeof window !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                const shop = urlParams.get('shop');
                const host = urlParams.get('host');
                if (shop) sessionStorage.setItem('shopify_shop', shop);
                if (host) sessionStorage.setItem('shopify_host', host);
            }

            // Check if embedded mode (use session token, not localStorage)
            const inIframe = typeof window !== 'undefined' && window.self !== window.top;
            const hasHost = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).has('host') || sessionStorage.getItem('shopify_host'));
            const isEmbedded = inIframe || hasHost;
            
            if (isEmbedded) {
                // Wait for App Bridge before making API calls
                console.log('[SelectPackage] Embedded mode - waiting for App Bridge');
                const { waitForAppBridge } = await import('@/lib/sessionTokenForApi');
                const ready = await waitForAppBridge();
                if (!ready) {
                    console.error('[SelectPackage] App Bridge not ready');
                    toast.error('Failed to connect to Shopify. Please refresh.');
                    setLoading(false);
                    return;
                }
                console.log('[SelectPackage] App Bridge ready');
            } else {
                // Standalone mode: check localStorage token
                const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
                if (!token) {
                    router.push('/login');
                    return;
                }
            }

            // Fetch user info (session token via axios interceptor)
            const userResponse = await apiClient.get('/user');
            const userData = userResponse.data.user || userResponse.data;
            setUser(userData);

            // If admin, redirect to dashboard
            if (userData.role === 'admin') {
                router.push('/');
                return;
            }

            // Fetch available packages
            await fetchPackages();
        } catch (err: any) {
            console.error('[SelectPackage] Error:', err);
            const inIframe = typeof window !== 'undefined' && window.self !== window.top;
            const hasHost = typeof window !== 'undefined' && sessionStorage.getItem('shopify_host');
            const isEmbedded = inIframe || hasHost;
            
            if (err.response?.status === 401 || err.response?.status === 403) {
                if (!isEmbedded) {
                    // Only redirect to login in standalone mode
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('user');
                    }
                    router.push('/login');
                } else {
                    // Embedded mode: show error, don't redirect
                    toast.error('Authentication failed. Please refresh the page.');
                    setLoading(false);
                }
            } else {
                toast.error('Failed to load packages');
                setLoading(false);
            }
        }
    };

    const fetchPackages = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/subscription/packages');
            // Handle new response format
            const data = response.data;
            setPackages(data.packages || []);
            setHasActiveSubscription(data.has_active_subscription || false);
            setCurrentSubscription(data.current_subscription || null);
            setFreeTrialUsed(data.free_trial_used ?? false);
        } catch (error: any) {
            console.error('Error fetching packages:', error);
            toast.error('Failed to fetch packages');
        } finally {
            setLoading(false);
        }
    };

    const isCurrentPlan = (pkg: Package): boolean =>
        !!currentSubscription && currentSubscription.package_id === pkg.id;

    const isCurrentPlanActive = (): boolean =>
        !!currentSubscription && (currentSubscription.remaining_days ?? 0) > 0;

    // Free: Activated (disabled) | Expired (disabled) | Activate Free (enabled)
    // Paid: Cancel (enabled when this plan is active) | Activate (enabled otherwise)
    type ButtonAction = 'activate' | 'cancel' | null;
    const getPlanButtonState = (pkg: Package): { label: string; action: ButtonAction } => {
        if (pkg.type === 'free') {
            const freeActive = isCurrentPlan(pkg) && isCurrentPlanActive();
            if (freeActive) return { label: 'Activated', action: null };
            if (freeTrialUsed) return { label: 'Expired', action: null };
            return { label: 'Activate Free', action: 'activate' };
        }
        // Paid
        if (isCurrentPlan(pkg) && isCurrentPlanActive()) return { label: 'Cancel', action: 'cancel' };
        return { label: 'Activate', action: 'activate' };
    };

    const isPackageButtonEnabled = (pkg: Package): boolean => {
        return getPlanButtonState(pkg).action !== null;
    };

    const handlePlanAction = async (pkg: Package) => {
        const { action } = getPlanButtonState(pkg);
        if (!action) {
            toast.info('No action available for this plan.');
            return;
        }

        if (action === 'cancel') {
            try {
                setActivating(pkg.id);
                const response = await apiClient.post('/subscription/cancel');
                if (response.data?.success) {
                    toast.success(response.data.message ?? 'Subscription cancelled.');
                    if (typeof window !== 'undefined' && window.self !== window.top) {
                        window.dispatchEvent(new CustomEvent('subscription-activated'));
                    }
                    await fetchPackages();
                } else {
                    toast.error(response.data?.message ?? 'Failed to cancel.');
                }
            } catch (err: any) {
                toast.error(err.response?.data?.message ?? 'Failed to cancel subscription.');
            } finally {
                setActivating(null);
            }
            return;
        }

        try {
            setActivating(pkg.id);
            const response = await apiClient.post('/subscription/purchase', {
                package_id: pkg.id,
            });

            if (response.data.success) {
                if (response.data.confirmation_url) {
                    toast.info('Redirecting to Shopify for payment approval...');

                    // Get host parameter from URL
                    const params = new URLSearchParams(window.location.search);
                    const host = params.get('host');
                    const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;

                    if (host && apiKey) {
                        try {
                            // Create App Bridge instance
                            const app = createApp({
                                apiKey: apiKey,
                                host: host,
                            });

                            // Use top-level redirect to break out of iframe
                            const redirect = Redirect.create(app);
                            redirect.dispatch(Redirect.Action.REMOTE, response.data.confirmation_url);
                        } catch (bridgeError) {
                            console.error('App Bridge error:', bridgeError);
                            // Fallback: Force top-level redirect
                            window.top!.location.href = response.data.confirmation_url;
                        }
                    } else {
                        // Fallback: Force top-level redirect
                        if (window.top) {
                            window.top.location.href = response.data.confirmation_url;
                        } else {
                            window.location.href = response.data.confirmation_url;
                        }
                    }
                    return;
                }

                toast.success(response.data.message || 'Package activated successfully!');
                // Embedded: tell SubscriptionGuard to re-check so dashboard shows at same URL
                if (typeof window !== 'undefined' && window.self !== window.top) {
                    window.dispatchEvent(new CustomEvent('subscription-activated'));
                }
                // Redirect to dashboard after successful activation (standalone or after re-check)
                setTimeout(() => {
                    router.push('/');
                }, 1500);
            } else {
                toast.error(response.data.message || 'Failed to activate package');
            }
        } catch (error: any) {
            console.error('Error activating package:', error);
            toast.error(error.response?.data?.message || 'Failed to activate package');
        } finally {
            setActivating(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading packages...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 p-8" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
            <ToastContainer position="top-right" autoClose={3000} />

            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center space-x-3 mb-4">
                        <div
                            className="w-14 h-14 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: branding.colors.primaryLight }}
                        >
                            <PackageIcon className="w-8 h-8" style={{ color: branding.colors.primary }} />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">Choose Your Plan</h1>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                        Select a package to get started with abandoned cart recovery and boost your sales.
                    </p>

                    {/* Current subscription info */}
                    {currentSubscription && (
                        <div className="mt-4 inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg">
                            <Info className="w-5 h-5" />
                            <span>
                                Current plan expires in <strong>{currentSubscription.remaining_days} day{currentSubscription.remaining_days !== 1 ? 's' : ''}</strong>
                            </span>
                        </div>
                    )}
                </div>

                {/* Packages Grid */}
                {packages.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl shadow-md">
                        <PackageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No packages available at the moment.</p>
                        <p className="text-gray-400">Please contact support for assistance.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {packages.map((pkg) => {
                            const isEnabled = isPackageButtonEnabled(pkg);
                            return (
                                <div
                                    key={pkg.id}
                                    className={`bg-white rounded-2xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl ${pkg.type === 'paid' ? 'border-2 border-yellow-400' : 'border border-gray-200'
                                        }`}
                                >
                                    {/* Package Header */}
                                    <div
                                        className="p-6 text-white rounded-t-2xl"
                                        style={{
                                            backgroundColor: pkg.type === 'paid' ? '#f59e0b' : branding.colors.primary,
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-2xl font-bold">{pkg.name}</h3>
                                            {pkg.type === 'paid' && <Crown className="w-6 h-6" />}
                                        </div>
                                        <div className="flex items-baseline">
                                            <span className="text-4xl font-bold">
                                                {pkg.type === 'free' ? '$0' : `$${Number(pkg.price).toFixed(2)}`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Package Body */}
                                    <div className="p-6">
                                        {/* Duration */}
                                        <div className="flex items-center space-x-2 mb-4 text-gray-600">
                                            <Clock className="w-5 h-5" />
                                            <span className="font-medium">{pkg.duration_days} days access</span>
                                        </div>

                                        {/* Description */}
                                        {pkg.description && (
                                            <div
                                                className="prose prose-sm text-gray-600 mb-6"
                                                dangerouslySetInnerHTML={{ __html: pkg.description }}
                                            />
                                        )}

                                        {/* Features placeholder */}
                                        <ul className="space-y-3 mb-6">
                                            <li className="flex items-center space-x-2 text-gray-700">
                                                <Check className="w-5 h-5 text-green-500" />
                                                <span>Abandoned cart tracking</span>
                                            </li>
                                            <li className="flex items-center space-x-2 text-gray-700">
                                                <Check className="w-5 h-5 text-green-500" />
                                                <span>WhatsApp notifications</span>
                                            </li>
                                            <li className="flex items-center space-x-2 text-gray-700">
                                                <Check className="w-5 h-5 text-green-500" />
                                                <span>Dashboard analytics</span>
                                            </li>
                                        </ul>

                                        {/* Free: Activated | Expired | Activate Free. Paid: Cancel | Activate */}
                                        <div className="relative">
                                            <button
                                                onClick={() => handlePlanAction(pkg)}
                                                disabled={activating === pkg.id || !isEnabled}
                                                className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center space-x-2 ${!isEnabled
                                                    ? 'bg-gray-400 cursor-not-allowed opacity-60'
                                                    : getPlanButtonState(pkg).action === 'cancel'
                                                        ? 'bg-red-500 hover:bg-red-600'
                                                        : pkg.type === 'paid'
                                                            ? 'bg-yellow-500 hover:bg-yellow-600'
                                                            : ''
                                                    } ${activating === pkg.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                style={isEnabled && pkg.type === 'free' ? { backgroundColor: branding.colors.primary } : {}}
                                            >
                                                {activating === pkg.id ? (
                                                    <>
                                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        <span>Processing...</span>
                                                    </>
                                                ) : (
                                                    <span>{getPlanButtonState(pkg).label}</span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
