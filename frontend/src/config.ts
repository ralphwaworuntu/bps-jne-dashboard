// Browser memanggil /api/* → Next.js rewrite ke backend :8000 (lihat next.config.ts).
// Override opsional: NEXT_PUBLIC_API_URL (contoh http://127.0.0.1:8000 untuk bypass proxy).
export const API_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")) ||
  "/api";

/** Header Authorization standar. */
export function authHeaders(token?: string | null): HeadersInit {
  const t = token ?? (typeof window !== "undefined" ? localStorage.getItem("token") : null);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/**
 * URL file di /uploads yang aman untuk <img>/<a> (token di query,
 * karena browser tidak mengirim Authorization header pada src gambar).
 */
export function mediaUrl(path: string, token?: string | null): string {
  const t = token ?? (typeof window !== "undefined" ? localStorage.getItem("token") : null);
  let normalized = (path || "").replace(/\\/g, "/").trim();
  if (!normalized) return API_URL;

  if (/^https?:\/\//i.test(normalized)) {
    if (!t) return normalized;
    const sep = normalized.includes("?") ? "&" : "?";
    return `${normalized}${sep}token=${encodeURIComponent(t)}`;
  }

  // "/uploads/..." atau "uploads/..." → "/api/uploads/..."
  normalized = normalized.replace(/^\//, "");
  const base = `${API_URL}/${normalized}`;
  if (!t) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}token=${encodeURIComponent(t)}`;
}
