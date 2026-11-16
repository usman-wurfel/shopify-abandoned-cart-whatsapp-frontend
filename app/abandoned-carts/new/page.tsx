'use client';

import { Page, Card, Layout, Form, FormLayout, TextField, Button, Banner } from '@shopify/polaris';
import { useState, useCallback } from 'react';
import apiClient from '@/lib/axios';
import { useRouter } from 'next/navigation';

export default function NewCartPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    cart_total: '',
    cart_url: '',
  });

  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await apiClient.post('/abandoned-carts', {
        ...formData,
        cart_total: formData.cart_total ? parseFloat(formData.cart_total) : 0,
      });
      
      router.push('/abandoned-carts');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create cart');
    } finally {
      setLoading(false);
    }
  }, [formData, router]);

  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <Page 
      title="Add Abandoned Cart"
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
                  label="Customer Name"
                  value={formData.customer_name}
                  onChange={(value) => handleFieldChange('customer_name', value)}
                  autoComplete="off"
                />
                <TextField
                  label="Customer Phone"
                  value={formData.customer_phone}
                  onChange={(value) => handleFieldChange('customer_phone', value)}
                  requiredIndicator
                  autoComplete="off"
                />
                <TextField
                  label="Customer Email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(value) => handleFieldChange('customer_email', value)}
                  autoComplete="off"
                />
                <TextField
                  label="Cart Total"
                  type="number"
                  value={formData.cart_total}
                  onChange={(value) => handleFieldChange('cart_total', value)}
                  prefix="$"
                  autoComplete="off"
                />
                <TextField
                  label="Cart URL"
                  type="url"
                  value={formData.cart_url}
                  onChange={(value) => handleFieldChange('cart_url', value)}
                  autoComplete="off"
                />
                <Button submit loading={loading} variant="primary">
                  Create Cart
                </Button>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

