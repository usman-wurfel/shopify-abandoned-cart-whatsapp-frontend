'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/axios';
import { branding } from '@/config/branding';
import { History, CheckCircle, XCircle, Clock, Package as PackageIcon } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Subscription {
    id: number;
    package_name: string;
    package_description: string | null;
    package_type: 'free' | 'paid';
    package_price: string;
    package_duration_days: number;
    started_at: string;
    expires_at: string;
    status: 'active' | 'expired' | 'cancelled';
    remaining_days: number;
    created_at: string;
}

export default function SubscriptionHistoryPage() {
    const router = useRouter();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        checkAuthAndFetch();
    }, []);

    const checkAuthAndFetch = async () => {
        try {
            const host = typeof window !== 'undefined' ? sessionStorage.getItem('shopify_host') : null;
            const inIframe = typeof window !== 'undefined' && window.self !== window.top;
            const isEmbedded = inIframe || !!host;

            if (isEmbedded) {
                const { waitForAppBridge } = await import('@/lib/sessionTokenForApi');
                const ready = await waitForAppBridge();
                if (!ready) {
                    toast.error('Failed to initialize. Please refresh.');
                    setLoading(false);
                    return;
                }
            } else {
                const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
                if (!token) {
                    router.push('/login');
                    return;
                }
            }

            // Fetch user info
            const userResponse = await apiClient.get('/user');
            const userData = userResponse.data.user || userResponse.data;
            setUser(userData);

            // If admin, redirect to dashboard
            if (userData.role === 'admin') {
                router.push('/');
                return;
            }

            // Fetch subscription history
            await fetchHistory();
        } catch (err: any) {
            console.error('Error:', err);
            if (err.response?.status === 401 || err.response?.status === 403) {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user');
                }
                router.push('/login');
            } else {
                toast.error('Failed to load subscription history');
                setLoading(false);
            }
        }
    };

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/subscription/history');
            setSubscriptions(response.data || []);
        } catch (error: any) {
            console.error('Error fetching history:', error);
            toast.error('Failed to fetch subscription history');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (subscription: Subscription) => {
        if (subscription.status === 'active') {
            return (
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3" />
                    <span>Active</span>
                </span>
            );
        } else if (subscription.status === 'cancelled') {
            return (
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3" />
                    <span>Cancelled</span>
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                    <Clock className="w-3 h-3" />
                    <span>Expired</span>
                </span>
            );
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading subscription history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 p-8" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
            <ToastContainer position="top-right" autoClose={3000} />

            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center space-x-3 mb-2">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: branding.colors.primaryLight }}
                        >
                            <History className="w-6 h-6" style={{ color: branding.colors.primary }} />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Subscription History</h1>
                    </div>
                    <p className="text-gray-600">
                        View all your past and current subscription packages.
                    </p>
                </div>

                {/* History List */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    {subscriptions.length === 0 ? (
                        <div className="text-center py-12">
                            <PackageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">No subscription history found.</p>
                            <button
                                onClick={() => router.push('/select-package')}
                                className="mt-4 px-6 py-2 rounded-lg text-white font-medium"
                                style={{ backgroundColor: branding.colors.primary }}
                            >
                                Choose a Package
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {subscriptions.map((sub) => (
                                <div key={sub.id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900">{sub.package_name}</h3>
                                                {getStatusBadge(sub)}
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${sub.package_type === 'paid'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {sub.package_type === 'paid' ? `$${Number(sub.package_price).toFixed(2)}` : 'Free'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-3">
                                                <div>
                                                    <span className="font-medium text-gray-500">Started:</span>
                                                    <p>{formatDate(sub.started_at)}</p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-500">Expires:</span>
                                                    <p>{formatDate(sub.expires_at)}</p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-500">Duration:</span>
                                                    <p>{sub.package_duration_days} days</p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-500">Remaining:</span>
                                                    <p className={sub.status === 'active' ? 'text-green-600 font-semibold' : ''}>
                                                        {sub.status === 'active' ? `${sub.remaining_days} days` : '-'}
                                                    </p>
                                                </div>
                                            </div>

                                            {sub.package_description && (
                                                <div
                                                    className="mt-3 text-sm text-gray-500 prose prose-sm max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: sub.package_description }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
