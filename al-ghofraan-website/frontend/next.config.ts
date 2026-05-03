import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8055",
        pathname: "/assets/**",
      },
      {
        protocol: "https",
        hostname: "cms.al-ghofraan.com",
        pathname: "/assets/**",
      },
    ],
  },
  // Voorbereid op i18n (later activeren)
  // i18n: {
  //   locales: ['nl', 'en', 'ar'],
  //   defaultLocale: 'nl',
  //   localeDetection: false,
  // },
};

export default nextConfig;
