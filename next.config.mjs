/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/home',
        destination: '/',
      },
    ];
  },
};

export default nextConfig;

