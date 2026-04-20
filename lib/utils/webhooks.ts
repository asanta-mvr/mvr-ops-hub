import crypto from 'crypto'

export function verifyHmacSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) return false

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex')

  const sigBuffer = Buffer.from(signature.replace(/^sha256=/, ''), 'hex')
  const expectedBuffer = Buffer.from(expectedSig, 'hex')

  if (sigBuffer.length !== expectedBuffer.length) return false

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer)
}
