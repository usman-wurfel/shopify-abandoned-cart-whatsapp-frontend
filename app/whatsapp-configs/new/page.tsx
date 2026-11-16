'use client';

import { useState, useCallback, useEffect } from 'react';
import apiClient from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { branding } from '@/config/branding';

export default function NewWhatsAppConfigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingConfigs, setFetchingConfigs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingConfigs, setExistingConfigs] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'twilio',
    api_url: '',
    api_key: '',
    api_secret: '',
    phone_number_id: '',
    is_active: false, // By default inactive
    is_default: false,
  });

  const allProviders = [
    { value: 'twilio', label: 'Twilio', description: 'Twilio WhatsApp API' },
    { value: 'wati', label: 'WATI', description: 'WATI WhatsApp API' },
  ];

  // Fetch existing configs to filter providers
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        setFetchingConfigs(true);
        const response = await apiClient.get('/whatsapp-configs');
        // Handle paginated response or direct array
        let configs = [];
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          configs = response.data.data;
        } else if (Array.isArray(response.data)) {
          configs = response.data;
        }
        setExistingConfigs(configs);

        // Set default provider to the one that's not added yet
        const existingProviders = configs.map((c: any) => c.provider?.toLowerCase()).filter(Boolean);
        if (existingProviders.includes('twilio') && !existingProviders.includes('wati')) {
          setFormData(prev => ({ ...prev, provider: 'wati' }));
        } else if (existingProviders.includes('wati') && !existingProviders.includes('twilio')) {
          setFormData(prev => ({ ...prev, provider: 'twilio' }));
        }
      } catch (err) {
        // Ignore errors, just proceed with all providers
      } finally {
        setFetchingConfigs(false);
      }
    };
    fetchConfigs();
  }, []);

  // Filter providers based on what's already added
  const existingProviders = existingConfigs.map((c: any) => c.provider?.toLowerCase()).filter(Boolean);
  const availableProviders = allProviders.filter(
    (p) => !existingProviders.includes(p.value.toLowerCase())
  );

  // If no providers available, redirect back
  useEffect(() => {
    if (existingConfigs.length > 0 && availableProviders.length === 0) {
      router.push('/whatsapp-configs');
    }
  }, [existingConfigs, availableProviders, router]);

  const getProviderConfig = (provider: string) => {
    const configs: any = {
      twilio: {
        api_url: '', // Not needed for Twilio
        api_key_label: 'Account SID',
        api_secret_label: 'Auth Token',
        phone_number_id_label: 'WhatsApp Number',
        show_fields: ['api_key', 'api_secret', 'phone_number_id'],
        show_api_url: false,
      },
      wati: {
        api_url: 'https://app-server.wati.io',
        api_key_label: 'Bearer Token',
        api_secret_label: '', // Not needed for WATI
        phone_number_id_label: '', // Not needed for WATI
        show_fields: ['api_key'],
        show_api_url: true,
      },
    };
    return configs[provider] || configs.twilio;
  };

  const handleProviderChange = (provider: string) => {
    const config = getProviderConfig(provider);
    setFormData(prev => ({
      ...prev,
      provider,
      api_url: config.show_api_url ? config.api_url : '',
    }));
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // Clean up API key - remove "Bearer " prefix if present (for WATI)
      const submitData: any = { ...formData };
      if (submitData.provider === 'wati' && submitData.api_key) {
        submitData.api_key = submitData.api_key.replace(/^Bearer\s+/i, '').trim();
      }

      // Always set is_active to false for new configs
      submitData.is_active = false;

      await apiClient.post('/whatsapp-configs', submitData);

      router.push('/whatsapp-configs');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to create configuration';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [formData, router]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const providerConfig = getProviderConfig(formData.provider);

  if (fetchingConfigs) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading available providers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-sm font-medium mb-4"
              style={{ color: branding.colors.primary }}
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold" style={{ color: branding.colors.secondary }}>Add WhatsApp Configuration</h1>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
              {availableProviders.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    All providers have been added. Please remove an existing configuration first.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {availableProviders.map((provider) => (
                    <button
                      key={provider.value}
                      type="button"
                      onClick={() => handleProviderChange(provider.value)}
                      className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${formData.provider === provider.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }`}
                      style={
                        formData.provider === provider.value
                          ? { borderColor: branding.colors.primary, backgroundColor: branding.colors.primaryLight }
                          : {}
                      }
                    >
                      <div className="font-semibold text-gray-900">{provider.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{provider.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Configuration Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Configuration Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent outline-none"
                style={{ '--tw-ring-color': branding.colors.primary } as React.CSSProperties}
                onFocus={(e) => e.currentTarget.style.borderColor = branding.colors.primary}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                placeholder="My WhatsApp Config"
              />
            </div>

            {/* API URL - Only for WATI */}
            {providerConfig.show_api_url && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API URL</label>
                <input
                  type="url"
                  value={formData.api_url}
                  onChange={(e) => handleFieldChange('api_url', e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent outline-none"
                  style={{ '--tw-ring-color': branding.colors.primary } as React.CSSProperties}
                  onFocus={(e) => e.currentTarget.style.borderColor = branding.colors.primary}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  placeholder={providerConfig.api_url || 'https://api.example.com'}
                />
              </div>
            )}

            {/* API Key */}
            {providerConfig.show_fields.includes('api_key') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{providerConfig.api_key_label}</label>
                <input
                  type="text"
                  value={formData.api_key}
                  onChange={(e) => handleFieldChange('api_key', e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent outline-none"
                  style={{ '--tw-ring-color': branding.colors.primary } as React.CSSProperties}
                  onFocus={(e) => e.currentTarget.style.borderColor = branding.colors.primary}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  placeholder="Enter your API key"
                />
              </div>
            )}

            {/* API Secret */}
            {providerConfig.show_fields.includes('api_secret') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{providerConfig.api_secret_label}</label>
                <input
                  type="password"
                  value={formData.api_secret}
                  onChange={(e) => handleFieldChange('api_secret', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent outline-none"
                  style={{ '--tw-ring-color': branding.colors.primary } as React.CSSProperties}
                  onFocus={(e) => e.currentTarget.style.borderColor = branding.colors.primary}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  placeholder="Enter your API secret"
                />
              </div>
            )}

            {/* Phone Number ID */}
            {providerConfig.show_fields.includes('phone_number_id') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{providerConfig.phone_number_id_label}</label>
                <input
                  type="text"
                  value={formData.phone_number_id}
                  onChange={(e) => handleFieldChange('phone_number_id', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent outline-none"
                  style={{ '--tw-ring-color': branding.colors.primary } as React.CSSProperties}
                  onFocus={(e) => e.currentTarget.style.borderColor = branding.colors.primary}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  placeholder="Enter phone number ID"
                />
              </div>
            )}

            {/* Checkboxes */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => handleFieldChange('is_default', e.target.checked)}
                  className="rounded border-gray-300 focus:ring-blue-500"
                  style={{ accentColor: branding.colors.primary }}
                />
                <span className="ml-2 text-sm text-gray-700">Set as Default</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{ backgroundColor: branding.colors.primary }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = branding.colors.primaryDark)}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = branding.colors.primary)}
            >
              {loading ? 'Creating...' : 'Create Configuration'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
