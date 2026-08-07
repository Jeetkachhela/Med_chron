export function getApiBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  url = url.trim().replace(/\/+$/, '');
  
  // If NEXT_PUBLIC_API_URL was set to root domain without /api/v1 (e.g. https://med-chron.onrender.com),
  // automatically append /api/v1 to prevent 404 errors.
  if (!url.endsWith('/api/v1') && !url.endsWith('/api')) {
    url = `${url}/api/v1`;
  } else if (url.endsWith('/api')) {
    url = `${url}/v1`;
  }
  return url;
}

export const API_BASE = getApiBaseUrl();
