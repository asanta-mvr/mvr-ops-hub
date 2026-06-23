// AES-256-GCM encryption helpers for at-rest secrets. Used for the Gmail
// refresh token (`GoogleWorkspaceCredential.refreshToken`, key
// `GMAIL_TOKEN_SECRET`) and for Guesty credentials
// (`GuestyConnection.clientSecret` / `accessToken`, key
// `INTEGRATION_SECRET_KEY`).
//
// Key source: an env var holding a 32-byte (256-bit) key encoded as 64 hex
// chars. Defaults to `GMAIL_TOKEN_SECRET`; pass a different env var name as
// the second argument to key a different domain (so rotating one key never
// breaks another). Generate a key with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
// Wire format (base64-encoded single string):
//   <12-byte iv> | <16-byte auth tag> | <ciphertext>
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

const DEFAULT_KEY_ENV = 'GMAIL_TOKEN_SECRET'

function loadKey(keyEnv: string = DEFAULT_KEY_ENV): Buffer {
  const hex = process.env[keyEnv]
  if (!hex || hex.length !== 64) {
    throw new Error(
      `${keyEnv} must be a 32-byte hex string (64 chars). Generate one with \`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"\``
    )
  }
  return Buffer.from(hex, 'hex')
}

export function encryptSecret(plaintext: string, keyEnv: string = DEFAULT_KEY_ENV): string {
  const key = loadKey(keyEnv)
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct]).toString('base64')
}

export function decryptSecret(blob: string, keyEnv: string = DEFAULT_KEY_ENV): string {
  const key = loadKey(keyEnv)
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
