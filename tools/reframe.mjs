/**
 * Re-crop every backdrop photo so the subject's head keeps the space the
 * original shot gave it: crop with `position: top` (bottom-only loss) instead of
 * `attention` (which can shove a head against the frame edge).
 *
 * Sources: docs/shortlist.json for the picks made through the shortlist tool,
 * photos/credits.json for everything else, photos/_user/ for user-supplied art.
 *
 * Usage: node tools/reframe.mjs [number...]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromDsh = createRequire(
  'C:/Users/陈天威/AppData/Local/npm-cache/_npx/1e7f6d9597241db0/node_modules/dshmarket/package.json'
)
const sharp = requireFromDsh('sharp')

/** Which shortlist candidate became the live photo (logged when it was applied). */
const PICKED = { 1: 2, 8: 1, 10: 3, 11: 1, 14: 1, 45: 2 }

const shortlist = existsSync(join(root, 'docs/shortlist.json'))
  ? JSON.parse(readFileSync(join(root, 'docs/shortlist.json'), 'utf8'))
  : {}
const credits = existsSync(join(root, 'photos/credits.json'))
  ? JSON.parse(readFileSync(join(root, 'photos/credits.json'), 'utf8'))
  : {}

const requested = process.argv.slice(2).map(Number).filter((value) => !Number.isNaN(value))
const numbers = requested.length > 0
  ? requested
  : readdirSync(join(root, 'photos'))
    .filter((name) => /^\d+\.jpg$/.test(name))
    .map((name) => Number(name.replace('.jpg', '')))
    .sort((a, b) => a - b)

async function download(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const report = []
for (const number of numbers) {
  const userFile = join(root, 'photos', '_user', `${number}.jpg`)
  let raw = null
  let origin = ''

  if (PICKED[number] && shortlist[String(number)]?.[PICKED[number] - 1]) {
    const pick = shortlist[String(number)][PICKED[number] - 1]
    raw = await download(pick.url)
    origin = `shortlist #${PICKED[number]} ${pick.host}`
  } else if (existsSync(userFile)) {
    raw = readFileSync(userFile)
    origin = 'user image (handled by from-image.mjs)'
  } else if (credits[String(number)]?.source?.startsWith('http')) {
    raw = await download(credits[String(number)].source)
    origin = `credits ${new URL(credits[String(number)].source).host}`
  }

  if (!raw) {
    report.push(`${number}: NO SOURCE (kept current photo)`)
    continue
  }

  const meta = await sharp(raw).metadata()
  const ratio = meta.width / meta.height

  // Portrait originals are framed by from-image.mjs (blur/plain framing) — a
  // cover crop here would cut the poster back down and undo that work.
  if (ratio < 1.2) {
    report.push(`${number}: portrait ${meta.width}x${meta.height} — left to from-image.mjs framing`)
    continue
  }

  // 16:9 needs at least 1.78; anything taller loses the BOTTOM only.
  const graded = await sharp(raw)
    .resize(1600, 900, { fit: 'cover', position: 'top' })
    .composite([{
      input: Buffer.from('<svg width="1600" height="900"><rect width="1600" height="900" fill="#7a0418" fill-opacity="0.22"/></svg>'),
      blend: 'over'
    }])
    .modulate({ saturation: 0.92 })
    .jpeg({ quality: 76, mozjpeg: true })
    .toBuffer()

  writeFileSync(join(root, 'photos', `${number}.jpg`), graded)
  const cropped = ratio > 1.78 ? 0 : Math.round((1 - ratio / (16 / 9)) * 100)
  report.push(`${number}: ${meta.width}x${meta.height} ratio ${ratio.toFixed(2)} -> bottom-crop ${cropped}%  [${origin}]`)
}

console.log(report.join('\n'))
console.log('\nnext: node tools/embed-photos.mjs && node tools/safearea.mjs')
