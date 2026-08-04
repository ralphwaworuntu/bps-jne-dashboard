"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogIn, User, Lock, AlertCircle } from "lucide-react";
import { API_URL } from "../../config";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking");
    const [gifFailed, setGifFailed] = useState(false);
    const router = useRouter();
    const JNE_RED = "#E30613";

    useEffect(() => {
        const checkServer = async () => {
            try {
                const res = await fetch(`${API_URL}/`);
                if (res.ok) {
                    setServerStatus("online");
                } else {
                    setServerStatus("offline");
                }
            } catch (e) {
                console.error("Health check failed:", e);
                setServerStatus("offline");
            }
        };
        void checkServer();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const formData = new URLSearchParams();
            formData.append("username", email);
            formData.append("password", password);

            const res = await fetch(`${API_URL}/token`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.detail || "Email atau password tidak valid");
            }

            const data = await res.json();
            localStorage.setItem("token", data.access_token);
            router.push("/dashboard/v2");
        } catch (err: any) {
            setError(err.message || "Login gagal");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="relative min-h-screen overflow-hidden bg-[#070b14] text-white antialiased"
            style={{ fontFamily: "var(--font-lexend-deca), sans-serif" }}
        >
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-red-600/20 blur-[120px]" />
                <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-sky-500/20 blur-[140px]" />
            </div>

            <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[90rem] items-center px-6 py-8 sm:px-10 lg:px-14">
                <div className="grid w-full items-stretch gap-6 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                        className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl backdrop-blur-xl sm:p-10"
                    >
                        <div className="flex items-center justify-between gap-4">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/30 hover:text-white"
                            >
                                <ArrowLeft className="size-4" />
                                Kembali ke Landing
                            </Link>
                            <Image
                                src="/jne_logo.png"
                                alt="JNE"
                                width={112}
                                height={48}
                                className="h-9 w-auto"
                                priority
                            />
                        </div>

                        <div className="mt-6">
                            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
                                Masuk ke Dashboard
                            </h1>
                            <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
                                Gunakan akun internal JNE KOE untuk mengakses modul OPERASIONAL,
                                FINANCE &amp; ACCOUNTING, GA, ALC, SALES &amp; MARKETING, HC,
                                dan IT.
                            </p>
                        </div>

                        {error && (
                            <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                                <AlertCircle className="size-4" />
                                {error}
                            </div>
                        )}

                        {serverStatus === "offline" && !error && (
                            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
                                Server belum terhubung. Pastikan backend aktif di `{API_URL}`.
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="mt-7 space-y-5">
                            <div>
                                <label className="mb-2 block text-sm text-white/75">Email Address</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-white/35" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full rounded-xl border border-white/15 bg-[#0b1220]/70 py-3 pl-11 pr-4 text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-red-600/25"
                                        placeholder="admin@jne.co.id"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm text-white/75">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-white/35" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full rounded-xl border border-white/15 bg-[#0b1220]/70 py-3 pl-11 pr-4 text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-red-600/25"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || serverStatus === "offline"}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-xl transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
                                style={{ backgroundColor: JNE_RED }}
                            >
                                {loading ? (
                                    "Memproses..."
                                ) : (
                                    <>
                                        <LogIn className="size-5" />
                                        Masuk
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-white/50">
                            Butuh akun baru? Hubungi Admin IT melalui menu Kelola User.
                        </p>
                    </motion.section>

                    <motion.section
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1, duration: 0.35 }}
                        className="relative hidden min-h-[620px] items-center justify-center lg:flex"
                    >
                        {!gifFailed ? (
                            <img
                                src="/landing/mascot-login.gif.gif"
                                alt="Maskot JNE"
                                className="h-[64%] max-h-[540px] w-auto max-w-full object-contain drop-shadow-[0_14px_40px_rgba(227,6,19,0.25)]"
                                onError={() => setGifFailed(true)}
                            />
                        ) : (
                            <div className="max-w-sm rounded-2xl border border-dashed border-white/20 bg-white/[0.03] p-6 text-center text-sm text-white/60">
                                File animasi belum ditemukan di
                                `frontend/public/landing/mascot-login.gif.gif`.
                            </div>
                        )}
                    </motion.section>
                </div>
            </main>
        </div>
    );
}
