'use client';

import { Page, Card, Layout, Form, FormLayout, TextField, Checkbox, Button, Banner } from '@shopify/polaris';
import { useState, useCallback } from 'react';
import apiClient from '@/lib/axios';
import { useRouter } from 'next/navigation';

export default function NewTemplatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    twilio_content_sid: '',
    wati_template_name: '',
    is_active: true,
  });

  // Check if required variables are present
  const checkRequiredVariables = (message: string) => {
    const hasOrderNumber = message.includes('{{order_number}}');
    const hasCartUrl = message.includes('{{cart_url}}');
    return { hasOrderNumber, hasCartUrl, allPresent: hasOrderNumber && hasCartUrl };
  };

  const variableStatus = checkRequiredVariables(formData.message);

  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Frontend validation
      if (!variableStatus.allPresent) {
        const missing = [];
        if (!variableStatus.hasOrderNumber) missing.push('{{order_number}}');
        if (!variableStatus.hasCartUrl) missing.push('{{cart_url}}');
        setError(`Template must include the following required variables: ${missing.join(', ')}`);
        setLoading(false);
        return;
      }
      
      await apiClient.post('/message-templates', formData);
      
      router.push('/message-templates');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to create template';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [formData, router, variableStatus]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <Page 
      title="Create Message Template"
      backAction={{ onAction: () => router.back() }}
    >
      <Layout>
        {error && (
          <Layout.Section>
            <Banner tone="critical" onDismiss={() => setError(null)}>
              {error}
            </Banner>
          </Layout.Section>
        )}
        <Layout.Section>
          <Card>
            <Form onSubmit={handleSubmit}>
              <FormLayout>
                <TextField
                  label="Template Name"
                  value={formData.name}
                  onChange={(value) => handleFieldChange('name', value)}
                  requiredIndicator
                  autoComplete="off"
                />
                <TextField
                  label="Message"
                  multiline={6}
                  value={formData.message}
                  onChange={(value) => handleFieldChange('message', value)}
                  requiredIndicator
                  autoComplete="off"
                  helpText={
                    <div>
                      <div className="mb-2">
                        <strong>Required Variables (must include):</strong>
                        <div className="mt-1 space-y-1">
                          <div className={variableStatus.hasOrderNumber ? 'text-green-600' : 'text-red-600'}>
                            {variableStatus.hasOrderNumber ? '✅' : '❌'} {'{{order_number}}'} - Order/Checkout number
                          </div>
                          <div className={variableStatus.hasCartUrl ? 'text-green-600' : 'text-red-600'}>
                            {variableStatus.hasCartUrl ? '✅' : '❌'} {'{{cart_url}}'} - Cart recovery URL
                          </div>
                        </div>
                      </div>
                      <div>
                        <strong>Optional Variables:</strong>
                        <div className="mt-1 space-y-1 text-gray-600">
                          <div>⚪ {'{{customer_name}}'} - Customer name</div>
                          <div>⚪ {'{{total_amount}}'} - Cart total amount</div>
                        </div>
                      </div>
                    </div>
                  }
                />
                <div className="p-4 border border-gray-200 rounded-lg bg-yellow-50">
                  <div className="mb-3">
                    <strong className="text-red-600">⚠️ Important: WhatsApp Template IDs Required</strong>
                    <p className="text-sm text-gray-600 mt-1">
                      Before using this template, you must create and approve it in your WhatsApp Business Manager account.
                      Then enter the Template ID below.
                    </p>
                  </div>
                  <TextField
                    label="Twilio Content SID"
                    value={formData.twilio_content_sid}
                    onChange={(value) => handleFieldChange('twilio_content_sid', value)}
                    helpText="Enter the Content SID from Twilio Content Templates (e.g., HXb5b62575e6e4ff6129ad7c8efe1f983e). Leave empty if not using Twilio."
                    placeholder="HXb5b62575e6e4ff6129ad7c8efe1f983e"
                    autoComplete="off"
                  />
                  <TextField
                    label="WATI Template Name"
                    value={formData.wati_template_name}
                    onChange={(value) => handleFieldChange('wati_template_name', value)}
                    helpText="Enter the template name from WATI approved templates. Leave empty if not using WATI."
                    placeholder="abandoned_cart_reminder"
                    autoComplete="off"
                  />
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                    <strong>How to get Template IDs:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-gray-700">
                      <li><strong>Twilio:</strong> Go to Twilio Console → Content Templates → Copy Content SID</li>
                      <li><strong>WATI:</strong> Go to WATI Dashboard → Templates → Copy Template Name</li>
                      <li>Template must match your message content and include the same variables</li>
                      <li>Template must be approved by WhatsApp before use</li>
                    </ul>
                  </div>
                </div>
                {formData.message && (
                  <div className="p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="mb-2 font-semibold">Preview:</div>
                    <div className="p-3 bg-gray-50 rounded border border-gray-200 whitespace-pre-wrap text-sm">
                      {formData.message
                        .replace(/\{\{order_number\}\}/g, '#12345')
                        .replace(/\{\{cart_url\}\}/g, 'https://store.com/cart/recover/abc123')
                        .replace(/\{\{customer_name\}\}/g, 'John Doe')
                        .replace(/\{\{total_amount\}\}/g, '$99.99')}
                    </div>
                  </div>
                )}
                <Checkbox
                  label="Active"
                  checked={formData.is_active}
                  onChange={(value) => handleFieldChange('is_active', value)}
                />
                {!variableStatus.allPresent && (
                  <Banner tone="warning">
                    Please include all required variables: {!variableStatus.hasOrderNumber && '{{order_number}} '}
                    {!variableStatus.hasCartUrl && '{{cart_url}}'}
                  </Banner>
                )}
                <Button 
                  submit 
                  loading={loading} 
                  variant="primary"
                  disabled={!variableStatus.allPresent}
                >
                  Create Template
                </Button>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

