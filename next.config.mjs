/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output is needed for Electron packaging
  ...(process.env.ELECTRON_BUILD && { output: "standalone" }),
};

export default nextConfig;
