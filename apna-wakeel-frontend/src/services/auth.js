import { API_BASE_URL } from "../lib/apiConfig.js";

const AUTH_SESSION_KEY = "apna-wakeel-session";

function normalizeUser(payload) {
  const email = payload?.email || payload?.user?.email || "";
  const userId = payload?.user_id || payload?.user?.id || payload?.id || "";
  const fullName = payload?.full_name || payload?.user?.user_metadata?.full_name || payload?.user?.full_name || email.split("@")[0] || "";

  return {
    id: userId,
    email,
    user_metadata: { full_name: fullName },
    app_metadata: {},
  };
}

function normalizeSession(payload) {
  if (!payload?.access_token || !payload?.user_id) return null;

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || "",
    token_type: payload.token_type || "bearer",
    user: normalizeUser(payload),
  };
}

export function persistSession(session) {
  if (typeof window === "undefined") return;
  if (session) {
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
  }
}

export function getStoredSession() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token ? parsed : null;
  } catch {
    return null;
  }
}

function apiError(payload, status) {
  const detail = payload?.detail;
  const message = typeof detail === "string"
    ? detail
    : status === 401
      ? "auth.invalidCredentials"
      : status === 403
        ? "auth.forbidden"
        : status === 404
          ? "auth.endpointUnavailable"
          : status === 422
            ? "auth.invalidRequest"
            : status === 429
              ? "auth.rateLimited"
              : status >= 500
                ? "auth.providerError"
                : "auth.genericError";

  const error = new Error(message);
  error.status = status;
  return error;
}

async function requestJson(path, body) {
  if (!API_BASE_URL) {
    const error = new Error("api.notConfigured");
    error.status = 0;
    throw error;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw apiError(payload, response.status);
  return payload;
}

export async function signInWithPassword({ email, password }) {
  const data = await requestJson("/api/auth/login", {
    email: email.trim(),
    password,
  });

  const session = normalizeSession(data);
  if (!session) {
    throw new Error("auth.invalidCredentials");
  }

  persistSession(session);
  return { session, user: session.user };
}

export async function signUpWithPassword({ name, email, password }) {
  const data = await requestJson("/api/auth/signup", {
    email: email.trim(),
    password,
    full_name: name.trim(),
  });

  return {
    user: {
      id: data.user_id,
      email: data.email,
      user_metadata: { full_name: name.trim() },
    },
    message: data.message,
    session: null,
  };
}

export async function signOut() {
  persistSession(null);
}

export async function getCurrentSession() {
  return getStoredSession();
}

export function subscribeToAuthChanges(callback) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event) => {
    if (event.key === AUTH_SESSION_KEY) {
      callback(getStoredSession());
    }
  };

  callback(getStoredSession());
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}