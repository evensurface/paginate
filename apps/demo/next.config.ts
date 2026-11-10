import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@evensurface/paginate", "@evensurface/paginate-drizzle"],
}

export default nextConfig
