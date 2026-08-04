"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
    Activity,
    ArrowRight,
    Box,
    Briefcase,
    LayoutDashboard,
    ReceiptText,
    Truck,
    UserCog,
    Users,
    Wallet,
} from "lucide-react";
import { API_URL } from "../config";

const JNE_RED = "#E30613";

const MOTIVASI = [
    "Setiap paket yang tepat waktu dimulai dari data yang akurat — kerja hebat hari ini.",
    "Dari Kupang untuk seluruh pelosok Flobamora, setiap roda yang berputar adalah jejak pengabdian terbaik kita.",
    "Satu keputusan tepat di dashboard bisa menjaga kepercayaan ribuan pelanggan.",
    "Kerja sama antar divisi membuat JNE KOE lebih cepat, lebih rapi, lebih unggul.",
];

type DivisionCard = {
    key: string;
    title: string;
    blurb: string;
    icon: typeof Box;
    href: string;
    accent: string;
};

const DIVISIONS: DivisionCard[] = [
    {
        key: "operations",
        title: "Operations",
        blurb: "Lastmile, Firstmile, Daily Issue, dan Master Data dalam satu alur kerja.",
        icon: Box,
        href: "/dashboard/v2/lastmile",
        accent: "from-red-600 to-red-800",
    },
    {
        key: "finance",
        title: "Finance",
        blurb: "Kelola transaksi dan pantau arus keuangan cabang dengan rapi.",
        icon: Wallet,
        href: "/dashboard/v2/finance/kelola-transaksi",
        accent: "from-emerald-600 to-emerald-800",
    },
    {
        key: "alc",
        title: "ALC",
        blurb: "CTC, penjualan, delivery, COD, project, hingga master data ALC.",
        icon: Briefcase,
        href: "/dashboard/v2/alc/managemen-ctc",
        accent: "from-orange-500 to-orange-700",
    },
    {
        key: "sales",
        title: "Sales",
        blurb: "Correction request dan tracking invoice untuk layanan pelanggan.",
        icon: ReceiptText,
        href: "/dashboard/v2/sales/tracking-invoice",
        accent: "from-sky-600 to-sky-800",
    },
    {
        key: "hc",
        title: "HC",
        blurb: "Kelola calon karyawan dan kasbon dengan proses yang transparan.",
        icon: Users,
        href: "/dashboard/v2/hc/kelola-calon-karyawan",
        accent: "from-violet-600 to-violet-800",
    },
    {
        key: "it",
        title: "IT",
        blurb: "Kelola user, pantau log error, dan jaga performa sistem.",
        icon: UserCog,
        href: "/dashboard/v2/it/sys-performance",
        accent: "from-slate-700 to-slate-900",
    },
];

export default function LandingPage() {
    const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">(
        "checking"
    );
    const [hasToken, setHasToken] = useState(false);
    const [quoteIdx, setQuoteIdx] = useState(0);
    const [showHeader, setShowHeader] = useState(false);
    const heroVideoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        setHasToken(Boolean(localStorage.getItem("token")));
        const checkServer = async () => {
            try {
                const res = await fetch(`${API_URL}/`);
                setServerStatus(res.ok ? "online" : "offline");
            } catch {
                setServerStatus("offline");
            }
        };
        void checkServer();
    }, []);

    useEffect(() => {
        const video = heroVideoRef.current;
        if (!video) return;

        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;

        const tryPlay = () => {
            const playPromise = video.play();
            if (playPromise && typeof playPromise.catch === "function") {
                playPromise.catch(() => {
                    // Autoplay bisa diblok browser; poster tetap tampil.
                });
            }
        };

        tryPlay();
        video.addEventListener("loadeddata", tryPlay);
        video.addEventListener("canplay", tryPlay);
        return () => {
            video.removeEventListener("loadeddata", tryPlay);
            video.removeEventListener("canplay", tryPlay);
        };
    }, []);

    useEffect(() => {
        const id = window.setInterval(() => {
            setQuoteIdx((i) => (i + 1) % MOTIVASI.length);
        }, 5500);
        return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
        const onScroll = () => {
            // Tampilkan header setelah melewati hero (~viewport)
            setShowHeader(window.scrollY > window.innerHeight * 0.85);
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const primaryHref = hasToken ? "/dashboard/v2" : "/login";
    const primaryLabel = hasToken ? "Buka Dashboard" : "Masuk";

    const statusLabel = useMemo(() => {
        if (serverStatus === "online") return "Sistem Online";
        if (serverStatus === "offline") return "Sistem Offline";
        return "Menghubungkan…";
    }, [serverStatus]);

    return (
        <div
            className="min-h-screen overflow-x-hidden text-white antialiased"
            style={{ fontFamily: "var(--font-lexend-deca), sans-serif" }}
        >
            {/* Header — hanya setelah scroll melewati hero */}
            <AnimatePresence>
                {showHeader ? (
                    <motion.nav
                        initial={{ y: -24, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -24, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0b1220]/85 backdrop-blur-md"
                    >
                        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
                            <Link href="/" className="flex items-center">
                                <Image
                                    src="/jne_logo.png"
                                    alt="JNE"
                                    width={96}
                                    height={40}
                                    className="h-8 w-auto sm:h-9"
                                    priority
                                />
                            </Link>
                            <div className="flex items-center gap-3 sm:gap-4">
                                <span
                                    className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:text-xs ${
                                        serverStatus === "online"
                                            ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                                            : serverStatus === "offline"
                                              ? "border-red-400/30 bg-red-500/10 text-red-300"
                                              : "border-white/15 bg-white/5 text-white/70"
                                    }`}
                                >
                                    <span
                                        className={`size-1.5 rounded-full ${
                                            serverStatus === "online"
                                                ? "bg-emerald-400"
                                                : serverStatus === "offline"
                                                  ? "bg-red-400"
                                                  : "animate-pulse bg-white/50"
                                        }`}
                                    />
                                    {statusLabel}
                                </span>
                                <Link
                                    href={primaryHref}
                                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                                    style={{ backgroundColor: JNE_RED }}
                                >
                                    {primaryLabel}
                                    <ArrowRight className="size-4" />
                                </Link>
                            </div>
                        </div>
                    </motion.nav>
                ) : null}
            </AnimatePresence>

            {/* Hero — full bleed */}
            <section className="relative flex min-h-[100svh] flex-col overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                    <video
                        ref={heroVideoRef}
                        className="pointer-events-none absolute left-1/2 top-1/2 h-auto w-auto min-h-full min-w-full max-w-none -translate-x-1/2 -translate-y-1/2 scale-[1.2] object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        poster="/landing/hero-poster.jpg"
                    >
                        <source
                            src="https://jne.co.id/cfind/source/files/hugo-papua-15-website.mp4"
                            type="video/mp4"
                        />
                        <source
                            src="https://jne.co.id/cfind/source/files/hugo-papua-15-website.webm"
                            type="video/webm"
                        />
                    </video>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/70 to-[#070b14]/40" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#070b14]/55 via-transparent to-[#070b14]/45" />
                </div>

                {/* Logo putih — tengah atas */}
                <div className="relative z-10 flex justify-center pt-10 sm:pt-14">
                    <Image
                        src="/landing/logo-white.svg"
                        alt="JNE Express"
                        width={180}
                        height={54}
                        className="h-11 w-auto drop-shadow-lg sm:h-14"
                        priority
                    />
                </div>

                <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-5 pb-16 sm:justify-center sm:px-8 sm:pb-24 sm:pt-8">
                    <motion.div
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.65, ease: "easeOut" }}
                        className="mx-auto max-w-3xl text-center sm:mx-0 sm:text-left"
                    >
                        <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                            Satu Dashboard.
                            <br />
                            <span style={{ color: JNE_RED }}>Semua Divisi.</span>
                        </h1>
                        <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:mx-0 sm:text-lg">
                            Platform internal JNE KOE untuk mengelola operasional, keuangan,
                            ALC, sales, HC, dan IT — rapi, cepat, dan terhubung.
                        </p>

                        {/* Quotes di atas tombol Masuk */}
                        <div className="mx-auto mt-8 min-h-[4.5rem] max-w-xl sm:mx-0">
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={quoteIdx}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.35 }}
                                    className="text-sm font-medium italic leading-relaxed text-white/90 sm:text-base"
                                >
                                    “{MOTIVASI[quoteIdx]}”
                                </motion.p>
                            </AnimatePresence>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                            <Link
                                href={primaryHref}
                                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white shadow-xl transition hover:brightness-110 sm:text-base"
                                style={{ backgroundColor: JNE_RED }}
                            >
                                {primaryLabel}
                                <ArrowRight className="size-4" />
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Semangat Tim — langsung di bawah hero */}
            <section className="relative overflow-hidden bg-[#070b14] py-20 sm:py-28">
                <div className="absolute inset-0 opacity-40">
                    <Image
                        src="/landing/promo-truck.jpg"
                        alt=""
                        fill
                        className="object-cover"
                        sizes="100vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#070b14] via-[#070b14]/85 to-[#070b14]/55" />
                </div>
                <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="max-w-2xl"
                    >
                        <p
                            className="text-xs font-semibold uppercase tracking-[0.2em]"
                            style={{ color: JNE_RED }}
                        >
                            Semangat Tim
                        </p>
                        <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-5xl">
                            Dari Kupang untuk seluruh pelosok Flobamora
                        </h2>
                        <p className="mt-4 text-base leading-relaxed text-white/75 sm:text-lg">
                            Setiap roda yang berputar adalah jejak pengabdian terbaik kita.
                            Data yang bersih hari ini menjaga kepercayaan pelanggan esok hari —
                            ayo selesaikan dengan bangga.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                href={primaryHref}
                                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white transition hover:brightness-110"
                                style={{ backgroundColor: JNE_RED }}
                            >
                                {hasToken ? (
                                    <>
                                        <LayoutDashboard className="size-4" />
                                        Lanjut bekerja
                                    </>
                                ) : (
                                    <>
                                        <Truck className="size-4" />
                                        Mulai shift hari ini
                                    </>
                                )}
                            </Link>
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-3 text-xs text-white/70">
                                <Activity className="size-3.5" />
                                Lastmile · Firstmile · ALC · Finance · HC · IT
                            </span>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Divisi */}
            <section className="bg-[#0a101c] py-16 sm:py-24">
                <div className="mx-auto max-w-6xl px-5 sm:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.45 }}
                        className="mb-10 max-w-2xl"
                    >
                        <p
                            className="text-xs font-semibold uppercase tracking-[0.2em]"
                            style={{ color: JNE_RED }}
                        >
                            Divisi JNE KOE
                        </p>
                        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            Semua fungsi dalam satu sistem
                        </h2>
                        <p className="mt-3 text-sm leading-relaxed text-white/65 sm:text-base">
                            Kartu di bawah mengikuti section dashboard. Masuk untuk membuka
                            modul divisi Anda dan kolaborasi lintas tim.
                        </p>
                    </motion.div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {DIVISIONS.map((d, i) => {
                            const Icon = d.icon;
                            const target = hasToken ? d.href : "/login";
                            return (
                                <motion.div
                                    key={d.key}
                                    initial={{ opacity: 0, y: 18 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-40px" }}
                                    transition={{ duration: 0.4, delay: i * 0.05 }}
                                >
                                    <Link
                                        href={target}
                                        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.06]"
                                    >
                                        <div
                                            className={`flex items-center gap-3 bg-gradient-to-br ${d.accent} px-5 py-4`}
                                        >
                                            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-white/15 text-white">
                                                <Icon className="size-5" />
                                            </span>
                                            <h3 className="text-lg font-bold text-white">
                                                {d.title}
                                            </h3>
                                        </div>
                                        <div className="flex flex-1 flex-col gap-4 px-5 py-5">
                                            <p className="text-sm leading-relaxed text-white/65">
                                                {d.blurb}
                                            </p>
                                            <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 transition group-hover:gap-2.5">
                                                {hasToken ? "Buka modul" : "Masuk untuk akses"}
                                                <ArrowRight className="size-4" />
                                            </span>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <footer className="border-t border-white/10 bg-[#05080f] py-10">
                <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 sm:flex-row sm:items-center sm:px-8">
                    <div className="flex items-center gap-3">
                        <Image
                            src="/jne_logo.png"
                            alt="JNE"
                            width={72}
                            height={32}
                            className="h-7 w-auto"
                        />
                        <span className="text-sm text-white/55">JNE Dashboard · Cabang KOE</span>
                    </div>
                    <p className="text-xs text-white/40">
                        © {new Date().getFullYear()} Internal use only. Bukan situs pelanggan.
                    </p>
                </div>
            </footer>
        </div>
    );
}
