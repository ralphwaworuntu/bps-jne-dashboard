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

export type SysSpeedTestResult = {
    status: string;
    tested_at: string;
    provider?: string;
    latency_ms: number | null;
    jitter_ms: number | null;
    download_mbps: number | null;
    upload_mbps: number | null;
    download_bytes?: number;
    upload_bytes?: number;
    download_ms?: number | null;
    upload_ms?: number | null;
    probe?: string;
    detail?: string | null;
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
    network?: {
        latency: {
            status: string;
            probe?: string;
            latency_ms: number | null;
            jitter_ms: number | null;
            min_ms?: number | null;
            max_ms?: number | null;
            samples?: number;
            detail?: string;
        };
        interface: {
            bytes_sent: number;
            bytes_recv: number;
            tx_mbps: number | null;
            rx_mbps: number | null;
            sample_seconds?: number;
            detail?: string;
        };
        last_speedtest?: SysSpeedTestResult | null;
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

export type CloudStorageSettings = {
    enabled: boolean;
    provider: string;
    endpoint_url: string | null;
    region: string | null;
    bucket: string | null;
    prefix: string;
    access_key_id: string | null;
    secret_access_key_masked: string | null;
    secret_access_key_set: boolean;
    hot_days: number;
    size_trigger_gb: number;
    keep_local_pivots: boolean;
    hydrate_cache_gb: number;
    modules: string[];
    last_run_at: string | null;
    last_error: string | null;
    bytes_archived: number;
    bytes_local_uploads?: number | null;
    updated_at: string | null;
    updated_by_email: string | null;
};

export type CloudStorageSettingsUpdate = {
    enabled?: boolean;
    provider?: string;
    endpoint_url?: string | null;
    region?: string | null;
    bucket?: string | null;
    prefix?: string;
    access_key_id?: string | null;
    secret_access_key?: string;
    hot_days?: number;
    size_trigger_gb?: number;
    keep_local_pivots?: boolean;
    hydrate_cache_gb?: number;
    modules?: string[];
};

export type StorageCandidate = {
    path: string;
    module: string;
    bytes: number;
    age_days: number;
    remote_key: string;
};

export type StorageInventory = {
    enabled?: boolean;
    dry_run?: boolean;
    uploads_total_bytes: number;
    uploads_sized_files: number;
    folders: Array<{ name: string; bytes: number; files: number }>;
    size_trigger_gb: number;
    size_trigger_hit: boolean;
    hot_days: number;
    modules: string[];
    keep_local_pivots: boolean;
    scanned_files: number;
    already_cold: number;
    candidate_count: number;
    candidate_bytes: number;
    should_run: boolean;
    trigger: string;
    candidates: StorageCandidate[];
    candidates_truncated: number;
    policy?: {
        hot_days: number;
        size_trigger_gb: number;
        keep_local_pivots: boolean;
        hydrate_cache_gb: number;
        modules: string[];
        trigger: string;
        keep_local: string[];
    };
};

export type StorageTestResult = {
    ok: boolean;
    status: string;
    detail?: string;
    bucket?: string;
    endpoint_url?: string | null;
    provider?: string;
};

export async function getStorageSettings(token: string): Promise<CloudStorageSettings> {
    const res = await fetch(`${API_URL}/it/storage-settings`, {
        headers: authHeaders(token),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

export async function putStorageSettings(
    token: string,
    payload: CloudStorageSettingsUpdate
): Promise<CloudStorageSettings> {
    const res = await fetch(`${API_URL}/it/storage-settings`, {
        method: "PUT",
        headers: authHeaders(token, true),
        body: JSON.stringify(payload),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

export async function testStorageConnection(token: string): Promise<StorageTestResult> {
    const res = await fetch(`${API_URL}/it/storage-settings/test-connection`, {
        method: "POST",
        headers: authHeaders(token),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

export async function getStorageInventory(token: string): Promise<StorageInventory> {
    const res = await fetch(`${API_URL}/it/storage-settings/inventory`, {
        headers: authHeaders(token),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

export async function archiveStorageNow(
    token: string,
    dryRun = true
): Promise<StorageInventory & { job?: { id: string; status: string; message: string } }> {
    const params = new URLSearchParams({ dry_run: dryRun ? "true" : "false" });
    const res = await fetch(`${API_URL}/it/storage-settings/archive-now?${params}`, {
        method: "POST",
        headers: authHeaders(token),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

export async function runSysSpeedTest(token: string): Promise<SysSpeedTestResult> {
    const res = await fetch(`${API_URL}/it/sys-performance/speed-test`, {
        method: "POST",
        headers: authHeaders(token),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}
