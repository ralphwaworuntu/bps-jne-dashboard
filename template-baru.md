<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Logistics Dashboard - Courier & Expedition</title>
<meta name="description" content="Comprehensive logistics dashboard for tracking revenue, shipments, and fleet performance.">
<link href="https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@100..900&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style type="text/tailwindcss">
  :root {
    --primary: #165DFF;
    --primary-hover: #0E4BD9;
    --foreground: #080C1A;
    --secondary: #6A7686;
    --muted: #EFF2F7;
    --border: #F3F4F3;
    --card-grey: #F1F3F6;
    --success: #30B22D;
    --success-light: #DCFCE7;
    --error: #ED6B60;
    --error-light: #FEE2E2;
    --warning: #FED71F;
    --warning-light: #FEF9C3;
    --font-sans: 'Lexend Deca', sans-serif;
  }
  @theme inline {
    --color-primary: var(--primary);
    --color-primary-hover: var(--primary-hover);
    --color-foreground: var(--foreground);
    --color-secondary: var(--secondary);
    --color-muted: var(--muted);
    --color-border: var(--border);
    --color-card-grey: var(--card-grey);
    --color-success: var(--success);
    --color-success-light: var(--success-light);
    --color-error: var(--error);
    --color-error-light: var(--error-light);
    --color-warning: var(--warning);
    --color-warning-light: var(--warning-light);
    --font-sans: var(--font-sans);
    --radius-card: 24px;
    --radius-button: 50px;
    --radius-xl: 16px;
    --radius-2xl: 20px;
  }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
</head>
<body class="font-sans bg-white min-h-screen overflow-x-hidden">

<!-- Mobile Overlay -->
<div id="sidebar-overlay" class="fixed inset-0 bg-black/80 z-40 lg:hidden hidden" onclick="toggleSidebar()"></div>

<div class="flex h-screen max-h-screen flex-1 bg-muted overflow-hidden">
  <!-- SIDEBAR -->
  <aside id="sidebar" class="flex flex-col w-[280px] shrink-0 h-screen fixed inset-y-0 left-0 z-50 bg-white border-r border-border transform -translate-x-full lg:translate-x-0 transition-transform duration-300 overflow-hidden">
    <!-- Top Bar -->
    <div class="flex items-center justify-between border-b border-border h-[90px] px-5 gap-3">
      <div class="flex items-center gap-3">
        <div class="w-11 h-9 bg-primary rounded-xl flex items-center justify-center">
          <i data-lucide="package-check" class="w-5 h-5 text-white"></i>
        </div>
        <h1 class="font-semibold text-xl">SwiftLog</h1>
      </div>
      <button onclick="toggleSidebar()" class="lg:hidden size-11 flex shrink-0 bg-white rounded-xl p-[10px] items-center justify-center ring-1 ring-border hover:ring-primary transition-all duration-300 cursor-pointer">
        <i data-lucide="x" class="size-6 text-secondary"></i>
      </button>
    </div>

    <!-- Navigation -->
    <div class="flex flex-col p-5 pb-28 gap-6 overflow-y-auto flex-1">
      <div class="flex flex-col gap-4">
        <h3 class="font-medium text-sm text-secondary">Overview</h3>
        <div class="flex flex-col gap-1">
          <a href="#" class="group active cursor-pointer">
            <div class="flex items-center rounded-xl p-4 gap-3 bg-white group-[.active]:bg-muted group-hover:bg-muted transition-all duration-300">
              <i data-lucide="layout-dashboard" class="size-6 text-secondary group-[.active]:text-foreground group-hover:text-foreground transition-all duration-300"></i>
              <span class="font-medium text-secondary group-[.active]:font-semibold group-[.active]:text-foreground group-hover:text-foreground transition-all duration-300">Dashboard</span>
            </div>
          </a>
          <a href="#" class="group cursor-pointer">
            <div class="flex items-center rounded-xl p-4 gap-3 bg-white group-[.active]:bg-muted group-hover:bg-muted transition-all duration-300">
              <i data-lucide="map" class="size-6 text-secondary group-[.active]:text-foreground group-hover:text-foreground transition-all duration-300"></i>
              <span class="font-medium text-secondary group-[.active]:font-semibold group-[.active]:text-foreground group-hover:text-foreground transition-all duration-300">Live Map</span>
            </div>
          </a>
        </div>
      </div>

      <div class="flex flex-col gap-4">
        <h3 class="font-medium text-sm text-secondary">Operations</h3>
        <div class="flex flex-col gap-1">
          <a href="#" class="group cursor-pointer">
            <div class="flex items-center rounded-xl p-4 gap-3 bg-white group-[.active]:bg-muted group-hover:bg-muted transition-all duration-300">
              <i data-lucide="box" class="size-6 text-secondary group-[.active]:text-foreground group-hover:text-foreground transition-all duration-300"></i>
              <span class="font-medium text-secondary group-[.active]:font-semibold group-[.active]:text-foreground group-hover:text-foreground transition-all duration-300">Shipments</span>
            </div>
          </a>
          <a href="#" class="group cursor-pointer">
            <div class="flex items-center rounded-xl p-4 gap-3 bg-white group-[.active]:bg-muted group-hover:bg-muted transition-all duration-300">
              <i data-lucide="truck" class="size-6 text-secondary group-[.active]:text-foreground group-hover:text-foreground transition-all duration-300"></i>
              <span class="font-medium text-secondary group-[.active]:font-semibold group-[.active]:text-foreground group-hover:text-foreground transition-all duration-300">Fleet</span>
            </div>
          </a>
          <a href="#" class="group cursor-pointer">
            <div class="flex items-center rounded-xl p-4 gap-3 bg-white group-[.active]:bg-muted group-hover:bg-muted transition-all duration-300">
              <i data-lucide="users" class="size-6 text-secondary group-[.active]:text-foreground group-hover:text-foreground transition-all duration-300"></i>
              <span class="font-medium text-secondary group-[.active]:font-semibold group-[.active]:text-foreground group-hover:text-foreground transition-all duration-300">Drivers</span>
            </div>
          </a>
        </div>
      </div>
      
      <div class="flex flex-col gap-4">
        <h3 class="font-medium text-sm text-secondary">Reports</h3>
        <div class="flex flex-col gap-1">
          <a href="#" class="group cursor-pointer">
            <div class="flex items-center rounded-xl p-4 gap-3 bg-white group-[.active]:bg-muted group-hover:bg-muted transition-all duration-300">
              <i data-lucide="bar-chart-3" class="size-6 text-secondary group-[.active]:text-foreground group-hover:text-foreground transition-all duration-300"></i>
              <span class="font-medium text-secondary group-[.active]:font-semibold group-[.active]:text-foreground group-hover:text-foreground transition-all duration-300">Analytics</span>
            </div>
          </a>
           <a href="#" class="group cursor-pointer">
            <div class="flex items-center rounded-xl p-4 gap-3 bg-white group-[.active]:bg-muted group-hover:bg-muted transition-all duration-300">
              <i data-lucide="file-text" class="size-6 text-secondary group-[.active]:text-foreground group-hover:text-foreground transition-all duration-300"></i>
              <span class="font-medium text-secondary group-[.active]:font-semibold group-[.active]:text-foreground group-hover:text-foreground transition-all duration-300">Invoices</span>
            </div>
          </a>
        </div>
      </div>
    </div>

    <!-- Help Card -->
    <div class="absolute bottom-0 left-0 w-[280px]">
      <div class="flex items-center justify-between border-t bg-white border-border p-5 gap-3">
        <div class="min-w-0">
          <p class="font-semibold text-foreground">Support Center</p>
          <a href="#" class="cursor-pointer"><span class="text-sm text-secondary hover:text-primary hover:underline transition-all duration-300">Get assistance</span></a>
        </div>
        <div class="size-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <i data-lucide="headset" class="size-6 text-primary"></i>
        </div>
      </div>
    </div>
  </aside>

  <!-- MAIN CONTENT -->
  <main class="flex-1 lg:ml-[280px] flex flex-col bg-white min-h-screen overflow-x-hidden">
    <!-- Top Header -->
    <div class="flex items-center justify-between w-full h-[90px] shrink-0 border-b border-border bg-white px-5 md:px-8">
      <button onclick="toggleSidebar()" class="lg:hidden size-11 flex items-center justify-center rounded-xl ring-1 ring-border hover:ring-primary transition-all duration-300 cursor-pointer">
        <i data-lucide="menu" class="size-6 text-foreground"></i>
      </button>
      <h2 class="hidden lg:block font-bold text-2xl text-foreground">Logistics Overview</h2>
      <div class="flex items-center gap-3">
        <button onclick="openSearchModal()" class="size-11 flex items-center justify-center rounded-xl ring-1 ring-border hover:ring-primary transition-all duration-300 cursor-pointer">
          <i data-lucide="search" class="size-6 text-secondary"></i>
        </button>
        <button class="size-11 flex items-center justify-center rounded-xl ring-1 ring-border hover:ring-primary transition-all duration-300 cursor-pointer relative">
          <i data-lucide="bell" class="size-6 text-secondary"></i>
          <span class="absolute -top-1 -right-1 h-5 px-1.5 rounded-full bg-error text-white text-xs font-medium flex items-center justify-center">5</span>
        </button>
        <div class="hidden md:flex items-center gap-3 pl-3 border-l border-border">
          <div class="text-right">
            <p class="font-semibold text-foreground text-sm">Alex Morgan</p>
            <p class="text-secondary text-xs">Operations Manager</p>
          </div>
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" alt="Profile" class="size-11 rounded-full object-cover ring-2 ring-border">
        </div>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div class="flex-1 overflow-y-auto p-5 md:p-8">
      
      <!-- Date Filter & Actions -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-foreground text-2xl md:text-3xl font-bold mb-1">Performance Summary</h1>
          <p class="text-secondary text-sm">Key metrics for the current fiscal period.</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="relative hidden sm:block">
            <i data-lucide="calendar" class="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-secondary"></i>
            <select class="pl-10 pr-10 py-3 rounded-full bg-white ring-1 ring-border focus:ring-primary outline-none text-sm font-semibold cursor-pointer appearance-none">
              <option>Last 30 Days</option>
              <option>This Quarter</option>
              <option>Last Year</option>
            </select>
            <i data-lucide="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-secondary pointer-events-none"></i>
          </div>
          <button class="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary-hover transition-all duration-300 cursor-pointer shadow-lg shadow-primary/20">
            <i data-lucide="download" class="w-5 h-5"></i>
            <span>Export Report</span>
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <!-- Revenue -->
        <div class="flex flex-col rounded-2xl border border-border p-6 gap-3 bg-white hover:shadow-sm transition-all duration-300">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-[6px]">
              <div class="size-11 bg-success/10 rounded-xl flex items-center justify-center shrink-0">
                <i data-lucide="dollar-sign" class="size-6 text-success"></i>
              </div>
              <p class="font-medium text-secondary">Total Revenue</p>
            </div>
            <span class="bg-success-light text-success-dark text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <i data-lucide="trending-up" class="size-3"></i> 12.5%
            </span>
          </div>
          <p class="font-bold text-[32px] leading-10">$4.2M</p>
          <p class="text-xs text-secondary">vs $3.8M last period</p>
        </div>

        <!-- Shipments -->
        <div class="flex flex-col rounded-2xl border border-border p-6 gap-3 bg-white hover:shadow-sm transition-all duration-300">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-[6px]">
              <div class="size-11 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <i data-lucide="package" class="size-6 text-primary"></i>
              </div>
              <p class="font-medium text-secondary">Total Shipments</p>
            </div>
             <span class="bg-success-light text-success-dark text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <i data-lucide="trending-up" class="size-3"></i> 8.2%
            </span>
          </div>
          <p class="font-bold text-[32px] leading-10">125K</p>
          <p class="text-xs text-secondary">Avg 4.1K per day</p>
        </div>

        <!-- On-Time Rate -->
        <div class="flex flex-col rounded-2xl border border-border p-6 gap-3 bg-white hover:shadow-sm transition-all duration-300">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-[6px]">
              <div class="size-11 bg-warning/10 rounded-xl flex items-center justify-center shrink-0">
                <i data-lucide="clock" class="size-6 text-warning-dark"></i>
              </div>
              <p class="font-medium text-secondary">On-Time Rate</p>
            </div>
             <span class="bg-error-light text-error-dark text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <i data-lucide="trending-down" class="size-3"></i> 0.5%
            </span>
          </div>
          <p class="font-bold text-[32px] leading-10">96.8%</p>
          <p class="text-xs text-secondary">Target: 98.0%</p>
        </div>

        <!-- Active Fleet -->
        <div class="flex flex-col rounded-2xl border border-border p-6 gap-3 bg-white hover:shadow-sm transition-all duration-300">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-[6px]">
              <div class="size-11 bg-card-message rounded-xl flex items-center justify-center shrink-0">
                <i data-lucide="truck" class="size-6 text-primary"></i>
              </div>
              <p class="font-medium text-secondary">Active Fleet</p>
            </div>
            <span class="bg-muted text-secondary text-xs font-bold px-2 py-1 rounded-full">
              Stable
            </span>
          </div>
          <p class="font-bold text-[32px] leading-10">452</p>
          <p class="text-xs text-secondary">Total fleet: 480 vehicles</p>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        <!-- Revenue Growth Chart (Large - 2 cols) -->
        <div class="lg:col-span-2 flex flex-col rounded-2xl border border-border p-6 gap-6 bg-white">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 class="font-bold text-lg text-foreground">Revenue Growth & Volume</h3>
              <p class="text-sm text-secondary">Comparative analysis by service type</p>
            </div>
            <div class="flex items-center gap-2">
              <button class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">Monthly</button>
              <button class="px-3 py-1.5 rounded-lg text-secondary hover:bg-muted text-xs font-medium transition-colors">Quarterly</button>
            </div>
          </div>
          <div class="w-full h-[300px]">
            <canvas id="revenueChart"></canvas>
          </div>
        </div>

        <!-- Shipment Status (Small - 1 col) -->
        <div class="flex flex-col rounded-2xl border border-border p-6 gap-6 bg-white">
          <h3 class="font-bold text-lg text-foreground">Shipment Status</h3>
          <div class="relative h-[220px] flex items-center justify-center">
            <canvas id="statusChart"></canvas>
            <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span class="text-3xl font-bold text-foreground">125K</span>
              <span class="text-xs text-secondary">Total</span>
            </div>
          </div>
          <div class="flex flex-col gap-3">
             <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-success"></span>
                  <span class="text-secondary font-medium">Delivered</span>
                </div>
                <span class="font-bold">65%</span>
             </div>
             <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-primary"></span>
                  <span class="text-secondary font-medium">In Transit</span>
                </div>
                <span class="font-bold">25%</span>
             </div>
             <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-warning"></span>
                  <span class="text-secondary font-medium">Pending</span>
                </div>
                <span class="font-bold">10%</span>
             </div>
          </div>
        </div>
      </div>

      <!-- Bottom Section: Routes & Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Top Routes -->
        <div class="flex flex-col rounded-2xl border border-border bg-white overflow-hidden">
          <div class="flex items-center justify-between p-6 border-b border-border">
            <h3 class="font-bold text-lg text-foreground">Top Performance Routes</h3>
            <a href="#" class="text-sm text-primary font-semibold hover:underline">View All</a>
          </div>
          <div class="flex flex-col">
            <!-- Route Item 1 -->
            <div class="flex items-center gap-4 p-5 border-b border-border hover:bg-muted/30 transition-all">
              <div class="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                <img src="https://images.unsplash.com/photo-1496442226666-8d4a0e62e6e9?w=100&h=100&fit=crop" alt="NY" class="w-full h-full object-cover">
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-bold text-foreground">New York</span>
                  <i data-lucide="arrow-right" class="size-3 text-secondary"></i>
                  <span class="font-bold text-foreground">Los Angeles</span>
                </div>
                <p class="text-xs text-secondary">Route ID: #US-E2W-88</p>
              </div>
              <div class="text-right">
                <p class="font-bold text-foreground">12.5K</p>
                <p class="text-xs text-success font-medium">2.1 Days Avg</p>
              </div>
            </div>

            <!-- Route Item 2 -->
            <div class="flex items-center gap-4 p-5 border-b border-border hover:bg-muted/30 transition-all">
              <div class="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                <img src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=100&h=100&fit=crop" alt="CHI" class="w-full h-full object-cover">
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-bold text-foreground">Chicago</span>
                  <i data-lucide="arrow-right" class="size-3 text-secondary"></i>
                  <span class="font-bold text-foreground">Miami</span>
                </div>
                <p class="text-xs text-secondary">Route ID: #US-N2S-42</p>
              </div>
              <div class="text-right">
                <p class="font-bold text-foreground">8.2K</p>
                <p class="text-xs text-success font-medium">3.5 Days Avg</p>
              </div>
            </div>

             <!-- Route Item 3 -->
            <div class="flex items-center gap-4 p-5 hover:bg-muted/30 transition-all">
              <div class="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                <img src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=100&h=100&fit=crop" alt="SEA" class="w-full h-full object-cover">
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-bold text-foreground">Seattle</span>
                  <i data-lucide="arrow-right" class="size-3 text-secondary"></i>
                  <span class="font-bold text-foreground">Austin</span>
                </div>
                <p class="text-xs text-secondary">Route ID: #US-W2S-15</p>
              </div>
              <div class="text-right">
                <p class="font-bold text-foreground">6.4K</p>
                <p class="text-xs text-warning-dark font-medium">4.2 Days Avg</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Deliveries / Activity -->
        <div class="flex flex-col rounded-2xl border border-border bg-white overflow-hidden">
           <div class="flex items-center justify-between p-6 border-b border-border">
            <h3 class="font-bold text-lg text-foreground">Live Delivery Updates</h3>
            <span class="flex items-center gap-1.5 px-2 py-1 bg-success/10 text-success text-xs font-bold rounded-full">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              Live
            </span>
          </div>
          <div class="flex flex-col p-6 gap-6">
            <!-- Activity 1 -->
            <div class="flex gap-4">
              <div class="relative">
                <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop" alt="Driver" class="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm">
                <div class="absolute -bottom-1 -right-1 bg-success text-white p-1 rounded-full ring-2 ring-white">
                  <i data-lucide="check" class="size-3"></i>
                </div>
              </div>
              <div class="flex-1 min-w-0 pt-0.5">
                <div class="flex justify-between items-start">
                   <h4 class="font-semibold text-sm text-foreground">Mike Johnson</h4>
                   <span class="text-xs text-secondary">2 min ago</span>
                </div>
                <p class="text-sm text-secondary mt-0.5">Delivered <span class="font-medium text-foreground">#SHP-9921</span> to Downtown Warehouse.</p>
              </div>
            </div>

            <!-- Activity 2 -->
            <div class="flex gap-4">
              <div class="relative">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" alt="Driver" class="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm">
                 <div class="absolute -bottom-1 -right-1 bg-primary text-white p-1 rounded-full ring-2 ring-white">
                  <i data-lucide="truck" class="size-3"></i>
                </div>
              </div>
              <div class="flex-1 min-w-0 pt-0.5">
                <div class="flex justify-between items-start">
                   <h4 class="font-semibold text-sm text-foreground">Sarah Connor</h4>
                   <span class="text-xs text-secondary">15 min ago</span>
                </div>
                <p class="text-sm text-secondary mt-0.5">Started route <span class="font-medium text-foreground">Zone B-12</span>. 45 packages loaded.</p>
              </div>
            </div>

            <!-- Activity 3 -->
            <div class="flex gap-4">
              <div class="relative">
                <img src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop" alt="Driver" class="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm">
                 <div class="absolute -bottom-1 -right-1 bg-warning text-white p-1 rounded-full ring-2 ring-white">
                  <i data-lucide="alert-circle" class="size-3"></i>
                </div>
              </div>
              <div class="flex-1 min-w-0 pt-0.5">
                <div class="flex justify-between items-start">
                   <h4 class="font-semibold text-sm text-foreground">David Chen</h4>
                   <span class="text-xs text-secondary">42 min ago</span>
                </div>
                <p class="text-sm text-secondary mt-0.5">Reported delay: <span class="font-medium text-foreground">Traffic Congestion</span> on I-95 South.</p>
              </div>
            </div>
            
            <button class="w-full py-3 mt-2 rounded-xl border border-border text-sm font-semibold text-secondary hover:bg-muted hover:text-foreground transition-all">
              View All Activities
            </button>
          </div>
        </div>
      </div>

    </div>
  </main>
</div>

<!-- Search Modal -->
<div id="search-modal" class="fixed inset-0 bg-black/50 z-[100] hidden items-center justify-center p-4">
  <div class="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
    <div class="p-4 border-b border-border">
      <div class="flex items-center gap-3 bg-muted rounded-xl px-4">
        <i data-lucide="search" class="size-5 text-secondary"></i>
        <input type="text" id="search-input" placeholder="Track shipment ID, route, or driver..." class="flex-1 py-3 bg-transparent outline-none text-foreground placeholder:text-secondary">
        <kbd class="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-xs text-secondary border border-border">ESC</kbd>
      </div>
    </div>
    <div class="p-4 overflow-y-auto max-h-[60vh]">
      <p class="text-sm text-secondary mb-3">Recent Searches</p>
      <div class="flex flex-col gap-2">
        <a href="#" class="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-all cursor-pointer">
          <div class="size-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <i data-lucide="package" class="size-5 text-primary"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-foreground truncate">#SHP-29931</p>
            <p class="text-sm text-secondary truncate">In Transit • Expected Today</p>
          </div>
        </a>
        <a href="#" class="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-all cursor-pointer">
          <div class="size-10 bg-card-grey rounded-xl flex items-center justify-center">
            <i data-lucide="truck" class="size-5 text-secondary"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-foreground truncate">Fleet Route 42A</p>
            <p class="text-sm text-secondary truncate">North District • Active</p>
          </div>
        </a>
      </div>
    </div>
  </div>
</div>

<!-- Page Not Found Modal -->
<div id="page-not-found-modal" class="fixed inset-0 bg-black/50 z-[100] hidden flex items-center justify-center p-4">
  <div class="bg-white rounded-card p-6 max-w-sm w-full text-center">
    <div class="w-16 h-16 bg-warning-light rounded-full flex items-center justify-center mx-auto mb-4">
      <i data-lucide="alert-triangle" class="w-8 h-8 text-warning-dark"></i>
    </div>
    <h3 class="text-foreground text-xl font-bold mb-2">Page Not Available</h3>
    <p class="text-gray-500 text-sm mb-6">This page hasn't been created yet. Generate it using the chat!</p>
    <button onclick="closePageNotFoundModal()" class="w-full px-4 py-2.5 bg-primary text-white rounded-button font-medium hover:bg-primary-hover transition-all duration-200 cursor-pointer">
      Got it
    </button>
  </div>
</div>

<script>
// --- Initialization ---
document.addEventListener('DOMContentLoaded', function() {
  lucide.createIcons();
  initCharts();
  
  // Link click handler
  document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      document.getElementById('page-not-found-modal').classList.remove('hidden');
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeSearchModal();
      closePageNotFoundModal();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearchModal();
    }
  });

  // Modal click outside
  document.getElementById('search-modal').addEventListener('click', function(e) {
    if (e.target === this) closeSearchModal();
  });
});

// --- Modal Functions ---
function openSearchModal() {
  const modal = document.getElementById('search-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => document.getElementById('search-input').focus(), 100);
}

function closeSearchModal() {
  const modal = document.getElementById('search-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function closePageNotFoundModal() {
  document.getElementById('page-not-found-modal').classList.add('hidden');
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('-translate-x-full');
  overlay.classList.toggle('hidden');
  document.body.classList.toggle('overflow-hidden');
}

// --- Chart Initialization ---
function initCharts() {
  const chartFont = "'Lexend Deca', sans-serif";
  
  // 1. Revenue Growth Chart
  const ctxRevenue = document.getElementById('revenueChart').getContext('2d');
  new Chart(ctxRevenue, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
      datasets: [
        {
          label: 'Revenue (M)',
          data: [2.8, 3.1, 3.0, 3.4, 3.2, 3.8, 4.0, 4.2],
          borderColor: '#165DFF',
          backgroundColor: (context) => {
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
          label: 'Expenses (M)',
          data: [2.1, 2.3, 2.2, 2.5, 2.4, 2.8, 2.9, 3.0],
          borderColor: '#9CA3AF',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.4,
          fill: false,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: { family: chartFont, size: 12 }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#080C1A',
          titleFont: { family: chartFont },
          bodyFont: { family: chartFont },
          padding: 10,
          cornerRadius: 8,
          displayColors: false
        }
      },
      scales: {
        y: {
          grid: { color: '#F3F4F3', drawBorder: false },
          ticks: { font: { family: chartFont }, color: '#6A7686', callback: (val) => '$' + val + 'M' }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: chartFont }, color: '#6A7686' }
        }
      }
    }
  });

  // 2. Status Chart (Doughnut)
  const ctxStatus = document.getElementById('statusChart').getContext('2d');
  new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: ['Delivered', 'In Transit', 'Pending'],
      datasets: [{
        data: [65, 25, 10],
        backgroundColor: ['#30B22D', '#165DFF', '#FED71F'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#080C1A',
          bodyFont: { family: chartFont },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              return context.label + ': ' + context.raw + '%';
            }
          }
        }
      }
    }
  });
}
</script>
</body>
</html>