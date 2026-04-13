import { API_URL } from "@/config";

export type HCCandidate = {
    id: number;
    created_at: string;
    created_by_user_id: number | null;
    nama: string;
    posisi: string;
    cabang: string;
    no_hp: string;
    email: string | null;
    alamat: string | null;
    tanggal_lahir: string | null;
    pendidikan_terakhir: string | null;
    pengalaman_singkat: string | null;
    sumber: string;
    status: string;
    catatan: string | null;
};

export type HCCandidateCreate = Omit<
    HCCandidate,
    "id" | "created_at" | "created_by_user_id"
>;

export type HCKasbon = {
    id: number;
    created_at: string;
    created_by_user_id: number | null;
    nama_karyawan: string;
    nik: string;
    divisi: string;
    nominal: number;
    tenor_bulan: number;
    alasan: string;
    tanggal_pengajuan: string;
    status: string;
    sisa: number;
    catatan: string | null;
};

export type HCKasbonCreate = {
    nama_karyawan: string;
    nik: string;
    divisi: string;
    nominal: number;
    tenor_bulan: number;
    alasan: string;
    catatan?: string | null;
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

export async function listCandidates(token: string): Promise<HCCandidate[]> {
    const res = await fetch(`${API_URL}/hc/candidates`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

export async function createCandidate(
    token: string,
    payload: HCCandidateCreate
): Promise<HCCandidate> {
    const res = await fetch(`${API_URL}/hc/candidates`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

export async function listKasbon(token: string): Promise<HCKasbon[]> {
    const res = await fetch(`${API_URL}/hc/kasbon`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

export async function createKasbon(
    token: string,
    payload: HCKasbonCreate
): Promise<HCKasbon> {
    const res = await fetch(`${API_URL}/hc/kasbon`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
}

