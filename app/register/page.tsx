'use client';

import { Page, Card, Layout, Form, FormLayout, TextField, Button, Banner } from '@shopify/polaris';
import { useState, useCallback } from 'react';
import apiClient from '@/lib/axios';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post('/register', formData);
      
      if (response.data.success && response.data.token) {
        const userData = response.data.user;
        // Store token in localStorage
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        router.push('/');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Registration failed.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [formData, router]);

  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <Page title="Register" narrowWidth>
      <Layout>
        <Layout.Section>
          <Card>
            <Form onSubmit={handleSubmit}>
              <FormLayout>
                {error && (
                  <Banner tone="critical" onDismiss={() => setError(null)}>
                    {error}
                  </Banner>
                )}
                
                <TextField
                  label="Name"
                  value={formData.name}
                  onChange={(value) => handleFieldChange('name', value)}
                  requiredIndicator
                  autoComplete="name"
                />
                
                <TextField
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(value) => handleFieldChange('email', value)}
                  requiredIndicator
                  autoComplete="email"
                />
                
                <TextField
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(value) => handleFieldChange('password', value)}
                  requiredIndicator
                  autoComplete="new-password"
                />
                
                <TextField
                  label="Confirm Password"
                  type="password"
                  value={formData.password_confirmation}
                  onChange={(value) => handleFieldChange('password_confirmation', value)}
                  requiredIndicator
                  autoComplete="new-password"
                />
                
                <Button submit loading={loading} variant="primary" fullWidth>
                  Register
                </Button>
                
                <Button onClick={() => router.push('/login')} variant="plain">
                  Already have an account? Login
                </Button>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

