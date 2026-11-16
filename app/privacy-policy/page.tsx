'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/axios';
import { branding } from '@/config/branding';
import { getImageUrl } from '@/lib/config';

export default function PrivacyPolicyPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [brandingSettings, setBrandingSettings] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [policyRes, brandingRes] = await Promise.all([
          apiClient.get('/privacy-policy').catch(() => ({ data: { content: '' } })),
          apiClient.get('/branding-settings').catch(() => ({ data: null })),
        ]);
        setContent(policyRes.data?.content || '');
        if (brandingRes.data) {
          setBrandingSettings(brandingRes.data);
        }
      } catch (err) {
        setContent('');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const logo = brandingSettings?.logo ?? branding.logo;
  const logoUrl = logo && (String(logo).startsWith('http') || String(logo).startsWith('/'))
    ? getImageUrl(logo)
    : null;
  const copyrightText = brandingSettings?.copyright_text ?? branding.copyright;
  const navbarBg = `linear-gradient(to bottom, ${branding.colors.secondary}, ${branding.colors.primaryDark})`;
  const pageBg = `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)`;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg }}>
      {/* Navbar - same color as sidebar */}
      <header
        className="w-full text-white shadow-md"
        style={{ background: navbarBg }}
      >
        <div className="w-full px-6 py-4 flex items-center justify-start">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="w-auto object-contain"
              style={{ height: '6rem' }}
            />
          ) : (
            <span className="text-2xl">{logo}</span>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-600"></div>
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        ) : content ? (
          <article
            className="privacy-policy-content bg-white rounded-xl shadow-sm p-8 text-gray-800"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
            <p>No privacy policy content available yet.</p>
          </div>
        )}
      </main>

      {/* Footer - copyright only */}
      <footer
        className="w-full text-white py-4"
        style={{ background: navbarBg }}
      >
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-white/90">{copyrightText}</p>
        </div>
      </footer>
    </div>
  );
}
