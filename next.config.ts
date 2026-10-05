import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "onchainos.bnbstatic.com" }] },
  // Lets the dev server be viewed through Google Cloud Shell's Web Preview.
  allowedDevOrigins: ["*.cloudshell.dev"],
};

export default config;
