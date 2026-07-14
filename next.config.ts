import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ถ้าตัวแปร STANDALONE_BUILD เป็น 'true' ให้เปิด standalone
  // ถ้าไม่ใช่ (เช่นรันบนเครื่อง Local) ก็ไม่ต้องใส่ค่า output (เป็น undefined ไป)
  output: process.env.STANDALONE_BUILD === "true" ? "standalone" : undefined,
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "profile.line-scdn.net",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "graph.facebook.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
