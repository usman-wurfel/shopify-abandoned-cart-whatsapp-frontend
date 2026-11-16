'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/axios';
import { branding } from '@/config/branding';
import { ShoppingCart, Mail, Phone, DollarSign, Clock, CheckCircle, Trash2, ExternalLink, Search, Send, AlertCircle, MessageCircle } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTimezone } from '@/contexts/TimezoneContext';

export default function AbandonedCartsPage() {
  const router = useRouter();
  const { formatDate: formatDateInTimezone, timezone } = useTimezone();
  const [carts, setCarts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [deletingCartId, setDeletingCartId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cartToDelete, setCartToDelete] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'queued' | 'sent' | 'failed'>('queued');
  const [queuedCount, setQueuedCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [hasActiveWhatsApp, setHasActiveWhatsApp] = useState(false);
  const [sendingCartId, setSendingCartId] = useState<number | null>(null);
  const [showSentModal, setShowSentModal] = useState(false);
  const [cartToMarkSent, setCartToMarkSent] = useState<any>(null);
  const [markingSent, setMarkingSent] = useState(false);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  useEffect(() => {
    if (user) {
      fetchCarts(1, false, true); // Don't show full page loading, but show table loading
    }
  }, [searchTerm, activeTab]);

  // Update current time every second for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
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

      // Fetch counts for tabs
      await fetchTabCounts();

      // Fetch carts
      await fetchCarts(1);
    } catch (err: any) {
      console.error('Error:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
        }
        router.push('/login');
      } else {
        // Only show toast for non-auth errors (network issues, etc.)
        // Subscription/package errors will be handled by redirect
        toast.error('Failed to load abandoned carts');
        setLoading(false);
      }
    }
  };

  const fetchTabCounts = async () => {
    try {
      // Fetch queued count
      const queuedResponse = await apiClient.get('/abandoned-carts', { 
        params: { status: 'active', per_page: 1 } 
      });
      setQueuedCount(queuedResponse.data.total || 0);

      // Fetch sent count
      const sentResponse = await apiClient.get('/abandoned-carts', { 
        params: { status: 'sent', per_page: 1 } 
      });
      setSentCount(sentResponse.data.total || 0);

      // Fetch failed count
      const failedResponse = await apiClient.get('/abandoned-carts', { 
        params: { status: 'failed', per_page: 1 } 
      });
      setFailedCount(failedResponse.data.total || 0);
    } catch (error: any) {
      // Don't show toast for subscription/package errors - redirect will handle it
      if (error.response?.status === 403 || error.response?.status === 401) {
        // Silently handle - redirect will happen via middleware/guard
        return;
      }
      console.error('Error fetching tab counts:', error);
    }
  };

  const fetchCarts = async (page: number = 1, showPageLoading: boolean = true, showTableLoading: boolean = false) => {
    try {
      if (showPageLoading) {
        setLoading(true);
      }
      if (showTableLoading) {
        setTableLoading(true);
      }
      const params: any = { page, per_page: 20 };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      // Set status based on active tab
      if (activeTab === 'queued') {
        params.status = 'active';
      } else if (activeTab === 'sent') {
        params.status = 'sent';
      } else {
        params.status = 'failed';
      }

      const response = await apiClient.get('/abandoned-carts', { params });
      if (response.data) {
        // Set hasActiveWhatsApp flag
        if (response.data.hasActiveWhatsApp !== undefined) {
          setHasActiveWhatsApp(response.data.hasActiveWhatsApp);
        }
        
        if (response.data.data) {
          // Paginated response
          const cartsData = response.data.data;
          setCarts(cartsData);
          setCurrentPage(response.data.current_page || page);
          setTotalPages(response.data.last_page || 1);
          setTotal(response.data.total || 0);
        } else {
          // Non-paginated response (fallback)
          setCarts(response.data);
          setCurrentPage(1);
          setTotalPages(1);
          setTotal(response.data.length);
        }
      }
    } catch (error: any) {
      // Don't show toast for subscription/package errors - redirect will handle it
      if (error.response?.status === 403 || error.response?.status === 401) {
        // Silently handle - redirect will happen via middleware/guard
        setLoading(false);
        setTableLoading(false);
        return;
      }
      console.error('Error fetching carts:', error);
      toast.error('Failed to fetch abandoned carts');
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const handleDeleteClick = (cart: any) => {
    setCartToDelete(cart);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!cartToDelete) return;
    
    setDeletingCartId(cartToDelete.id);
    setShowDeleteModal(false);
    
    try {
      await apiClient.delete(`/abandoned-carts/${cartToDelete.id}`);
      toast.success('Cart deleted successfully');
      fetchCarts(currentPage, false, true);
      fetchTabCounts(); // Refresh counts
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete cart');
    } finally {
      setDeletingCartId(null);
      setCartToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setCartToDelete(null);
  };

  // Handle manual send via WhatsApp Web
  // Open WhatsApp with pre-filled message
  const handleManualSend = (cart: any) => {
    if (!cart.customer_phone) {
      toast.error('No phone number available for this cart');
      return;
    }

    // Clean phone number - remove spaces, dashes, parentheses
    let phone = cart.customer_phone.replace(/[^0-9+]/g, '');
    // Remove leading + for WhatsApp URL
    phone = phone.replace(/^\+/, '');

    // Build message
    const customerName = cart.customer_name || 'Customer';
    const cartTotal = parseFloat(cart.cart_total || 0).toFixed(2);
    const currency = cart.currency || 'USD';
    const cartUrl = cart.cart_url || '';

    // Default message
    let message = `Hi ${customerName}!\n\n`;
    message += `You left some items in your cart worth ${currency} ${cartTotal}.\n\n`;
    if (cartUrl) {
      message += `Complete your purchase here: ${cartUrl}\n\n`;
    }
    message += `Let us know if you have any questions!`;

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);

    // Generate WhatsApp API URL (works better than wa.me)
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;

    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank');
  };

  // Mark cart as sent manually
  const handleMarkAsSent = async () => {
    if (!cartToMarkSent) return;
    
    setMarkingSent(true);
    try {
      await apiClient.post(`/abandoned-carts/${cartToMarkSent.id}/mark-sent`);
      toast.success('Cart marked as sent!');
      setShowSentModal(false);
      setCartToMarkSent(null);
      fetchCarts(currentPage, false, true);
      fetchTabCounts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to mark as sent');
    } finally {
      setMarkingSent(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return formatDateInTimezone(dateString);
  };

  const calculateRemainingTime = (sendingAt: string, isActive: boolean = true, cartTimezone?: string): string => {
    if (!sendingAt) return '';
    
    // Use customer timezone from context, or cart's timezone, or default to UTC
    const targetTimezone = cartTimezone || timezone || 'UTC';
    
    // Parse the sending_at timestamp - backend sends in UTC (ISO 8601)
    let sendTime: Date;
    try {
      // Parse as UTC (backend always sends UTC)
      if (sendingAt.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        // Format without timezone - treat as UTC
        sendTime = new Date(sendingAt.replace(' ', 'T') + 'Z');
      } else if (sendingAt.includes('T') && sendingAt.includes('Z')) {
        // ISO 8601 with Z (UTC) - parse directly
        sendTime = new Date(sendingAt);
      } else if (sendingAt.includes('T') && !sendingAt.includes('Z') && !sendingAt.includes('+') && !sendingAt.includes('-', 10)) {
        // ISO 8601 without timezone - treat as UTC
        sendTime = new Date(sendingAt + 'Z');
      } else {
        // Try parsing as ISO string (should have timezone)
        sendTime = new Date(sendingAt);
      }
      
      if (isNaN(sendTime.getTime())) {
        console.error('Invalid date:', sendingAt);
        return 'Invalid date';
      }
    } catch (e) {
      console.error('Date parsing error:', e, sendingAt);
      return 'Invalid date';
    }
    
    // Get current time in customer's timezone
    const now = currentTime;
    
    // Calculate difference in milliseconds
    const diff = sendTime.getTime() - now.getTime();
    
    // If time has passed (more than 2 seconds ago)
    if (diff <= -2000) {
      // After 2 seconds, show "Sent!"
      return 'Sent!';
    } else if (diff <= 0) {
      // Within last 2 seconds - show "Sending now..."
      return 'Sending now...';
    }
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    // Short format: 1d, 23h or 1d
    if (days > 0) {
      const remainingHours = hours % 24;
      if (remainingHours > 0) {
        return `${days} d, ${remainingHours} h`;
      }
      return `${days} d`;
    } 
    // Short format: 1hr, 30m or 1hr
    else if (hours > 0) {
      const remainingMinutes = minutes % 60;
      if (remainingMinutes > 0 && hours < 5) {
        return `${hours} hr, ${remainingMinutes} m`;
      }
      return `${hours} hr`;
    } 
    // Short format: 1m, 30sec or 1m
    else if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      if (remainingSeconds > 0 && minutes < 5) {
        return `${minutes} m, ${remainingSeconds} sec`;
      }
      return `${minutes} m`;
    } 
    // Short format: 32sec
    else {
      return `${seconds} sec`;
    }
  };

  if (loading && carts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading abandoned carts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 p-8" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <ShoppingCart className="w-8 h-8" style={{ color: branding.colors.primary }} />
                <h1 className="text-3xl font-bold text-gray-900">Abandoned Carts</h1>
              </div>
              <p className="text-gray-600">
                {user?.role === 'admin' 
                  ? 'View and manage all abandoned shopping carts' 
                  : 'View your abandoned shopping carts'}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg w-fit mb-4">
            <button
              onClick={() => {
                setActiveTab('queued');
                setCurrentPage(1);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'queued'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Queued</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'queued'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {queuedCount}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab('sent');
                setCurrentPage(1);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'sent'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Sent</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'sent'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {sentCount}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab('failed');
                setCurrentPage(1);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'failed'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              <span>Failed</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'failed'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {failedCount}
              </span>
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={activeTab === 'queued' ? "Search queued carts..." : activeTab === 'sent' ? "Search sent carts..." : "Search failed carts..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {tableLoading ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading...</p>
          </div>
        ) : carts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            {activeTab === 'queued' ? (
              <>
                <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Queued Carts</h3>
                <p className="text-gray-500">Carts waiting to be sent will appear here.</p>
              </>
            ) : activeTab === 'sent' ? (
              <>
                <Send className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Sent Reminders</h3>
                <p className="text-gray-500">Carts with sent reminders will appear here.</p>
              </>
            ) : (
              <>
                <AlertCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Failed Reminders</h3>
                <p className="text-gray-500">Failed reminders will appear here.</p>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {user?.role === 'admin' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeTab === 'queued' 
                        ? (hasActiveWhatsApp ? 'Sending In' : 'Mode') 
                        : activeTab === 'sent' ? 'Sent At' : 'Failed At'}
                    </th>
                    {activeTab === 'failed' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {carts.map((cart) => (
                    <tr key={cart.id} className="hover:bg-gray-50">
                      {user?.role === 'admin' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {cart.customer?.business_name || cart.customer?.shop_domain || 'N/A'}
                          </div>
                          {cart.customer?.user?.name && (
                            <div className="text-xs text-gray-500 mt-1">
                              Owner: {cart.customer.user.name}
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {cart.customer_name || cart.customer?.user?.name || 'Guest Customer'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {cart.customer_email && (
                            <div className="flex items-center space-x-1 mb-1">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="truncate max-w-[200px]">{cart.customer_email}</span>
                            </div>
                          )}
                          {cart.customer_phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{cart.customer_phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {parseFloat(cart.cart_total || 0) > 0 
                            ? formatCurrency(parseFloat(cart.cart_total || 0), cart.currency || 'USD')
                            : 'Free'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {(() => {
                            try {
                              const lineItems = cart.line_items ? (typeof cart.line_items === 'string' ? JSON.parse(cart.line_items) : cart.line_items) : [];
                              return Array.isArray(lineItems) ? lineItems.length : 0;
                            } catch (e) {
                              return 0;
                            }
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {activeTab === 'queued' ? (
                            // Queued tab - show countdown only if WhatsApp is configured
                            hasActiveWhatsApp && cart.sending_at ? (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center space-x-1 w-fit">
                                <Clock className="w-3 h-3" />
                                <span>{calculateRemainingTime(cart.sending_at, cart.is_active, cart.timezone || cart.sending_at_timezone)}</span>
                              </span>
                            ) : !hasActiveWhatsApp ? (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center space-x-1 w-fit">
                                <MessageCircle className="w-3 h-3" />
                                <span>Manual</span>
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )
                          ) : activeTab === 'sent' ? (
                            // Sent tab - show sent date
                            cart.last_reminder_sent_at ? (
                              <span className="text-sm text-gray-600">
                                {formatDate(cart.last_reminder_sent_at)}
                              </span>
                            ) : cart.abandoned_at ? (
                              <span className="text-sm text-gray-600">
                                {formatDate(cart.abandoned_at)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )
                          ) : (
                            // Failed tab - show failed date
                            cart.last_reminder_sent_at ? (
                              <span className="text-sm text-gray-600">
                                {formatDate(cart.last_reminder_sent_at)}
                              </span>
                            ) : cart.updated_at ? (
                              <span className="text-sm text-gray-600">
                                {formatDate(cart.updated_at)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )
                          )}
                        </div>
                      </td>
                      {activeTab === 'failed' && (
                        <td className="px-6 py-4">
                          <div className="text-sm text-red-600 max-w-xs">
                            {cart.error_message ? (
                              <span className="line-clamp-2" title={cart.error_message}>
                                {cart.error_message}
                              </span>
                            ) : (
                              <span className="text-gray-400">No error details</span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {/* Manual Send via WhatsApp Web - show for queued carts */}
                          {activeTab === 'queued' && cart.customer_phone && user?.role !== 'admin' && (
                            <button
                              onClick={() => handleManualSend(cart)}
                              className="text-green-600 hover:text-green-800"
                              title="Open WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}
                          {/* Mark as Sent button - show for queued carts */}
                          {activeTab === 'queued' && user?.role !== 'admin' && (
                            <button
                              onClick={() => {
                                setCartToMarkSent(cart);
                                setShowSentModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                              title="Mark as Sent"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {cart.cart_url && (
                            <a
                              href={cart.cart_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                              title="View Cart"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {user?.role !== 'admin' && (
                            <button
                              onClick={() => handleDeleteClick(cart)}
                              disabled={deletingCartId === cart.id}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete Cart"
                            >
                              {deletingCartId === cart.id ? (
                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!tableLoading && carts.length > 0 && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * 20 + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * 20, total)}</span> of{' '}
              <span className="font-medium">{total}</span> carts
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  if (currentPage > 1) {
                    setCurrentPage(currentPage - 1);
                    fetchCarts(currentPage - 1, false, true);
                  }
                }}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => {
                        setCurrentPage(pageNum);
                        fetchCarts(pageNum, false, true);
                      }}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'text-white font-medium'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      style={
                        currentPage === pageNum
                          ? { backgroundColor: branding.colors.primary }
                          : {}
                      }
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  if (currentPage < totalPages) {
                    setCurrentPage(currentPage + 1);
                    fetchCarts(currentPage + 1, false, true);
                  }
                }}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Abandoned Cart</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-700 mb-2">
                  Are you sure you want to delete this abandoned cart?
                </p>
                {cartToDelete && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="font-medium text-gray-900">
                      {cartToDelete.customer_name || 'Guest Customer'}
                    </div>
                    <div className="text-gray-600">
                      {formatCurrency(parseFloat(cartToDelete.cart_total || 0), cartToDelete.currency || 'USD')}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deletingCartId !== null}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {deletingCartId !== null ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Sent Confirmation Modal */}
      {showSentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Mark as Sent</h3>
                  <p className="text-sm text-gray-500">Confirm message was sent via WhatsApp</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-700 mb-2">
                  Did you send the WhatsApp message to this customer?
                </p>
                {cartToMarkSent && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="font-medium text-gray-900">
                      {cartToMarkSent.customer_name || 'Guest Customer'}
                    </div>
                    <div className="text-gray-600">
                      {cartToMarkSent.customer_phone}
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      Cart: {formatCurrency(parseFloat(cartToMarkSent.cart_total || 0), cartToMarkSent.currency || 'USD')}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowSentModal(false);
                    setCartToMarkSent(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkAsSent}
                  disabled={markingSent}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {markingSent ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Marking...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Yes, Mark as Sent</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
