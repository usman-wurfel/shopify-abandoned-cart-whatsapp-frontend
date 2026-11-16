'use client';

import { useState, useCallback, useEffect } from 'react';
import apiClient from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { branding } from '@/config/branding';
import { getBaseUrl, getImageUrl } from '@/lib/config';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandingSettings, setBrandingSettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    // Fetch branding settings (public endpoint - no auth required)
    const fetchBranding = async () => {
      try {
        // Try to fetch branding settings, but don't fail if it doesn't work
        const response = await apiClient.get('/branding-settings');
        if (response.data) {
          setBrandingSettings(response.data);
        }
      } catch (err) {
        // If it fails, use default branding
      }
    };
    fetchBranding();
  }, []);

  // Update favicon when branding settings are loaded
  useEffect(() => {
    if (brandingSettings?.favicon) {
      const faviconUrl = getImageUrl(brandingSettings.favicon);
      
      // Update or create favicon link
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = faviconUrl;
    }
  }, [brandingSettings]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post('/login', formData);
      
      if (response.data.success && response.data.token) {
        const userData = response.data.user;
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        router.push('/');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED' || err.message?.includes('ERR_CONNECTION_REFUSED')) {
        const apiUrl = getBaseUrl();
        setError(`Cannot connect to server. Please make sure Laravel server is running on ${apiUrl}`);
      } else if (err.response?.status === 401 || err.response?.status === 422) {
        const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Invalid email or password.';
        setError(errorMsg);
      } else {
        const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Login failed. Please try again.';
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [formData, router]);

  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, ${branding.colors.primaryDark} 0%, ${branding.colors.primary} 50%, ${branding.colors.secondary} 100%)` }}
    >
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4" style={{ minHeight: '6rem' }}>
            {(() => {
              const logo = brandingSettings?.logo || branding.logo;
              
              if (!logo) {
                return <span className="text-4xl">{branding.logo}</span>;
              }
              
              // Handle different logo formats
              const logoUrl = getImageUrl(logo);
              
              // Check if it's an image URL or emoji
              if (logoUrl && (logoUrl.startsWith('http://') || logoUrl.startsWith('https://') || logoUrl.startsWith('/'))) {
                return (
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="rounded-xl object-contain bg-transparent"
                    style={{ height: '6rem', width: 'auto' }}
                    onError={(e) => {
                      // If image fails to load, show emoji fallback
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.emoji-fallback')) {
                        const fallback = document.createElement('span');
                        fallback.className = 'emoji-fallback text-4xl';
                        fallback.textContent = branding.logo;
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                );
              } else {
                return <span className="text-4xl">{logo}</span>;
              }
            })()}
          </div>
          
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Welcome Back</h2>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="text-red-600 mr-2 w-5 h-5 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="text-gray-400 w-5 h-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  required
                  autoComplete="email"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 outline-none"
                  style={{ 
                    '--tw-ring-color': branding.colors.primary 
                  } as React.CSSProperties & { '--tw-ring-color': string }}
                  onFocus={(e) => e.currentTarget.style.borderColor = branding.colors.primary}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400 w-5 h-5" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  required
                  autoComplete="current-password"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 outline-none"
                  style={{ 
                    '--tw-ring-color': branding.colors.primary 
                  } as React.CSSProperties & { '--tw-ring-color': string }}
                  onFocus={(e) => e.currentTarget.style.borderColor = branding.colors.primary}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 px-4 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{ backgroundColor: branding.colors.primary }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = branding.colors.primaryDark)}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = branding.colors.primary)}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Secure login to your account
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 text-center">
          <p className="text-white/80 text-sm">
            {brandingSettings?.copyright_text || branding.copyright}
          </p>
        </div>
      </div>
    </div>
  );
}
