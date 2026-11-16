// Configuration helper functions
export const getBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    // Server-side
    return process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 
           process.env.NEXT_PUBLIC_LARAVEL_URL || 
           'http://localhost:8000';
  }
  // Client-side
  return process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 
         process.env.NEXT_PUBLIC_LARAVEL_URL || 
         'http://localhost:8000';
};

export const getImageUrl = (path: string): string => {
  if (!path) return '';
  
  // If it's already a full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // If it's a relative path, prepend base URL
  if (path.startsWith('/')) {
    return `${getBaseUrl()}${path}`;
  }
  
  // Otherwise return as is (might be emoji or other)
  return path;
};

