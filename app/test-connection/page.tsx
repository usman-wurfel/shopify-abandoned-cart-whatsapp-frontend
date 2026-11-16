'use client';

import { Page, Card, Layout, Banner, Button, BlockStack, Text } from '@shopify/polaris';
import { useState } from 'react';
import axios from 'axios';
import { getBaseUrl } from '@/lib/config';

const LARAVEL_URL = process.env.NEXT_PUBLIC_LARAVEL_URL || getBaseUrl();

export default function TestConnectionPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await axios.get(`${LARAVEL_URL}/test`, {
        withCredentials: true,
        headers: { 'Accept': 'application/json' },
      });
      setResult({ success: true, data: response.data });
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
        code: error.code,
        details: error.response?.data || 'No response from server',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Test Laravel Connection">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Test Laravel Server Connection</Text>
              <Text as="p">Click the button below to test if Laravel server is accessible.</Text>
              
              <Button onClick={testConnection} loading={loading} variant="primary">
                Test Connection
              </Button>

              {result && (
                <>
                  {result.success ? (
                    <Banner tone="success" title="Connection Successful!">
                      <p>Laravel server is running and accessible.</p>
                      <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </Banner>
                  ) : (
                    <Banner tone="critical" title="Connection Failed">
                      <BlockStack gap="200">
                        <p><strong>Error:</strong> {result.error}</p>
                        {result.code && <p><strong>Code:</strong> {result.code}</p>}
                        <details>
                          <summary style={{ cursor: 'pointer', marginTop: '10px' }}>Details</summary>
                          <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                        {result.code === 'ERR_CONNECTION_REFUSED' && (
                          <Banner tone="info">
                            <p><strong>Solution:</strong> Make sure Laravel server is running:</p>
                            <code style={{ display: 'block', marginTop: '10px', padding: '10px', background: '#f5f5f5' }}>
                              php artisan serve
                            </code>
                          </Banner>
                        )}
                      </BlockStack>
                    </Banner>
                  )}
                </>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

