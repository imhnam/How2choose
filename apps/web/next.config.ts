import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  experimental: { agentUpgrade: 'security' },
};
export default config;
