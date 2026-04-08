/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESM-only packages that need transpilation for SSR/SSG compatibility
  transpilePackages: ['react-markdown', 'remark-gfm', 'remark-parse', 'unified', 'vfile', 'unist-util-visit'],
  experimental: {
    // Force the docs source files into Vercel traces for server-rendered routes.
    outputFileTracingIncludes: {
      '/**': ['./content/docs/**/*'],
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
    ],
  },

  // Security headers for MonkeyTest/Lighthouse compliance
  async headers() {
    return [
      {
        // CORS for public API (used by landing-agrobiciufa)
        source: '/api/public/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://landing-agrobiciufa.vercel.app',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, x-tenant-key',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // NOTA: Turbopack se desactiva desde el comando npm, no desde config
  // Usar: npm run dev:no-turbo
  // Ver: PROBLEMA_SPECS_AUDITORIAS.md

  // Suprimir warnings de Sentry/OpenTelemetry (require-in-the-middle)
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.ignoreWarnings = [
        { module: /node_modules\/require-in-the-middle/ },
        { module: /node_modules\/@opentelemetry/ },
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
