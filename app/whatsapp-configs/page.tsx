'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { branding } from '@/config/branding';
import { Plus, Play, Edit, Trash2, CheckCircle2, XCircle, X, Phone, AlertTriangle, Search, MessageSquare } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function WhatsAppConfigsPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testConfigId, setTestConfigId] = useState<number | null>(null);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfigId, setDeleteConfigId] = useState<number | null>(null);
  const [deleteConfigName, setDeleteConfigName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [toggleConfigId, setToggleConfigId] = useState<number | null>(null);
  const [toggleConfigName, setToggleConfigName] = useState('');
  const [toggleConfigActive, setToggleConfigActive] = useState(false);
  const [toggleConfigProvider, setToggleConfigProvider] = useState<string>('');
  const [toggling, setToggling] = useState(false);
  const [updatingCustomerId, setUpdatingCustomerId] = useState<number | null>(null);
  const [templateData, setTemplateData] = useState({
    twilio_content_sid: '',
    wati_template_name: '',
    wati_broadcast_name: 'ABANDONED_CART',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [apiKeyAllowed, setApiKeyAllowed] = useState<boolean>(false);

  // Example template message (read-only)
  const exampleTemplateMessage = `Hi {{customer_name}},

You have items waiting in your cart.

Complete your checkout here:
{{cart_url}}

Total amount: {{total_amount}}`;
  const [verifyingTemplate, setVerifyingTemplate] = useState(false);
  const [activationTestPhone, setActivationTestPhone] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      setLoading(true);
      setError(null);

      const host = typeof window !== 'undefined' ? sessionStorage.getItem('shopify_host') : null;
      const inIframe = typeof window !== 'undefined' && window.self !== window.top;
      const isEmbedded = inIframe || !!host;
      if (isEmbedded) {
        const { waitForAppBridge } = await import('@/lib/sessionTokenForApi');
        const ready = await waitForAppBridge();
        if (!ready) {
          setError('Failed to initialize. Please refresh.');
          setLoading(false);
          return;
        }
      }

      // Fetch user info
      const userResponse = await apiClient.get('/user');
      const userData = userResponse.data.user || userResponse.data;
      setUser(userData);
      
      // Fetch subscription data for customers to check api_key_allowed
      if (userData.role === 'customer') {
        try {
          const subResponse = await apiClient.get('/subscription/current');
          const subscription = subResponse.data?.subscription;
          
          if (subscription && subscription.api_key_allowed === true) {
            setApiKeyAllowed(true);
          } else {
            // No subscription or api_key_allowed not set means no API key access
            setApiKeyAllowed(false);
          }
        } catch (e) {
          setApiKeyAllowed(false);
        }
      } else {
        // Admin always has access
        setApiKeyAllowed(true);
      }
      
      // Fetch configs
      await fetchConfigs(1);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        router.push('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to load configurations');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigs = async (page: number = 1) => {
    try {
      setLoading(true);
      const params: any = { page, per_page: 20 };
      
      if (isAdmin && searchTerm) {
        // For admin search, we'll filter on frontend since backend doesn't support search yet
      }

      const response = await apiClient.get('/whatsapp-configs', { params });
      if (response.data) {
        if (response.data.data) {
          // Paginated response
          setConfigs(response.data.data);
          setCurrentPage(response.data.current_page || page);
          setTotalPages(response.data.last_page || 1);
          setTotal(response.data.total || 0);
        } else {
          // Non-paginated response (fallback)
          setConfigs(response.data);
          setCurrentPage(1);
          setTotalPages(1);
          setTotal(response.data.length);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (id: number) => {
    // Open activation modal for testing template message
    try {
      const response = await apiClient.get(`/whatsapp-configs/${id}`);
      const config = response.data;
      
      setToggleConfigId(id);
      setToggleConfigName(config.name || 'Configuration');
      setToggleConfigActive(config.is_active || false);
      setToggleConfigProvider(config.provider || 'twilio');
      
      // Pre-fill template data if exists
      setTemplateData({
        twilio_content_sid: config.twilio_content_sid || '',
        wati_template_name: config.wati_template_name || '',
        wati_broadcast_name: config.wati_broadcast_name || 'ABANDONED_CART',
      });
      
      // Clear test phone number
      setActivationTestPhone('');
      
      setShowToggleModal(true);
    } catch (err: any) {
      toast.error('Failed to load configuration', {
        autoClose: 5000,
      });
    }
  };

  const handleCloseTestModal = () => {
    if (!sendingTest) {
      setShowTestModal(false);
      setTestConfigId(null);
      setTestPhoneNumber('');
    }
  };

  const handleSendTest = async () => {
    if (!testConfigId) return;
    
    // Validate phone number
    const phone = testPhoneNumber.trim();
    if (!phone) {
      toast.error('Please enter a phone number');
      return;
    }
    
    if (phone.length < 10) {
      toast.error('Please enter a valid phone number (minimum 10 digits)');
      return;
    }
    
    setSendingTest(true);
    
    try {
      const response = await apiClient.post(`/whatsapp-configs/${testConfigId}/test`, {
        phone_number: phone
      });
      
      if (response.data.success) {
        if (response.data.test_message_sent) {
          toast.success(`Test message sent successfully to ${response.data.test_phone}!`, {
            autoClose: 5000,
          });
          setShowTestModal(false);
          setTestPhoneNumber('');
        } else {
          toast.success('Connection successful!', {
            autoClose: 3000,
          });
        }
      } else {
        toast.error(response.data.error || 'Connection test failed', {
          autoClose: 5000,
        });
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Connection test failed';
      toast.error(errorMsg, {
        autoClose: 5000,
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteConfigId(id);
    setDeleteConfigName(name);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    if (!deleting) {
      setShowDeleteModal(false);
      setDeleteConfigId(null);
      setDeleteConfigName('');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfigId) return;
    
    setDeleting(true);
    try {
      await apiClient.delete(`/whatsapp-configs/${deleteConfigId}`);
      toast.success('Configuration deleted successfully!', {
        autoClose: 3000,
      });
      setShowDeleteModal(false);
      setDeleteConfigId(null);
      setDeleteConfigName('');
      fetchConfigs(currentPage);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete configuration', {
        autoClose: 5000,
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleClick = async (id: number, name: string, isActive: boolean, provider: string) => {
    // If trying to activate, show confirmation modal with template setup
    if (!isActive) {
      setToggleConfigId(id);
      setToggleConfigName(name);
      setToggleConfigActive(isActive);
      setToggleConfigProvider(provider);
      
      // Fetch config details to populate template fields if already set
      try {
        const response = await apiClient.get(`/whatsapp-configs/${id}`);
        const config = response.data;
        setTemplateData({
          twilio_content_sid: config.twilio_content_sid || '',
          wati_template_name: config.wati_template_name || '',
          wati_broadcast_name: config.wati_broadcast_name || 'ABANDONED_CART',
        });
      } catch (err) {
        // If fetch fails, start with empty template data
        setTemplateData({
          twilio_content_sid: '',
          wati_template_name: '',
          wati_broadcast_name: 'ABANDONED_CART',
        });
      }
      
      setShowToggleModal(true);
    } else {
      // If deactivating, directly toggle without confirmation
      handleToggleActive(id);
    }
  };

  const handleCloseToggleModal = () => {
    if (!toggling && !verifyingTemplate) {
      setShowToggleModal(false);
      setToggleConfigId(null);
      setToggleConfigName('');
      setToggleConfigActive(false);
      setToggleConfigProvider('');
      setActivationTestPhone('');
      setTemplateData({
        twilio_content_sid: '',
        wati_template_name: '',
        wati_broadcast_name: 'ABANDONED_CART',
      });
    }
  };

  // Check if required variables are present in example message
  const checkRequiredVariables = (message: string) => {
    const hasCustomerName = message.includes('{{customer_name}}');
    const hasCartUrl = message.includes('{{cart_url}}');
    const hasTotalAmount = message.includes('{{total_amount}}');
    return { hasCustomerName, hasCartUrl, hasTotalAmount, allPresent: hasCustomerName && hasCartUrl && hasTotalAmount };
  };

  const variableStatus = checkRequiredVariables(exampleTemplateMessage);

  const handleSendTestMessage = async (activate: boolean = false) => {
    if (!toggleConfigId) return;
    
    // Validate test phone number
    if (!activationTestPhone.trim()) {
      toast.error('Please enter a WhatsApp number to send test message', {
        autoClose: 5000,
      });
      return;
    }

    // Validate required variables
    if (!variableStatus.allPresent) {
      toast.error('Template must include {{order_number}} and {{cart_url}} variables', {
        autoClose: 5000,
      });
      return;
    }

    // Check if template ID is provided based on provider
    if (toggleConfigProvider.toLowerCase() === 'twilio' && !templateData.twilio_content_sid.trim()) {
      toast.error('Please enter Twilio Content SID', {
        autoClose: 5000,
      });
      return;
    }

    if (toggleConfigProvider.toLowerCase() === 'wati' && !templateData.wati_template_name.trim()) {
      toast.error('Please enter WATI Template Name', {
        autoClose: 5000,
      });
      return;
    }

    setVerifyingTemplate(true);
    try {
      if (activate) {
        // Send test message and activate if successful
        const response = await apiClient.post(`/whatsapp-configs/${toggleConfigId}/activate-with-test`, {
          template_message: exampleTemplateMessage, // Use example message
          twilio_content_sid: templateData.twilio_content_sid,
          wati_template_name: templateData.wati_template_name,
          wati_broadcast_name: templateData.wati_broadcast_name,
          test_phone_number: activationTestPhone.trim(),
        });

        if (response.data.success) {
          toast.success(response.data.message || 'Configuration activated successfully! Test message sent.', {
            autoClose: 5000,
          });
          setShowToggleModal(false);
          setToggleConfigId(null);
          setToggleConfigName('');
          setToggleConfigActive(false);
          setToggleConfigProvider('');
          setActivationTestPhone('');
          setTemplateData({
            twilio_content_sid: '',
            wati_template_name: '',
            wati_broadcast_name: 'ABANDONED_CART',
          });
          fetchConfigs(currentPage);
        } else {
          toast.error(response.data.error || 'Failed to activate configuration', {
            autoClose: 5000,
          });
        }
      } else {
        // Just send test message without activating
        const response = await apiClient.post(`/whatsapp-configs/${toggleConfigId}/send-test-template`, {
          template_message: exampleTemplateMessage,
          twilio_content_sid: templateData.twilio_content_sid,
          wati_template_name: templateData.wati_template_name,
          wati_broadcast_name: templateData.wati_broadcast_name,
          test_phone_number: activationTestPhone.trim(),
        });

        if (response.data.success) {
          toast.success('Test template message sent successfully!', {
            autoClose: 5000,
          });
          // Update template IDs if provided (only for customers, not admin)
          if (!isAdmin && (templateData.twilio_content_sid || templateData.wati_template_name)) {
            await apiClient.put(`/whatsapp-configs/${toggleConfigId}`, {
              twilio_content_sid: templateData.twilio_content_sid,
              wati_template_name: templateData.wati_template_name,
              wati_broadcast_name: templateData.wati_broadcast_name,
            });
            toast.success('Template ID updated successfully!', {
              autoClose: 3000,
            });
            fetchConfigs(currentPage);
          }
        } else {
          toast.error(response.data.error || 'Failed to send test message', {
            autoClose: 5000,
          });
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to send test message';
      toast.error(errorMsg, {
        autoClose: 5000,
      });
    } finally {
      setVerifyingTemplate(false);
    }
  };

  const handleActivateWithTest = async () => {
    await handleSendTestMessage(true);
  };

  const handleToggleActive = async (id?: number) => {
    const configId = id || toggleConfigId;
    if (!configId) return;
    
    // Admin cannot activate configurations
    if (isAdmin) {
      toast.error('Admins can only send test messages. Activation is restricted to customers.', {
        autoClose: 5000,
      });
      return;
    }
    
    setToggling(true);
    setUpdatingCustomerId(configId);
    try {
      // Update config with template data before activating
      await apiClient.put(`/whatsapp-configs/${configId}`, {
        template_message: exampleTemplateMessage, // Use example message
        twilio_content_sid: templateData.twilio_content_sid,
        wati_template_name: templateData.wati_template_name,
        wati_broadcast_name: templateData.wati_broadcast_name,
      });

      // Then activate
      const response = await apiClient.post(`/whatsapp-configs/${configId}/toggle-active`);
      toast.success(response.data.message || 'Status updated successfully!', {
        autoClose: 3000,
      });
      setShowToggleModal(false);
      setToggleConfigId(null);
      setToggleConfigName('');
      setToggleConfigActive(false);
      setToggleConfigProvider('');
      setTemplateData({
        twilio_content_sid: '',
        wati_template_name: '',
        wati_broadcast_name: 'ABANDONED_CART',
      });
      fetchConfigs(currentPage);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update status', {
        autoClose: 5000,
      });
    } finally {
      setToggling(false);
      setUpdatingCustomerId(null);
    }
  };

  const isAdmin = user?.role === 'admin';

  // Update fetchConfigs when search changes (for admin)
  useEffect(() => {
    if (user && isAdmin && !loading) {
      // Reset to page 1 when search changes
      setCurrentPage(1);
      fetchConfigs(1);
    }
  }, [searchTerm]);

  // Check which providers are already added
  const existingProviders = configs.map((config: any) => config.provider?.toLowerCase()).filter(Boolean);
  const hasTwilio = existingProviders.includes('twilio');
  const hasWati = existingProviders.includes('wati');
  const bothAdded = hasTwilio && hasWati;

  // Filter configs based on search term (admin only)
  const filteredConfigs = isAdmin && searchTerm
    ? configs.filter((config: any) => {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = (config.name || '').toLowerCase().includes(searchLower);
        const providerMatch = (config.provider || '').toLowerCase().includes(searchLower);
        const customerNameMatch = config.customer?.user?.name 
          ? config.customer.user.name.toLowerCase().includes(searchLower)
          : false;
        const businessNameMatch = config.customer?.business_name 
          ? config.customer.business_name.toLowerCase().includes(searchLower)
          : false;
        const shopDomainMatch = config.customer?.shop_domain 
          ? config.customer.shop_domain.toLowerCase().includes(searchLower)
          : false;
        
        return nameMatch || providerMatch || customerNameMatch || businessNameMatch || shopDomainMatch;
      })
    : configs;

  const rows = filteredConfigs.map((config) => {
    const customerInfo = config.customer?.user 
      ? `${config.customer.user.name} (${config.customer.business_name || config.customer.shop_domain || 'N/A'})`
      : '';
    
    const actions = isAdmin ? (
      <button
        onClick={() => handleTest(config.id)}
        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110"
        title="Test Connection"
      >
        <Play className="w-4 h-4" />
      </button>
    ) : (
      <div className="flex space-x-2">
        <button
          onClick={() => handleTest(config.id)}
          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110"
          title="Test Connection"
        >
          <Play className="w-4 h-4" />
        </button>
        <button
          onClick={() => router.push(`/whatsapp-configs/${config.id}/edit`)}
          className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110"
          title="Edit Configuration"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleDeleteClick(config.id, config.name)}
          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110"
          title="Delete Configuration"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );

    const defaultBadge = config.is_default ? (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Default</span>
    ) : '';

    const status = (
      <button
        onClick={() => handleToggleClick(config.id, config.name, config.is_active, config.provider || 'twilio')}
        disabled={updatingCustomerId === config.id || isAdmin}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          config.is_active 
            ? 'bg-green-500 focus:ring-green-500' 
            : 'bg-gray-300 focus:ring-gray-400'
        }`}
        title={isAdmin ? 'Only customers can toggle status' : config.is_active ? 'Click to deactivate' : 'Click to activate'}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            config.is_active ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
        {updatingCustomerId === config.id && (
          <span className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
          </span>
        )}
      </button>
    );

    if (isAdmin) {
      return [
        config.name || 'Unnamed',
        config.provider ? config.provider.toUpperCase() : 'N/A',
        customerInfo,
        defaultBadge,
        status,
        actions,
      ];
    } else {
      return [
        config.name || 'Unnamed',
        config.provider ? config.provider.toUpperCase() : 'N/A',
        defaultBadge,
        status,
        actions,
      ];
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading configurations...</p>
        </div>
      </div>
    );
  }

  const headings = isAdmin 
    ? ['Name', 'Provider', 'Customer', 'Default', 'Status', 'Actions']
    : ['Name', 'Provider', 'Default', 'Status', 'Actions'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 p-8" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Test Message Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseTestModal}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold" style={{ color: branding.colors.secondary }}>
                Send Test Message
              </h2>
              <button
                onClick={handleCloseTestModal}
                disabled={sendingTest}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  Phone Number
                </div>
              </label>
              <input
                type="tel"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                placeholder="923105727614 (with country code)"
                disabled={sendingTest}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                style={{ 
                  '--tw-ring-color': branding.colors.primary 
                } as React.CSSProperties & { '--tw-ring-color': string }}
                onFocus={(e) => e.currentTarget.style.borderColor = branding.colors.primary}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !sendingTest) {
                    handleSendTest();
                  }
                }}
              />
              <p className="mt-2 text-xs text-gray-500">
                Enter phone number with country code (e.g., 923105727614)
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleSendTest}
                disabled={sendingTest || !testPhoneNumber.trim()}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{ backgroundColor: branding.colors.primary }}
                onMouseEnter={(e) => !sendingTest && !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = branding.colors.primaryDark)}
                onMouseLeave={(e) => !sendingTest && !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = branding.colors.primary)}
              >
                {sendingTest ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>Send Test Message</span>
                  </>
                )}
              </button>
              <button
                onClick={handleCloseTestModal}
                disabled={sendingTest}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Delete Configuration</h2>
              </div>
              <button
                onClick={handleCloseDeleteModal}
                disabled={deleting}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete the configuration <strong>"{deleteConfigName}"</strong>?
              </p>
              <p className="text-sm text-gray-500">
                This action cannot be undone. All associated settings will be permanently deleted.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg font-semibold shadow-lg hover:bg-red-600 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    <span>Delete</span>
                  </>
                )}
              </button>
              <button
                onClick={handleCloseDeleteModal}
                disabled={deleting}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Active - Template Setup Modal */}
      {showToggleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 transform transition-all my-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {toggleConfigActive ? 'Test Template Message: ' : 'Activate Configuration: '}{toggleConfigName}
                </h2>
              </div>
              <button
                onClick={handleCloseToggleModal}
                disabled={toggling || verifyingTemplate}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Required Variables Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="mb-2">
                  <strong>Required Variables (must include):</strong>
                  <div className="mt-2 space-y-1">
                    <div className={variableStatus.hasCustomerName ? 'text-green-600' : 'text-red-600'}>
                      {variableStatus.hasCustomerName ? '✅' : '❌'} {'{{customer_name}}'} - Customer name
                    </div>
                    <div className={variableStatus.hasCartUrl ? 'text-green-600' : 'text-red-600'}>
                      {variableStatus.hasCartUrl ? '✅' : '❌'} {'{{cart_url}}'} - Cart recovery URL
                    </div>
                    <div className={variableStatus.hasTotalAmount ? 'text-green-600' : 'text-red-600'}>
                      {variableStatus.hasTotalAmount ? '✅' : '❌'} {'{{total_amount}}'} - Cart total amount (shows "Free" if 0)
                    </div>
                  </div>
                </div>
              </div>

              {/* Example Template Message (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Example Template Message</label>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                    {exampleTemplateMessage}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    This is an example. Your actual template will be created in WhatsApp Business Manager with the same variables.
                  </p>
                </div>
              </div>

              {/* WhatsApp Template IDs */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="mb-3">
                  <strong className="text-red-600">⚠️ Important: WhatsApp Template IDs Required</strong>
                  <p className="text-sm text-gray-600 mt-1">
                    Before using this template, you must create and approve it in your WhatsApp Business Manager account.
                    Then enter the Template ID below.
                  </p>
                </div>

                {toggleConfigProvider.toLowerCase() === 'twilio' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Twilio Content SID</label>
                    <input
                      type="text"
                      value={templateData.twilio_content_sid}
                      onChange={(e) => setTemplateData(prev => ({ ...prev, twilio_content_sid: e.target.value }))}
                      readOnly={isAdmin}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none ${
                        isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''
                      }`}
                      placeholder="HXb5b62575e6e4ff6129ad7c8efe1f983e"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Example: HXb5b62575e6e4ff6129ad7c8efe1f983e
                      {isAdmin && <span className="text-orange-600 ml-2">(Read-only for admin)</span>}
                    </p>
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                      <strong>How to get Template ID:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1 text-gray-700">
                        <li>Go to Twilio Console → Content Templates → Copy Content SID</li>
                        <li>Template must match the example message above and include the same variables</li>
                        <li>Template must be approved by WhatsApp before use</li>
                      </ul>
                      {isAdmin && (
                        <p className="mt-2 text-orange-600 font-semibold">
                          Note: As admin, you can only send test messages. Template settings can only be changed by the customer.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">WATI Template Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={templateData.wati_template_name}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, wati_template_name: e.target.value }))}
                        readOnly={isAdmin}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none ${
                          isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''
                        }`}
                        placeholder="abandoned_cart_reminder"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Example: abandoned_cart_reminder
                        {isAdmin && <span className="text-orange-600 ml-2">(Read-only for admin)</span>}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Broadcast Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={templateData.wati_broadcast_name}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, wati_broadcast_name: e.target.value }))}
                        readOnly={isAdmin}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none ${
                          isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''
                        }`}
                        placeholder="ABANDONED_CART"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Example: ABANDONED_CART, MARKETING, TRANSACTIONAL
                        {isAdmin && <span className="text-orange-600 ml-2">(Read-only for admin)</span>}
                      </p>
                    </div>
                    
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                      <strong>How to get Template Name:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1 text-gray-700">
                        <li>Go to WATI Dashboard → Templates → Copy Template Name</li>
                        <li>Template must match the example message above and include the same variables</li>
                        <li>Template must be approved by WhatsApp before use</li>
                        <li>Broadcast Name is used to categorize your messages (e.g., ABANDONED_CART, MARKETING)</li>
                      </ul>
                      {isAdmin && (
                        <p className="mt-2 text-orange-600 font-semibold">
                          Note: As admin, you can only send test messages. Template settings can only be changed by the customer.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="mb-2 font-semibold">Preview:</div>
                <div className="p-3 bg-white rounded border border-gray-200 whitespace-pre-wrap text-sm">
                  {exampleTemplateMessage
                    .replace(/\{\{customer_name\}\}/g, 'John Doe')
                    .replace(/\{\{cart_url\}\}/g, 'https://store.com/cart/recover/abc123')
                    .replace(/\{\{total_amount\}\}/g, '$99.99')}
                </div>
              </div>

              {/* Test Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={activationTestPhone}
                  onChange={(e) => setActivationTestPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  placeholder="923001234567 or +923001234567"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {toggleConfigActive 
                    ? 'Enter a WhatsApp number to send a test template message. Template ID will be updated if you modify it above.'
                    : 'Enter a WhatsApp number to send a test template message. If the message sends successfully, the configuration will be activated.'}
                </p>
              </div>

              {/* Warning if variables missing */}
              {!variableStatus.allPresent && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  Please include all required variables: {!variableStatus.hasCustomerName && '{{customer_name}} '}
                  {!variableStatus.hasCartUrl && '{{cart_url}} '}
                  {!variableStatus.hasTotalAmount && '{{total_amount}}'}
                </div>
              )}
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => handleSendTestMessage(false)}
                disabled={verifyingTemplate || !variableStatus.allPresent || !activationTestPhone.trim()}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold shadow-lg hover:bg-blue-600 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {verifyingTemplate ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Sending Test...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>Send Test Message</span>
                  </>
                )}
              </button>
              {!toggleConfigActive && !isAdmin && (
                <button
                  onClick={handleActivateWithTest}
                  disabled={toggling || verifyingTemplate || !variableStatus.allPresent || !activationTestPhone.trim()}
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg font-semibold shadow-lg hover:bg-green-600 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {verifyingTemplate || toggling ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Activating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Activate & Send Test</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleCloseToggleModal}
                disabled={toggling || verifyingTemplate}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <MessageSquare className="w-8 h-8" style={{ color: branding.colors.primary }} />
                <h1 className="text-3xl font-bold text-gray-900">WhatsApp Configurations</h1>
              </div>
              <p className="text-gray-600">
                {isAdmin 
                  ? 'View and manage all WhatsApp configurations' 
                  : 'Manage your WhatsApp API configurations'}
              </p>
            </div>
            {!isAdmin && (
              <div className="relative group">
                <button
                  onClick={() => {
                    if (bothAdded !== true && apiKeyAllowed === true) {
                      router.push('/whatsapp-configs/new');
                    }
                  }}
                  disabled={bothAdded === true || apiKeyAllowed !== true}
                  className={`flex items-center space-x-2 px-6 py-3 text-white rounded-lg font-semibold shadow-lg transition-all duration-200 ${
                    bothAdded === true || apiKeyAllowed !== true
                      ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                      : 'hover:shadow-xl transform hover:scale-[1.02]'
                  }`}
                  style={bothAdded !== true && apiKeyAllowed === true ? { backgroundColor: branding.colors.primary } : { backgroundColor: '#9ca3af' }}
                  onMouseEnter={(e) => {
                    if (bothAdded !== true && apiKeyAllowed === true) {
                      e.currentTarget.style.backgroundColor = branding.colors.primaryDark;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (bothAdded !== true && apiKeyAllowed === true) {
                      e.currentTarget.style.backgroundColor = branding.colors.primary;
                    }
                  }}
                  title={apiKeyAllowed !== true ? 'Upgrade your package to add API keys and automate your process' : bothAdded ? 'Remove existing config first' : 'Add Configuration'}
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Configuration</span>
                </button>
                {apiKeyAllowed !== true && (
                  <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    Upgrade your package to add API keys and automate your process
                    <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                )}
                {bothAdded && apiKeyAllowed === true && (
                  <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    Please remove one of the existing configurations first
                    <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                )}
              </div>
            )}
              </div>

          {/* Search Bar - Admin Only */}
          {isAdmin && (
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, provider, customer name, or shop domain..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Table */}
        {filteredConfigs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No WhatsApp Configurations</h3>
            <p className="text-gray-500 mb-4">
              {isAdmin 
                ? (searchTerm 
                    ? 'No configurations found matching your search.' 
                    : 'No WhatsApp configurations found. Customers can add their configurations.')
                : 'Add your WhatsApp API configuration to get started.'}
            </p>
            {!isAdmin && (
              <div className="relative group inline-block">
                <button
                  onClick={() => {
                    if (bothAdded !== true && apiKeyAllowed === true) {
                      router.push('/whatsapp-configs/new');
                    }
                  }}
                  disabled={bothAdded === true || apiKeyAllowed !== true}
                  className={`flex items-center space-x-2 px-6 py-3 text-white rounded-lg font-semibold shadow-lg transition-all duration-200 mx-auto ${
                    bothAdded === true || apiKeyAllowed !== true
                      ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                      : 'hover:shadow-xl transform hover:scale-[1.02]'
                  }`}
                  style={bothAdded !== true && apiKeyAllowed === true ? { backgroundColor: branding.colors.primary } : { backgroundColor: '#9ca3af' }}
                  onMouseEnter={(e) => {
                    if (bothAdded !== true && apiKeyAllowed === true) {
                      e.currentTarget.style.backgroundColor = branding.colors.primaryDark;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (bothAdded !== true && apiKeyAllowed === true) {
                      e.currentTarget.style.backgroundColor = branding.colors.primary;
                    }
                  }}
                  title={apiKeyAllowed !== true ? 'Upgrade your package to add API keys and automate your process' : bothAdded ? 'Remove existing config first' : 'Add Configuration'}
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Configuration</span>
                </button>
                {apiKeyAllowed !== true && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    Upgrade your package to add API keys and automate your process
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                )}
                {bothAdded && apiKeyAllowed === true && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    Please remove one of the existing configurations first
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {headings.map((heading, index) => (
                      <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {typeof cell === 'object' ? cell : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {filteredConfigs.length > 0 && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * 20 + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * 20, total)}</span> of{' '}
                <span className="font-medium">{total}</span> configurations
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (currentPage > 1) {
                      setCurrentPage(currentPage - 1);
                      setLoading(true);
                      fetchConfigs(currentPage - 1);
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
                          setLoading(true);
                          fetchConfigs(pageNum);
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
                      fetchConfigs(currentPage + 1);
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
    </div>
  );
}

