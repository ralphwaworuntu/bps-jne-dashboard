"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
    Cloud,
    HardDrive,
    Loader2,
    PlugZap,
    Save,
    ScanSearch,
    Snowflake,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import {
    archiveStorageNow,
    getStorageInventory,
    getStorageSettings,
    putStorageSettings,
    testStorageConnection,
    type CloudStorageSettings,
    type StorageInventory,
} from "@/lib/itApi";

const MODULE_OPTIONS = [
    { id: "all_shipment", label: "all_shipment (Inbound / CTC / UNRS)" },
    { id: "kiriman_yes", label: "kiriman_yes" },
    { id: "alc_penjualan", label: "alc_penjualan" },
    { id: "jobs", label: "jobs (raw leftovers)" },
    { id: "lastmile", label: "lastmile" },
    { id: "firstmile", label: "firstmile" },
    { id: "master", label: "master" },
    { id: "ops_master_data", label: "ops_master_data" },
];

function formatBytes(n: number | null | undefined) {
    if (n == null || n <= 0) return "—";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let v = n;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i += 1;
    }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatWhen(iso: string | null | undefined) {
    if (!iso) return "Belum pernah";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("id-ID");
}

export default function StorageSettingsPanel() {
    const router = useRouter();
    const { showToast } = useToast();
    const [settings, setSettings] = useState<CloudStorageSettings | null>(null);
    const [inventory, setInventory] = useState<StorageInventory | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const [secretInput, setSecretInput] = useState("");

    const [form, setForm] = useState({
        enabled: false,
        provider: "bebox",
        endpoint_url: "",
        region: "auto",
        bucket: "",
        prefix: "bps-jne/",
        access_key_id: "",
        hot_days: 45,
        size_trigger_gb: 100,
        keep_local_pivots: true,
        hydrate_cache_gb: 5,
        modules: ["all_shipment", "kiriman_yes", "alc_penjualan", "jobs"] as string[],
    });

    const applySettings = useCallback((s: CloudStorageSettings) => {
        setSettings(s);
        setForm({
            enabled: s.enabled,
            provider: s.provider || "bebox",
            endpoint_url: s.endpoint_url || "",
            region: s.region || "auto",
            bucket: s.bucket || "",
            prefix: s.prefix || "bps-jne/",
            access_key_id: s.access_key_id || "",
            hot_days: s.hot_days,
            size_trigger_gb: s.size_trigger_gb,
            keep_local_pivots: s.keep_local_pivots,
            hydrate_cache_gb: s.hydrate_cache_gb,
            modules: s.modules?.length
                ? s.modules
                : ["all_shipment", "kiriman_yes", "alc_penjualan", "jobs"],
        });
        setSecretInput("");
    }, []);

    const load = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/");
            return;
        }
        setLoading(true);
        try {
            const [s, inv] = await Promise.all([
                getStorageSettings(token),
                getStorageInventory(token),
            ]);
            applySettings(s);
            setInventory(inv);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "error";
            if (msg.toLowerCase().includes("akses ditolak") || msg.includes("403")) {
                showToast("Halaman ini hanya untuk Super Admin / Admin IT.", "error");
            } else {
                showToast(`Gagal memuat pengaturan penyimpanan: ${msg}`, "error");
            }
        } finally {
            setLoading(false);
        }
    }, [applySettings, router, showToast]);

    useEffect(() => {
        load();
    }, [load]);

    const triggerHit = useMemo(() => {
        const total = settings?.bytes_local_uploads ?? inventory?.uploads_total_bytes ?? 0;
        const limit = (form.size_trigger_gb || 100) * 1024 * 1024 * 1024;
        return total >= limit;
    }, [form.size_trigger_gb, inventory?.uploads_total_bytes, settings?.bytes_local_uploads]);

    const handleSave = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        setSaving(true);
        try {
            const payload: Parameters<typeof putStorageSettings>[1] = {
                enabled: form.enabled,
                provider: form.provider,
                endpoint_url: form.endpoint_url.trim() || null,
                region: form.region.trim() || "auto",
                bucket: form.bucket.trim() || null,
                prefix: form.prefix.trim() || "bps-jne/",
                access_key_id: form.access_key_id.trim() || null,
                hot_days: Number(form.hot_days) || 45,
                size_trigger_gb: Number(form.size_trigger_gb) || 100,
                keep_local_pivots: form.keep_local_pivots,
                hydrate_cache_gb: Number(form.hydrate_cache_gb) || 5,
                modules: form.modules,
            };
            if (secretInput.trim()) {
                payload.secret_access_key = secretInput.trim();
            }
            const saved = await putStorageSettings(token, payload);
            applySettings(saved);
            showToast("Pengaturan API penyimpanan disimpan.", "success");
        } catch (e) {
            showToast(e instanceof Error ? e.message : "Gagal menyimpan.", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        setTesting(true);
        try {
            const res = await testStorageConnection(token);
            if (res.ok) {
                showToast(res.detail || "Koneksi berhasil.", "success");
            } else {
                showToast(res.detail || "Koneksi gagal.", "error");
            }
        } catch (e) {
            showToast(e instanceof Error ? e.message : "Tes koneksi gagal.", "error");
        } finally {
            setTesting(false);
        }
    };

    const handleScan = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        setScanning(true);
        try {
            const inv = await getStorageInventory(token);
            setInventory(inv);
            showToast(
                `${inv.candidate_count} kandidat cold · ${formatBytes(inv.candidate_bytes)}`,
                "success"
            );
        } catch (e) {
            showToast(e instanceof Error ? e.message : "Gagal memindai.", "error");
        } finally {
            setScanning(false);
        }
    };

    const handleArchive = async (dryRun: boolean) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        setArchiving(true);
        try {
            const res = await archiveStorageNow(token, dryRun);
            if (dryRun) {
                setInventory(res);
                showToast(
                    `Dry-run: ${res.candidate_count} file akan diarsipkan (${formatBytes(res.candidate_bytes)}).`,
                    "success"
                );
            } else if (res.job) {
                showToast(
                    `Job archive ${res.job.id.slice(0, 8)}… ${res.job.status}`,
                    "success"
                );
            }
        } catch (e) {
            showToast(e instanceof Error ? e.message : "Archive gagal.", "error");
        } finally {
            setArchiving(false);
        }
    };

    const toggleModule = (id: string) => {
        setForm((prev) => {
            const has = prev.modules.includes(id);
            return {
                ...prev,
                modules: has
                    ? prev.modules.filter((m) => m !== id)
                    : [...prev.modules, id],
            };
        });
    };

    if (loading && !settings) {
        return (
            <div className="flex items-center justify-center gap-2 py-24 text-secondary">
                <Loader2 className="size-5 animate-spin" />
                Memuat pengaturan penyimpanan…
            </div>
        );
    }

    const localBytes =
        settings?.bytes_local_uploads ?? inventory?.uploads_total_bytes ?? 0;

    return (
        <div className="flex flex-col gap-6">
            <div className="rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                Pivot / stats tetap di VPS. Detail CSV lebih tua dari hot window
                dipindah ke BEBOX lalu dibaca on-demand (hydrate cache). Filter
                tanggal lama tidak diblokir — tabel detail menampilkan progres
                unduh dari BEBOX.
            </div>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatusCard
                    icon={<HardDrive className="size-5 text-primary" />}
                    label="Uploads lokal"
                    value={formatBytes(localBytes)}
                    hint={triggerHit ? `Melebihi trigger ${form.size_trigger_gb} GB` : `Trigger ${form.size_trigger_gb} GB`}
                />
                <StatusCard
                    icon={<Snowflake className="size-5 text-primary" />}
                    label="Kandidat cold"
                    value={String(inventory?.candidate_count ?? "—")}
                    hint={formatBytes(inventory?.candidate_bytes)}
                />
                <StatusCard
                    icon={<Cloud className="size-5 text-primary" />}
                    label="Sudah diarsipkan"
                    value={formatBytes(settings?.bytes_archived)}
                    hint={formatWhen(settings?.last_run_at)}
                />
                <StatusCard
                    icon={<PlugZap className="size-5 text-primary" />}
                    label="API"
                    value={form.enabled ? "Aktif" : "Nonaktif"}
                    hint={settings?.last_error || settings?.bucket || "Belum tes koneksi"}
                />
            </section>

            {settings?.last_error ? (
                <p className="rounded-[var(--radius-card)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    Error terakhir: {settings.last_error}
                </p>
            ) : null}

            <section className="rounded-[var(--radius-card)] border border-border bg-white p-5">
                <h3 className="mb-1 font-semibold text-foreground">Koneksi API</h3>
                <p className="mb-4 text-sm text-secondary">
                    Koneksi API BEBOX (endpoint, access key, secret, bucket/prefix).
                    Secret disimpan terenkripsi; kosongkan
                    field secret untuk mempertahankan yang sudah tersimpan
                    {settings?.secret_access_key_set
                        ? ` (${settings.secret_access_key_masked || "••••"}).`
                        : "."}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="font-semibold text-secondary">Endpoint URL</span>
                        <input
                            className="rounded-[var(--radius-button)] border border-border px-3 py-2"
                            placeholder="https://api.bebox.example"
                            value={form.endpoint_url}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, endpoint_url: e.target.value }))
                            }
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="font-semibold text-secondary">Region</span>
                        <input
                            className="rounded-[var(--radius-button)] border border-border px-3 py-2"
                            value={form.region}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, region: e.target.value }))
                            }
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="font-semibold text-secondary">Bucket</span>
                        <input
                            className="rounded-[var(--radius-button)] border border-border px-3 py-2"
                            value={form.bucket}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, bucket: e.target.value }))
                            }
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="font-semibold text-secondary">Prefix</span>
                        <input
                            className="rounded-[var(--radius-button)] border border-border px-3 py-2"
                            value={form.prefix}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, prefix: e.target.value }))
                            }
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="font-semibold text-secondary">Access key</span>
                        <input
                            className="rounded-[var(--radius-button)] border border-border px-3 py-2"
                            value={form.access_key_id}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, access_key_id: e.target.value }))
                            }
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="font-semibold text-secondary">Secret access key</span>
                        <input
                            type="password"
                            autoComplete="new-password"
                            className="rounded-[var(--radius-button)] border border-border px-3 py-2"
                            placeholder={
                                settings?.secret_access_key_set
                                    ? "Biarkan kosong untuk tidak mengubah"
                                    : "Secret"
                            }
                            value={secretInput}
                            onChange={(e) => setSecretInput(e.target.value)}
                        />
                    </label>
                </div>
                <label className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                    <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={form.enabled}
                        onChange={(e) =>
                            setForm((p) => ({ ...p, enabled: e.target.checked }))
                        }
                    />
                    Aktifkan archive ke BEBOX
                </label>
            </section>

            <section className="rounded-[var(--radius-card)] border border-border bg-white p-5">
                <h3 className="mb-4 font-semibold text-foreground">Kebijakan hot / cold</h3>
                <div className="grid gap-3 md:grid-cols-3">
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="font-semibold text-secondary">Hot window (hari)</span>
                        <input
                            type="number"
                            min={1}
                            max={3650}
                            className="rounded-[var(--radius-button)] border border-border px-3 py-2"
                            value={form.hot_days}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, hot_days: Number(e.target.value) }))
                            }
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="font-semibold text-secondary">Trigger ukuran (GB)</span>
                        <input
                            type="number"
                            min={1}
                            className="rounded-[var(--radius-button)] border border-border px-3 py-2"
                            value={form.size_trigger_gb}
                            onChange={(e) =>
                                setForm((p) => ({
                                    ...p,
                                    size_trigger_gb: Number(e.target.value),
                                }))
                            }
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="font-semibold text-secondary">Cache hydrate (GB)</span>
                        <input
                            type="number"
                            min={1}
                            max={500}
                            className="rounded-[var(--radius-button)] border border-border px-3 py-2"
                            value={form.hydrate_cache_gb}
                            onChange={(e) =>
                                setForm((p) => ({
                                    ...p,
                                    hydrate_cache_gb: Number(e.target.value),
                                }))
                            }
                        />
                    </label>
                </div>
                <label className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                    <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={form.keep_local_pivots}
                        onChange={(e) =>
                            setForm((p) => ({
                                ...p,
                                keep_local_pivots: e.target.checked,
                            }))
                        }
                    />
                    Pertahankan pivot / stats di VPS
                </label>
                <p className="mt-2 text-xs text-secondary">
                    Archive jalan jika ada file lebih tua dari hot window{" "}
                    <span className="font-semibold">atau</span> total uploads ≥ trigger
                    (OR). File di dalam hot window tidak dihapus.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {MODULE_OPTIONS.map((m) => (
                        <label
                            key={m.id}
                            className="inline-flex items-center gap-2 text-sm text-foreground"
                        >
                            <input
                                type="checkbox"
                                className="size-4 accent-primary"
                                checked={form.modules.includes(m.id)}
                                onChange={() => toggleModule(m.id)}
                            />
                            {m.label}
                        </label>
                    ))}
                </div>
            </section>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Simpan
                </button>
                <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
                >
                    {testing ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
                    Tes koneksi
                </button>
                <button
                    type="button"
                    onClick={handleScan}
                    disabled={scanning}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
                >
                    {scanning ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <ScanSearch className="size-4" />
                    )}
                    Pindai inventori
                </button>
                <button
                    type="button"
                    onClick={() => handleArchive(true)}
                    disabled={archiving}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
                >
                    Dry-run archive
                </button>
                <button
                    type="button"
                    onClick={() => handleArchive(false)}
                    disabled={archiving || !form.enabled}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 disabled:opacity-60"
                    title={form.enabled ? "Jalankan job archive" : "Aktifkan dulu lalu simpan"}
                >
                    {archiving ? <Loader2 className="size-4 animate-spin" /> : <Cloud className="size-4" />}
                    Archive sekarang
                </button>
            </div>

            <section className="rounded-[var(--radius-card)] border border-border bg-white p-5">
                <h3 className="mb-3 font-semibold text-foreground">Inventori folder</h3>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[280px] text-left text-sm">
                        <thead className="bg-muted/60 text-xs uppercase text-secondary">
                            <tr>
                                <th className="px-3 py-2 font-semibold">Folder</th>
                                <th className="px-3 py-2 font-semibold">Size</th>
                                <th className="px-3 py-2 font-semibold">Files</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(inventory?.folders || []).length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-3 py-6 text-center text-secondary">
                                        Belum ada data folder
                                    </td>
                                </tr>
                            ) : (
                                (inventory?.folders || []).map((f) => (
                                    <tr key={f.name} className="border-t border-border/70">
                                        <td className="px-3 py-2 font-medium text-foreground">
                                            {f.name}
                                        </td>
                                        <td className="px-3 py-2 text-secondary">
                                            {formatBytes(f.bytes)}
                                        </td>
                                        <td className="px-3 py-2 text-secondary">{f.files}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="rounded-[var(--radius-card)] border border-border bg-white p-5">
                <h3 className="mb-1 font-semibold text-foreground">Prediksi archive</h3>
                <p className="mb-3 text-sm text-secondary">
                    {inventory?.candidate_count ?? 0} kandidat ·{" "}
                    {formatBytes(inventory?.candidate_bytes)}
                    {(inventory?.candidates_truncated || 0) > 0
                        ? ` · menampilkan ${inventory?.candidates.length} pertama`
                        : ""}
                    {inventory?.already_cold
                        ? ` · ${inventory.already_cold} sudah berupa stub cold`
                        : ""}
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-sm">
                        <thead className="bg-muted/60 text-xs uppercase text-secondary">
                            <tr>
                                <th className="px-3 py-2 font-semibold">Path</th>
                                <th className="px-3 py-2 font-semibold">Usia</th>
                                <th className="px-3 py-2 font-semibold">Size</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(inventory?.candidates || []).length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-3 py-6 text-center text-secondary">
                                        Tidak ada kandidat di luar hot window
                                    </td>
                                </tr>
                            ) : (
                                (inventory?.candidates || []).map((c) => (
                                    <tr key={c.path} className="border-t border-border/70">
                                        <td className="px-3 py-2 font-medium text-foreground">
                                            {c.path}
                                        </td>
                                        <td className="px-3 py-2 text-secondary">
                                            {c.age_days} hari
                                        </td>
                                        <td className="px-3 py-2 text-secondary">
                                            {formatBytes(c.bytes)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function StatusCard({
    icon,
    label,
    value,
    hint,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    hint?: string;
}) {
    return (
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-secondary">
                {icon}
                <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <p className="truncate text-lg font-bold text-foreground" title={value}>
                {value}
            </p>
            {hint ? <p className="mt-1 line-clamp-2 text-xs text-secondary">{hint}</p> : null}
        </div>
    );
}
