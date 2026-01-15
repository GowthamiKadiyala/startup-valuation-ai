import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites: async () => {
    return [
      {
        source: "/api/:path*",
        destination:
          process.env.NODE_ENV === "development"
            ? "http://127.0.0.1:8000/api/:path*" // Local: Send to Python port 8000
            : "/api/", // Prod: Handled by Vercel
      },
    ];
  },
};

export default nextConfig;
