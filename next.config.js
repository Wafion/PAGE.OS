require('dotenv').config();

const path = require('path');
const { ProvidePlugin } = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.PAGEOS_NEXT_DIST || '.next',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.gutenberg.org',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias.canvas = false;

    if (isServer) {
      // Node.js 18 lacks the global File constructor (added in Node 20).
      // cheerio 1.2+ pulls in undici which references File as a bare global
      // at module-init time, crashing the Next.js build when it collects page data.
      // ProvidePlugin injects the polyfill into every bundled module that uses File.
      config.plugins.push(
        new ProvidePlugin({
          File: path.resolve(__dirname, 'src/lib/server-file-polyfill.js'),
        })
      );
    }

    return config;
  },
};

module.exports = nextConfig;
