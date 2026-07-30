"use client";

import Link from "next/link";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";

export default function AllDatabaseOtsPage() {
    return (
        <DashboardLayout>
            <div className="mx-auto max-w-6xl">
                <Link
                    href="/dashboard/v2/firstmile/all-database"
                    className="mb-8 inline-flex items-center text-muted-foreground transition-colors hover:text-primary"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Database
                </Link>

                <header className="mb-10">
                    <h1 className="text-4xl font-bold text-foreground">Database OTS</h1>
                    <p className="mt-2 text-muted-foreground">
                        Halaman Operational Time Service Firstmile.
                    </p>
                </header>

                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-border bg-white p-12 text-center">
                    <div className="mb-4 rounded-2xl bg-orange-50 p-4">
                        <FileSpreadsheet className="h-10 w-10 text-orange-600" />
                    </div>
                    <p className="text-lg font-medium text-foreground">Data belum tersedia</p>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                        Konten Database OTS akan ditampilkan di halaman ini.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
