// Thin wrapper around puppeteer-core + @sparticuz/chromium. Renders a
// same-origin URL to PDF bytes.
//
// Runtime split:
//   • Vercel/Lambda → use @sparticuz/chromium's bundled Chromium (Linux)
//   • Local dev     → use the Chrome at PUPPETEER_EXECUTABLE_PATH
//
// The wrapper is server-only — never import from a client component.
import 'server-only'

export interface HtmlToPdfOptions {
  /** Extra request headers puppeteer should set when navigating. Used to
   *  forward the auth token to the preview page. */
  headers?: Record<string, string>
  /** Default 'letter'. */
  format?: 'letter' | 'a4'
  /** Default '0.5in' on every side. */
  margin?: { top?: string; bottom?: string; left?: string; right?: string }
}

export async function htmlToPdf(url: string, opts: HtmlToPdfOptions = {}): Promise<Buffer> {
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY,
  )

  // Dynamic imports keep the (~50MB) Chromium binary out of the warm-path
  // for any other route that pulls server bundles through this module path.
  const [{ default: puppeteer }, chromiumMod] = await Promise.all([
    import('puppeteer-core'),
    isServerless ? import('@sparticuz/chromium') : Promise.resolve(null as unknown as typeof import('@sparticuz/chromium')),
  ])

  let executablePath: string
  let args: string[]
  if (isServerless && chromiumMod) {
    const chromium = chromiumMod.default
    executablePath = await chromium.executablePath()
    args           = chromium.args
  } else {
    const local = process.env.PUPPETEER_EXECUTABLE_PATH
    if (!local) {
      throw new Error(
        'htmlToPdf: PUPPETEER_EXECUTABLE_PATH is not set. Point it at your ' +
        'installed Chrome binary for local PDF rendering, or deploy to Vercel.',
      )
    }
    executablePath = local
    // Minimum-viable Chrome flags for headless on a developer machine.
    args = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  }

  const browser = await puppeteer.launch({
    executablePath,
    args,
    headless: true,
  })

  try {
    const page = await browser.newPage()
    if (opts.headers) {
      await page.setExtraHTTPHeaders(opts.headers)
    }
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 45_000 })
    const pdf = await page.pdf({
      format:          opts.format ?? 'letter',
      printBackground: true,
      margin: {
        top:    opts.margin?.top    ?? '0.5in',
        bottom: opts.margin?.bottom ?? '0.5in',
        left:   opts.margin?.left   ?? '0.5in',
        right:  opts.margin?.right  ?? '0.5in',
      },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close().catch(() => { /* best-effort */ })
  }
}
