'use client';

import { useEffect, useState, useRef } from 'react';
import apiClient from '@/lib/axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { branding } from '@/config/branding';
import { getBaseUrl } from '@/lib/config';
import { Store, CheckCircle, XCircle, ShoppingCart, MessageSquare, FileText, BarChart3, Clock, Mail, Send, User, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Home() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [storeOwners, setStoreOwners] = useState<any[]>([]);
  const [togglingStatus, setTogglingStatus] = useState<{ [key: number]: boolean }>({});
  const [graphPeriod, setGraphPeriod] = useState<'last7Days' | 'lastMonth' | 'lastYear'>('last7Days');
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [hideWhatsAppAlert, setHideWhatsAppAlert] = useState(false);
  const initStarted = useRef(false); // Prevent double initialization

  // Check if WhatsApp alert was dismissed (shop-specific)
  useEffect(() => {
    if (typeof window !== 'undefined' && dashboardData?.customer?.shop_domain) {
      const shopDomain = dashboardData.customer.shop_domain;
      const dismissed = localStorage.getItem(`whatsapp_alert_dismissed_${shopDomain}`);
      if (dismissed === 'true') {
        setHideWhatsAppAlert(true);
      }
    }
  }, [dashboardData?.customer?.shop_domain]);

  useEffect(() => {
    // Prevent double initialization (React re-renders, HMR, etc.)
    if (initStarted.current) {
      console.log('[Dashboard] Init already started, skipping');
      return;
    }
    initStarted.current = true;
    
    let mounted = true;
    const handleOAuthAndFetch = async () => {
      try {
        // Check if coming from Shopify OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const shop = urlParams.get('shop');
        const token = urlParams.get('token');

        if (shop && token) {
          // Store token from OAuth callback
          localStorage.setItem('auth_token', token);
          console.log('[OAuth] Token stored from callback:', { shop });

          // Clear WhatsApp alert dismissal on fresh OAuth (app install/reinstall)
          localStorage.removeItem(`whatsapp_alert_dismissed_${shop}`);

          // Small delay to ensure localStorage is synced
          await new Promise(resolve => setTimeout(resolve, 200));

          // Check auth FIRST, before cleaning URL
          // If this fails with 401, axios interceptor will see the URL params and skipping redirect
          if (mounted) {
            await checkAuthAndFetch(true);
          }
        } else {
          // Normal load
          if (mounted) {
            await checkAuthAndFetch(false);
          }
        }
      } catch (error) {
        console.error('Error in handleOAuthAndFetch:', error);
        if (mounted) {
          setError('Failed to initialize dashboard. Please refresh the page.');
          setLoading(false);
        }
      }
    };

    handleOAuthAndFetch();
    
    return () => {
      mounted = false;
    };
  }, []);

  const checkAuthAndFetch = async (cleanUrl = false) => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('token'); // OAuth callback token in URL
      const host = urlParams.get('host') || (typeof window !== 'undefined' ? sessionStorage.getItem('shopify_host') : null);
      const inIframe = window.self !== window.top;
      const isShopifyEmbedded = inIframe || host;

      // Don't redirect to OAuth if we just came from OAuth (has token param but localStorage empty)
      if (tokenParam) {
        console.log('[Dashboard] Waiting for OAuth callback to complete...');
        setLoading(false);
        return;
      }

      // EMBEDDED MODE: Don't check localStorage token - use session token via axios interceptor
      // API calls will automatically use session token from App Bridge
      // Backend will auto-create customer if valid session token is received
      // NEVER redirect to OAuth when embedded - it causes loops and is blocked!
      if (isShopifyEmbedded) {
        console.log('[Dashboard] Embedded mode - waiting for App Bridge, then using session token');
        // Wait for App Bridge to be ready before making API calls
        const { waitForAppBridge } = await import('@/lib/sessionTokenForApi');
        const ready = await waitForAppBridge();
        if (!ready) {
          console.error('[Dashboard] App Bridge not ready after timeout');
          setError('Failed to initialize Shopify connection. Please refresh the page.');
          setLoading(false);
          return;
        }
        console.log('[Dashboard] App Bridge ready - proceeding with API calls');
      } else {
        // STANDALONE MODE: Check localStorage token
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (!token) {
          router.push('/login');
          setLoading(false);
          return;
        }
      }

      // Fetch user info
      const userResponse = await apiClient.get('/user');

      // If we need to clean URL (successful OAuth flow), do it now
      // But only if not in Shopify embedded app (to preserve host parameter)
      if (cleanUrl) {
        const urlParams = new URLSearchParams(window.location.search);
        const isShopifyEmbedded = urlParams.has('host');
        
        if (!isShopifyEmbedded) {
          window.history.replaceState({}, '', '/');
        } else {
          // In embedded app, only remove shop and token, keep host
          const newParams = new URLSearchParams();
          if (urlParams.has('host')) {
            newParams.set('host', urlParams.get('host')!);
          }
          const newUrl = newParams.toString() ? `/?${newParams.toString()}` : '/';
          window.history.replaceState({}, '', newUrl);
        }
      }

      const userData = userResponse.data.user || userResponse.data;
      setUser(userData);

      // Notify sidebar that user is updated
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('profile-updated'));
      }

      // If customer, SubscriptionGuard handles redirect to select-package when no subscription.
      // We only fetch dashboard data here – no duplicate redirect (avoids multiple reloads).
      if (userData.role === 'customer') {
        // Fetch current subscription for display (SubscriptionGuard already checks and redirects if needed)
        try {
          const currentSubResponse = await apiClient.get('/subscription/current');
          if (currentSubResponse.data.has_active) {
            setSubscriptionData(currentSubResponse.data.subscription);
          }
        } catch (_) {}

        const response = await apiClient.get('/customer/dashboard');
        setDashboardData(response.data);
      } else {
        // Admin - fetch admin dashboard data
        const response = await apiClient.get('/dashboard');
        setDashboardData(response.data);

        // Set store owners from response
        if (response.data.storeOwners) {
          setStoreOwners(response.data.storeOwners);
        }
      }
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          
          // Check if we're in Shopify embedded mode
          const urlParams = new URLSearchParams(window.location.search);
          const isShopifyEmbedded = urlParams.has('host') || window.self !== window.top;
          
          if (!isShopifyEmbedded) {
            router.push('/login');
          } else {
            // In Shopify embedded mode, show error instead of redirecting
            setError('Session expired. Please reload the app from Shopify admin.');
            setLoading(false);
          }
        }
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load dashboard');
        setLoading(false);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold text-lg mb-2">Error loading dashboard</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-blue-800 font-semibold text-lg mb-2">No data available</h2>
            <p className="text-blue-600">Please configure your settings to get started.</p>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = dashboardData?.role === 'admin' || user?.role === 'admin';

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

  const toggleActiveStatus = async (customerId: number, currentStatus: boolean) => {
    setTogglingStatus(prev => ({ ...prev, [customerId]: true }));
    try {
      const response = await apiClient.post(`/customers/${customerId}/toggle-active`);
      if (response.data.success) {
        setStoreOwners(storeOwners.map(c =>
          c.id === customerId
            ? { ...c, is_active: !currentStatus }
            : c
        ));
      }
    } catch (error: any) {
      console.error('Failed to update customer status:', error);
    } finally {
      setTogglingStatus(prev => ({ ...prev, [customerId]: false }));
    }
  };

  // Customer Dashboard Stats
  const customerStats = !isAdmin ? [
    {
      name: 'Total Carts',
      value: dashboardData.totalCarts || 0,
      icon: <ShoppingCart className="w-7 h-7" />,
      color: branding.colors.primary,
      link: '/abandoned-carts',
    },
    {
      name: 'Queued',
      value: dashboardData.queued || 0,
      icon: <Clock className="w-7 h-7" />,
      color: '#fbbf24',
      link: '/abandoned-carts',
    },
    {
      name: 'Total Sent',
      // Total sent = total carts - queued (active) carts
      value: Math.max(0, (dashboardData.totalCarts || 0) - (dashboardData.queued || 0)),
      icon: <Mail className="w-7 h-7" />,
      color: branding.colors.accent,
      link: '/abandoned-carts',
    },
    {
      name: "Today's Sent",
      value: dashboardData.todaysSent || 0,
      icon: <Send className="w-7 h-7" />,
      color: '#10b981', // different from Total Sent for better contrast
      link: '/abandoned-carts',
    },
  ] : [];

  // Admin Dashboard Stats (overall view)
  const adminStats = isAdmin ? [
    {
      name: 'Total Carts',
      value: dashboardData.totalCarts || 0,
      icon: <ShoppingCart className="w-7 h-7" />,
      color: branding.colors.primary,
      link: '/abandoned-carts',
      tooltip: 'All carts across all stores',
    },
    {
      name: 'Queued Carts',
      value: dashboardData.queuedCarts || dashboardData.activeCarts || 0,
      icon: <Clock className="w-7 h-7" />,
      color: '#fbbf24',
      link: '/abandoned-carts',
      tooltip: 'Active carts (not recovered) across all stores',
    },
    {
      name: 'Total Reminders Sent',
      value: dashboardData.sentReminders || 0,
      icon: <Mail className="w-7 h-7" />,
      color: branding.colors.accent,
      link: '/message-templates',
      tooltip: 'All reminders sent across all stores',
    },
    {
      name: 'Today Sent',
      value: dashboardData.todaysSent || 0,
      icon: <Send className="w-7 h-7" />,
      color: '#10b981',
      link: '/message-templates',
      tooltip: 'Reminders sent today (all stores)',
    },
    {
      name: 'Total Customers',
      value: dashboardData.totalCustomers ?? (storeOwners?.length || 0),
      icon: <Store className="w-7 h-7" />,
      color: branding.colors.primaryDark || '#2563eb',
      link: '/customers',
      tooltip: 'Total store owners onboarded',
    },
    {
      name: 'Active Customers',
      value: dashboardData.activeCustomers || 0,
      icon: <Users className="w-7 h-7" />,
      color: '#10b981',
      link: '/customers',
      tooltip: 'Active store owners onboarded',
    },
    {
      name: 'Paid Customers',
      value: dashboardData.paidCustomers || 0,
      icon: <User className="w-7 h-7" />,
      color: '#8b5cf6',
      link: '/admin/subscriptions',
      tooltip: 'Customers who purchased paid packages',
    },
    {
      name: 'Total Earnings',
      value: `$${Number(dashboardData.totalEarnings || 0).toFixed(2)}`,
      icon: <BarChart3 className="w-7 h-7" />,
      color: '#f59e0b',
      link: '/admin/subscriptions',
      tooltip: 'Total revenue from paid subscriptions',
    },
  ] : [];

  const stats = isAdmin ? adminStats : customerStats;

  return (
    <div className="bg-gradient-to-br from-gray-50" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* WhatsApp Configuration Alert */}
        {!isAdmin && dashboardData?.hasActiveWhatsApp === false && !hideWhatsAppAlert && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">WhatsApp API Not Configured</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Configure API for automated messages, or send manually without setup.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                <button
                  onClick={() => {
                    const shopDomain = dashboardData?.customer?.shop_domain;
                    if (shopDomain) {
                      localStorage.setItem(`whatsapp_alert_dismissed_${shopDomain}`, 'true');
                    }
                    setHideWhatsAppAlert(true);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Don't show again
                </button>
                <Link
                  href="/whatsapp-configs"
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm"
                >
                  Configure
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Info - Show for customers */}
        {/* Subscription Info - Show for customers */}
        {!isAdmin && subscriptionData && (
          <div className="mb-8 relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl group">
            {/* Background Gradient & Decoration */}
            <div
              className="absolute inset-0 z-0"
              style={{
                background: `linear-gradient(135deg, ${branding.colors.primary}, ${branding.colors.primaryDark})`,
                opacity: 0.95
              }}
            ></div>
            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white opacity-10 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-white opacity-10 blur-2xl"></div>

            <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between text-white">
              {/* Left Side: Package Info */}
              <div className="flex items-center space-x-6 mb-6 md:mb-0 w-full md:w-auto">
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-inner">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-transparent shadow-sm animate-pulse"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-white mb-1">
                    {subscriptionData.package_name}
                  </h3>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md border border-white/20"
                      >
                        {subscriptionData.package_duration_days ? `${subscriptionData.package_duration_days} days` : subscriptionData.package_type === 'free' ? 'Free Plan' : 'Paid Plan'}
                      </span>
                    </div>
                    {subscriptionData.expires_at && (
                      <p className="text-xs text-white/70">
                        Expires: {new Date(subscriptionData.expires_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Progress & Action */}
              <div className="flex items-center justify-between md:justify-end w-full md:w-auto space-x-8">
                {/* Days Remaining Circular Progress */}
                <div className="text-center">
                  <div className="relative h-16 w-16 flex items-center justify-center">
                    <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                      {/* Background Circle */}
                      <path
                        className="text-white/20"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      {/* Progress Circle */}
                      <path
                        className="text-white drop-shadow-md"
                        strokeDasharray={`${Math.min(100, (subscriptionData.remaining_days / 30) * 100)}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-xl font-bold text-white">
                      {subscriptionData.remaining_days}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 mt-1 font-medium">Days Left</p>
                </div>

                {/* Vertical Divider */}
                <div className="h-12 w-px bg-white/20 hidden md:block"></div>

                {/* Action Button */}
                {subscriptionData.remaining_days < 2 ? (
                  <Link
                    href="/select-package"
                    className="group relative inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-gray-900 transition-all duration-200 bg-white font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 hover:bg-gray-50 hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <span>Renew Now</span>
                    <svg className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                ) : (
                  <Link
                    href="/select-package"
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors border border-white/20 backdrop-blur-sm"
                  >
                    View Plans
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3 xl:grid-cols-4'} gap-6 mb-8`}>
          {stats.map((stat, index) => (
            <Link
              key={index}
              href={stat.link}
              className="block transform transition-all duration-200 hover:scale-105"
              title={(stat as any).tooltip || stat.name}
            >
              <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden">
                <div className="p-4 text-white" style={{ backgroundColor: stat.color }}>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl text-white">{stat.icon}</span>
                    <div className="text-right">
                      <p className="text-3xl font-bold">{stat.value}</p>
                      <p className="text-sm opacity-90">{stat.name}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Graph Section (admin = overall, customer = personal) */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isAdmin ? 'Overall Reminders Sent Analysis' : 'Reminders Sent Analysis'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {isAdmin ? 'All stores combined' : 'Your store data'}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setGraphPeriod('last7Days')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${graphPeriod === 'last7Days'
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
                style={graphPeriod === 'last7Days' ? { backgroundColor: branding.colors.primary } : {}}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setGraphPeriod('lastMonth')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${graphPeriod === 'lastMonth'
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
                style={graphPeriod === 'lastMonth' ? { backgroundColor: branding.colors.primary } : {}}
              >
                Last Month
              </button>
              <button
                onClick={() => setGraphPeriod('lastYear')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${graphPeriod === 'lastYear'
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
                style={graphPeriod === 'lastYear' ? { backgroundColor: branding.colors.primary } : {}}
              >
                Last Year
              </button>
            </div>
          </div>
          <div className="h-80 w-full">
            {(() => {
              const graphData = dashboardData?.graphData || {
                last7Days: [],
                lastMonth: [],
                lastYear: []
              };

              // Get data based on selected period
              let chartData: any[] = [];
              let xAxisKey = 'label';

              if (graphPeriod === 'last7Days') {
                chartData = graphData.last7Days || [];
              } else if (graphPeriod === 'lastMonth') {
                chartData = graphData.lastMonth || [];
              } else if (graphPeriod === 'lastYear') {
                chartData = graphData.lastYear || [];
              }

              // If no data, show empty chart
              if (!chartData || chartData.length === 0) {
                chartData = [{ label: 'No Data', value: 0 }];
              }

              return (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey={xAxisKey}
                      stroke="#6b7280"
                      style={{ fontSize: '12px', fontWeight: '500' }}
                      tick={{ fill: '#6b7280' }}
                      angle={graphPeriod === 'lastMonth' ? -45 : 0}
                      textAnchor={graphPeriod === 'lastMonth' ? 'end' : 'middle'}
                      height={graphPeriod === 'lastMonth' ? 80 : 30}
                    />
                    <YAxis
                      stroke="#6b7280"
                      style={{ fontSize: '13px' }}
                      tick={{ fill: '#6b7280' }}
                      label={{
                        value: 'Reminders Sent',
                        angle: -90,
                        position: 'insideLeft',
                        style: {
                          fontSize: '13px',
                          fill: '#6b7280',
                          fontWeight: '500'
                        }
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: any) => [`${value} Reminders`, '']}
                      labelStyle={{ fontWeight: '600', marginBottom: '4px' }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={branding.colors.primary || '#3b82f6'}
                      strokeWidth={3}
                      dot={{ fill: branding.colors.primary || '#3b82f6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 7, stroke: branding.colors.primary || '#3b82f6', strokeWidth: 2 }}
                      name="Reminders Sent"
                    />
                  </LineChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </div>

        {/* Recent Sent (customer view only) */}
        {!isAdmin && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Sent</h2>
            <div className="space-y-4">
              {dashboardData.recentSent && dashboardData.recentSent.length > 0 ? (
                dashboardData.recentSent.map((item: any, index: number) => (
                  <div key={index} className="flex items-center space-x-3 p-3 rounded-lg" style={{ backgroundColor: branding.colors.primaryLight }}>
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: branding.colors.primary }}>
                        <span className="text-white">✉️</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.customer_name || 'Unknown Customer'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.customer_phone || 'No Phone'} • {item.total_items || 0} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {item.currency || '$'}{item.price || '0.00'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.sent_at ? new Date(item.sent_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No recent sent reminders</p>
              )}
            </div>
          </div>
        )}

        {/* Admin Dashboard - Store Owners */}
        {isAdmin && storeOwners.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Store Owners</h2>
              <Link
                href="/customers"
                className="text-sm font-medium"
                style={{ color: branding.colors.primary }}
              >
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {storeOwners.map((owner) => {
                const shopUrl = getShopUrl(owner.shop_domain);
                return (
                  <div
                    key={owner.id}
                    className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-4"
                  >
                    {/* Store Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: branding.colors.primaryLight }}
                        >
                          <Store className="w-5 h-5" style={{ color: branding.colors.primary }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {shopUrl ? (
                            <a
                              href={shopUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-semibold text-blue-700 hover:underline truncate block"
                            >
                              {owner.business_name || owner.shop_domain || 'No Store Name'}
                            </a>
                          ) : (
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {owner.business_name || owner.shop_domain || 'No Store Name'}
                            </p>
                          )}
                          {owner.shop_domain && (
                            <p className="text-xs text-gray-500 truncate">{owner.shop_domain}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleActiveStatus(owner.id, owner.is_active)}
                        disabled={togglingStatus[owner.id]}
                        className={`px-2 py-1 rounded-full text-xs font-medium transition-colors flex items-center space-x-1 flex-shrink-0 ${owner.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                      >
                        {togglingStatus[owner.id] ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                            <span>...</span>
                          </>
                        ) : (
                          <>
                            {owner.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            <span>{owner.is_active ? 'Active' : 'Inactive'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* User Info */}
                    {owner.user && (
                      <div className="space-y-1 mb-3">
                        <p className="text-xs text-gray-600 truncate">
                          <span className="font-medium">Name:</span> {owner.user.name}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          <span className="font-medium">Email:</span> {owner.user.email}
                        </p>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center space-x-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-1">
                        <ShoppingCart className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-600">{owner.total_carts || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-600">{owner.sent_reminders || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-600">{owner.total_reminders || 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Admin - Recent Activity */}
        {isAdmin && dashboardData.recentCarts && dashboardData.recentCarts.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {dashboardData.recentCarts.slice(0, 5).map((cart: any, index: number) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg" style={{ backgroundColor: branding.colors.primaryLight }}>
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: branding.colors.primary }}>
                      <span className="text-white">🛒</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Cart #{cart.id}
                    </p>
                    <p className="text-xs text-gray-500">
                      {cart.customer_name || 'Unknown Customer'}
                      {cart.customer && cart.customer.user && ` • ${cart.customer.user.name}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {cart.currency || '$'}{cart.cart_total || '0.00'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
