import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // reactCompiler: true, // Commenting out to avoid potential type issues if experimental
  // Izinkan akses LAN (Next.js block cross-origin di mode dev bila IP tidak terdaftar).
  // Update IP WiFi di sini jika berubah.
  allowedDevOrigins: [
    "192.168.1.29",
    "192.168.1.33",
    "localhost",
    "127.0.0.1",
  ],

  // Upload SCO/APEX bisa >10MB; default proxy Next.js memotong body → socket hang up.
  experimental: {
    proxyClientMaxBodySize: "300mb",
    // Upload APEX besar butuh waktu parse di backend
    proxyTimeout: 300_000,
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/:path*",
      },
    ];
  },
};

export default nextConfig;
