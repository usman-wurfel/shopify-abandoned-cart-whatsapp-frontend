import ClientLayout from './ClientLayout';

/**
 * Root Layout for Shopify Embedded App
 * Per https://shopify.dev/docs/apps/build/authentication-authorization/session-tokens
 * and https://shopify.dev/docs/api/app-bridge-library:
 * - meta name="shopify-api-key" must be in <head>
 * - App Bridge CDN script must be in <head>
 * 
 * IMPORTANT: Using raw <script> tag instead of next/script
 * so it appears in view-source HTML for Shopify's automated checks
 */
const shopifyApiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Required for Shopify embedded app - App Bridge reads this */}
        <meta name="shopify-api-key" content={shopifyApiKey} />
        {/* App Bridge CDN script - MUST appear in initial HTML for Shopify checks */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
