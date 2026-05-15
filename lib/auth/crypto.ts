// AES-256-GCM encryption helpers for at-rest secrets (currently used for
// the Gmail refresh token stored on `GoogleWorkspaceCredential.refreshToken`).
//
// Key source: `GMAIL_TOKEN_SECRET` env var. Must be a 32-byte (256-bit) key
// encoded as 64 hex chars. Generate with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
// Wire format (base64-encoded single string):
//   <12-byte iv> | <16-byte auth tag> | <ciphertext>
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

function loadKey(): Buffer {
  const hex = process.env.GMAIL_TOKEN_SECRET
  if (!hex || hex.length !== 64) {
    throw new Error(
      'GMAIL_TOKEN_SECRET must be a 32-byte hex string (64 chars). Generate one with `node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"`'
    )
  }
  return Buffer.from(hex, 'hex')
}

export function encryptSecret(plaintext: string): string {
  const key = loadKey()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct]).toString('base64')
}

export function decryptSecret(blob: string): string {
  const key = loadKey()
  const buf = Buffer.from(blob, 'base64')
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('Ciphertext too short — corrupted or wrong format')
  }
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ct = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const pt = Buffer.concat([decipher.update(ct), decipher.final()])
  return pt.toString('utf8')
}
