const DEFAULT_BASE_URL = 'http://localhost:3267';

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL;
}

export function getAuthToken() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem('auth_token');
}

export function setAuthToken(token: string) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem('auth_token', token);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem('auth_token');
}

export async function apiRequest(
  path: string,
  options: RequestInit = {},
  { auth = false }: { auth?: boolean } = {}
) {
  const baseUrl = getApiBaseUrl();
  const headers = new Headers(options.headers ?? {});
  const hasFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (!hasFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers
  });
}
