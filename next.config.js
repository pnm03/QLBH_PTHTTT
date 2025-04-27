/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  eslint: {
    // Bỏ qua lỗi ESLint trong quá trình xây dựng
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Bỏ qua lỗi TypeScript trong quá trình xây dựng
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Suppress the punycode deprecation warning
    config.ignoreWarnings = [
      { module: /node_modules\/punycode/ }
    ];
    return config;
  }
};

module.exports = nextConfig;
