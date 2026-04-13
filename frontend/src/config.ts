// Centralized configuration using Next.js Proxy
// Requests starting with /api will be forwarded to the backend
export const API_URL = typeof window !== 'undefined'
    ? `http://${window.location.hostname}:8000`
    : "http://localhost:8000";
