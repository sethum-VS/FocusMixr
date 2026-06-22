import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  // VS Code / GitHub dev tunnels proxy to localhost — allow their origins for
  // HMR, webpack chunks, and font preloads (blocked by default in Next 16 dev).
  allowedDevOrigins: ["*.devtunnels.ms", "*.asse.devtunnels.ms"],
};

export default nextConfig;
