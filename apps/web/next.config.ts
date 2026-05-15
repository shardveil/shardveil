import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@shardveil/shared', '@shardveil/contracts'],
};

export default nextConfig;
