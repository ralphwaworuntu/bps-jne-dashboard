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
    const url = new URL(`${API_URL}/it/users`);
    if (q?.trim()) url.searchParams.set("q", q.trim());
    const res = await fetch(url.toString(), {
        headers: authHeaders(token),
    });
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
    const url = new URL(`${API_URL}/it/error-logs`);
    url.searchParams.set("limit", String(limit));
    const res = await fetch(url.toString(), {
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
