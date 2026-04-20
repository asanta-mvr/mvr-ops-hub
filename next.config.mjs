/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // maplibre-gl uses browser-only APIs (WebGL, canvas) — exclude from server bundle
    if (isServer) {
      config.externals = [...(Array.isArray(config.externals) ? config.externals : []), 'maplibre-gl']
    }
    return config
  },
}

export default nextConfig
