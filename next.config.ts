import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@aws-sdk/client-s3'],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
