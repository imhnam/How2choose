import type { NextConfig } from 'next';
const config: NextConfig = { poweredByHeader: false, ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}) };
export default config;
