const BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'}/api/v1`;

let accessToken: string | null = null;

export async function initAuth(): Promise<void> {
  const refreshed = await fetchRefreshToken();
  if (refreshed) {
    accessToken = refreshed;
    return;
  }
  accessToken = await fetchNewToken();
}

export function getAccessToken(): string | null {
  return accessToken;
}

export async function refreshAuth(): Promise<boolean> {
  const token = await fetchRefreshToken();
  if (!token) return false;
  accessToken = token;
  return true;
}

async function fetchNewToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/auth/token`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json();
    return data.accessToken ?? null;
  } catch {
    return null;
  }
}

async function fetchRefreshToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.accessToken ?? null;
  } catch {
    return null;
  }
}
