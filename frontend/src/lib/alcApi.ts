import { API_URL, authHeaders } from "@/config";

export type PenjualanKind = "SCO" | "APEX";

export type PenjualanUpload = {
    id: number;
    kind: PenjualanKind;
    month: number;
    year: number;
    original_filename: string;
    row_count: number;
    uploaded_by: string | null;
    created_at: string;
};

export type PenjualanRow = Record<string, string>;

export type PenjualanMatchStats = {
    sco_awb_count: number;
    apex_awb_count: number;
    matched_awb_count: number;
    only_sco_count: number;
    only_apex_count: number;
    merged_row_count: number;
    periods_paired: number;
    periods_incomplete: number;
    awb_count_equal: boolean;
    awb_content_equal: boolean;
};

export type PenjualanPage = {
    items: PenjualanRow[];
    total: number;
    page: number;
    limit: number;
    pages: number;
    columns: string[];
    uploads_count?: number;
    match?: PenjualanMatchStats;
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

export async function uploadPenjualan(params: {
    kind: PenjualanKind;
    file: File;
    month: number;
    year: number;
}): Promise<{ message: string; upload: PenjualanUpload }> {
    const form = new FormData();
    form.append("file", params.file);
    form.append("month", String(params.month));
    form.append("year", String(params.year));

    let res: Response;
    try {
        res = await fetch(`${API_URL}/alc/penjualan/upload/${params.kind}`, {
            method: "POST",
            headers: authHeaders(),
            body: form,
        });
    } catch {
        throw new Error(
            "Tidak bisa terhubung ke server. Pastikan backend API (port 8000) sedang berjalan, lalu coba lagi."
        );
    }
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

export async function listPenjualanUploads(kind?: PenjualanKind): Promise<PenjualanUpload[]> {
    const query = kind ? `?kind=${encodeURIComponent(kind)}` : "";
    const res = await fetch(`${API_URL}/alc/penjualan/uploads${query}`, {
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await parseError(res));
    const body = (await res.json()) as { items: PenjualanUpload[] };
    return body.items ?? [];
}

export async function fetchPenjualan(params: {
    nama?: string;
    tipe?: "Cabang" | "Agen";
    page?: number;
    limit?: number;
    q?: string;
}): Promise<PenjualanPage> {
    const search = new URLSearchParams({
        page: String(params.page ?? 1),
        limit: String(params.limit ?? 50),
    });
    if (params.nama) search.set("nama", params.nama);
    if (params.tipe) search.set("tipe", params.tipe);
    if (params.q) search.set("q", params.q);

    const res = await fetch(`${API_URL}/alc/penjualan?${search.toString()}`, {
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}
