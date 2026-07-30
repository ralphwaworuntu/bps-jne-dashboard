"use client";

import type { ReactNode } from "react";
import DashboardLayout from "@/components/dashboard/v2/DashboardLayout";

type AlcPageShellProps = {
    title: string;
    description?: string;
    toolbar?: ReactNode;
    children: ReactNode;
    contentClassName?: string;
};

export default function AlcPageShell({
    title,
    description,
    toolbar,
    children,
    contentClassName = "mx-auto max-w-6xl",
}: AlcPageShellProps) {
    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6 p-6 lg:p-10">
                <div>
                    <h1 className="text-2xl font-bold text-foreground lg:text-3xl">{title}</h1>
                    {description ? <p className="mt-2 text-sm text-secondary">{description}</p> : null}
                </div>
                {toolbar}
                <div
                    className={`rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-sm ${contentClassName}`}
                >
                    {children}
                </div>
            </div>
        </DashboardLayout>
    );
}
