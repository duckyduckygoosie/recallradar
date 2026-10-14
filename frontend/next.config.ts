import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8000'}/api/:path*` }];
  },
};

export default nextConfig;
