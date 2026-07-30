"use client";

import type { ChangeEvent, ComponentType } from "react";
import { CheckCircle, Loader2, Upload } from "lucide-react";

export type ReferenceUploadColor =
    | "blue"
    | "emerald"
    | "orange"
    | "purple"
    | "rose"
    | "cyan";

export type ReferenceUploadCardProps = {
    title: string;
    description: string;
    colorClass: ReferenceUploadColor;
    file: File | null;
    uploading: boolean;
    onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onUpload: () => void;
    acceptedFiles?: string;
    isUploaded?: boolean;
    lastUpdated?: string;
    filename?: string;
    /** Opsional — di Master Data dihilangkan agar kartu lebih hemat ruang. */
    icon?: ComponentType<{ className?: string }>;
};

const COLORS: Record<
    ReferenceUploadColor,
    { bg: string; text: string; border: string; hoverborder: string; btn: string }
> = {
    blue: {
        bg: "bg-blue-50",
        text: "text-blue-600",
        border: "border-blue-100",
        hoverborder: "hover:border-blue-300",
        btn: "bg-blue-600 hover:bg-blue-700",
    },
    emerald: {
        bg: "bg-emerald-50",
        text: "text-emerald-600",
        border: "border-emerald-100",
        hoverborder: "hover:border-emerald-300",
        btn: "bg-emerald-600 hover:bg-emerald-700",
    },
    orange: {
        bg: "bg-orange-50",
        text: "text-orange-600",
        border: "border-orange-100",
        hoverborder: "hover:border-orange-300",
        btn: "bg-orange-600 hover:bg-orange-700",
    },
    purple: {
        bg: "bg-purple-50",
        text: "text-purple-600",
        border: "border-purple-100",
        hoverborder: "hover:border-purple-300",
        btn: "bg-purple-600 hover:bg-purple-700",
    },
    rose: {
        bg: "bg-rose-50",
        text: "text-rose-600",
        border: "border-rose-100",
        hoverborder: "hover:border-rose-300",
        btn: "bg-rose-600 hover:bg-rose-700",
    },
    cyan: {
        bg: "bg-cyan-50",
        text: "text-cyan-600",
        border: "border-cyan-100",
        hoverborder: "hover:border-cyan-300",
        btn: "bg-cyan-600 hover:bg-cyan-700",
    },
};

export default function ReferenceUploadCard({
    title,
    description,
    colorClass,
    file,
    uploading,
    onFileChange,
    onUpload,
    acceptedFiles = ".xlsx, .xls, .csv",
    isUploaded,
    lastUpdated,
    filename,
    icon: Icon,
}: ReferenceUploadCardProps) {
    const theme = COLORS[colorClass];

    return (
        <div
            className={`flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition-all ${theme.border} ${theme.hoverborder}`}
        >
            {Icon ? (
                <div className="mb-3 flex items-start justify-between">
                    <div className={`rounded-xl p-3 ${theme.bg}`}>
                        <Icon className={`h-6 w-6 ${theme.text}`} />
                    </div>
                </div>
            ) : null}

            <div className="mb-3 flex-1">
                <h3 className="mb-1 text-base font-bold text-foreground">{title}</h3>
                <p className="text-xs text-secondary">{description}</p>
            </div>

            <div
                className={`mb-4 flex items-start gap-2 rounded-xl border p-3 ${
                    isUploaded ? "border-emerald-100 bg-emerald-50" : "border-gray-100 bg-gray-50"
                }`}
            >
                <div className="min-w-0 flex-1">
                    <p
                        className={`mb-1 text-xs font-medium ${
                            isUploaded ? "text-emerald-700" : "text-gray-400"
                        }`}
                    >
                        {isUploaded ? "Status Upload" : "Status Integrasi Tabel"}
                    </p>
                    {isUploaded ? (
                        <>
                            <div className="mb-0.5 flex items-center gap-1.5 truncate text-sm font-semibold text-emerald-800">
                                <CheckCircle className="h-4 w-4" />
                                <span>Berhasil Diunggah</span>
                            </div>
                            <p className="truncate text-xs text-emerald-600/80" title={filename || ""}>
                                {filename || "File diunggah"}
                            </p>
                            <p className="mt-1 text-[11px] text-emerald-600/60">{lastUpdated}</p>
                        </>
                    ) : (
                        <p className="truncate text-sm text-gray-500">Sistem Menunggu File</p>
                    )}
                </div>
            </div>

            <div className="mt-auto flex flex-col gap-2">
                <label
                    className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-medium shadow-sm transition-colors hover:opacity-80 ${theme.bg} ${theme.text}`}
                >
                    <Upload className="h-4 w-4" />
                    <span className="truncate text-sm">{file ? file.name : "Pilih File..."}</span>
                    <input
                        type="file"
                        accept={acceptedFiles}
                        onChange={onFileChange}
                        className="hidden"
                        disabled={uploading}
                    />
                </label>

                {file ? (
                    <button
                        type="button"
                        onClick={onUpload}
                        disabled={uploading}
                        className={`flex w-full items-center justify-center rounded-xl border border-transparent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-70 ${theme.btn}`}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="-ml-1 mr-2 h-4 w-4 animate-spin text-white" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Upload className="-ml-1 mr-2 h-4 w-4" />
                                Unggah Sekarang
                            </>
                        )}
                    </button>
                ) : null}
            </div>
        </div>
    );
}
