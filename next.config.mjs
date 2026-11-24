/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Server-only parsers used by the upload route; load them from node_modules
    // at runtime instead of bundling them.
    serverComponentsExternalPackages: ["mammoth", "linkedom"],
  },
};

export default nextConfig;
