// Cấu hình bổ sung cho Vercel
module.exports = {
  // Cấu hình Next.js
  async headers() {
    return [
      {
        // Áp dụng cho tất cả các route
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  // Cấu hình chuyển hướng
  async redirects() {
    return [];
  },
  // Cấu hình rewrite
  async rewrites() {
    return [];
  },
};
