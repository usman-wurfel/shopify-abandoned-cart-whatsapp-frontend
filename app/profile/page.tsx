'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import apiClient from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { branding } from '@/config/branding';
import { getImageUrl } from '@/lib/config';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { User, Mail, Lock, Upload, X, Phone } from 'lucide-react';

// Image Dropzone Component
function ImageDropzone({ 
  value, 
  onChange, 
  label,
  onUserUpdate 
}: { 
  value: string | null; 
  onChange: (url: string) => void; 
  label: string;
  onUserUpdate?: (user: any) => void;
}) {
  const [preview, setPreview] = useState<string | null>(value);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(value);
    // Clear local preview when value changes from server
    if (!value) {
      setLocalPreview(null);
    }
  }, [value]);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setLocalPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      // First upload the image
      const formData = new FormData();
      formData.append('profile_image', file);

      const uploadResponse = await apiClient.post('/upload/profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (uploadResponse.data.success && uploadResponse.data.url) {
        // Then save the URL to profile
        const saveResponse = await apiClient.put('/profile', {
          profile_image: uploadResponse.data.url,
        });

        if (saveResponse.data.success) {
          const imageUrl = saveResponse.data.user?.profile_image || uploadResponse.data.url;
          
          // Update preview state
          setPreview(imageUrl);
          setLocalPreview(null); // Clear local preview after successful upload
          
          // Update parent form data safely
          try {
            onChange(imageUrl || '');
          } catch (error) {
            console.error('Error calling onChange:', error);
          }
          
          // Notify parent component to update user state safely
          if (onUserUpdate && saveResponse.data.user) {
            try {
              onUserUpdate(saveResponse.data.user);
            } catch (error) {
              console.error('Error updating user state:', error);
            }
          }
          
          // Dispatch event to update sidebar
          try {
            window.dispatchEvent(new Event('profile-updated'));
          } catch (error) {
            console.error('Error dispatching event:', error);
          }
          
          toast.success('Profile image updated successfully');
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setLocalPreview(null); // Clear local preview on error
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const removeImage = async () => {
    try {
      const response = await apiClient.put('/profile', {
        remove_profile_image: true,
      });

      if (response.data.success) {
        // Clear all preview states
        setPreview(null);
        setLocalPreview(null);
        onChange('');
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Notify parent component to update user state
        if (onUserUpdate) {
          onUserUpdate(response.data.user);
        }
        
        // Dispatch event to update sidebar
        window.dispatchEvent(new Event('profile-updated'));
        
        toast.success('Profile image removed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove image');
    }
  };

  // Show local preview if available, otherwise show server preview
  const displayImage = useMemo(() => {
    if (localPreview) {
      return localPreview;
    }
    if (!preview) {
      return null;
    }
    try {
      return getImageUrl(preview);
    } catch (error) {
      console.error('Error getting image URL:', error, preview);
      return preview; // Fallback to original value
    }
  }, [localPreview, preview]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          uploading
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        {uploading ? (
          <div className="flex flex-col items-center">
            <div className="relative inline-block">
              {localPreview && (
                <img
                  src={localPreview}
                  alt="Profile Preview"
                  className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-white shadow-lg opacity-50"
                />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-sm text-gray-600 font-medium">Uploading...</p>
              </div>
            </div>
          </div>
        ) : displayImage ? (
          <div className="relative inline-block">
            <img
              src={displayImage || ''}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-white shadow-lg"
              onError={(e) => {
                // If image fails to load, hide it and log error
                const target = e.target as HTMLImageElement;
                console.error('Image load error for URL:', displayImage);
                target.style.display = 'none';
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeImage();
              }}
              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg z-10"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="w-12 h-12 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Click or drag image here</p>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 2MB</p>
          </div>
        )}
      </div>
      {displayImage && !uploading && (
        <p className="text-xs text-gray-500 text-center mt-2">
          Profile photo preview
        </p>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    profile_image: null as string | null,
  });

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
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
      }

      const response = await apiClient.get('/user');
      const userData = response.data.user || response.data;
      setUser(userData);
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        password: '',
        confirmPassword: '',
        profile_image: userData.profile_image || null,
      });
    } catch (error: any) {
      console.error('Error fetching user:', error);
      if (error.response?.status === 401) {
        router.push('/login');
      } else {
        toast.error('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
      };

      // Add phone if user is customer
      if (user && user.role === 'customer' && formData.phone !== undefined) {
        updateData.phone = formData.phone;
      }

      // Add password only if user is admin
      if (user && user.role === 'admin' && formData.password) {
        updateData.password = formData.password;
      }

      const response = await apiClient.put('/profile', updateData);

      if (response.data.success) {
        toast.success('Profile updated successfully');
        const updatedUser = response.data.user;
        setUser(updatedUser);
        setFormData(prev => ({
          ...prev,
          email: updatedUser.email || prev.email,
          phone: updatedUser.phone || prev.phone,
          password: '',
          confirmPassword: '',
          profile_image: updatedUser.profile_image || prev.profile_image,
        }));
      }
    } catch (error: any) {
      console.error('Update error:', error);
      const res = error.response?.data;
      // Duplicate email (422 validation)
      if (error.response?.status === 422 && res?.errors?.email?.length) {
        toast.error(res.errors.email[0] || 'This email is already in use.');
        return;
      }
      toast.error(res?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 p-8" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-6" style={{ color: branding.colors.secondary }}>
            Edit Profile
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Image */}
            <ImageDropzone
              value={formData.profile_image}
              onChange={(url) => setFormData(prev => ({ ...prev, profile_image: url }))}
              label="Profile Image"
              onUserUpdate={(updatedUser) => {
                try {
                  if (updatedUser && updatedUser.profile_image !== undefined) {
                    setUser(updatedUser);
                    setFormData(prev => ({
                      ...prev,
                      profile_image: updatedUser.profile_image || prev.profile_image,
                    }));
                  }
                } catch (error) {
                  console.error('Error updating user state in parent component:', error);
                }
              }}
            />

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Full Name
                </div>
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                required
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 outline-none"
                style={{ 
                  '--tw-ring-color': branding.colors.primary 
                } as React.CSSProperties & { '--tw-ring-color': string }}
                onFocus={(e) => e.currentTarget.style.borderColor = branding.colors.primary}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                placeholder="Enter your full name"
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Address
                </div>
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                required
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 outline-none"
                style={{
                  '--tw-ring-color': branding.colors.primary
                } as React.CSSProperties & { '--tw-ring-color': string }}
                onFocus={(e) => e.currentTarget.style.borderColor = branding.colors.primary}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                placeholder="Enter your email"
              />
            </div>

            {/* Phone Field - Only for customers */}
            {user && user.role === 'customer' && (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    Phone Number
                  </div>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 outline-none"
                  style={{ 
                    '--tw-ring-color': branding.colors.primary 
                  } as React.CSSProperties & { '--tw-ring-color': string }}
                  onFocus={(e) => e.currentTarget.style.borderColor = branding.colors.primary}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  placeholder="Enter your phone number"
                />
              </div>
            )}

            {/* Password Field - Only for admin */}
            {user && user.role === 'admin' && (
              <>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center">
                      <Lock className="w-4 h-4 mr-2" />
                      New Password (leave blank to keep current)
                    </div>
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 outline-none"
                    style={{ 
                      '--tw-ring-color': branding.colors.primary 
                    } as React.CSSProperties & { '--tw-ring-color': string }}
                    onFocus={(e) => e.currentTarget.style.borderColor = branding.colors.primary}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    placeholder="Enter new password"
                  />
                </div>

                {/* Confirm Password Field */}
                {formData.password && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center">
                        <Lock className="w-4 h-4 mr-2" />
                        Confirm Password
                      </div>
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 transition-all duration-200 outline-none"
                      style={{ 
                        '--tw-ring-color': branding.colors.primary 
                      } as React.CSSProperties & { '--tw-ring-color': string }}
                      onFocus={(e) => e.currentTarget.style.borderColor = branding.colors.primary}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                      placeholder="Confirm new password"
                    />
                  </div>
                )}
              </>
            )}

            {/* Submit Button */}
            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 text-white py-3 px-6 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{ backgroundColor: branding.colors.primary }}
                onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = branding.colors.primaryDark)}
                onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = branding.colors.primary)}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

