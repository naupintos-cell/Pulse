/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingExcludes: {
      '*': ['./supabase/**/*'],
    },
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig
