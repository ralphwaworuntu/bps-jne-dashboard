"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Database,
    FileSpreadsheet,
    Layers,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";

export default function AllDatabaseFirstmileHubPage() {
    return (
        <DashboardLayout>
            <div className="mx-auto max-w-6xl">
                <Link
                    href="/dashboard/v2/firstmile"
                    className="mb-8 inline-flex items-center text-muted-foreground transition-colors hover:text-primary"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Firstmile Data
                </Link>

                <header className="mb-8">
                    <h1 className="text-4xl font-bold text-foreground">All Database</h1>
                    <p className="mt-2 text-muted-foreground">
                        Kelola ALL DB TRANSAKSI, ALL DB FM 141, dan Database OTS Firstmile.
                    </p>
                </header>

                <div className="mb-10 rounded-2xl border border-border bg-white p-6">
                    <div className="space-y-2 text-sm leading-relaxed text-foreground">
                        <p>ALL DB TRANSAKSI — database transaksi Firstmile.</p>
                        <p>ALL DB FM 141 — database FM 141 Firstmile.</p>
                        <p>Database OTS — Operational Time Service Firstmile.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    <Link href="/dashboard/v2/firstmile/all-database/transaksi" className="h-full">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative h-full cursor-pointer overflow-hidden rounded-3xl border border-border bg-white p-8 transition-all hover:shadow-lg"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10">
                                <Layers className="h-28 w-28 text-violet-600" />
                            </div>
                            <div className="relative z-10">
                                <div className="mb-6 w-fit rounded-2xl bg-violet-50 p-4">
                                    <Layers className="h-8 w-8 text-violet-600" />
                                </div>
                                <h2 className="mb-2 text-xl font-bold text-foreground">
                                    ALL DB TRANSAKSI
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Lihat database transaksi Firstmile.
                                </p>
                            </div>
                        </motion.div>
                    </Link>

                    <Link href="/dashboard/v2/firstmile/all-database/fm-141" className="h-full">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative h-full cursor-pointer overflow-hidden rounded-3xl border border-border bg-white p-8 transition-all hover:shadow-lg"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10">
                                <Database className="h-28 w-28 text-sky-600" />
                            </div>
                            <div className="relative z-10">
                                <div className="mb-6 w-fit rounded-2xl bg-sky-50 p-4">
                                    <Database className="h-8 w-8 text-sky-600" />
                                </div>
                                <h2 className="mb-2 text-xl font-bold text-foreground">
                                    ALL DB FM 141
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Lihat database FM 141 Firstmile.
                                </p>
                            </div>
                        </motion.div>
                    </Link>

                    <Link href="/dashboard/v2/firstmile/all-database/ots" className="h-full">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative h-full cursor-pointer overflow-hidden rounded-3xl border border-border bg-white p-8 transition-all hover:shadow-lg"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10">
                                <FileSpreadsheet className="h-28 w-28 text-orange-600" />
                            </div>
                            <div className="relative z-10">
                                <div className="mb-6 w-fit rounded-2xl bg-orange-50 p-4">
                                    <FileSpreadsheet className="h-8 w-8 text-orange-600" />
                                </div>
                                <h2 className="mb-2 text-xl font-bold text-foreground">
                                    Database OTS
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Lihat data OTS Firstmile.
                                </p>
                            </div>
                        </motion.div>
                    </Link>
                </div>
            </div>
        </DashboardLayout>
    );
}
