"use client";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
);

interface ChartsProps {
    firstmileStats?: any;
    lastmileStats?: any;
}

export function VolumeChart({ firstmileStats }: ChartsProps) {
    // Mock data for now - in real app, fetch historical volume
    const data = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Firstmile Shipments',
                data: [1200, 1900, 1500, 2100, 1800, 2500, 2300],
                borderColor: '#165DFF',
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(22, 93, 255, 0.2)');
                    gradient.addColorStop(1, 'rgba(22, 93, 255, 0)');
                    return gradient;
                },
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6
            },
            {
                label: 'Lastmile Shipments',
                data: [1000, 1500, 1200, 1800, 1600, 2000, 1900],
                borderColor: '#9CA3AF',
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0.4,
                fill: false,
                pointRadius: 0
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top' as const,
                align: 'end' as const,
                labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    font: { family: "'Lexend Deca', sans-serif", size: 12 }
                }
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                backgroundColor: '#080C1A',
                titleFont: { family: "'Lexend Deca', sans-serif" },
                bodyFont: { family: "'Lexend Deca', sans-serif" },
                padding: 10,
                cornerRadius: 8,
                displayColors: false
            }
        },
        scales: {
            y: {
                grid: { color: '#F3F4F3', drawBorder: false },
                ticks: { font: { family: "'Lexend Deca', sans-serif" }, color: '#6A7686' }
            },
            x: {
                grid: { display: false },
                ticks: { font: { family: "'Lexend Deca', sans-serif" }, color: '#6A7686' }
            }
        }
    };

    return (
        <div className="lg:col-span-2 flex flex-col rounded-2xl border border-border p-6 gap-6 bg-white shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-lg text-foreground">Shipment Volume</h3>
                    <p className="text-sm text-secondary">Firstmile vs Lastmile Volume</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">Weekly</button>
                    <button className="px-3 py-1.5 rounded-lg text-secondary hover:bg-muted text-xs font-medium transition-colors">Monthly</button>
                </div>
            </div>
            <div className="w-full h-[300px]">
                {/* @ts-ignore */}
                <Line data={data} options={options} />
            </div>
        </div>
    );
}

export function StatusChart({ firstmileStats }: ChartsProps) {
    const successRate = firstmileStats?.success_rate || 0;
    const ongoing = 100 - successRate;
    const total = firstmileStats?.total_shipments?.toLocaleString() || '0';

    const data = {
        labels: ['Success', 'Ongoing'],
        datasets: [{
            data: [successRate, ongoing],
            backgroundColor: ['#30B22D', '#FED71F'],
            borderWidth: 0,
            hoverOffset: 4
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#080C1A',
                bodyFont: { family: "'Lexend Deca', sans-serif" },
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                    label: function (context: any) {
                        return context.label + ': ' + context.raw + '%';
                    }
                }
            }
        }
    };

    return (
        <div className="flex flex-col rounded-2xl border border-border p-6 gap-6 bg-white shadow-sm">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-foreground">Firstmile Status</h3>
                <button className="text-secondary hover:text-foreground">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>

            <div className="relative h-[220px] flex items-center justify-center">
                <Doughnut data={data} options={options} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-foreground">{total}</span>
                    <span className="text-xs text-secondary">Total</span>
                </div>
            </div>
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-success"></span>
                        <span className="text-secondary font-medium">Success (Delivered)</span>
                    </div>
                    <span className="font-bold">{successRate}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-warning"></span>
                        <span className="text-secondary font-medium">Ongoing/Other</span>
                    </div>
                    <span className="font-bold">{ongoing.toFixed(1)}%</span>
                </div>
            </div>
        </div>
    );
}
