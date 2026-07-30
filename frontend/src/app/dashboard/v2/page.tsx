"use client";

import { useState, useEffect, useCallback } from "react";
import { API_URL, authHeaders } from "../../../config";
import StatsCard from "@/components/dashboard/v2/StatsCard";
import { VolumeChart, StatusChart } from "@/components/dashboard/v2/AnalyticsCharts";
import RecentActivity from "@/components/dashboard/v2/RecentActivity";
import { useDashboard } from "@/context/DashboardContext";
import { Box, Truck, AlertTriangle, CheckCircle, BarChart3 } from "lucide-react";

export default function DashboardV2() {
  const { notifications } = useDashboard();
  const [firstmileStats, setFirstmileStats] = useState<any>(null);
  const [correctionStats, setCorrectionStats] = useState<any[]>([]);
  const [dailyIssueStats, setDailyIssueStats] = useState<any[]>([]);
  const [dailyIssueCount, setDailyIssueCount] = useState(0);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/analytics/firstmile`, {
        headers: authHeaders(),
      });
      if (res.ok) setFirstmileStats(await res.json());
    } catch (error) {
      console.error("Failed to fetch firstmile analytics", error);
    }
  }, []);

  const fetchCorrectionStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/correction-requests`, {
        headers: authHeaders(),
      });
      if (res.ok) setCorrectionStats(await res.json());
    } catch (error) {
      console.error("Failed to fetch correction stats", error);
    }
  }, []);

  const fetchDailyIssues = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/daily-issues?limit=1`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDailyIssueStats(data);
          setDailyIssueCount(data.length);
        } else {
          setDailyIssueStats(data.items || []);
          setDailyIssueCount(data.total || 0);
        }
      }
    } catch (error) {
      console.error("Failed to fetch daily issues", error);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchCorrectionStats();
    fetchDailyIssues();

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      fetchCorrectionStats();
      fetchDailyIssues();
    };
    const interval = window.setInterval(tick, 30000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchAnalytics, fetchCorrectionStats, fetchDailyIssues]);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Performance Summary</h1>
          <p className="text-secondary text-sm">Overview of current shipment performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary-hover transition-all duration-300 cursor-pointer shadow-lg shadow-primary/20"
          >
            <span>Export Report</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <StatsCard
          title="Lastmile Data"
          count="Lastmile"
          subtext="Manage Shipments"
          icon={Box}
          href="/dashboard/v2/lastmile"
          colorClass="text-primary"
        />
        <StatsCard
          title="Firstmile Data"
          count={firstmileStats?.total_shipments?.toLocaleString() || "0"}
          subtext="Total Shipments"
          icon={Truck}
          href="/dashboard/v2/firstmile"
          colorClass="text-orange-500"
          trend={
            firstmileStats?.success_rate ? `${firstmileStats.success_rate}% Success` : undefined
          }
          trendUp={true}
        />
        <StatsCard
          title="Issue Harian"
          count={dailyIssueCount.toLocaleString()}
          subtext="Total Issues"
          icon={AlertTriangle}
          href="/dashboard/v2/daily-issue"
          colorClass="text-error"
        />
        <StatsCard
          title="Req Koreksi"
          count={correctionStats ? correctionStats.length.toLocaleString() : "0"}
          subtext="Total Requests"
          icon={CheckCircle}
          href="/dashboard/v2/correction-request"
          colorClass="text-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <VolumeChart firstmileStats={firstmileStats} />
        <StatusChart firstmileStats={firstmileStats} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        <div className="flex flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm h-full">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h3 className="font-bold text-lg text-foreground">Top Destinations</h3>
            <button type="button" className="text-xs font-semibold text-primary hover:text-primary-hover">
              View All
            </button>
          </div>
          <div className="p-0 flex flex-col h-full overflow-y-auto">
            {firstmileStats?.top_routes && firstmileStats.top_routes.length > 0 ? (
              firstmileStats.top_routes.map((route: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        index < 3 ? "bg-primary text-white" : "bg-secondary/20 text-secondary"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{route.destination}</p>
                      <p className="text-xs text-secondary">{route.percentage}% of total</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-foreground">
                    {route.count.toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-secondary text-sm flex flex-col items-center gap-2">
                <BarChart3 className="w-8 h-8 opacity-20" />
                <p>No route data available</p>
              </div>
            )}
          </div>
        </div>
        <RecentActivity notifications={notifications} />
      </div>
    </>
  );
}
