'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Spinner, BlockStack, Text, Card, Layout, Page } from '@shopify/polaris';
import { getBaseUrl } from '@/lib/config';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 
                (process.env.NEXT_PUBLIC_LARAVEL_URL ? `${process.env.NEXT_PUBLIC_LARAVEL_URL}/api` : `${getBaseUrl()}/api`);

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_URL}/customer/dashboard`, {
        withCredentials: true,
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.status === 200) {
        setIsAuthenticated(true);
      }
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400" align="center">
                <Spinner size="large" />
                <Text as="p">Checking authentication...</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}

