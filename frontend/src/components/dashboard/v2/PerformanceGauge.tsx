"use client";

import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

type GaugeTone = "health" | "usage";

type Props = {
    title: string;
    value: number;
    subtitle?: string;
    /** health: tinggi = baik; usage: tinggi = beban (warna terbalik) */
    tone?: GaugeTone;
    max?: number;
    unit?: string;
};

function colorFor(value: number, tone: GaugeTone): string {
    if (tone === "usage") {
        if (value < 60) return "#30B22D";
        if (value < 80) return "#FED71F";
        return "#E5484D";
    }
    if (value >= 80) return "#30B22D";
    if (value >= 55) return "#FED71F";
    return "#E5484D";
}

export default function PerformanceGauge({
    title,
    value,
    subtitle,
    tone = "health",
    max = 100,
    unit = "%",
}: Props) {
    const v = Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0));
    const color = colorFor(v, tone);

    const option: EChartsOption = {
        series: [
            {
                type: "gauge",
                startAngle: 210,
                endAngle: -30,
                min: 0,
                max,
                splitNumber: 5,
                radius: "95%",
                center: ["50%", "58%"],
                axisLine: {
                    lineStyle: {
                        width: 14,
                        color:
                            tone === "usage"
                                ? [
                                      [0.55, "#30B22D"],
                                      [0.8, "#FED71F"],
                                      [1, "#E5484D"],
                                  ]
                                : [
                                      [0.45, "#E5484D"],
                                      [0.7, "#FED71F"],
                                      [1, "#30B22D"],
                                  ],
                    },
                },
                pointer: {
                    length: "62%",
                    width: 5,
                    itemStyle: { color: "#080C1A" },
                },
                anchor: {
                    show: true,
                    size: 10,
                    itemStyle: { color: "#080C1A" },
                },
                axisTick: { show: false },
                splitLine: {
                    length: 10,
                    distance: -14,
                    lineStyle: { width: 2, color: "#EFF2F7" },
                },
                axisLabel: {
                    distance: 18,
                    color: "#6A7686",
                    fontSize: 10,
                    fontFamily: "Lexend Deca, sans-serif",
                },
                detail: {
                    valueAnimation: true,
                    formatter: `{value}${unit}`,
                    color,
                    fontSize: 22,
                    fontWeight: 700,
                    fontFamily: "Lexend Deca, sans-serif",
                    offsetCenter: [0, "28%"],
                },
                title: {
                    show: true,
                    offsetCenter: [0, "58%"],
                    color: "#6A7686",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "Lexend Deca, sans-serif",
                },
                data: [{ value: Math.round(v * 10) / 10, name: title }],
            },
        ],
    };

    return (
        <div className="flex flex-col rounded-[var(--radius-card)] border border-border bg-white p-4 shadow-sm">
            <ReactECharts
                option={option}
                style={{ height: 210, width: "100%" }}
                opts={{ renderer: "canvas" }}
                notMerge
                lazyUpdate
            />
            {subtitle ? (
                <p className="-mt-2 text-center text-xs text-secondary">{subtitle}</p>
            ) : null}
        </div>
    );
}
