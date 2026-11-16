'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/axios';
import { branding } from '@/config/branding';
import { Store, Mail, Phone, MapPin, ShoppingCart, MessageSquare, CheckCircle, XCircle, Users, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [updatingCustomerId, setUpdatingCustomerId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

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

      // Check if user is admin
      if (userData.role !== 'admin') {
        toast.error('Admin access required');
        router.push('/');
        return;
      }

      // Fetch customers
      await fetchCustomers(1);
    } catch (err: any) {
      console.error('Error:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
        }
        router.push('/login');
      } else {
        toast.error('Failed to load customers');
        setLoading(false);
      }
    }
  };

  const fetchCustomers = async (page: number = 1) => {
    try {
      const response = await apiClient.get(`/customers?page=${page}&per_page=6`);
      if (response.data) {
        if (response.data.data) {
          // Paginated response
          setCustomers(response.data.data);
          setCurrentPage(response.data.current_page || page);
          setTotalPages(response.data.last_page || 1);
          setTotal(response.data.total || 0);
        } else {
          // Non-paginated response (fallback)
          setCustomers(response.data);
          setCurrentPage(1);
          setTotalPages(1);
          setTotal(response.data.length);
        }
      }
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const toggleActiveStatus = async (customerId: number, currentStatus: boolean) => {
    setUpdatingCustomerId(customerId);
    try {
      const response = await apiClient.post(`/customers/${customerId}/toggle-active`);
      if (response.data.success) {
        toast.success(response.data.message);
        // Update local state
        setCustomers(customers.map(c => 
          c.id === customerId 
            ? { ...c, is_active: !currentStatus }
            : c
        ));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update customer status');
    } finally {
      setUpdatingCustomerId(null);
    }
  };

  // Generate Shopify store URL from shop domain
  const getShopUrl = (shopDomain: string | null) => {
    if (!shopDomain) return null;
    // If already contains https://, return as is, otherwise add it
    if (shopDomain.startsWith('http://') || shopDomain.startsWith('https://')) {
      return shopDomain;
    }
    // If domain doesn't contain .myshopify.com, add it
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
          <p className="mt-4 text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 p-8" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Users className="w-8 h-8" style={{ color: branding.colors.primary }} />
            <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          </div>
          <p className="text-gray-600">Manage all Shopify store customers and their information</p>
        </div>

        {/* Customers Grid */}
        {customers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Store className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Customers Yet</h3>
            <p className="text-gray-500">Customers will appear here once they install your Shopify app.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6"
              >
                {/* Store Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: branding.colors.primaryLight }}
                    >
                      <Store className="w-6 h-6" style={{ color: branding.colors.primary }} />
                    </div>
                    <div>
                      {customer.shop_domain ? (
                        <a
                          href={getShopUrl(customer.shop_domain) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[200px] block"
                        >
                          {customer.business_name || customer.shop_domain || 'Store'}
                        </a>
                      ) : customer.business_name ? (
                        <h3 className="text-lg font-semibold text-gray-900 truncate max-w-[200px]">
                          {customer.business_name}
                        </h3>
                      ) : (
                        <h3 className="text-lg font-semibold text-gray-900 truncate max-w-[200px]">
                          {customer.name || 'No Store Name'}
                        </h3>
                      )}
                      <p className="text-sm text-gray-500">{customer.name}</p>
                      {customer.shop_domain && (
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">{customer.shop_domain}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActiveStatus(customer.id, customer.is_active)}
                    disabled={updatingCustomerId === customer.id}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      customer.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    } ${updatingCustomerId === customer.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {updatingCustomerId === customer.id ? (
                      <span className="flex items-center space-x-1">
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        <span>Updating...</span>
                      </span>
                    ) : customer.is_active ? (
                      <span className="flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1">
                        <XCircle className="w-3 h-3" />
                        <span>Inactive</span>
                      </span>
                    )}
                  </button>
                </div>

                {/* Customer Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                  
                  {customer.phone && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  
                  {customer.address && (
                    <div className="flex items-start space-x-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="line-clamp-2">{customer.address}</span>
                    </div>
                  )}
                  
                  {customer.timezone && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>Timezone: <span className="font-medium">{customer.timezone}</span></span>
                    </div>
                  )}
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-gray-600 mb-1">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {customer.total_carts_count || 0}
                    </p>
                    <p className="text-xs text-gray-500">Total Carts</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-gray-600 mb-1">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {customer.queued_carts_count || 0}
                    </p>
                    <p className="text-xs text-gray-500">Queued</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-gray-600 mb-1">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {customer.whatsapp_configs_count || 0}
                    </p>
                    <p className="text-xs text-gray-500">Configs</p>
                  </div>
                </div>

                {/* Created Date */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Joined: {new Date(customer.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {customers.length > 0 && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * 6 + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * 6, total)}</span> of{' '}
              <span className="font-medium">{total}</span> customers
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  if (currentPage > 1) {
                    setCurrentPage(currentPage - 1);
                    setLoading(true);
                    fetchCustomers(currentPage - 1);
                  }
                }}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-1 ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
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
                        setLoading(true);
                        fetchCustomers(pageNum);
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
                    setLoading(true);
                    fetchCustomers(currentPage + 1);
                  }
                }}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-1 ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

