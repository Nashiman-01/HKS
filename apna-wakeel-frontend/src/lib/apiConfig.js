const configuredApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");

export const API_BASE_URL = configuredApiUrl.replace(/\/$/, "");