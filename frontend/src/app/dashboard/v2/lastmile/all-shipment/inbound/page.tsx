"use client";

import Link from "next/link";
import { ArrowLeft, Inbox } from "lucide-react";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";

export default function InboundPage() {
    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto">
                <Link
                    href="/dashboard/v2/lastmile/all-shipment"
                    className="inline-flex items-center text-muted-foreground hover:text-primary mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to All Shipment
                </Link>

                <header className="mb-10">
                    <h1 className="text-4xl font-bold text-foreground">Inbound</h1>
                    <p className="text-muted-foreground mt-2">Halaman data Inbound.</p>
                </header>

                <div className="bg-white border border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[280px]">
                    <div className="p-4 bg-sky-50 rounded-2xl mb-4">
                        <Inbox className="w-10 h-10 text-sky-600" />
                    </div>
                    <p className="text-lg font-medium text-foreground">Data belum tersedia</p>
                    <p className="text-sm text-muted-foreground mt-2 max-w-md">
                        Unggah template Inbound dari halaman All Shipment untuk menampilkan data di
                        sini.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
