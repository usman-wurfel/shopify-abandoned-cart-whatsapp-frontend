'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/axios';
import { branding } from '@/config/branding';
import { LayoutDashboard, ShoppingCart, MessageSquare, Settings, LogOut, User, Users, Package as PackageIcon, History, FileText } from 'lucide-react';
import { getImageUrl } from '@/lib/config';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [brandingSettings, setBrandingSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [userRes, brandingRes] = await Promise.all([
          apiClient.get('/user').catch(() => ({ data: null })),
          apiClient.get('/branding-settings').catch(() => ({ data: null }))
        ]);

        if (userRes?.data) {
          setUser(userRes.data.user || userRes.data);
        }

        if (brandingRes?.data) {
          setBrandingSettings(brandingRes.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Listen for profile update events
    const handleProfileUpdate = () => {
      apiClient.get('/user').then(res => {
        setUser(res.data.user || res.data);
      });
    };

    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, []);

  const logo = brandingSettings?.logo || branding.logo;
  const logoUrl = logo && (logo.startsWith('http://') || logo.startsWith('https://') || logo.startsWith('/'))
    ? getImageUrl(logo)
    : null;

  const handleLogout = async () => {
    try {
      // Call logout API to revoke token on server
      await apiClient.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API call fails, clear local storage
    } finally {
      // Clear all local storage items
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');

      // Clear any session storage if used
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.clear();
      }

      // Force redirect to login page
      router.push('/login');

      // Force a hard reload to clear any cached state
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const navigationItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  ];

  if (user) {
    if (user.role === 'admin') {
      // Admin specific navigation order
      navigationItems.push(
        { name: 'Customers', href: '/customers', icon: Users },
        { name: 'Abandoned Carts', href: '/abandoned-carts', icon: ShoppingCart },
        { name: 'Packages', href: '/packages', icon: PackageIcon },
        { name: 'Subscriptions', href: '/admin/subscriptions', icon: PackageIcon },
        { name: 'WhatsApp Configs', href: '/whatsapp-configs', icon: MessageSquare },
        { name: 'Privacy Policy', href: '/edit/privacy-policy', icon: FileText },
        { name: 'Settings', href: '/settings', icon: Settings }
      );
    } else {
      // Customer specific navigation order
      navigationItems.push(
        { name: 'Abandoned Carts', href: '/abandoned-carts', icon: ShoppingCart },
        { name: 'WhatsApp Configs', href: '/whatsapp-configs', icon: MessageSquare },
        { name: 'Subscription History', href: '/subscription-history', icon: History },
        { name: 'Settings', href: '/settings', icon: Settings }
      );
    }
  }

  // Shimmer Component
  const Shimmer = ({ className, style }: { className: string; style?: React.CSSProperties }) => (
    <div className={`animate-pulse bg-white/20 ${className}`} style={style}></div>
  );

  return (
    <div className="fixed left-0 top-0 h-full w-64 text-white shadow-xl" style={{ background: `linear-gradient(to bottom, ${branding.colors.secondary}, ${branding.colors.primaryDark})` }}>
      <div className="flex flex-col h-full">
        {/* Logo at Top */}
        <div className="p-6 border-b border-white/20 flex items-center justify-center">
          {loading ? (
            <Shimmer className="h-28 rounded-xl" style={{ width: 'auto', minWidth: '6rem', maxWidth: '12rem' }} />
          ) : (
            logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="rounded-xl object-contain bg-transparent" 
                style={{ width: 'auto', height: '7rem', maxWidth: '100%' }} 
              />
            ) : (
              <div className="text-4xl">{logo}</div>
            )
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {loading ? (
            // Shimmer for Navigation Items
            Array(5).fill(0).map((_, i) => (
              <Shimmer key={i} className="h-12 w-full rounded-lg" />
            ))
          ) : (
            navigationItems.map((item) => {
              const isActive = pathname === item.href;
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                    ? 'text-white shadow-lg'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  style={isActive ? { backgroundColor: branding.colors.primary } : {}}
                >
                  <IconComponent className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })
          )}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-white/20 space-y-3">
          {loading ? (
            <div className="flex items-center space-x-3 p-3">
              <Shimmer className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Shimmer className="h-4 w-24 rounded" />
                <Shimmer className="h-3 w-16 rounded" />
              </div>
            </div>
          ) : (
            user && (
              <Link
                href="/profile"
                className="block p-3 rounded-lg transition-all duration-200 hover:bg-white/10 cursor-pointer"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <div className="flex items-center space-x-3">
                  {user.profile_image ? (
                    <img
                      src={getImageUrl(user.profile_image)}
                      alt={user.name}
                      className="h-10 w-10 rounded-full object-cover border-2 border-white/30"
                    />
                  ) : (
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: branding.colors.primary }}
                    >
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                    <p className="text-xs text-white/70 capitalize">{user.role}</p>
                  </div>
                  <User className="w-4 h-4 text-white/70" />
                </div>
              </Link>
            )
          )}
          {/* Show logout button only for admin */}
          {!loading && user && user.role === 'admin' && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors duration-200 text-white font-medium"
              style={{ backgroundColor: '#dc2626' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          )}
        </div>

        {/* Copyright */}
        <div className="p-4 border-t border-white/20">
          {loading ? (
            <div className="flex justify-center">
              <Shimmer className="h-3 w-48 rounded" />
            </div>
          ) : (
            <p className="text-xs text-white/60 text-center">
              {brandingSettings?.copyright_text || branding.copyright}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
