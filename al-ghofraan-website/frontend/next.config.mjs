/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8055',
        pathname: '/assets/**',
      },
      {
        protocol: 'http',
        hostname: 'directus',
        port: '8055',
        pathname: '/assets/**',
      },
      {
        protocol: 'https',
        hostname: 'al-ghofraan.com',
        pathname: '/assets/**',
      },
    ],
  },

  experimental: {
    typedRoutes: false,
  },

  // Oude inschrijfroute Koranonderwijs → Hifdh programma (permanent, 308).
  async redirects() {
    return [
      {
        source: '/onderwijs/inschrijven',
        destination: '/onderwijs/hifdhprogramma',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;