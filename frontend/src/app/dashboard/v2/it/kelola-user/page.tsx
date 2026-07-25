"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";
import {
    KeyRound,
    Loader2,
    Plus,
    RefreshCw,
    Search,
    Shield,
    UserCog,
    X,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import {
    createUser,
    listRoles,
    listUsers,
    resetUserPassword,
    updateUser,
    type ITUser,
    type RoleOption,
} from "@/lib/itApi";

function formatDate(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function KelolaUserPage() {
    const router = useRouter();
    const { showToast } = useToast();

    const [users, setUsers] = useState<ITUser[]>([]);
    const [roles, setRoles] = useState<RoleOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [resetTarget, setResetTarget] = useState<ITUser | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [createForm, setCreateForm] = useState({
        email: "",
        full_name: "",
        password: "",
        role: "Admin Operations",
        shift: "",
    });
    const [newPassword, setNewPassword] = useState("");

    const loadData = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/");
            return;
        }
        setLoading(true);
        try {
            const [roleList, userList] = await Promise.all([
                listRoles(token),
                listUsers(token, search),
            ]);
            setRoles(roleList);
            setUsers(userList);
            setCreateForm((p) => {
                if (roleList.length && !roleList.find((r) => r.role === p.role)) {
                    return { ...p, role: roleList[0].role };
                }
                return p;
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : "error";
            if (msg.toLowerCase().includes("akses ditolak") || msg.includes("403")) {
                showToast("Halaman ini hanya untuk Super Admin / Admin IT.", "error");
            } else {
                showToast(`Gagal memuat data user: ${msg}`, "error");
            }
        } finally {
            setLoading(false);
        }
    }, [router, search, showToast]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/");
            return;
        }
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const roleByName = useMemo(() => {
        const map = new Map<string, RoleOption>();
        for (const r of roles) map.set(r.role, r);
        return map;
    }, [roles]);

    const selectedRoleMeta = roleByName.get(createForm.role);

    const handleCreate = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        if (!createForm.email.trim() || !createForm.password.trim() || !createForm.role) {
            showToast("Email, password, dan role wajib diisi.", "error");
            return;
        }
        setSubmitting(true);
        try {
            const dept = selectedRoleMeta?.section;
            const user = await createUser(token, {
                email: createForm.email.trim(),
                password: createForm.password,
                full_name: createForm.full_name.trim() || undefined,
                role: createForm.role,
                department: dept,
                shift: createForm.shift.trim() || undefined,
            });
            setUsers((prev) => [user, ...prev]);
            setShowCreate(false);
            setCreateForm({
                email: "",
                full_name: "",
                password: "",
                role: roles[0]?.role || "Admin Operations",
                shift: "",
            });
            showToast("User baru berhasil dibuat.", "success");
        } catch (e) {
            showToast(`Gagal membuat user: ${e instanceof Error ? e.message : "error"}`, "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleResetPassword = async () => {
        const token = localStorage.getItem("token");
        if (!token || !resetTarget) return;
        if (newPassword.trim().length < 6) {
            showToast("Password baru minimal 6 karakter.", "error");
            return;
        }
        setSubmitting(true);
        try {
            await resetUserPassword(token, resetTarget.id, newPassword.trim());
            showToast(`Password ${resetTarget.email} berhasil direset.`, "success");
            setResetTarget(null);
            setNewPassword("");
        } catch (e) {
            showToast(`Gagal reset password: ${e instanceof Error ? e.message : "error"}`, "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (user: ITUser) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const updated = await updateUser(token, user.id, { is_active: !user.is_active });
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
            showToast(
                updated.is_active ? "User diaktifkan." : "User dinonaktifkan.",
                "success"
            );
        } catch (e) {
            showToast(`Gagal update status: ${e instanceof Error ? e.message : "error"}`, "error");
        }
    };

    const handleChangeRole = async (user: ITUser, role: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        const meta = roleByName.get(role);
        try {
            const updated = await updateUser(token, user.id, {
                role,
                department: meta?.section ?? user.department,
            });
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
            showToast("Role user diperbarui.", "success");
        } catch (e) {
            showToast(`Gagal update role: ${e instanceof Error ? e.message : "error"}`, "error");
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6 p-6 lg:p-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                            IT
                        </p>
                        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
                            Kelola User
                        </h1>
                        <p className="mt-2 text-sm text-secondary">
                            Buat user baru, atur role per section, reset password, dan aktifkan/nonaktifkan akun.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => loadData()}
                            className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                        >
                            <RefreshCw className="size-4" aria-hidden />
                            Refresh
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCreate(true)}
                            className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
                        >
                            <Plus className="size-4" aria-hidden />
                            Create User
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") loadData();
                            }}
                            placeholder="Cari email, nama, atau role..."
                            className="w-full rounded-xl border border-border bg-white py-3 pl-10 pr-4 text-sm"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => loadData()}
                        className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted"
                    >
                        Cari
                    </button>
                </div>

                {roles.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {roles.map((r) => (
                            <div
                                key={r.role}
                                className="rounded-xl border border-border bg-white p-4"
                            >
                                <div className="flex items-center gap-2">
                                    <Shield className="size-4 text-primary" aria-hidden />
                                    <p className="text-sm font-semibold text-foreground">{r.role}</p>
                                </div>
                                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-secondary">
                                    Section: {r.section}
                                </p>
                                <p className="mt-2 text-sm text-secondary">{r.description}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-muted/60 text-left text-secondary">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">User</th>
                                    <th className="px-4 py-3 font-semibold">Role / Section</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold">Dibuat</th>
                                    <th className="px-4 py-3 font-semibold">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-secondary">
                                            <span className="inline-flex items-center gap-2">
                                                <Loader2 className="size-4 animate-spin" />
                                                Memuat user...
                                            </span>
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-secondary">
                                            Belum ada user.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((u) => (
                                        <tr key={u.id} className="border-t border-border">
                                            <td className="px-4 py-3">
                                                <div className="flex items-start gap-2">
                                                    <UserCog className="mt-0.5 size-4 shrink-0 text-secondary" />
                                                    <div>
                                                        <p className="font-semibold text-foreground">
                                                            {u.full_name || "—"}
                                                        </p>
                                                        <p className="text-secondary">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={
                                                        roles.some((r) => r.role === u.role)
                                                            ? u.role
                                                            : ""
                                                    }
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            handleChangeRole(u, e.target.value);
                                                        }
                                                    }}
                                                    className="w-full max-w-[220px] rounded-lg border border-border bg-white px-3 py-2 text-sm"
                                                >
                                                    {!roles.some((r) => r.role === u.role) && (
                                                        <option value="">{u.role} (legacy)</option>
                                                    )}
                                                    {roles.map((r) => (
                                                        <option key={r.role} value={r.role}>
                                                            {r.role} — {r.section}
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="mt-1 text-xs text-secondary">
                                                    {u.department || roleByName.get(u.role)?.section || "—"}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleActive(u)}
                                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                        u.is_active
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : "bg-red-50 text-red-700"
                                                    }`}
                                                >
                                                    {u.is_active ? "Aktif" : "Nonaktif"}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-secondary">
                                                {formatDate(u.created_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setResetTarget(u);
                                                        setNewPassword("");
                                                    }}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                                                >
                                                    <KeyRound className="size-3.5" />
                                                    Reset Password
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showCreate && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
                    <div className="flex w-full max-w-lg max-h-[85vh] flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                                    Create User
                                </p>
                                <h3 className="text-lg font-semibold text-foreground">
                                    User baru
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreate(false)}
                                className="rounded-xl border border-border bg-white p-2 text-secondary hover:bg-muted"
                                aria-label="Tutup"
                            >
                                <X className="size-5" />
                            </button>
                        </div>
                        <div className="flex-1 space-y-4 overflow-y-auto p-5">
                            <label className="flex flex-col gap-1 text-sm">
                                <span className="font-semibold">Email *</span>
                                <input
                                    type="email"
                                    value={createForm.email}
                                    onChange={(e) =>
                                        setCreateForm((p) => ({ ...p, email: e.target.value }))
                                    }
                                    className="rounded-xl border border-border px-4 py-3"
                                    placeholder="user@bps.go.id"
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-sm">
                                <span className="font-semibold">Nama lengkap</span>
                                <input
                                    value={createForm.full_name}
                                    onChange={(e) =>
                                        setCreateForm((p) => ({ ...p, full_name: e.target.value }))
                                    }
                                    className="rounded-xl border border-border px-4 py-3"
                                    placeholder="Nama lengkap"
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-sm">
                                <span className="font-semibold">Password *</span>
                                <input
                                    type="password"
                                    value={createForm.password}
                                    onChange={(e) =>
                                        setCreateForm((p) => ({ ...p, password: e.target.value }))
                                    }
                                    className="rounded-xl border border-border px-4 py-3"
                                    placeholder="Minimal 6 karakter"
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-sm">
                                <span className="font-semibold">Role (berdasarkan section) *</span>
                                <select
                                    value={createForm.role}
                                    onChange={(e) =>
                                        setCreateForm((p) => ({ ...p, role: e.target.value }))
                                    }
                                    className="rounded-xl border border-border px-4 py-3"
                                >
                                    {roles.map((r) => (
                                        <option key={r.role} value={r.role}>
                                            {r.section} — {r.role}
                                        </option>
                                    ))}
                                </select>
                                {selectedRoleMeta && (
                                    <span className="text-xs text-secondary">
                                        {selectedRoleMeta.description}
                                    </span>
                                )}
                            </label>
                            <label className="flex flex-col gap-1 text-sm">
                                <span className="font-semibold">Shift</span>
                                <input
                                    value={createForm.shift}
                                    onChange={(e) =>
                                        setCreateForm((p) => ({ ...p, shift: e.target.value }))
                                    }
                                    className="rounded-xl border border-border px-4 py-3"
                                    placeholder="opsional"
                                />
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
                            <button
                                type="button"
                                onClick={() => setShowCreate(false)}
                                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={handleCreate}
                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                            >
                                {submitting && <Loader2 className="size-4 animate-spin" />}
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {resetTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-[var(--radius-card)] border border-border bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                                    Reset Password
                                </p>
                                <h3 className="text-lg font-semibold text-foreground">
                                    {resetTarget.email}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setResetTarget(null)}
                                className="rounded-xl border border-border p-2 text-secondary hover:bg-muted"
                                aria-label="Tutup"
                            >
                                <X className="size-5" />
                            </button>
                        </div>
                        <div className="space-y-4 p-5">
                            <label className="flex flex-col gap-1 text-sm">
                                <span className="font-semibold">Password baru *</span>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="rounded-xl border border-border px-4 py-3"
                                    placeholder="Minimal 6 karakter"
                                />
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
                            <button
                                type="button"
                                onClick={() => setResetTarget(null)}
                                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={handleResetPassword}
                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                            >
                                {submitting && <Loader2 className="size-4 animate-spin" />}
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
