/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bundle the crown PNG with API routes that read it at runtime
  // (e.g. /api/v1/invitations/* reads public/mvr-crown-logo.png to attach
  // it inline to outgoing emails via nodemailer).
  outputFileTracingIncludes: {
    '/api/v1/invitations/**': ['./public/mvr-crown-logo.png'],
  },
}

export default nextConfig
