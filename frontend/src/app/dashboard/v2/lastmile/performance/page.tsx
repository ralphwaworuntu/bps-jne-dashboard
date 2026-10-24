"use client";

import Link from "next/link";
import { ArrowLeft, Gauge } from "lucide-react";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";

export default function LastmilePerformancePage() {
    return (
        <DashboardLayout>
            <div className="mx-auto max-w-7xl">
                <Link
                    href="/dashboard/v2/lastmile"
                    className="mb-8 inline-flex items-center text-muted-foreground transition-colors hover:text-primary"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Lastmile Data
                </Link>

                <header className="mb-8">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50">
                        <Gauge className="h-7 w-7 text-sky-600" />
                    </div>
                    <h1 className="text-4xl font-bold text-foreground">Performance</h1>
                    <p className="mt-2 text-muted-foreground">
                        Halaman performa kiriman Lastmile.
                    </p>
                </header>
            </div>
        </DashboardLayout>
    );
}
