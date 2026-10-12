/**
 * Fetch real match photos for the Bayern skin backdrops.
 *
 * Source: Bing image index (the only image search reachable on this network).
 * Index/stock-photo hosts are rejected — they carry watermarks or licensing
 * traps — and every kept photo records its origin so the README can credit it.
 *
 * Output: photos/<shirt-number>.jpg (1600x900 JPEG) + photos/credits.json
 *
 * Usage:
 *   node tools/fetch-photos.mjs            # every player
 *   node tools/fetch-photos.mjs --only 9 42
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const photosDir = join(root, 'photos')
mkdirSync(photosDir, { recursive: true })

const requireFromDsh = createRequire(
  'C:/Users/陈天威/AppData/Local/npm-cache/_npx/1e7f6d9597241db0/node_modules/dshmarket/package.json'
)
const sharp = requireFromDsh('sharp')

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/** Queries per shirt number — Chinese phrasing returns the reachable local sports CDNs. */
const QUERIES = {
  1: ['诺伊尔 拜仁 比赛 扑救', 'Manuel Neuer Bayern match'],
  2: ['乌帕梅卡诺 拜仁 比赛', 'Upamecano Bayern match'],
  3: ['金玟哉 拜仁 比赛', 'Kim Min-jae Bayern match'],
  4: ['塔 拜仁 比赛', 'Jonathan Tah Bayern match'],
  6: ['基米希 拜仁 比赛', 'Kimmich Bayern match'],
  7: ['格纳布里 拜仁 比赛', 'Gnabry Bayern match'],
  8: ['格雷茨卡 拜仁 比赛', 'Goretzka Bayern match'],
  9: ['哈里凯恩 拜仁 比赛 进球', 'Harry Kane Bayern match'],
  10: ['萨内 拜仁 比赛', 'Leroy Sane Bayern match'],
  11: ['科曼 拜仁 比赛', 'Kingsley Coman Bayern match'],
  14: ['路易斯迪亚斯 拜仁 比赛', 'Luis Diaz Bayern Munich match'],
  17: ['奥利塞 拜仁 2026 赛季 比赛', 'Michael Olise Bayern Munich 2026 match'],
  19: ['阿方索戴维斯 拜仁 比赛', 'Alphonso Davies Bayern match'],
  21: ['纳撒尼尔布朗 拜仁 比赛', 'Nathaniel Brown Bayern Munich match'],
  25: ['托马斯穆勒 拜仁 比赛', 'Thomas Muller Bayern match'],
  27: ['莱默 拜仁 比赛', 'Konrad Laimer Bayern match'],
  34: ['赛巴里 拜仁 比赛', 'Ismael Saibari Bayern Munich match'],
  42: ['穆夏拉 拜仁 比赛 突破', 'Jamal Musiala Bayern match'],
  45: ['帕夫洛维奇 拜仁 比赛', 'Pavlovic Bayern match']
}

/** Hosts that mean watermark / licensing trouble, or are unreachable here. */
const REJECT = /alamy|gettyimages|shutterstock|dreamstime|adobestock|vecteezy|123rf|istockphoto|imago-images|depositphotos|agefotostock|bigstock|canstockphoto|zoonar|panthermedia|stockphoto|watermark|cachephoto|visualchinagroup|quanjing|tuchong|vcg\.com|wikipedia|wikimedia|unsplash|pexels|pinimg|wordpress\.com\/.*-1024|^https:\/\/tse?\d*\.mm\.bing\.net/i

function parseArgs() {
  const argv = process.argv.slice(2)
  const idx = argv.indexOf('--only')
  if (idx === -1) return null
  return argv.slice(idx + 1).map(Number).filter((n) => !Number.isNaN(n))
}

async function get(url, { timeout = 20000, referer } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        ...(referer ? { Referer: referer } : {})
      }
    })
    return res
  } finally {
    clearTimeout(timer)
  }
}

/** Bing image index → candidate original-image URLs. */
async function bingCandidates(query) {
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1&count=35`
  try {
    const res = await get(url, { timeout: 25000 })
    if (!res.ok) return []
    const html = await res.text()
    const out = []
    for (const match of html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)) out.push(match[1])
    return out
  } catch {
    return []
  }
}

const MIN_BYTES = 40 * 1024
const MAX_BYTES = 12 * 1024 * 1024

/** Download one candidate and normalise it to a 16:9 1600x900 JPEG. */
async function take(url, referer) {
  try {
    const res = await get(url, { timeout: 25000, referer })
    if (!res.ok) return null
    const len = Number(res.headers.get('content-length') || 0)
    if (len && (len < MIN_BYTES || len > MAX_BYTES)) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < MIN_BYTES || buf.length > MAX_BYTES) return null
    const img = sharp(buf, { failOn: 'none' })
    const meta = await img.metadata()
    if (!meta.width || !meta.height) return null
    if (meta.width < 900 || meta.height < 500) return null
    // Landscape only: cropping a portrait shot into 16:9 is how a head ends up
    // outside the frame (the failure that shipped in the first photo pass).
    if (meta.width / meta.height < 1.33) return null
    const out = await img
      .resize(1600, 900, { fit: 'cover', position: 'attention' })
      .composite([
        // club-colour grade: pull saturation down a touch, then a red wash the
        // skin's own scrim blends into
        {
          input: Buffer.from(
            '<svg width="1600" height="900"><rect width="1600" height="900" fill="#7a0418" fill-opacity="0.22"/></svg>'
          ),
          blend: 'over'
        }
      ])
      .modulate({ saturation: 0.92 })
      .jpeg({ quality: 74, mozjpeg: true })
      .toBuffer()
    return { buffer: out, width: 1600, height: 900, source: url }
  } catch {
    return null
  }
}

async function main() {
  const only = parseArgs()
  const creditsPath = join(photosDir, 'credits.json')
  const credits = existsSync(creditsPath) ? JSON.parse(readFileSync(creditsPath, 'utf8')) : {}
  const numbers = only || Object.keys(QUERIES).map(Number)

  for (const n of numbers) {
    const queries = QUERIES[n]
    if (!queries) continue
    const target = join(photosDir, `${n}.jpg`)
    if (existsSync(target) && process.env.FORCE !== '1') {
      console.log(`${n}: already present, skip`)
      continue
    }
    let done = false
    for (const query of queries) {
      const candidates = await bingCandidates(query)
      const usable = candidates.filter((u) => !REJECT.test(u))
      console.log(`${n} "${query}": ${candidates.length} hits, ${usable.length} usable`)
      for (const url of usable.slice(0, 8)) {
        const got = await take(url)
        if (!got) continue
        writeFileSync(target, got.buffer)
        credits[String(n)] = { source: url, bytes: got.buffer.length, query }
        writeFileSync(creditsPath, JSON.stringify(credits, null, 2))
        console.log(`  ✓ ${n}.jpg  ${(got.buffer.length / 1024).toFixed(0)} KB  ${new URL(url).host}`)
        done = true
        break
      }
      if (done) break
    }
    if (!done) console.log(`  ✗ ${n}: no usable photo`)
  }
}

main().catch((error) => {
  console.error('fetch-photos failed:', error.message)
  process.exit(1)
})
