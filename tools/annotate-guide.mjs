/**
 * Draw the "where do I switch this" annotation onto a screenshot of the running
 * skin, so the settings path is obvious.
 *
 * Usage: node tools/annotate-guide.mjs <screenshot.png> [out.png]
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromDsh = createRequire(
  'C:/Users/陈天威/AppData/Local/npm-cache/_npx/1e7f6d9597241db0/node_modules/dshmarket/package.json'
)
const sharp = requireFromDsh('sharp')

const input = process.argv[2] || 'C:/Users/陈天威/.dsh/attachments/v1/objects/a3/a34872dab24ef902aba52d8edd7a377dad42014e07089ed4dd0da4e088cf0eab'
const output = resolve(process.argv[3] || join(root, 'docs/how-to-switch.png'))

const meta = await sharp(input).metadata()
const targetW = Math.min(2000, meta.width)

// Resize first so the annotation is drawn in the final pixel space, and keep the
// overlay a hair smaller than the canvas (librsvg rounds its own output size).
const base = await sharp(input).resize(targetW).png().toBuffer()
const baseMeta = await sharp(base).metadata()
const W = baseMeta.width
const H = baseMeta.height
const scale = W / 2560
const OW = W - 2
const OH = H - 2

const FONT = "Microsoft YaHei, 'Segoe UI', Arial, sans-serif"
const y = (value) => Math.round(value * scale)
const x = (value) => Math.round(value * scale)

const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${OW}" height="${OH}" viewBox="0 0 ${OW} ${OH}">
  <rect x="0" y="0" width="${OW}" height="${y(96)}" fill="rgba(12,10,14,0.86)"/>
  <g font-family="${FONT}" fill="#ffffff">
    <text x="${x(40)}" y="${y(44)}" font-size="${y(34)}" font-weight="700">切换入口：左下角「设置」→ 左侧「通用」→ 往下滚</text>
    <text x="${x(40)}" y="${y(80)}" font-size="${y(30)}" fill="rgba(255,255,255,0.85)">会看到 5 行：球衣配色 · 背景主题 · 背景球员 · 强调色 · 自定义背景图</text>
  </g>
  <rect x="${x(14)}" y="${y(1288)}" width="${x(392)}" height="${y(84)}" rx="${y(16)}" fill="none" stroke="#ff2d4b" stroke-width="${y(7)}"/>
  <path d="M ${x(560)} ${y(1330)} L ${x(430)} ${y(1330)} L ${x(452)} ${y(1306)} L ${x(396)} ${y(1338)} L ${x(452)} ${y(1370)} L ${x(430)} ${y(1346)} L ${x(560)} ${y(1346)} Z" fill="#ff2d4b"/>
  <text x="${x(578)}" y="${y(1352)}" font-family="${FONT}" font-size="${y(34)}" font-weight="700" fill="#ff2d4b">点这里打开设置</text>
  <rect x="${x(1180)}" y="${y(128)}" width="${x(1250)}" height="${y(120)}" rx="${y(16)}" fill="rgba(12,10,14,0.82)" stroke="#ff2d4b" stroke-width="${y(4)}"/>
  <g font-family="${FONT}" fill="#ffffff">
    <text x="${x(1216)}" y="${y(178)}" font-size="${y(32)}" font-weight="700">现在是 DSH 亮色主题 → 照片走「暖红纸面」分支</text>
    <text x="${x(1216)}" y="${y(220)}" font-size="${y(30)}" fill="rgba(255,255,255,0.85)">想要预览图那种深红底效果：同一页把主题改「深色」，球衣配色选「主场红」</text>
  </g>
</svg>`

mkdirSync(dirname(output), { recursive: true })
const png = await sharp(base)
  .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
  .png({ compressionLevel: 9 })
  .toBuffer()
writeFileSync(output, png)
console.log('wrote', output, `${(png.length / 1024).toFixed(0)} KB`, `${meta.width}x${meta.height} -> ${W}x${H}`)
