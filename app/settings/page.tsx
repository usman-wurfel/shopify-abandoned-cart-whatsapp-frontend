'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import apiClient from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { branding } from '@/config/branding';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getImageUrl } from '@/lib/config';
import { Search } from 'lucide-react';
import { useTimezone } from '@/contexts/TimezoneContext';

// Image Dropzone Component
function ImageDropzone({ 
  value, 
  onUpload, 
  uploading, 
  accept = 'image/*', 
  maxSize = 2048,
  label = 'Drop image here or click to browse',
  previewLabel = 'Preview'
}: {
  value: string;
  onUpload: (file: File) => void;
  uploading: boolean;
  accept?: string;
  maxSize?: number;
  label?: string;
  previewLabel?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size <= maxSize * 1024) {
        // Show immediate preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        onUpload(file);
      } else {
        toast.error(`File size must be less than ${maxSize}KB`);
      }
    } else {
      toast.error('Please upload a valid image file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size <= maxSize * 1024) {
        // Show immediate preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        onUpload(file);
      } else {
        toast.error(`File size must be less than ${maxSize}KB`);
      }
    } else {
      toast.error('Please upload a valid image file');
    }
  };

  const getImageUrlLocal = () => {
    // Use preview URL if available (for immediate preview after upload)
    if (previewUrl) return previewUrl;
    
    if (!value) return null;
    
    // Check if it's an emoji (simple check - if it's a single character and not a path)
    // Emojis are usually single characters, paths contain slashes
    if (value.length <= 2 && !value.includes('/') && !value.includes('.')) {
      return null; // Likely an emoji
    }
    
    return getImageUrl(value);
  };

  const imageUrl = getImageUrlLocal();
  
  // Update preview when value changes (after successful upload)
  useEffect(() => {
    if (value && !uploading) {
      const url = getImageUrl(value);
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        setPreviewUrl(null); // Clear local preview, use server URL
      }
    }
  }, [value, uploading]);

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={isDragging ? { borderColor: branding.colors.primary, backgroundColor: branding.colors.primaryLight + '20' } : {}}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        {uploading ? (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: branding.colors.primary }}></div>
            <p className="text-sm text-gray-600">Uploading...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-xs text-gray-500">Max size: {maxSize}KB</p>
          </div>
        )}
      </div>
      
      {imageUrl && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-700 mb-2">{previewLabel}:</p>
          <div className="relative inline-block p-2 bg-gray-50 rounded-lg border border-gray-200">
            <img 
              src={imageUrl} 
              alt="Preview" 
              className="max-w-full max-h-24 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { setTimezone: updateTimezoneContext } = useTimezone();
  const [user, setUser] = useState<any>(null);
  const [brandingSettings, setBrandingSettings] = useState<any>(null);
  const [customerSettings, setCustomerSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  
  // Message timing state
  const [messageDelayValue, setMessageDelayValue] = useState<number>(15);
  const [messageDelayUnit, setMessageDelayUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');
  
  // Timezone state
  const [timezones, setTimezones] = useState<any[]>([]);
  const [selectedTimezone, setSelectedTimezone] = useState<string>('UTC');
  const [loadingTimezones, setLoadingTimezones] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState<string>('');
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);

  useEffect(() => {
    fetchData();
    fetchTimezones();
  }, []);

  const fetchData = async () => {
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

      // Fetch user
      const userResponse = await apiClient.get('/user');
      const userData = userResponse.data.user || userResponse.data;
      setUser(userData);
      
      // Fetch settings based on role
      if (userData && userData.role === 'admin') {
        // Admin: Fetch branding settings
        try {
          const brandingResponse = await apiClient.get('/branding-settings');
          setBrandingSettings(brandingResponse.data);
        } catch (err: any) {
          console.error('Branding settings fetch error:', err);
          if (err.response?.status === 403) {
            setError('Admin access required to view branding settings');
          }
        }
      } else if (userData && userData.role === 'customer') {
        // Customer: Fetch customer settings
        try {
          const customerSettingsResponse = await apiClient.get('/customer/settings');
          const settings = customerSettingsResponse.data?.settings || customerSettingsResponse.data;
          
          if (settings) {
            setCustomerSettings(settings);
            setMessageDelayValue(settings.message_delay_value || 15);
            setMessageDelayUnit(settings.message_delay_unit || 'minutes');
            setSelectedTimezone(settings.timezone || 'UTC');
            setError(null); // Clear any previous errors
          } else {
            // If no settings returned, create default
            setCustomerSettings({
              message_delay_value: 15,
              message_delay_unit: 'minutes',
              timezone: 'UTC',
            });
            setError(null); // Clear any previous errors
          }
        } catch (err: any) {
          console.error('Customer settings fetch error:', err);
          console.error('Error response:', err.response?.data); // Debug log
          
          // Set default settings even on error so user can still configure
          setCustomerSettings({
            message_delay_value: 15,
            message_delay_unit: 'minutes',
            timezone: 'UTC',
          });
          
          // Only show error if it's a critical error (not 404 or similar)
          // Don't show error if we can still use default settings
          if (err.response?.status && err.response?.status >= 500) {
            setError(err.response?.data?.error || 'Failed to load customer settings');
          } else {
            // For other errors (like 404), just use defaults without showing error
            setError(null);
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimezones = async () => {
    try {
      setLoadingTimezones(true);
      const response = await apiClient.get('/timezones');
      if (response.data && response.data.timezones) {
        setTimezones(response.data.timezones);
      }
    } catch (err: any) {
      console.error('Failed to fetch timezones:', err);
      // Set default timezones if API fails
      setTimezones([
        { id: 1, name: 'UTC', label: 'UTC (UTC+0)', offset: 'UTC', offset_seconds: 0 },
      ]);
    } finally {
      setLoadingTimezones(false);
    }
  };

  // Close timezone dropdown when clicking outside
  const timezoneRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timezoneRef.current && !timezoneRef.current.contains(event.target as Node)) {
        setShowTimezoneDropdown(false);
        setTimezoneSearch('');
      }
    };

    if (showTimezoneDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTimezoneDropdown]);

  const handleBrandingSubmit = useCallback(async () => {
    if (!brandingSettings) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      await apiClient.put(`/branding-settings/${brandingSettings.id}`, brandingSettings);
      
      // Update local branding config
      if (typeof window !== 'undefined') {
        localStorage.setItem('branding_updated', 'true');
      }
      
      toast.success('Settings saved successfully!');
      setTimeout(() => {
        window.location.reload(); // Reload to apply branding changes
      }, 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  }, [brandingSettings]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    if (brandingSettings) {
      setBrandingSettings((prev: any) => ({ ...prev, [field]: value }));
    }
  }, [brandingSettings]);

  const handleLogoUpload = useCallback(async (file: File) => {
    try {
      setUploadingLogo(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await apiClient.post('/upload/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success && response.data.url) {
        handleFieldChange('logo', response.data.url);
        toast.success('Logo uploaded successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  }, [handleFieldChange]);

  const handleFaviconUpload = useCallback(async (file: File) => {
    try {
      setUploadingFavicon(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('favicon', file);
      
      const response = await apiClient.post('/upload/favicon', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success && response.data.url) {
        handleFieldChange('favicon', response.data.url);
        toast.success('Favicon uploaded successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to upload favicon');
    } finally {
      setUploadingFavicon(false);
    }
  }, [handleFieldChange]);

  // Handle message delay unit auto-switch
  const handleDelayValueChange = useCallback((value: number) => {
    setMessageDelayValue(value);
    
    // Auto-switch logic: if minutes selected and value > 60, switch to days
    if (messageDelayUnit === 'minutes' && value > 60) {
      setMessageDelayUnit('days');
    }
    // Auto-switch logic: if hours selected and value > 24, switch to days
    else if (messageDelayUnit === 'hours' && value > 24) {
      setMessageDelayUnit('days');
    }
    // If hours selected and value <= 24 and > 0, keep hours
    // If days selected and value <= 24, switch to hours
    else if (messageDelayUnit === 'days' && value > 0 && value <= 24) {
      setMessageDelayUnit('hours');
    }
  }, [messageDelayUnit]);

  const handleDelayUnitChange = useCallback((unit: 'minutes' | 'hours' | 'days') => {
    // If switching to minutes and value > 60, switch to days
    if (unit === 'minutes' && messageDelayValue > 60) {
      setMessageDelayUnit('days');
    }
    // If switching to hours and value > 24, switch to days
    else if (unit === 'hours' && messageDelayValue > 24) {
      setMessageDelayUnit('days');
    } else {
      // Allow user to select any unit otherwise (including days for any value)
      setMessageDelayUnit(unit);
    }
  }, [messageDelayValue]);

  const handleCustomerSettingsSubmit = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      // Get settings ID, or fetch settings first if not available
      let settingsId = customerSettings?.id;
      
      if (!settingsId) {
        // Fetch settings to get ID
        try {
          const response = await apiClient.get('/customer/settings');
          const settings = response.data?.settings || response.data;
          if (settings && settings.id) {
            settingsId = settings.id;
            setCustomerSettings(settings);
          }
        } catch (fetchErr: any) {
          // If fetch fails, try to update anyway (backend will create if needed)
          settingsId = 0; // Use 0 as placeholder, backend will handle it
        }
      }
      
      // Update settings (backend will create if doesn't exist)
      const response = await apiClient.put(`/customer/settings/${settingsId || 0}`, {
        message_delay_value: messageDelayValue,
        message_delay_unit: messageDelayUnit,
        timezone: selectedTimezone,
      });
      
      // Update local state with response
      if (response.data) {
        setCustomerSettings(response.data);
        // Update timezone context if timezone was changed
        if (response.data.timezone) {
          updateTimezoneContext(response.data.timezone);
        }
      }
      
      toast.success('Message timing settings saved successfully!');
      setSuccess(true);
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [customerSettings, messageDelayValue, messageDelayUnit, selectedTimezone]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: branding.colors.primary }}></div>
            <p className="mt-4" style={{ color: branding.colors.secondary }}>Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user && user.role === 'admin';

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-center py-8">
              <p className="text-gray-500">Loading user data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h1 className="text-3xl font-bold mb-6" style={{ color: branding.colors.secondary }}>Settings</h1>

          {/* Admin: Branding Settings */}
          {isAdmin && brandingSettings && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Branding Configuration</h2>
                <p className="text-sm text-gray-500 mb-4">Customize the app title, logo, favicon, and copyright text.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">App Title</label>
                    <input
                      type="text"
                      value={brandingSettings.app_title || ''}
                      onChange={(e) => handleFieldChange('app_title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent outline-none"
                      style={{ '--tw-ring-color': branding.colors.primary } as React.CSSProperties}
                      onFocus={(e) => e.currentTarget.style.borderColor = branding.colors.primary}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                      placeholder="Cart Recovery"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                    <ImageDropzone
                      value={brandingSettings.logo || ''}
                      onUpload={handleLogoUpload}
                      uploading={uploadingLogo}
                      accept="image/*"
                      maxSize={2048}
                      label="Drop logo image here or click to browse"
                      previewLabel="Current Logo"
                    />
                    <p className="text-xs text-gray-500 mt-2">Upload an image file (JPG, PNG, GIF, SVG, WEBP - Max 2MB)</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Favicon</label>
                    <ImageDropzone
                      value={brandingSettings.favicon || ''}
                      onUpload={handleFaviconUpload}
                      uploading={uploadingFavicon}
                      accept="image/*"
                      maxSize={1024}
                      label="Drop favicon image here or click to browse"
                      previewLabel="Current Favicon"
                    />
                    <p className="text-xs text-gray-500 mt-2">Upload an image file (JPG, PNG, GIF, SVG, ICO, WEBP - Max 1MB)</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Copyright Text</label>
                    <textarea
                      value={brandingSettings.copyright_text || ''}
                      onChange={(e) => handleFieldChange('copyright_text', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent outline-none"
                      style={{ '--tw-ring-color': branding.colors.primary } as React.CSSProperties}
                      onFocus={(e) => e.currentTarget.style.borderColor = branding.colors.primary}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                      placeholder="© 2024 Cart Recovery System. All rights reserved."
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleBrandingSubmit}
                disabled={saving}
                className="px-6 py-3 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{ backgroundColor: branding.colors.primary }}
                onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = branding.colors.primaryDark)}
                onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = branding.colors.primary)}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          )}

          {/* Customer: Message Timing Settings */}
          {!isAdmin && customerSettings && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Message Timing Settings</h2>
                <p className="text-sm text-gray-500 mb-4">Configure when to send abandoned cart reminder messages.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Send Message After</label>
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMessageDelayValue(15);
                            setMessageDelayUnit('minutes');
                          }}
                          className={`px-4 py-2 rounded-lg border transition-all ${
                            messageDelayValue === 15 && messageDelayUnit === 'minutes'
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          15 min
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMessageDelayValue(30);
                            setMessageDelayUnit('minutes');
                          }}
                          className={`px-4 py-2 rounded-lg border transition-all ${
                            messageDelayValue === 30 && messageDelayUnit === 'minutes'
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          30 min
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMessageDelayValue(45);
                            setMessageDelayUnit('minutes');
                          }}
                          className={`px-4 py-2 rounded-lg border transition-all ${
                            messageDelayValue === 45 && messageDelayUnit === 'minutes'
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          45 min
                        </button>
                      </div>
                      
                      <span className="text-gray-500">or</span>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          value={messageDelayValue}
                          onChange={(e) => handleDelayValueChange(parseInt(e.target.value) || 1)}
                          className={`w-20 px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                            customerSettings && 
                            customerSettings.message_delay_value === messageDelayValue && 
                            customerSettings.message_delay_unit === messageDelayUnit
                              ? 'border-blue-500 bg-blue-50 shadow-md' 
                              : 'border-gray-300'
                          }`}
                          style={customerSettings && 
                            customerSettings.message_delay_value === messageDelayValue && 
                            customerSettings.message_delay_unit === messageDelayUnit
                              ? {} 
                              : { '--tw-ring-color': branding.colors.primary } as React.CSSProperties}
                        />
                        <select
                          value={messageDelayUnit}
                          onChange={(e) => handleDelayUnitChange(e.target.value as 'minutes' | 'hours' | 'days')}
                          className={`px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                            customerSettings && 
                            customerSettings.message_delay_value === messageDelayValue && 
                            customerSettings.message_delay_unit === messageDelayUnit
                              ? 'border-blue-500 bg-blue-50 shadow-md' 
                              : 'border-gray-300'
                          }`}
                          style={customerSettings && 
                            customerSettings.message_delay_value === messageDelayValue && 
                            customerSettings.message_delay_unit === messageDelayUnit
                              ? {} 
                              : { '--tw-ring-color': branding.colors.primary } as React.CSSProperties}
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      <span>Messages will be sent {messageDelayValue} {messageDelayUnit} after cart abandonment.</span>
                    </p>
                  </div>
                  
                  <div className="relative" ref={timezoneRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={showTimezoneDropdown ? timezoneSearch : (timezones.find(tz => tz.name === selectedTimezone)?.label || selectedTimezone)}
                        onChange={(e) => {
                          setTimezoneSearch(e.target.value);
                          setShowTimezoneDropdown(true);
                        }}
                        onFocus={(e) => {
                          setShowTimezoneDropdown(true);
                          setTimezoneSearch('');
                          e.target.value = '';
                        }}
                        placeholder="Search timezone..."
                        className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                          customerSettings && customerSettings.timezone === selectedTimezone
                            ? 'border-blue-500 bg-blue-50 shadow-md' 
                            : 'border-gray-300'
                        }`}
                        style={customerSettings && customerSettings.timezone === selectedTimezone
                          ? {} 
                          : { '--tw-ring-color': branding.colors.primary } as React.CSSProperties}
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      
                      {/* Dropdown */}
                      {showTimezoneDropdown && timezones.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {(() => {
                            const filtered = timezoneSearch
                              ? timezones.filter(tz => 
                                  tz.name.toLowerCase().includes(timezoneSearch.toLowerCase()) ||
                                  tz.label.toLowerCase().includes(timezoneSearch.toLowerCase())
                                ).slice(0, 20) // Limit to 20 results
                              : [timezones.find(tz => tz.name === selectedTimezone)].filter(Boolean);
                            
                            if (filtered.length === 0) {
                              return (
                                <div className="px-3 py-2 text-sm text-gray-500">No timezones found</div>
                              );
                            }
                            
                            return filtered.map((tz) => (
                              <div
                                key={tz.id}
                                onClick={() => {
                                  setSelectedTimezone(tz.name);
                                  setTimezoneSearch('');
                                  setShowTimezoneDropdown(false);
                                }}
                                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors ${
                                  selectedTimezone === tz.name ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="text-sm font-medium text-gray-900">{tz.label}</div>
                                <div className="text-xs text-gray-500">{tz.name}</div>
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Search and select your timezone for accurate message scheduling.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCustomerSettingsSubmit}
                disabled={saving}
                className="px-6 py-3 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{ backgroundColor: branding.colors.primary }}
                onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = branding.colors.primaryDark)}
                onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = branding.colors.primary)}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          )}

          {!isAdmin && !customerSettings && !error && (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading settings...</p>
            </div>
          )}

          {!isAdmin && error && !customerSettings && (
            <div className="text-center py-8">
              <p className="text-red-600 font-semibold">{error}</p>
              <p className="text-sm text-gray-500 mt-2">You can still configure your settings below.</p>
            </div>
          )}

          {/* Show form even if settings not loaded yet (for new customers) */}
          {!isAdmin && !customerSettings && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Message Timing Settings</h2>
                <p className="text-sm text-gray-500 mb-4">Configure when to send abandoned cart reminder messages.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Send Message After</label>
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMessageDelayValue(15);
                            setMessageDelayUnit('minutes');
                          }}
                          className={`px-4 py-2 rounded-lg border transition-all ${
                            messageDelayValue === 15 && messageDelayUnit === 'minutes'
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          15 min
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMessageDelayValue(30);
                            setMessageDelayUnit('minutes');
                          }}
                          className={`px-4 py-2 rounded-lg border transition-all ${
                            messageDelayValue === 30 && messageDelayUnit === 'minutes'
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          30 min
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMessageDelayValue(45);
                            setMessageDelayUnit('minutes');
                          }}
                          className={`px-4 py-2 rounded-lg border transition-all ${
                            messageDelayValue === 45 && messageDelayUnit === 'minutes'
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          45 min
                        </button>
                      </div>
                      
                      <span className="text-gray-500">or</span>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          value={messageDelayValue}
                          onChange={(e) => handleDelayValueChange(parseInt(e.target.value) || 1)}
                          className={`w-20 px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                            customerSettings && 
                            customerSettings.message_delay_value === messageDelayValue && 
                            customerSettings.message_delay_unit === messageDelayUnit
                              ? 'border-blue-500 bg-blue-50 shadow-md' 
                              : 'border-gray-300'
                          }`}
                          style={customerSettings && 
                            customerSettings.message_delay_value === messageDelayValue && 
                            customerSettings.message_delay_unit === messageDelayUnit
                              ? {} 
                              : { '--tw-ring-color': branding.colors.primary } as React.CSSProperties}
                        />
                        <select
                          value={messageDelayUnit}
                          onChange={(e) => handleDelayUnitChange(e.target.value as 'minutes' | 'hours' | 'days')}
                          className={`px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                            customerSettings && 
                            customerSettings.message_delay_value === messageDelayValue && 
                            customerSettings.message_delay_unit === messageDelayUnit
                              ? 'border-blue-500 bg-blue-50 shadow-md' 
                              : 'border-gray-300'
                          }`}
                          style={customerSettings && 
                            customerSettings.message_delay_value === messageDelayValue && 
                            customerSettings.message_delay_unit === messageDelayUnit
                              ? {} 
                              : { '--tw-ring-color': branding.colors.primary } as React.CSSProperties}
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      <span>Messages will be sent {messageDelayValue} {messageDelayUnit} after cart abandonment.</span>
                    </p>
                  </div>
                  
                  <div className="relative" ref={timezoneRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={showTimezoneDropdown ? timezoneSearch : (timezones.find(tz => tz.name === selectedTimezone)?.label || selectedTimezone)}
                        onChange={(e) => {
                          setTimezoneSearch(e.target.value);
                          setShowTimezoneDropdown(true);
                        }}
                        onFocus={(e) => {
                          setShowTimezoneDropdown(true);
                          setTimezoneSearch('');
                          e.target.value = '';
                        }}
                        placeholder="Search timezone..."
                        className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:outline-none transition-all border-gray-300`}
                        style={{ '--tw-ring-color': branding.colors.primary } as React.CSSProperties}
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      
                      {/* Dropdown */}
                      {showTimezoneDropdown && timezones.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {(() => {
                            const filtered = timezoneSearch
                              ? timezones.filter(tz => 
                                  tz.name.toLowerCase().includes(timezoneSearch.toLowerCase()) ||
                                  tz.label.toLowerCase().includes(timezoneSearch.toLowerCase())
                                ).slice(0, 20) // Limit to 20 results
                              : [timezones.find(tz => tz.name === selectedTimezone)].filter(Boolean);
                            
                            if (filtered.length === 0) {
                              return (
                                <div className="px-3 py-2 text-sm text-gray-500">No timezones found</div>
                              );
                            }
                            
                            return filtered.map((tz) => (
                              <div
                                key={tz.id}
                                onClick={() => {
                                  setSelectedTimezone(tz.name);
                                  setTimezoneSearch('');
                                  setShowTimezoneDropdown(false);
                                }}
                                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors ${
                                  selectedTimezone === tz.name ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="text-sm font-medium text-gray-900">{tz.label}</div>
                                <div className="text-xs text-gray-500">{tz.name}</div>
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Search and select your timezone for accurate message scheduling.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={async () => {
                  // First fetch settings to get ID, or create if doesn't exist
                  try {
                    let settings = customerSettings;
                    if (!settings) {
                      const response = await apiClient.get('/customer/settings');
                      settings = response.data?.settings || response.data;
                      if (settings) {
                        setCustomerSettings(settings);
                      }
                    }
                    
                    if (settings && settings.id) {
                      await handleCustomerSettingsSubmit();
                    } else {
                      toast.error('Settings not found. Please refresh the page.');
                    }
                  } catch (err: any) {
                    toast.error('Failed to save settings. Please try again.');
                  }
                }}
                disabled={saving}
                className="px-6 py-3 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{ backgroundColor: branding.colors.primary }}
                onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = branding.colors.primaryDark)}
                onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = branding.colors.primary)}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          )}

          {isAdmin && !brandingSettings && (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading settings...</p>
            </div>
          )}
        </div>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}
