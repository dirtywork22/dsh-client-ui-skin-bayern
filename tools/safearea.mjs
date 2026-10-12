/**
 * Safety-area contact sheet: draw the band that `background-size: cover` will
 * crop away in a ~2.2:1 window on top of every backdrop photo, so heads that
 * fall inside it are visible at a glance.
 *
 * Usage: node tools/safearea.mjs [bandRatio]   (default 0.12 = 12% top & bottom)
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromDsh = createRequire(
  'C:/Users/陈天威/AppData/Local/npm-cache/_npx/1e7f6d9597241db0/node_modules/dshmarket/package.json'
)
const sharp = requireFromDsh('sharp')

const band = Number(process.argv[2] || 0.12)
const photosDir = join(root, 'photos')
const numbers = readdirSync(photosDir)
  .filter((name) => /^\d+\.jpg$/.test(name))
  .map((name) => Number(name.replace('.jpg', '')))
  .sort((a, b) => a - b)

const cellW = 520
const cellH = 293
const gap = 12
const pad = 12
const header = 74
const cols = 4
const rows = Math.ceil(numbers.length / cols)
const width = pad * 2 + cols * cellW + (cols - 1) * gap
const height = header + pad * 2 + rows * cellH + (rows - 1) * gap
const FONT = "Microsoft YaHei, 'Segoe UI', Arial, sans-serif"

const cells = []
for (let index = 0; index < numbers.length; index += 1) {
  const number = numbers[index]
  const buffer = await sharp(join(photosDir, `${number}.jpg`))
    .resize(cellW, cellH, { fit: 'fill' })
    .jpeg({ quality: 86 })
    .toBuffer()
  const x = pad + (index % cols) * (cellW + gap)
  const y = header + pad + Math.floor(index / cols) * (cellH + gap)
  const bandPx = Math.round(cellH * band)
  cells.push(
    `<image x="${x}" y="${y}" width="${cellW}" height="${cellH}" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/jpeg;base64,${buffer.toString('base64')}"/>`,
    // the crop band: what a 16:9 photo loses in a ~2.2:1 window
    `<rect x="${x}" y="${y}" width="${cellW}" height="${bandPx}" fill="rgba(255,45,75,0.30)"/>`,
    `<rect x="${x}" y="${y + cellH - bandPx}" width="${cellW}" height="${bandPx}" fill="rgba(255,45,75,0.30)"/>`,
    `<rect x="${x}" y="${y + bandPx - 1}" width="${cellW}" height="2" fill="rgba(255,45,75,0.9)"/>`,
    `<rect x="${x}" y="${y + cellH - bandPx}" width="${cellW}" height="2" fill="rgba(255,45,75,0.9)"/>`,
    `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>`,
    `<rect x="${x + 10}" y="${y + 10}" width="58" height="38" rx="10" fill="rgba(12,12,18,0.85)"/>`,
    `<text x="${x + 39}" y="${y + 38}" text-anchor="middle" font-family="${FONT}" font-size="24" font-weight="700" fill="#ffffff">${number}</text>`
  )
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#12121a"/>
  <text x="${pad + 4}" y="34" font-family="${FONT}" font-size="26" font-weight="700" fill="#ffffff">红色区域 = 页面里会被裁掉的部分（上下各 ${Math.round(band * 100)}%）</text>
  <text x="${pad + 4}" y="64" font-family="${FONT}" font-size="22" fill="rgba(255,255,255,0.65)">头部落进红条 / 贴着红线 = 页面上会被切到；头部离红线越远越安全</text>
  ${cells.join('')}
</svg>`

const out = join(root, 'docs/safearea.png')
writeFileSync(out, await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer())
console.log('wrote', out, `${numbers.length} photos`)
