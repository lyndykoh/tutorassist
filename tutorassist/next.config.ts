// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   serverExternalPackages: ["pdf-parse"],
// };

// export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopack: {
      root: "./",
    },
  },
};

export default nextConfig;