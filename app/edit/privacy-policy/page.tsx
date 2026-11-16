'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/axios';
import { branding } from '@/config/branding';
import { FileText, Save } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export default function EditPrivacyPolicyPage() {
  const [privacyPolicyContent, setPrivacyPolicyContent] = useState('');
  const [privacyPolicyLoading, setPrivacyPolicyLoading] = useState(false);
  const [savingPrivacyPolicy, setSavingPrivacyPolicy] = useState(false);
  const [loading, setLoading] = useState(true);

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link'],
      ['clean'],
    ],
  };

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      setLoading(true);
      // Page loads without login - fetch content (GET /privacy-policy is public)
      await fetchPrivacyPolicy();
    } catch (err: any) {
      toast.error('Failed to load privacy policy');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrivacyPolicy = async () => {
    try {
      setPrivacyPolicyLoading(true);
      const response = await apiClient.get('/privacy-policy');
      setPrivacyPolicyContent(response.data.content || '');
    } catch (err: any) {
      toast.error('Failed to load privacy policy', { autoClose: 3000 });
    } finally {
      setPrivacyPolicyLoading(false);
    }
  };

  const handleSavePrivacyPolicy = async () => {
    try {
      setSavingPrivacyPolicy(true);
      await apiClient.put('/privacy-policy', { content: privacyPolicyContent });
      toast.success('Privacy policy saved successfully!', { autoClose: 3000 });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save privacy policy', { autoClose: 5000 });
    } finally {
      setSavingPrivacyPolicy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 p-8" style={{ background: `linear-gradient(to bottom right, ${branding.colors.primaryLight}, #f9fafb)` }}>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <FileText className="w-8 h-8" style={{ color: branding.colors.primary }} />
            <h1 className="text-3xl font-bold text-gray-900">Edit Privacy Policy</h1>
          </div>
          <p className="text-gray-600">Manage the privacy policy content for your application.</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          {privacyPolicyLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="ml-3 text-gray-600">Loading privacy policy...</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Privacy Policy Content</label>
                <div className="border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden">
                  <ReactQuill
                    value={privacyPolicyContent}
                    onChange={(value) => setPrivacyPolicyContent(value)}
                    modules={quillModules}
                    theme="snow"
                    placeholder="Enter your privacy policy content here."
                    className="quill-privacy-editor"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">Use the toolbar above to format your text.</p>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSavePrivacyPolicy}
                  disabled={savingPrivacyPolicy}
                  className="flex items-center space-x-2 px-6 py-3 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  style={{ backgroundColor: branding.colors.primary }}
                  onMouseEnter={(e) => !savingPrivacyPolicy && (e.currentTarget.style.backgroundColor = branding.colors.primaryDark)}
                  onMouseLeave={(e) => !savingPrivacyPolicy && (e.currentTarget.style.backgroundColor = branding.colors.primary)}
                >
                  {savingPrivacyPolicy ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Save Privacy Policy</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
