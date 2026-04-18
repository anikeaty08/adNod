/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    workerThreads: true,
  },
  transpilePackages: ["@cofhe/sdk"],
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@react-native-async-storage/async-storage": false,
      "react-native": false,
      ...(isServer
        ? {
            // Prevent CoFHE web storage from executing in Node during build/SSR.
            "iframe-shared-storage": false,
            // Some wallet SDK deps use IndexedDB-only storage helpers.
            "idb-keyval": false,
          }
        : {}),
    };
    return config;
  },
};

export default nextConfig;
