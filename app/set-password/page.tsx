'use client';

import { useState, useCallback, useEffect } from 'react';
import apiClient from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { branding } from '@/config/branding';
import { getImageUrl } from '@/lib/config';
import { Lock, AlertCircle } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function SetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [formData, setFormData] = useState({
    password: '',
    password_confirmation: '',
  });

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await apiClient.get('/user');
      const userData = response.data.user || response.data;
      
      // If password is already set, redirect to dashboard
      if (userData.password_set_at || !userData.needs_password) {
        router.push('/');
        return;
      }
      
      setChecking(false);
    } catch (error: any) {
      console.error('Error checking user status:', error);
      if (error.response?.status === 401) {
        router.push('/login');
      } else {
        toast.error('Failed to verify user status');
        setChecking(false);
      }
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.password_confirmation) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/set-password', {
        password: formData.password,
        password_confirmation: formData.password_confirmation,
      });

      if (response.data.success) {
        toast.success('Password set successfully! Redirecting to dashboard...');
        
        // Update user in localStorage
        const updatedUser = response.data.user;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Check if coming from Shopify OAuth (shop parameter)
        const urlParams = new URLSearchParams(window.location.search);
        const shop = urlParams.get('shop');
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
          // Redirect to root (dashboard) - shop parameter not needed after password is set
          router.push('/');
        }, 1500);
      }
    } catch (err: any) {
      console.error('Set password error:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to set password. Please try again.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [formData, router]);

  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, ${branding.colors.primaryDark} 0%, ${branding.colors.primary} 50%, ${branding.colors.secondary} 100%)` }}
    >
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
            <Lock className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Set Your Password</h1>
          <p className="text-white/80">Please set a password to secure your account</p>
        </div>

        {/* Password Setup Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center">
                  <Lock className="w-4 h-4 mr-2" />
                  New Password
                </div>
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                required
                minLength={6}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 outline-none"
                style={{ 
                  '--tw-ring-color': branding.colors.primary 
                } as React.CSSProperties & { '--tw-ring-color': string }}
                onFocus={(e) => e.currentTarget.style.borderColor = branding.colors.primary}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                placeholder="Enter your password (min 6 characters)"
              />
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center">
                  <Lock className="w-4 h-4 mr-2" />
                  Confirm Password
                </div>
              </label>
              <input
                id="password_confirmation"
                type="password"
                value={formData.password_confirmation}
                onChange={(e) => handleFieldChange('password_confirmation', e.target.value)}
                required
                minLength={6}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 outline-none"
                style={{ 
                  '--tw-ring-color': branding.colors.primary 
                } as React.CSSProperties & { '--tw-ring-color': string }}
                onFocus={(e) => e.currentTarget.style.borderColor = branding.colors.primary}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                placeholder="Confirm your password"
              />
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
                  Setting password...
                </span>
              ) : (
                'Set Password'
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="text-blue-600 mr-2 w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-600">
                This is a one-time password setup. After setting your password, you'll be redirected to the dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

