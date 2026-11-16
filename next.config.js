/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled - causes double renders and issues with Shopify embedded apps
  // Ensure static files are served correctly
  trailingSlash: false,

  env: {
    NEXT_PUBLIC_SHOPIFY_API_KEY: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_LARAVEL_URL: process.env.NEXT_PUBLIC_LARAVEL_URL,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors https://*.myshopify.com https://admin.shopify.com https://*.shopify.com;",
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_LARAVEL_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
