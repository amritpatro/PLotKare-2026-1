/** @type {import('next').NextConfig} */
// Dynamic Next.js runtime for Supabase Auth, middleware, route handlers, and Hostinger Node hosting.
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || ''

const nextConfig = {
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  trailingSlash: true,
  turbopack: {
    root: __dirname,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

export default nextConfig
