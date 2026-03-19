const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  avatar: string;
  isGuest: boolean;
  gamesPlayed: number;
  wins: number;
  totalScore: number;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

// ── Email register ────────────────────────────────────────────────────────────

export async function registerWithEmail(
  username: string,
  email: string,
  password: string
): Promise<AuthResult> {
  return post<AuthResult>("/auth/register", { username, email, password });
}

// ── Email login ───────────────────────────────────────────────────────────────

export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  return post<AuthResult>("/auth/login", { email, password });
}

// ── Guest login ───────────────────────────────────────────────────────────────

export async function guestLogin(username: string): Promise<AuthResult> {
  return post<AuthResult>("/auth/guest", { username });
}

// ── Google login ──────────────────────────────────────────────────────────────
// Pass the credential (ID token) from @react-oauth/google's GoogleLogin onSuccess

export async function googleLogin(idToken: string): Promise<AuthResult> {
  return post<AuthResult>("/auth/google", { idToken });
}

// ── Token helpers ─────────────────────────────────────────────────────────────

export function saveAuth(result: AuthResult): void {
  localStorage.setItem("inka_token", result.token);
  localStorage.setItem("inka_user", JSON.stringify(result.user));
}

export function getToken(): string | null {
  return localStorage.getItem("inka_token");
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem("inka_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem("inka_token");
  localStorage.removeItem("inka_user");
}
