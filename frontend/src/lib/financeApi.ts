import { API_URL } from "@/config";

export type FinanceFileMeta = {
    id: number;
    original_filename: string;
    created_at: string;
};

export type MyFilesResponse = {
    rekening_koran: FinanceFileMeta | null;
    bukti_transaksi: FinanceFileMeta | null;
};

export async function fetchMyFinanceFiles(token: string): Promise<MyFilesResponse> {
    const res = await fetch(`${API_URL}/finance/my-files`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        const t = await res.text();
        throw new Error(t || res.statusText);
    }
    return res.json();
}

export async function downloadFinanceFile(token: string, uploadId: number): Promise<Blob> {
    const res = await fetch(`${API_URL}/finance/download/${uploadId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Gagal mengunduh file dari server");
    return res.blob();
}

export async function uploadRekeningKoranApi(
    token: string,
    blob: Blob,
    filename: string
): Promise<FinanceFileMeta & { message?: string }> {
    const form = new FormData();
    form.append(
        "file",
        new File([blob], filename, { type: blob.type || "application/octet-stream" })
    );
    const res = await fetch(`${API_URL}/finance/upload/rekening-koran`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    });
    if (!res.ok) {
        let detail = res.statusText;
        try {
            const j = await res.json();
            detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
        } catch {
            /* ignore */
        }
        throw new Error(detail);
    }
    return res.json();
}

export async function uploadBuktiTransaksiApi(
    token: string,
    blob: Blob,
    filename: string
): Promise<FinanceFileMeta & { message?: string }> {
    const form = new FormData();
    form.append(
        "file",
        new File([blob], filename, { type: blob.type || "application/octet-stream" })
    );
    const res = await fetch(`${API_URL}/finance/upload/bukti-transaksi`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    });
    if (!res.ok) {
        let detail = res.statusText;
        try {
            const j = await res.json();
            detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
        } catch {
            /* ignore */
        }
        throw new Error(detail);
    }
    return res.json();
}

export function formatUploadedLabelFromIso(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return (
        d.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        }) +
        " · " +
        d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    );
}
