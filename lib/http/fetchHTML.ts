import * as cheerio from 'cheerio'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0'
]

export interface FetchResult {
  html: string | null
  $: cheerio.CheerioAPI | null
  url: string
  status: number | null
  blocked: boolean
  error: string | null
  durationMs: number
}

export async function fetchHTML(
  url: string,
  options: {
    referer?: string
    delayMs?: number
    retries?: number
    timeoutMs?: number
  } = {}
): Promise<FetchResult> {
  const {
    referer = 'https://www.google.com/',
    delayMs = 1200,
    retries = 3,
    timeoutMs = 15000
  } = options

  // Polite delay before every request
  await new Promise(r => setTimeout(r, delayMs))

  const ua = USER_AGENTS[
    Math.floor(Math.random() * USER_AGENTS.length)
  ]
  const start = Date.now()

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(
        () => controller.abort(),
        timeoutMs
      )

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': referer,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      })

      clearTimeout(timeout)

      // Detect blocking
      if (response.status === 403 ||
          response.status === 429 ||
          response.status === 503) {
        const backoff = Math.pow(2, attempt) * 2000
        await new Promise(r => setTimeout(r, backoff))
        continue
      }

      if (!response.ok) {
        return {
          html: null, $: null, url,
          status: response.status,
          blocked: false,
          error: `HTTP ${response.status}`,
          durationMs: Date.now() - start
        }
      }

      const html = await response.text()

      // Detect CAPTCHA pages
      const lower = html.toLowerCase()
      const isCaptcha =
        lower.includes('g-recaptcha') ||
        lower.includes('h-captcha') ||
        lower.includes('turnstile') ||
        lower.includes('are you a robot') ||
        lower.includes('verify you are human') ||
        (lower.includes('cloudflare') && (
          lower.includes('cf-browser-verification') ||
          lower.includes('cf-challenge') ||
          lower.includes('jschallenge') ||
          lower.includes('ray id')
        ))

      if (isCaptcha) {
        return {
          html: null, $: null, url,
          status: response.status,
          blocked: true,
          error: 'CAPTCHA detected',
          durationMs: Date.now() - start
        }
      }

      const $ = cheerio.load(html)
      return {
        html, $, url,
        status: response.status,
        blocked: false, error: null,
        durationMs: Date.now() - start
      }

    } catch (err: any) {
      if (attempt === retries - 1) {
        return {
          html: null, $: null, url,
          status: null, blocked: false,
          error: err.message || 'Unknown error',
          durationMs: Date.now() - start
        }
      }
      await new Promise(
        r => setTimeout(r, Math.pow(2, attempt) * 1000)
      )
    }
  }

  return {
    html: null, $: null, url,
    status: null, blocked: false,
    error: 'Max retries exceeded',
    durationMs: Date.now() - start
  }
}
