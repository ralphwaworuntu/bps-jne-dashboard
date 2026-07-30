"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { API_URL, authHeaders } from "@/config";

export type DashboardUser = {
  id?: number;
  email?: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
  shift?: string | null;
  [key: string]: unknown;
};

type DashboardContextValue = {
  user: DashboardUser | null;
  loading: boolean;
  notifications: any[];
  markAllRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  logout: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

function useVisibleInterval(callback: () => void, delayMs: number, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        callback();
      }
    };

    tick();
    const id = window.setInterval(tick, delayMs);
    const onVisibility = () => {
      if (document.visibilityState === "visible") callback();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [callback, delayMs, enabled]);
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  /** false setelah 401 — hentikan poll agar console tidak spam Failed to load resource. */
  const [notifPollingEnabled, setNotifPollingEnabled] = useState(true);
  const notifInFlight = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved) {
      try {
        setIsCollapsed(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/users/me`, {
          headers: authHeaders(token),
        });
        if (!res.ok) throw new Error("Unauthorized");
        const data = await res.json();

        // Probe sekali: hanya aktifkan poll jika endpoint notifikasi menerima token.
        let canPollNotifications = false;
        try {
          const nRes = await fetch(`${API_URL}/notifications/`, {
            headers: authHeaders(token),
          });
          if (nRes.ok) {
            const notes = await nRes.json();
            if (!cancelled) {
              setNotifications(Array.isArray(notes) ? notes : []);
            }
            canPollNotifications = true;
          }
        } catch {
          canPollNotifications = false;
        }

        if (!cancelled) {
          setNotifPollingEnabled(canPollNotifications);
          setUser(data);
        }
      } catch {
        localStorage.removeItem("token");
        if (!cancelled) router.replace("/login");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const refreshNotifications = useCallback(async () => {
    if (!notifPollingEnabled || notifInFlight.current) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    notifInFlight.current = true;
    try {
      const res = await fetch(`${API_URL}/notifications/`, {
        headers: authHeaders(token),
      });

      if (res.status === 401) {
        setNotifPollingEnabled(false);
        return;
      }
      if (!res.ok) return;

      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      /* network blip — diamkan */
    } finally {
      notifInFlight.current = false;
    }
  }, [notifPollingEnabled]);

  const markAllRead = useCallback(async () => {
    if (!notifPollingEnabled) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/notifications/read-all`, {
        method: "POST",
        headers: authHeaders(token),
      });
      if (res.status === 401) {
        setNotifPollingEnabled(false);
        return;
      }
      if (!res.ok) return;
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      /* diamkan */
    }
  }, [notifPollingEnabled]);

  useVisibleInterval(refreshNotifications, 30000, !!user && notifPollingEnabled);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
    setNotifications([]);
    setNotifPollingEnabled(true);
    router.replace("/login");
  }, [router]);

  const toggleSidebar = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem("sidebarCollapsed", JSON.stringify(next));
        return next;
      });
    } else {
      setSidebarOpen((prev) => !prev);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      notifications,
      markAllRead,
      refreshNotifications,
      logout,
      sidebarOpen,
      setSidebarOpen,
      isCollapsed,
      toggleSidebar,
    }),
    [
      user,
      loading,
      notifications,
      markAllRead,
      refreshNotifications,
      logout,
      sidebarOpen,
      isCollapsed,
      toggleSidebar,
    ]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return ctx;
}

/** Opsional: aman dipakai di luar provider (mengembalikan null). */
export function useDashboardOptional() {
  return useContext(DashboardContext);
}
