/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Allow WebSocket connections to Deriv
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' wss://ws.binaryws.com wss://frontend.binaryws.com https://api.deriv.com",
              "img-src 'self' data: https:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
