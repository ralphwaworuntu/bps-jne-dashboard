import { API_URL, authHeaders } from "@/config";

export type MasterDataKind = string;

export type MasterDataColorClass =
    | "blue"
    | "emerald"
    | "orange"
    | "purple"
    | "rose"
    | "cyan";

export type MasterDataKindDef = {
    kind: MasterDataKind;
    label: string;
    description: string;
    tab_label: string;
    color_class: MasterDataColorClass;
    columns: string[];
    is_builtin: boolean;
    card_group: string | null;
    sort_order: number;
};

export type MasterDataUpload = {
    id: number;
    kind: MasterDataKind;
    original_filename: string;
    row_count: number;
    uploaded_by: string | null;
    created_at: string;
    label: string;
    columns: string[];
    is_active?: boolean;
};

export type MasterDataUploadHistoryItem = {
    id: number;
    kind: MasterDataKind;
    original_filename: string;
    row_count: number;
    uploaded_by: string | null;
    created_at: string;
    is_active: boolean;
    downloadable: boolean;
};

export type MasterDataPage = {
    items: Record<string, string>[];
    total: number;
    page: number;
    limit: number;
    pages: number;
    columns: string[];
    upload: MasterDataUpload | null;
    message?: string;
};

async function parseError(res: Response): Promise<string> {
    try {
        const body = await res.json();
        if (typeof body?.detail === "string") return body.detail;
        return JSON.stringify(body);
    } catch {
        return res.statusText || "Request gagal";
    }
}

export async function listMasterDataKinds(): Promise<MasterDataKindDef[]> {
    const res = await fetch(`${API_URL}/ops/master-data/kinds`, {
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await parseError(res));
    const body = (await res.json()) as { items: MasterDataKindDef[] };
    return body.items ?? [];
}

export async function createMasterDataKind(payload: {
    label: string;
    description?: string;
    columns: string[];
    color_class?: MasterDataColorClass;
    tab_label?: string;
}): Promise<MasterDataKindDef> {
    const res = await fetch(`${API_URL}/ops/master-data/kinds`, {
        method: "POST",
        headers: {
            ...authHeaders(),
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await parseError(res));
    const body = (await res.json()) as { item: MasterDataKindDef };
    return body.item;
}

export async function deleteMasterDataKind(kind: MasterDataKind): Promise<void> {
    const res = await fetch(`${API_URL}/ops/master-data/kinds/${encodeURIComponent(kind)}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await parseError(res));
}

export async function listMasterDataUploadHistory(): Promise<
    Partial<Record<MasterDataKind, MasterDataUploadHistoryItem[]>>
> {
    const res = await fetch(`${API_URL}/ops/master-data/uploads/history`, {
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await parseError(res));
    const body = (await res.json()) as {
        items: Partial<Record<MasterDataKind, MasterDataUploadHistoryItem[]>>;
    };
    return body.items ?? {};
}

export async function downloadMasterDataUpload(
    kind: MasterDataKind,
    uploadId: number
): Promise<Blob> {
    const res = await fetch(
        `${API_URL}/ops/master-data/${encodeURIComponent(kind)}/download/${uploadId}`,
        { headers: authHeaders() }
    );
    if (!res.ok) throw new Error(await parseError(res));
    return res.blob();
}

export async function listMasterDataUploads(): Promise<
    Partial<Record<MasterDataKind, MasterDataUpload | null>>
> {
    const res = await fetch(`${API_URL}/ops/master-data/uploads`, {
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await parseError(res));
    const body = (await res.json()) as {
        items: Partial<Record<MasterDataKind, MasterDataUpload | null>>;
    };
    return body.items ?? {};
}

export async function uploadMasterData(
    kind: MasterDataKind,
    file: File
): Promise<{ message: string; upload: MasterDataUpload; rows: number; columns: string[] }> {
    const form = new FormData();
    form.append("file", file);

    let res: Response;
    try {
        res = await fetch(`${API_URL}/ops/master-data/upload/${kind}`, {
            method: "POST",
            headers: authHeaders(),
            body: form,
        });
    } catch {
        throw new Error(
            "Tidak bisa terhubung ke server. Pastikan backend API (port 8000) sedang berjalan."
        );
    }
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

export async function fetchMasterData(params: {
    kind: MasterDataKind;
    page?: number;
    limit?: number;
    q?: string;
}): Promise<MasterDataPage> {
    const search = new URLSearchParams({
        page: String(params.page ?? 1),
        limit: String(params.limit ?? 50),
    });
    if (params.q) search.set("q", params.q);

    const res = await fetch(
        `${API_URL}/ops/master-data/${params.kind}?${search.toString()}`,
        { headers: authHeaders() }
    );
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}
