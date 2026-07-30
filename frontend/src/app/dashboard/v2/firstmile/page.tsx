"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Database, FolderTree, Package, BarChart3 } from "lucide-react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";

export default function FirstmilePageV2() {
    return (
        <DashboardLayout>
            <div className="mx-auto max-w-7xl">
                <Link
                    href="/dashboard/v2"
                    className="mb-8 inline-flex items-center text-muted-foreground transition-colors hover:text-primary"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Link>

                <header className="mb-10">
                    <h1 className="text-3xl font-bold text-foreground">Data Firstmile</h1>
                    <p className="mt-2 text-muted-foreground">
                        Upload raw Excel data to automatically clean and filter based on strict
                        business rules.
                    </p>
                </header>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    {/* All Database */}
                    <Link href="/dashboard/v2/firstmile/all-database" className="h-full">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative h-full cursor-pointer overflow-hidden rounded-3xl border border-border bg-white p-6 transition-all hover:shadow-lg"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10">
                                <Database className="h-32 w-32 text-purple-600" />
                            </div>

                            <div className="relative z-10 flex h-full min-h-[200px] flex-col justify-between">
                                <div className="mb-6 w-fit rounded-2xl bg-purple-50 p-4">
                                    <Database className="h-8 w-8 text-purple-600" />
                                </div>

                                <div>
                                    <h2 className="mb-2 text-2xl font-bold text-foreground">
                                        All Database
                                    </h2>
                                    <p className="mb-6 text-muted-foreground">
                                        ALL DB TRANSAKSI, ALL DB FM 141, dan Database OTS Firstmile.
                                    </p>
                                    <div className="flex w-fit items-center gap-2 rounded-lg border border-purple-100 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-600">
                                        Lihat Database <Database className="ml-1 h-4 w-4" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Link>

                    {/* Database OTS Cabang */}
                    <Link href="/dashboard/v2/firstmile/ots-cabang" className="h-full">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative h-full cursor-pointer overflow-hidden rounded-3xl border border-border bg-white p-6 transition-all hover:shadow-lg"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10">
                                <FolderTree className="h-32 w-32 text-emerald-600" />
                            </div>

                            <div className="relative z-10 flex h-full min-h-[200px] flex-col justify-between">
                                <div className="mb-6 w-fit rounded-2xl bg-emerald-50 p-4">
                                    <FolderTree className="h-8 w-8 text-emerald-600" />
                                </div>

                                <div>
                                    <h2 className="mb-2 text-2xl font-bold text-foreground">
                                        Database OTS Cabang
                                    </h2>
                                    <p className="mb-6 text-muted-foreground">
                                        Branch-specific Firstmile OTS data breakdown.
                                    </p>
                                    <div className="flex w-fit items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-600">
                                        View Data & Download
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Link>

                    {/* Database SMU */}
                    <Link href="/dashboard/v2/firstmile/database-smu" className="h-full">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative h-full cursor-pointer overflow-hidden rounded-3xl border border-border bg-white p-6 transition-all hover:shadow-lg"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10">
                                <Package className="h-32 w-32 text-blue-600" />
                            </div>

                            <div className="relative z-10 flex h-full min-h-[200px] flex-col justify-between">
                                <div className="mb-6 w-fit rounded-2xl bg-blue-50 p-4">
                                    <Package className="h-8 w-8 text-blue-600" />
                                </div>

                                <div>
                                    <h2 className="mb-2 text-2xl font-bold text-foreground">
                                        Database SMU
                                    </h2>
                                    <p className="mb-6 text-muted-foreground">
                                        Upload &amp; kelola data SMU Firstmile.
                                    </p>
                                    <div className="flex w-fit items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600">
                                        View Data & Upload
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Link>

                    {/* Report Firstmile */}
                    <Link href="/dashboard/v2/firstmile/report" className="h-full">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative h-full cursor-pointer overflow-hidden rounded-3xl border border-border bg-white p-6 transition-all hover:shadow-lg"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10">
                                <BarChart3 className="h-32 w-32 text-teal-600" />
                            </div>

                            <div className="relative z-10 flex h-full min-h-[200px] flex-col justify-between">
                                <div className="mb-6 w-fit rounded-2xl bg-teal-50 p-4">
                                    <BarChart3 className="h-8 w-8 text-teal-600" />
                                </div>

                                <div>
                                    <h2 className="mb-2 text-2xl font-bold text-foreground">
                                        Report Firstmile
                                    </h2>
                                    <p className="mb-6 text-muted-foreground">
                                        Upload master data &amp; laporan LT dengan filter Service per
                                        tabel.
                                    </p>
                                    <div className="flex w-fit items-center gap-2 rounded-lg border border-teal-100 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-600">
                                        View Report
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Link>
                </div>
            </div>
        </DashboardLayout>
    );
}
