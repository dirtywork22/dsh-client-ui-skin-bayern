/**
 * Local contact sheet: lay existing image files out on one labelled grid.
 *
 * Usage: node tools/sheet.mjs out.png <file...> [--cols 3] [--title "…"]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import { createRequire } from 'node:module'

const requireFromDsh = createRequire(
  'C:/Users/陈天威/AppData/Local/npm-cache/_npx/1e7f6d9597241db0/node_modules/dshmarket/package.json'
)
const sharp = requireFromDsh('sharp')

const argv = process.argv.slice(2)
const out = argv.shift()
const colsArg = argv.indexOf('--cols')
const cols = colsArg >= 0 ? Number(argv[colsArg + 1]) : 3
if (colsArg >= 0) argv.splice(colsArg, 2)
const titleArg = argv.indexOf('--title')
const title = titleArg >= 0 ? argv[titleArg + 1] : ''
if (titleArg >= 0) argv.splice(titleArg, 2)

const files = argv
if (!out || files.length === 0) throw new Error('usage: node tools/sheet.mjs out.png <file...> [--cols N] [--title "…"]')

const cellW = 640
const cellH = 360
const gap = 14
const pad = 14
const header = title ? 62 : 14
const rows = Math.ceil(files.length / cols)
const width = pad * 2 + cols * cellW + (cols - 1) * gap
const height = header + pad * 2 + rows * cellH + (rows - 1) * gap
const FONT = "Microsoft YaHei, 'Segoe UI', Arial, sans-serif"

const cells = []
for (let index = 0; index < files.length; index += 1) {
  const buffer = await sharp(readFileSync(files[index]))
    .resize(cellW, cellH, { fit: 'cover' })
    .jpeg({ quality: 84 })
    .toBuffer()
  const x = pad + (index % cols) * (cellW + gap)
  const y = header + pad + Math.floor(index / cols) * (cellH + gap)
  cells.push(
    `<image x="${x}" y="${y}" width="${cellW}" height="${cellH}" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/jpeg;base64,${buffer.toString('base64')}"/>`,
    `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>`,
    `<rect x="${x + 12}" y="${y + 12}" width="150" height="44" rx="12" fill="rgba(220,5,45,0.92)"/>`,
    `<text x="${x + 24}" y="${y + 44}" font-family="${FONT}" font-size="26" font-weight="700" fill="#ffffff">${basename(files[index])}</text>`
  )
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#12121a"/>
  ${title ? `<text x="${pad + 4}" y="42" font-family="${FONT}" font-size="28" font-weight="700" fill="#ffffff">${title}</text>` : ''}
  ${cells.join('')}
</svg>`

const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
writeFileSync(out, png)
console.log('wrote', out, `${(png.length / 1024).toFixed(0)} KB`, `${width}x${height}`)
