import { API_URL } from "@/config";

export type ITUser = {
    id: number;
    email: string;
    full_name: string | null;
    role: string;
    department: string | null;
    shift: string | null;
    is_active: boolean;
    created_at: string;
};

export type RoleOption = {
    section: string;
    role: string;
    description: string;
};

export type UserCreatePayload = {
    email: string;
    password: string;
    full_name?: string;
    role: string;
    department?: string;
    shift?: string;
};

export type UserUpdatePayload = {
    full_name?: string | null;
    role?: string;
    department?: string | null;
    shift?: string | null;
    is_active?: boolean;
};

export type SystemErrorLog = {
    id: number;
    created_at: string;
    level: string;
    source: string;
    path: string | null;
    method: string | null;
    message: string;
    traceback: string | null;
};

async function parseError(res: Response): Promise<string> {
    try {
        const j = await res.json();
        if (typeof j?.detail === "string") return j.detail;
        return JSON.stringify(j);
    } catch {
        return res.statusText || "Request gagal";
    }
}

function authHeaders(token: string, json = false): HeadersInit {
    const h: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (json) h["Content-Type"] = "application/json";
    return h;
}

export async function listRoles(token: string): Promise<RoleOption[]> {
    const res = await fetch(`${API_URL}/it/roles`, {
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

export async function listUsers(token: string, q?: string): Promise<ITUser[]> {
    const params = new URLSearchParams();
    if (q?.trim()) params.set("q", q.trim());
    const qs = params.toString();
    const res = await fetch(
        `${API_URL}/it/users${qs ? `?${qs}` : ""}`,
        { headers: authHeaders(token) }
    );
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

export async function createUser(
    token: string,
    payload: UserCreatePayload
): Promise<ITUser> {
    const res = await fetch(`${API_URL}/it/users`, {
        method: "POST",
        headers: authHeaders(token, true),
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

export async function updateUser(
    token: string,
    userId: number,
    payload: UserUpdatePayload
): Promise<ITUser> {
    const res = await fetch(`${API_URL}/it/users/${userId}`, {
        method: "PATCH",
        headers: authHeaders(token, true),
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

export async function resetUserPassword(
    token: string,
    userId: number,
    newPassword: string
): Promise<ITUser> {
    const res = await fetch(`${API_URL}/it/users/${userId}/reset-password`, {
        method: "POST",
        headers: authHeaders(token, true),
        body: JSON.stringify({ new_password: newPassword }),
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

export async function listErrorLogs(
    token: string,
    limit = 100
): Promise<SystemErrorLog[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    const res = await fetch(`${API_URL}/it/error-logs?${params.toString()}`, {
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

export async function clearErrorLogs(token: string): Promise<{ deleted: number }> {
    const res = await fetch(`${API_URL}/it/error-logs`, {
        method: "DELETE",
        headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

export type SysServiceStatus = {
    status: string;
    latency_ms?: number | null;
    backend?: string;
    detail?: string;
    workers?: number;
    active_tasks?: number;
    reserved_tasks?: number;
    scheduled_tasks?: number;
    queue_depth?: number | null;
    version?: string | null;
    connections?: number | null;
    size_bytes?: number | null;
    used_memory_bytes?: number | null;
    used_memory_human?: string | null;
    connected_clients?: number | null;
    uptime_days?: number | null;
};

export type SysJobKindStats = {
    kind: string;
    completed_24h: number;
    failed_24h: number;
    fail_rate_24h: number;
    p50_seconds: number | null;
    p95_seconds: number | null;
    sample_size: number;
};

export type SysPerformance = {
    collected_at: string;
    host: {
        hostname: string;
        platform: string;
        uptime_seconds: number | null;
    };
    cpu: {
        percent: number;
        count: number;
        load_avg: Array<number | null>;
    };
    memory: {
        total_bytes: number;
        used_bytes: number;
        percent: number;
    };
    swap?: {
        total_bytes: number;
        used_bytes: number;
        percent: number;
    };
    disk: Array<{
        mount: string;
        fstype?: string;
        total_bytes: number;
        used_bytes: number;
        percent: number;
    }>;
    processes?: Array<{
        role: string;
        pid: number | null;
        name: string | null;
        cpu_percent: number;
        rss_bytes: number;
        count: number;
    }>;
    units?: Array<{
        name: string;
        active: string;
        detail?: string | null;
    }>;
    ports?: Array<{
        name: string;
        host: string;
        port: number;
        open: boolean;
        status: string;
    }>;
    services: {
        api: SysServiceStatus;
        database: SysServiceStatus;
        redis: SysServiceStatus;
        celery: SysServiceStatus;
    };
    jobs: {
        queued: number;
        running: number;
        failed_last_24h: number;
        completed_last_24h: number;
        success_rate_24h: number;
        processing_score: number;
        latency_p50_seconds?: number | null;
        latency_p95_seconds?: number | null;
        by_kind?: SysJobKindStats[];
        recent: Array<{
            id: string;
            kind: string;
            status: string;
            percent: number;
            message: string;
            updated_at?: string;
        }>;
    };
    errors: {
        last_24h: number;
        critical_last_24h: number;
        stability_score: number;
    };
    uploads: {
        tracked_files: number;
        newest_age_hours: number | null;
        activity_score: number;
        total_bytes?: number;
        sized_files?: number;
        folders?: Array<{ name: string; bytes: number; files: number }>;
    };
    gauges: {
        overall: number;
        backend: number;
        processing: number;
        hardware: number;
        traffic: number;
        stability: number;
        cpu: number;
        memory: number;
        disk: number;
        swap?: number;
    };
};

export async function getSysPerformance(token: string): Promise<SysPerformance> {
    const res = await fetch(`${API_URL}/it/sys-performance`, {
        headers: authHeaders(token),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}
