'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/axios';
import { branding } from '@/config/branding';
import { Package, Search } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function AdminSubscriptionsPage() {
    const router = useRouter();
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 10
    });

    const fetchSubscriptions = async (page = 1, search = '') => {
        try {
            setLoading(true);
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

            const response = await apiClient.get('/admin/subscriptions', {
                params: { page, search }
            });

            if (response.data.data) {
                setSubscriptions(response.data.data);
                setPagination({
                    current_page: response.data.current_page,
                    last_page: response.data.last_page,
                    total: response.data.total,
                    per_page: response.data.per_page
                });
            }
        } catch (error: any) {
            console.error('Error fetching subscriptions:', error);
            if (error.response && error.response.status === 403) {
                router.push('/');
            } else {
                toast.error('Failed to load subscriptions');
            }
        } finally {
            setLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchSubscriptions(1, searchTerm);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.last_page) {
            fetchSubscriptions(newPage, searchTerm);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-700 border-green-200';
            case 'expired': return 'bg-red-100 text-red-700 border-red-200';
            case 'cancelled': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    const getShopUrl = (shopDomain: string | null) => {
        if (!shopDomain) return null;
        if (shopDomain.startsWith('http://') || shopDomain.startsWith('https://')) {
            return shopDomain;
        }
        if (!shopDomain.includes('.myshopify.com')) {
            return `https://${shopDomain}.myshopify.com`;
        }
        return `https://${shopDomain}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading subscriptions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-gray-50 min-h-screen" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
            <div className="p-6 md:p-8 max-w-7xl mx-auto">
                <ToastContainer position="top-right" autoClose={3000} />

                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Package className="w-8 h-8 text-primary" style={{ color: branding.colors.primary }} />
                            Customer Subscriptions
                        </h1>
                        <p className="text-gray-500 mt-1">Manage and view all customer subscription details</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search customer or package..."
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none w-64 transition-all focus:w-72"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Customer</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Store</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Package</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Price</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Started</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Expires</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {subscriptions.length > 0 ? (
                                    subscriptions.map((sub) => (
                                        <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                                                        {(sub.customer_name || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{sub.customer_name}</p>
                                                        <p className="text-xs text-gray-500">{sub.customer_email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {sub.shop_domain ? (
                                                    <a
                                                        href={getShopUrl(sub.shop_domain) || '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                                    >
                                                        {sub.business_name || sub.shop_domain}
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{sub.package_name}</div>
                                                <div className="text-xs text-gray-500 capitalize">{sub.package_type}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {sub.package_type === 'free' ? 'Free' : `$${Number(sub.package_price).toFixed(2)}`}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {new Date(sub.started_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-gray-900">{new Date(sub.expires_at).toLocaleDateString()}</span>
                                                    {sub.remaining_days > 0 ? (
                                                        <span className="text-xs text-blue-600 font-medium">
                                                            {sub.remaining_days} days left
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">Expired</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(sub.status)}`}>
                                                    {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <Package className="h-12 w-12 text-gray-300 mb-3" />
                                                <p className="text-lg font-medium">No subscriptions found</p>
                                                <p className="text-sm">Try adjusting your search terms</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {pagination.total > 0 && (
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                            <p className="text-sm text-gray-700">
                                Showing <span className="font-medium">{(pagination.current_page - 1) * pagination.per_page + 1}</span> to <span className="font-medium">{Math.min(pagination.current_page * pagination.per_page, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> results
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handlePageChange(pagination.current_page - 1)}
                                    disabled={pagination.current_page === 1}
                                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => handlePageChange(pagination.current_page + 1)}
                                    disabled={pagination.current_page === pagination.last_page}
                                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
