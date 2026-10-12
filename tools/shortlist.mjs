/**
 * Batch shortlist: fetch several candidates for several players at once, draw
 * them on one labelled sheet, and (with --apply) promote the chosen ones to the
 * real backdrop photos.
 *
 * Candidates are additionally filtered for a landscape aspect ratio, which is
 * what broke the first pass: cropping a portrait shot into 16:9 is how a head
 * ends up outside the frame.
 *
 * Usage:
 *   node tools/shortlist.mjs                       # build docs/shortlist.png + .json
 *   node tools/shortlist.mjs --apply "1:2,8:1,14:3"  # promote picks -> photos/<n>.jpg
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromDsh = createRequire(
  'C:/Users/陈天威/AppData/Local/npm-cache/_npx/1e7f6d9597241db0/node_modules/dshmarket/package.json'
)
const sharp = requireFromDsh('sharp')

const SHEET = join(root, 'docs/shortlist.png')
const SHEET_JSON = join(root, 'docs/shortlist.json')

/** Players whose framed photo failed QC, with fresh queries. */
const TARGETS = {
  1: ['诺伊尔 拜仁 扑救 特写', 'Manuel Neuer Bayern 2026 save'],
  8: ['格雷茨卡 拜仁 2026 比赛', 'Leon Goretzka Bayern 2026'],
  10: ['萨内 拜仁 进球 庆祝', 'Leroy Sane Bayern Munich goal'],
  11: ['科曼 拜仁 进球', 'Kingsley Coman Bayern Munich'],
  14: ['路易斯迪亚斯 拜仁 进球 庆祝', 'Luis Diaz Bayern Munich goal 2026'],
  45: ['帕夫洛维奇 拜仁 2026 比赛', 'Aleksandar Pavlovic Bayern 2026']
}

const PER_PLAYER = 4
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const REJECT = /alamy|gettyimages|shutterstock|dreamstime|adobestock|vecteezy|123rf|istockphoto|imago-images|depositphotos|agefotostock|bigstock|canstockphoto|zoonar|panthermedia|stockphoto|watermark|cachephoto|visualchinagroup|quanjing|tuchong|vcg\.com|wikipedia|wikimedia|unsplash|pexels|pinimg|cardhobby|ebay|tcdb|comc|mercari|topps|panini|cardmarket|aliexpress|taobao|jd\.com|1688|futbin|sofifa|视觉中国/i

const FONT = "Microsoft YaHei, 'Segoe UI', Arial, sans-serif"

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

/** Landscape-only draft: anything narrower than 4:3 will not survive a 16:9 crop. */
async function draft(url) {
  try {
    const res = await get(url, 25000)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 45 * 1024 || buf.length > 14 * 1024 * 1024) return null
    const meta = await sharp(buf, { failOn: 'none' }).metadata()
    if (!meta.width || meta.width < 1000) return null
    const ratio = meta.width / meta.height
    if (ratio < 1.33) return null
    const out = await sharp(buf, { failOn: 'none' })
      .resize(460, 259, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 84 })
      .toBuffer()
    return { buffer: out, url, size: `${meta.width}x${meta.height}`, ratio: ratio.toFixed(2) }
  } catch {
    return null
  }
}

/* ---- apply mode: promote picks ---------------------------------------- */

const applyArg = process.argv.indexOf('--apply')
if (applyArg >= 0) {
  const spec = process.argv[applyArg + 1] || ''
  if (!existsSync(SHEET_JSON)) throw new Error(`no ${SHEET_JSON} — build the sheet first`)
  const sheet = JSON.parse(readFileSync(SHEET_JSON, 'utf8'))
  for (const pair of spec.split(',')) {
    const [number, index] = pair.split(':').map((value) => Number(value.trim()))
    const list = sheet[String(number)]
    const pick = list && list[index - 1]
    if (!pick) {
      console.log(`✗ ${number}:${index} — no such candidate`)
      continue
    }
    const res = await get(pick.url, 30000)
    if (!res.ok) {
      console.log(`✗ ${number}:${index} — download failed ${res.status}`)
      continue
    }
    const raw = Buffer.from(await res.arrayBuffer())
    const graded = await sharp(raw, { failOn: 'none' })
      .resize(1600, 900, { fit: 'cover', position: 'attention' })
      .composite([{
        input: Buffer.from('<svg width="1600" height="900"><rect width="1600" height="900" fill="#7a0418" fill-opacity="0.22"/></svg>'),
        blend: 'over'
      }])
      .modulate({ saturation: 0.92 })
      .jpeg({ quality: 76, mozjpeg: true })
      .toBuffer()
    writeFileSync(join(root, 'photos', `${number}.jpg`), graded)
    console.log(`✓ ${number}.jpg  <- candidate ${index} (${pick.size}, ratio ${pick.ratio}, ${new URL(pick.url).host})`)
  }
  console.log('next: node tools/embed-photos.mjs')
  process.exit(0)
}

/* ---- build mode -------------------------------------------------------- */

const collected = {}
for (const [number, queries] of Object.entries(TARGETS)) {
  const picks = []
  const seen = new Set()
  for (const query of queries) {
    if (picks.length >= PER_PLAYER) break
    const urls = await search(query)
    console.log(`${number} "${query}": ${urls.length} hits`)
    for (const url of urls) {
      if (picks.length >= PER_PLAYER) break
      if (seen.has(url) || REJECT.test(url)) continue
      seen.add(url)
      const got = await draft(url)
      if (!got) continue
      picks.push(got)
      console.log(`   ✓ ${number}-${picks.length} ${got.size} ratio ${got.ratio} ${new URL(url).host}`)
    }
  }
  collected[number] = picks
}

writeFileSync(SHEET_JSON, JSON.stringify(
  Object.fromEntries(Object.entries(collected).map(([number, picks]) => [
    number,
    picks.map((pick) => ({ url: pick.url, size: pick.size, ratio: pick.ratio, host: new URL(pick.url).host }))
  ])),
  null,
  2
))

const cellW = 460
const cellH = 259
const gap = 12
const pad = 12
const header = 64
const rows = Object.keys(collected).length
const width = pad * 2 + PER_PLAYER * cellW + (PER_PLAYER - 1) * gap
const height = header + pad * 2 + rows * cellH + (rows - 1) * gap

const cells = []
Object.entries(collected).forEach(([number, picks], row) => {
  for (let index = 0; index < PER_PLAYER; index += 1) {
    const x = pad + index * (cellW + gap)
    const y = header + pad + row * (cellH + gap)
    const pick = picks[index]
    if (!pick) {
      cells.push(`<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="rgba(255,255,255,0.04)"/>`)
      continue
    }
    cells.push(
      `<image x="${x}" y="${y}" width="${cellW}" height="${cellH}" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/jpeg;base64,${pick.buffer.toString('base64')}"/>`,
      `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>`,
      `<rect x="${x + 10}" y="${y + 10}" width="120" height="42" rx="12" fill="rgba(220,5,45,0.92)"/>`,
      `<text x="${x + 22}" y="${y + 40}" font-family="${FONT}" font-size="26" font-weight="700" fill="#ffffff">${number}-${index + 1}</text>`
    )
  }
})

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#12121a"/>
  <text x="${pad + 4}" y="42" font-family="${FONT}" font-size="28" font-weight="700" fill="#ffffff">重选候选：1 诺伊尔 · 8 格雷茨卡 · 10 萨内 · 11 科曼 · 14 迪亚斯 · 45 帕夫洛维奇（回我 "1:2" 这种编号）</text>
  ${cells.join('')}
</svg>`

mkdirSync(dirname(SHEET), { recursive: true })
const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
writeFileSync(SHEET, png)
console.log(`\nwrote ${SHEET} (${(png.length / 1024).toFixed(0)} KB, ${width}x${height})`)
console.log(`also wrote ${SHEET_JSON}`)
