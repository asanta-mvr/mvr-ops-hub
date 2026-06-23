/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bundle the crown PNG with API routes that read it at runtime
  // (e.g. /api/v1/invitations/* reads public/mvr-crown-logo.png to attach
  // it inline to outgoing emails via nodemailer).
  // Next.js 14.2 expects this under `experimental`; it only became a
  // top-level key in Next 15. Keeping it nested silences the
  // "Unrecognized key" warning on 14.2.35.
  experimental: {
    outputFileTracingIncludes: {
      '/api/v1/invitations/**': ['./public/mvr-crown-logo.png'],
    },
  },
}

export default nextConfig
