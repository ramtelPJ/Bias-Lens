import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "www.reuters.com",
      },
      // ponytail: enumerated from actual stored article image_url hostnames
      // (each source's own CDN, not its homepage domain) — add the next
      // source's here the same way if next/image throws on it.
      {
        protocol: "https",
        hostname: "npr.brightspotcdn.com",
      },
      {
        protocol: "https",
        hostname: "i.guim.co.uk",
      },
      {
        protocol: "https",
        hostname: "static.foxnews.com",
      },
      {
        protocol: "https",
        hostname: "ichef.bbci.co.uk",
      },
    ],
  },
};

export default nextConfig;
