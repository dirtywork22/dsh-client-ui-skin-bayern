/**
 * Build a contact sheet of candidate photos for one player, so a human can pick
 * the keeper before it is embedded into the bundle.
 *
 * Usage: node tools/candidates.mjs [shirtNumber] [outFile]
 *        node tools/candidates.mjs 17 docs/candidate-olise.png
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromDsh = createRequire(
  'C:/Users/陈天威/AppData/Local/npm-cache/_npx/1e7f6d9597241db0/node_modules/dshmarket/package.json'
)
const sharp = requireFromDsh('sharp')

const args = process.argv.slice(2)
const saveArg = args.indexOf('--save')
/** --save N: write candidate N into photos/<number>.jpg with the standard grade. */
const SAVE = saveArg >= 0 ? Number(args[saveArg + 1]) : 0
if (saveArg >= 0) args.splice(saveArg, 2)
const PLAYER = Number(args[0] || 17)
const OUT = args[1] || join(root, 'docs/candidate-olise.png')
const COUNT = Number(process.env.COUNT || 6)

/**
 * Fresh-looking queries first: the point is a NEW photo, not another archive
 * shot. Players who joined mid-window may have no Bayern match photo at all, so
 * their query set leans on the club they came from / their national team.
 */
const QUERIES = {
  17: [
    'Michael Olise Bayern Munich 2026',
    '奥利塞 拜仁 2026 赛季 进球',
    'Michael Olise Bayern goal celebration 2026',
    '奥利塞 拜仁 德甲 庆祝',
    'Michael Olise Bayern Munich portrait 2026'
  ],
  21: [
    '纳撒尼尔布朗 拜仁 比赛',
    'Nathaniel Brown Bayern München 2026',
    'Nathaniel Brown Bayern Munich left back',
    '布朗 拜仁 左后卫 德甲'
  ],
  34: [
    'Ismael Saibari Morocco goal 2026 World Cup',
    '赛巴里 摩洛哥 进球 庆祝',
    'Saibari Morocco match action',
    'Ismael Saibari PSV goal celebration',
    '赛巴里 摩洛哥 世界杯 比赛'
  ]
}[PLAYER]

if (!QUERIES) throw new Error(`no query set for player ${PLAYER}`)

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const REJECT = /alamy|gettyimages|shutterstock|dreamstime|adobestock|vecteezy|123rf|istockphoto|imago-images|depositphotos|agefotostock|bigstock|canstockphoto|zoonar|panthermedia|stockphoto|watermark|cachephoto|visualchinagroup|quanjing|tuchong|vcg\.com|wikipedia|wikimedia|unsplash|pexels|pinimg|cardhobby|ebay|tcdb|comc|mercari|topps|panini|cardmarket|yahoo|aliexpress|taobao|jd\.com|1688|sortitoutsi|futbin|fifarosters|sofifa/i

async function get(url, timeout = 20000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' }
    })
  } finally {
    clearTimeout(timer)
  }
}

async function search(query) {
  try {
    const res = await get(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1&count=35`, 25000)
    if (!res.ok) return []
    const html = await res.text()
    return Array.from(html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g), (match) => match[1])
  } catch {
    return []
  }
}

/** Download + normalise one candidate to a 16:9 thumbnail (no colour grade — this is a draft). */
async function take(url) {
  try {
    const res = await get(url, 25000)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 40 * 1024 || buf.length > 12 * 1024 * 1024) return null
    const image = sharp(buf, { failOn: 'none' })
    const meta = await image.metadata()
    if (!meta.width || meta.width < 900 || meta.height < 500) return null
    const out = await image
      .resize(640, 360, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 82 })
      .toBuffer()
    return { buffer: out, source: url, size: `${meta.width}x${meta.height}` }
  } catch {
    return null
  }
}

const picks = []
const seen = new Set()
for (const query of QUERIES) {
  if (picks.length >= COUNT) break
  const urls = await search(query)
  console.log(`"${query}": ${urls.length} hits`)
  for (const url of urls) {
    if (picks.length >= COUNT) break
    if (seen.has(url) || REJECT.test(url)) continue
    seen.add(url)
    const got = await take(url)
    if (!got) continue
    picks.push(got)
    console.log(`  ✓ ${picks.length}. ${new URL(url).host} (${got.size})`)
  }
}

if (picks.length === 0) throw new Error('no candidates downloaded')

/* ---- contact sheet ---------------------------------------------------- */

const cellW = 640
const cellH = 360
const gap = 14
const pad = 14
const header = 66
const cols = 3
const rows = Math.ceil(picks.length / cols)
const width = pad * 2 + cols * cellW + (cols - 1) * gap
const height = header + pad * 2 + rows * cellH + (rows - 1) * gap

const FONT = "Microsoft YaHei, 'Segoe UI', Arial, sans-serif"
const cells = picks.map((pick, index) => {
  const col = index % cols
  const row = Math.floor(index / cols)
  const x = pad + col * (cellW + gap)
  const y = header + pad + row * (cellH + gap)
  const label = String(index + 1)
  return [
    `<image x="${x}" y="${y}" width="${cellW}" height="${cellH}" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/jpeg;base64,${pick.buffer.toString('base64')}"/>`,
    `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>`,
    `<rect x="${x + 12}" y="${y + 12}" width="${44 + (label.length - 1) * 22}" height="52" rx="14" fill="rgba(220,5,45,0.92)"/>`,
    `<text x="${x + 34 + (label.length - 1) * 11}" y="${y + 49}" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="800" fill="#ffffff">${label}</text>`
  ].join('')
}).join('')

const sources = picks
  .map((pick, index) => `[${index + 1}] ${new URL(pick.source).host}`)
  .join('   ')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#12121a"/>
  <text x="${pad + 4}" y="44" font-family="${FONT}" font-size="30" font-weight="700" fill="#ffffff">奥利塞 Olise · 候选照片（选一个号码，回我数字即可）</text>
  <text x="${width - pad}" y="44" text-anchor="end" font-family="${FONT}" font-size="18" fill="rgba(255,255,255,0.55)">${sources}</text>
  ${cells}
</svg>`

mkdirSync(dirname(OUT), { recursive: true })
const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
writeFileSync(OUT, png)
console.log(`\nwrote ${OUT} (${(png.length / 1024).toFixed(0)} KB, ${width}x${height}) with ${picks.length} candidates`)

/* ---- optional: promote one candidate to the real backdrop photo ------- */

if (SAVE > 0) {
  const pick = picks[SAVE - 1]
  if (!pick) throw new Error(`no candidate #${SAVE} (only ${picks.length})`)
  const res = await get(pick.source, 30000)
  if (!res.ok) throw new Error(`re-download failed: ${res.status}`)
  const raw = Buffer.from(await res.arrayBuffer())
  const graded = await sharp(raw, { failOn: 'none' })
    .resize(1600, 900, { fit: 'cover', position: 'attention' })
    .composite([{
      input: Buffer.from('<svg width="1600" height="900"><rect width="1600" height="900" fill="#7a0418" fill-opacity="0.22"/></svg>'),
      blend: 'over'
    }])
    .modulate({ saturation: 0.92 })
    .jpeg({ quality: 74, mozjpeg: true })
    .toBuffer()
  const target = join(root, 'photos', `${PLAYER}.jpg`)
  writeFileSync(target, graded)
  console.log(`saved candidate #${SAVE} -> ${target} (${(graded.length / 1024).toFixed(0)} KB from ${new URL(pick.source).host})`)
  console.log('next: node tools/embed-photos.mjs')
}
