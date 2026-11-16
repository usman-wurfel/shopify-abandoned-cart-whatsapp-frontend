import axios from 'axios';

// Get API URL - Use relative /api path in browser to leverage Next.js rewrite proxy
// This avoids CORS issues since requests go through the same origin
const getApiUrl = () => {
  // In browser: ALWAYS use relative /api path
  // Next.js rewrite rule proxies /api/* to NEXT_PUBLIC_LARAVEL_URL/api/*
  // This keeps requests same-origin (no CORS issues)
  if (typeof window !== 'undefined') {
    return '/api';
  }
  
  // Server-side: use explicit API URL
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  if (process.env.NEXT_PUBLIC_LARAVEL_URL) {
    return `${process.env.NEXT_PUBLIC_LARAVEL_URL}/api`;
  }
  
  return 'http://localhost:8000/api';
};

const API_URL = getApiUrl();

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Add token to requests (embedded app: session token; standalone: auth_token)
// Per https://shopify.dev/docs/apps/build/authentication-authorization/session-tokens
// Session token must be fetched fresh on each request (1 min lifetime)
apiClient.interceptors.request.use(
  async (config) => {
    if (typeof window === 'undefined') return config;

    // Embedded app: use session token from App Bridge (backend auto-creates customer if needed).
    // Do NOT redirect when embedded – that's blocked by browsers and causes loops.
    const isEmbedded = window.self !== window.top;
    if (isEmbedded) {
      try {
        const { getSessionTokenForApi } = await import('@/lib/sessionTokenForApi');
        const sessionToken = await getSessionTokenForApi();
        if (sessionToken) {
          config.headers.Authorization = `Bearer ${sessionToken}`;
          console.log('[Shopify] ✅ Session token obtained for:', config.url);
          return config;
        } else {
          console.warn('[Shopify] ⚠️ No session token available for:', config.url);
          // Don't reject - try without token, backend might handle it
        }
      } catch (e) {
        console.error('[Shopify] ❌ Failed to get session token:', e);
      }
    }
    
    // Standalone: use OAuth auth_token from localStorage
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const is401 = error.response?.status === 401;
    const config = error.config;
    const errorMessage = error.response?.data?.message || '';

    if (typeof window === 'undefined' || !config) {
      return Promise.reject(error);
    }

    const isEmbedded = window.self !== window.top;
    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get('shop') || sessionStorage.getItem('shopify_shop');

    // Embedded 401: don't redirect (browser blocks it, causes loops), just reject
    if (is401 && isEmbedded) {
      console.error('[Shopify] 401 in embedded app.', { shop, errorMessage, requestUrl: config.url });
      return Promise.reject(error);
    }

    // Standalone 401: redirect to login if not already there
    if (is401 && !window.location.pathname.includes('/login')) {
      const noRedirectPaths = ['/edit/privacy-policy', '/privacy-policy'];
      const isPublicPath = noRedirectPaths.some((p) => window.location.pathname.startsWith(p));
      const isOAuthFlow = urlParams.has('shop') || urlParams.has('token');

      if (!isPublicPath && !isOAuthFlow) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

