'use client';

import { useState, useCallback, useEffect } from 'react';
import apiClient from '@/lib/axios';
import { useRouter, useParams } from 'next/navigation';
import { branding } from '@/config/branding';

export default function EditWhatsAppConfigPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'twilio',
    api_url: '',
    api_key: '',
    api_secret: '',
    phone_number_id: '',
    is_active: true,
    is_default: false,
  });

  const providers = [
    { value: 'twilio', label: 'Twilio', description: 'Twilio WhatsApp API' },
    { value: 'wati', label: 'WATI', description: 'WATI WhatsApp API' },
  ];

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

  useEffect(() => {
    fetchConfig();
  }, [id]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/whatsapp-configs/${id}`);
      const config = response.data;
      
      // Determine provider - check if it's set, otherwise detect from API URL
      let provider = config.provider || 'twilio';
      if (!config.provider) {
        // Auto-detect provider from API URL
        if (config.api_url && config.api_url.includes('twilio.com')) {
          provider = 'twilio';
        } else if (config.api_url && config.api_url.includes('wati.io')) {
          provider = 'wati';
        }
      }
      
      // Get provider config to set default API URL if not set (only for WATI)
      const providerConfig = getProviderConfig(provider);
      let apiUrl = config.api_url || '';
      if (provider === 'wati' && !apiUrl) {
        apiUrl = providerConfig.api_url || '';
      }
      
      setFormData({
        name: config.name || '',
        provider: provider,
        api_url: apiUrl,
        api_key: config.api_key || '',
        api_secret: config.api_secret || '',
        phone_number_id: config.phone_number_id || '',
        is_active: config.is_active ?? true,
        is_default: config.is_default ?? false,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      
      // Clean up API key - remove "Bearer " prefix if present (for WATI)
      const submitData: any = { ...formData };
      if (submitData.provider === 'wati' && submitData.api_key) {
        submitData.api_key = submitData.api_key.replace(/^Bearer\s+/i, '').trim();
      }
      
      // Remove is_active from submit data - it can only be changed via toggle button
      delete submitData.is_active;
      
      // Include provider in update (read-only, backend will use existing one)
      await apiClient.put(`/whatsapp-configs/${id}`, submitData);
      
      router.push('/whatsapp-configs');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to update configuration';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [formData, id, router]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const providerConfig = getProviderConfig(formData.provider);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 p-8" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-sm font-medium mb-4"
              style={{ color: branding.colors.primary }}
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold" style={{ color: branding.colors.secondary }}>Edit WhatsApp Configuration</h1>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Provider Selection - Read Only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
              <div className="grid grid-cols-2 gap-4">
                {providers.map((provider) => (
                  <div
                    key={provider.value}
                    className={`p-4 border-2 rounded-lg text-left ${
                      formData.provider === provider.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-gray-50 opacity-50'
                    }`}
                    style={
                      formData.provider === provider.value
                        ? { borderColor: branding.colors.primary, backgroundColor: branding.colors.primaryLight }
                        : {}
                    }
                  >
                    <div className="font-semibold text-gray-900">{provider.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{provider.description}</div>
                    {formData.provider === provider.value && (
                      <div className="text-xs text-gray-600 mt-2 italic">(Cannot be changed)</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Configuration Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Configuration Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent outline-none"
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
              disabled={saving}
              className="w-full px-6 py-3 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{ backgroundColor: branding.colors.primary }}
              onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = branding.colors.primaryDark)}
              onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = branding.colors.primary)}
            >
              {saving ? 'Updating...' : 'Update Configuration'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

