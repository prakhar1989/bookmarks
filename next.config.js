/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
        port: "",
      },
    ],
  },
  serverExternalPackages: ["bun:sqlite"],
  turbopack: {},
};

module.exports = nextConfig;
