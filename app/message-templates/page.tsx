'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { branding } from '@/config/branding';
import { Plus, Edit, Trash2, CheckCircle2, XCircle, Eye } from 'lucide-react';

export default function MessageTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
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
      
      // Fetch templates
      await fetchTemplates();
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        router.push('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to load templates');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await apiClient.get('/message-templates');
      setTemplates(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load templates');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure?')) return;
    try {
      await apiClient.delete(`/message-templates/${id}`);
      fetchTemplates();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const isAdmin = user?.role === 'admin';

  const rows = templates.map((template) => {
    const customerInfo = template.customer?.user 
      ? `${template.customer.user.name} (${template.customer.business_name || template.customer.shop_domain || 'N/A'})`
      : '';
    
    const actions = isAdmin ? (
      <button
        className="p-2 bg-gray-400 text-white rounded-lg cursor-not-allowed opacity-50"
        title="View Only (Admin)"
        disabled
      >
        <Eye className="w-4 h-4" />
      </button>
    ) : (
      <div className="flex space-x-2">
        <button
          onClick={() => router.push(`/message-templates/${template.id}/edit`)}
          className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110"
          title="Edit Template"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleDelete(template.id)}
          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110"
          title="Delete Template"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );

    const status = template.is_active ? (
      <span className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        <CheckCircle2 className="w-3 h-3" />
        <span>Active</span>
      </span>
    ) : (
      <span className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
        <XCircle className="w-3 h-3" />
        <span>Inactive</span>
      </span>
    );

    if (isAdmin) {
      return [
        template.name || 'Unnamed',
        template.message ? template.message.substring(0, 50) + '...' : '',
        customerInfo,
        status,
        actions,
      ];
    } else {
      return [
        template.name || 'Unnamed',
        template.message ? template.message.substring(0, 50) + '...' : '',
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
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  const headings = isAdmin 
    ? ['Name', 'Message', 'Customer', 'Status', 'Actions']
    : ['Name', 'Message', 'Status', 'Actions'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 p-8" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold" style={{ color: branding.colors.secondary }}>
              Message Templates
            </h1>
            {!isAdmin && (
              <button
                onClick={() => router.push('/message-templates/new')}
                className="flex items-center space-x-2 px-6 py-3 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                style={{ backgroundColor: branding.colors.primary }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = branding.colors.primaryDark}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = branding.colors.primary}
              >
                <Plus className="w-5 h-5" />
                <span>Create Template</span>
              </button>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {templates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                {isAdmin 
                  ? 'No message templates found. Customers can create their templates.' 
                  : 'Create message templates for your reminders.'}
              </p>
              {!isAdmin && (
                <button
                  onClick={() => router.push('/message-templates/new')}
                  className="flex items-center space-x-2 px-6 py-3 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                  style={{ backgroundColor: branding.colors.primary }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = branding.colors.primaryDark}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = branding.colors.primary}
                >
                  <Plus className="w-5 h-5" />
                  <span>Create Template</span>
                </button>
              )}
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}

