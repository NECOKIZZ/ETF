import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "onchainos.bnbstatic.com" }] },
};

export default config;
