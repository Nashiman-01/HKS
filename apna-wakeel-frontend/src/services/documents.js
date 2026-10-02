import { API_BASE_URL } from "../lib/apiConfig.js";
import { getStoredSession, persistSession, refreshSession } from "./auth.js";
import { assertApiRoute, fetchWithSessionRefresh } from "./api.js";

const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;

export const DOCUMENT_MAX_SIZE = MAX_DOCUMENT_SIZE;
export const DOCUMENT_ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const allowedExtensions = new Set(["pdf", "docx"]);

export function validateDocument(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !allowedExtensions.has(extension)) return "documents.invalidType";
  if (file.size <= 0) return "documents.emptyFile";
  if (file.size > MAX_DOCUMENT_SIZE) return "documents.tooLarge";
  return "";
}

export async function uploadDocument(file, { accessToken, language, onProgress } = {}) {
  if (!API_BASE_URL) return Promise.reject(new Error("documents_not_connected"));
  try {
    await assertApiRoute("/api/documents", "post");
  } catch (error) {
    if (error.status === 404) throw new Error("documents.backendUnsupported");
    throw error;
  }

  return new Promise((resolve, reject) => {
    const requestUpload = (token, canRefresh = true) => {
      const request = new XMLHttpRequest();
      request.open("POST", `${API_BASE_URL}/api/documents`);
      request.timeout = 120000;
      request.setRequestHeader("Accept", "application/json");
      if (token) request.setRequestHeader("Authorization", `Bearer ${token}`);
      request.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
      });
      request.addEventListener("error", () => reject(new Error("documents.networkError")));
      request.addEventListener("timeout", () => reject(new Error("documents.timeout")));
      request.addEventListener("load", async () => {
      let payload;
      try {
        payload = JSON.parse(request.responseText);
      } catch {
        payload = {};
      }
      if (request.status < 200 || request.status >= 300) {
        if (request.status === 401 && canRefresh && getStoredSession()?.refresh_token) {
          try {
            const refreshed = await refreshSession(getStoredSession().refresh_token);
            requestUpload(refreshed.access_token, false);
            return;
          } catch (refreshError) {
            if (import.meta.env.DEV) console.error("Could not refresh session for document upload:", refreshError);
            persistSession(null);
          }
        }
        const detail = typeof payload.detail === "string" ? payload.detail : `documents.http.${request.status}`;
        reject(new Error(detail));
        return;
      }
      const document = payload?.document;
      if (!document || (typeof document.id !== "string" && typeof document.id !== "number")) {
        reject(new Error("documents_invalid_response"));
        return;
      }
      const status = ["uploaded", "processing", "ready"].includes(document.status) ? document.status : "uploaded";
      resolve({
        id: String(document.id),
        name: typeof document.name === "string" ? document.name : file.name,
        type: typeof document.type === "string" ? document.type : file.type,
        size: Number.isFinite(document.size) ? document.size : file.size,
        status,
      });
      });
      const data = new FormData();
      data.append("file", file, file.name);
      data.append("language", language || "en");
      request.send(data);
    };
    requestUpload(accessToken);
  });
}

async function requestDocuments(path, { accessToken, method = "GET" } = {}) {
  const contractPath = path ? "/api/documents/{document_id}" : "/api/documents";
  try {
    await assertApiRoute(contractPath, method.toLowerCase());
  } catch (error) {
    if (error.status === 404) throw new Error("documents.backendUnsupported");
    throw error;
  }
  const response = await fetchWithSessionRefresh(`${API_BASE_URL}/api/documents${path}`, { method }, accessToken, false);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || `documents.http.${response.status}`);
  return payload;
}

export async function listDocuments({ accessToken }) {
  if (!API_BASE_URL) throw new Error("documents_not_connected");
  const payload = await requestDocuments("", { accessToken });
  return payload.documents || [];
}

export async function deleteDocument({ documentId, accessToken }) {
  if (!API_BASE_URL) throw new Error("documents_not_connected");
  return requestDocuments(`/${encodeURIComponent(documentId)}`, { accessToken, method: "DELETE" });
}