'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/axios';
import { branding } from '@/config/branding';
import { Package as PackageIcon, Plus, Trash2, Edit, X } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface PackageData {
  id?: number;
  name: string;
  description: string;
  type: 'free' | 'paid';
  price: number | '';
  duration_days: number | '';
  is_active: boolean;
  api_key_allowed: boolean;
}

const defaultPackageData: PackageData = {
  name: '',
  description: '',
  type: 'free',
  price: '',
  duration_days: 30,
  is_active: true,
  api_key_allowed: false,
};

export default function PackagesPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any | null>(null);
  const [formData, setFormData] = useState<PackageData>(defaultPackageData);

  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
    ],
  };

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
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
      } else {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (!token) {
          router.push('/login');
          return;
        }
      }

      // Fetch user info
      const userResponse = await apiClient.get('/user');
      const userData = userResponse.data.user || userResponse.data;
      setUser(userData);

      // Only admin allowed
      if (userData.role !== 'admin') {
        toast.error('Admin access required');
        router.push('/');
        return;
      }

      await fetchPackages();
    } catch (err: any) {
      console.error('Error:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
        }
        router.push('/login');
      } else {
        toast.error('Failed to load packages');
        setLoading(false);
      }
    }
  };

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/packages');
      setPackages(response.data || []);
    } catch (error: any) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to fetch packages');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(defaultPackageData);
    setEditingPackage(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (pkg: any) => {
    setEditingPackage(pkg);
    setFormData({
      id: pkg.id,
      name: pkg.name || '',
      description: pkg.description || '',
      type: pkg.type || 'free',
      price: pkg.type === 'paid' ? Number(pkg.price) : '',
      duration_days: pkg.duration_days || 30,
      is_active: pkg.is_active ?? true,
      api_key_allowed: pkg.api_key_allowed ?? false,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (!saving) {
      setShowModal(false);
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (formData.type === 'paid' && (formData.price === '' || Number(formData.price) < 0)) {
      toast.error('Please enter a valid price for paid package');
      return;
    }
    if (formData.duration_days === '' || Number(formData.duration_days) <= 0) {
      toast.error('Please enter valid duration in days');
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        type: formData.type,
        is_active: formData.is_active,
        api_key_allowed: formData.api_key_allowed,
        duration_days: Number(formData.duration_days),
      };
      if (formData.type === 'paid') {
        payload.price = Number(formData.price);
      }

      if (editingPackage) {
        // Update existing package
        const response = await apiClient.put(`/packages/${editingPackage.id}`, payload);
        toast.success(response.data?.message || 'Package updated');
      } else {
        // Create new package
        const response = await apiClient.post('/packages', payload);
        toast.success(response.data?.message || 'Package created');
      }

      closeModal();
      await fetchPackages();
    } catch (error: any) {
      console.error('Error saving package:', error);
      toast.error(error.response?.data?.message || 'Failed to save package');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pkg: any) => {
    if (!confirm(`Delete package "${pkg.name}"?`)) return;
    try {
      setDeletingId(pkg.id);
      const response = await apiClient.delete(`/packages/${pkg.id}`);
      toast.success(response.data?.message || 'Package deleted');
      await fetchPackages();
    } catch (error: any) {
      console.error('Error deleting package:', error);
      toast.error(error.response?.data?.message || 'Failed to delete package');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (pkg: any) => {
    try {
      setTogglingId(pkg.id);
      const response = await apiClient.put(`/packages/${pkg.id}`, {
        is_active: !pkg.is_active,
      });
      toast.success(response.data?.message || 'Status updated');
      await fetchPackages();
    } catch (error: any) {
      console.error('Error toggling status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading && packages.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 p-8" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 transform transition-all max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{ color: branding.colors.secondary }}>
                {editingPackage ? 'Edit Package' : 'Create New Package'}
              </h2>
              <button
                onClick={closeModal}
                disabled={saving}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Free, Pro, Enterprise"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'free' | 'paid', price: e.target.value === 'free' ? '' : formData.price })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Price {formData.type === 'paid' && <span className="text-xs text-gray-400">(USD)</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.type === 'paid' ? formData.price : 0}
                    disabled={formData.type === 'free'}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? '' : Number(e.target.value) })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formData.type === 'free' ? 'bg-gray-100 text-gray-400' : ''}`}
                    placeholder={formData.type === 'paid' ? 'e.g. 19.99' : '0.00'}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Duration (days) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. 30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_active: true })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.is_active ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      style={formData.is_active ? { backgroundColor: branding.colors.primary } : {}}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_active: false })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        !formData.is_active ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      style={!formData.is_active ? { backgroundColor: '#9ca3af' } : {}}
                    >
                      Inactive
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">API Key Allow</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, api_key_allowed: !formData.api_key_allowed })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      formData.api_key_allowed 
                        ? 'bg-green-500 focus:ring-green-500' 
                        : 'bg-gray-300 focus:ring-gray-400'
                    }`}
                    title={formData.api_key_allowed ? 'Click to disable API key' : 'Click to allow API key'}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.api_key_allowed ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <p className="text-xs text-gray-500">Allow API key access for this package</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <div className="border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
                  <ReactQuill
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    modules={quillModules}
                    theme="snow"
                    placeholder="Add bullets, bold text, lists, etc."
                    className="quill-package-editor"
                  />
                </div>
                <p className="text-xs text-gray-500">You can add bullets, bold, lists, links, etc.</p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: branding.colors.primary }}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      {editingPackage ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingPackage ? 'Update Package' : 'Create Package'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: branding.colors.primaryLight }}
              >
                <PackageIcon className="w-6 h-6" style={{ color: branding.colors.primary }} />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Packages</h1>
            </div>
            <p className="text-gray-600">
              Create and manage pricing packages for your Shopify app users.
            </p>
          </div>
        </div>

        {/* Packages List */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Existing Packages</h2>
              <p className="text-sm text-gray-500">Total: {packages.length}</p>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
              style={{ backgroundColor: branding.colors.primary }}
            >
              <Plus className="w-5 h-5" />
              <span>Create Package</span>
            </button>
          </div>

          {packages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No packages created yet. Click the button above to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration (days)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API Key Allow</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {packages.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{pkg.name}</div>
                        <div className="text-xs text-gray-500">ID: {pkg.id}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                          {pkg.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {pkg.type === 'free' ? 'Free' : `$${Number(pkg.price).toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {pkg.duration_days ?? '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(pkg)}
                          disabled={togglingId === pkg.id}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            pkg.is_active 
                              ? 'bg-green-500 focus:ring-green-500' 
                              : 'bg-gray-300 focus:ring-gray-400'
                          }`}
                          title={pkg.is_active ? 'Click to deactivate' : 'Click to activate'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              pkg.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                          {togglingId === pkg.id && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          pkg.api_key_allowed 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {pkg.api_key_allowed ? 'Allowed' : 'Not Allowed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openEditModal(pkg)}
                            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110"
                            title="Edit Package"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(pkg)}
                            disabled={deletingId === pkg.id}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete Package"
                          >
                            {deletingId === pkg.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
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
