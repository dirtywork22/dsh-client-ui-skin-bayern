/**
 * Preview renderer: pulls the pure backdrop code out of lib/client.js (single
 * source — no duplicated drawing code), layers a mocked dsh shell on top and
 * writes the PNGs referenced by skin.json.
 *
 * Run: node tools/preview.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const requireFromDsh = createRequire(
  'C:/Users/陈天威/AppData/Local/npm-cache/_npx/1e7f6d9597241db0/node_modules/dshmarket/package.json'
)
const sharp = requireFromDsh('sharp')

/** Extract the dependency-free backdrop section of the client bundle. */
function loadBackdropModule() {
  const code = readFileSync(join(root, 'lib/client.js'), 'utf8')
  const start = code.indexOf('    const DEFAULT_STATE = {')
  const end = code.indexOf('    const CSS = [')
  if (start < 0 || end < 0 || end <= start) throw new Error('backdrop section not found in lib/client.js')
  const chunk = code.slice(start, end)
  // eslint-disable-next-line no-new-func
  const factory = new Function(`${chunk}\nreturn { backdropUrl, PHOTOS, PLAYERS, SANS }`)
  return factory()
}

/** Re-render backdropUrl's `url("data:...")` CSS value back into raw content. */
function dataFrom(url) {
  const comma = url.indexOf(',')
  return decodeURIComponent(url.slice(comma + 1).replace(/"\)\s*$/, '').replace(/\)\s*$/, ''))
}

const backdropModule = loadBackdropModule()
const SANS = backdropModule.SANS

/** A crude dsh shell mock so the PNG reads as a skin preview, not a texture. */
function mockShell(dark, photoMode = false) {
  const ink = dark ? '#f6f6f9' : '#16161a'
  const sub = dark ? 'rgba(246,246,249,0.55)' : 'rgba(22,22,26,0.55)'
  const pane = dark
    ? (photoMode ? 'rgba(10,10,16,0.4)' : 'rgba(10,10,16,0.6)')
    : (photoMode ? 'rgba(255,255,255,0.44)' : 'rgba(255,255,255,0.7)')
  const field = dark
    ? (photoMode ? 'rgba(6,6,10,0.56)' : 'rgba(6,6,10,0.72)')
    : (photoMode ? 'rgba(255,255,255,0.68)' : 'rgba(255,255,255,0.88)')
  const line = dark ? 'rgba(255,255,255,0.09)' : 'rgba(22,22,26,0.09)'
  const row = (x, y, w, h, fill, r = 10) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`
  return [
    row(0, 0, 280, 1080, pane, 0),
    `<rect x="279" y="0" width="1" height="1080" fill="${line}"/>`,
    `<text x="24" y="52" font-family="${SANS}" font-size="24" font-weight="700" fill="${ink}">deepseek</text>`,
    row(126, 32, 96, 24, '#dc052d', 6),
    `<text x="138" y="50" font-family="${SANS}" font-size="14" font-weight="700" fill="#ffffff">HARNESS</text>`,
    `<defs><linearGradient id="btn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dc052d"/><stop offset="1" stop-color="#f4183f"/></linearGradient></defs>`,
    row(18, 88, 244, 44, 'url(#btn)', 10),
    `<text x="140" y="116" text-anchor="middle" font-family="${SANS}" font-size="17" font-weight="600" fill="#ffffff">＋ 新会话</text>`,
    `<text x="24" y="176" font-family="${SANS}" font-size="15" fill="${sub}">工作区</text>`,
    ...[0, 1, 2].map((i) => [
      row(18, 196 + i * 40, 244, 32, i === 0 ? (dark ? 'rgba(220,5,45,0.18)' : 'rgba(220,5,45,0.14)') : 'transparent', 8),
      `<text x="36" y="${218 + i * 40}" font-family="${SANS}" font-size="15" fill="${i === 0 ? ink : sub}">${['tmp', 'Rustfox', 'dsh-plugin'][i]}</text>`
    ].join('')),
    row(18, 1010, 244, 44, dark ? 'rgba(255,255,255,0.08)' : 'rgba(22,22,26,0.06)', 10),
    `<text x="40" y="1038" font-family="${SANS}" font-size="16" fill="${ink}">⚙ 设置</text>`,
    `<text x="1120" y="470" text-anchor="middle" font-family="${SANS}" font-size="38" font-weight="700" fill="${ink}">探索未至之境</text>`,
    row(1290, 440, 86, 30, dark ? 'rgba(220,5,45,0.22)' : 'rgba(220,5,45,0.16)', 15),
    `<text x="1333" y="461" text-anchor="middle" font-family="${SANS}" font-size="15" fill="#dc052d">预览版</text>`,
    `<text x="760" y="540" font-family="${SANS}" font-size="16" fill="${sub}">dsh-plugin ⌄</text>`,
    `<text x="900" y="540" font-family="${SANS}" font-size="16" fill="${sub}">标准模式 ⌄</text>`,
    row(700, 560, 840, 150, field, 26),
    `<rect x="700.5" y="560.5" width="839" height="149" rx="26" fill="none" stroke="${dark ? 'rgba(220,5,45,0.35)' : 'rgba(220,5,45,0.28)'}"/>`,
    `<text x="736" y="612" font-family="${SANS}" font-size="17" fill="${sub}">描述你想要构建的内容</text>`,
    `<text x="760" y="676" font-family="${SANS}" font-size="15" fill="${sub}">Workspace Write ⌄</text>`,
    `<text x="1300" y="676" font-family="${SANS}" font-size="15" fill="${sub}">DeepSeek-V4-Flash High ⌄</text>`,
    `<circle cx="1500" cy="676" r="18" fill="#dc052d"/>`,
    `<text x="1500" y="683" text-anchor="middle" font-family="${SANS}" font-size="17" fill="#ffffff">↑</text>`,
    `<text x="1120" y="800" text-anchor="middle" font-family="${SANS}" font-size="15" fill="${sub}">设置 → 通用：球衣配色 / 背景主题 / 背景球员 / 强调色</text>`
  ].join('')
}

/** The two translucent layers the real shell puts over a photo backdrop. */
function photoLayers(dark) {
  const base = dark ? '10, 10, 16' : '255, 255, 255'
  const paneAlpha = dark ? 0.48 : 0.5
  return [
    '<defs><linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">',
    `<stop offset="0" stop-color="rgb(${base})" stop-opacity="${dark ? 0.58 : 0.44}"/>`,
    `<stop offset="0.45" stop-color="rgb(${base})" stop-opacity="${dark ? 0.24 : 0.12}"/>`,
    `<stop offset="1" stop-color="rgb(${base})" stop-opacity="${dark ? 0.76 : 0.72}"/>`,
    '</linearGradient></defs>',
    '<rect width="1920" height="1080" fill="url(#scrim)"/>',
    `<rect width="1920" height="1080" fill="rgba(${base},${paneAlpha})"/>`
  ].join('')
}

/** Build the full 1920x1080 preview SVG for one configuration. */
function previewSvg({ mode, dark, player, accent = 'red' }) {
  const photo = mode === 'photo' ? backdropModule.PHOTOS[String(player.n)] : ''
  if (photo) {
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1920 1080" width="1920" height="1080">`
      + `<image x="0" y="0" width="1920" height="1080" preserveAspectRatio="xMidYMid slice" xlink:href="${photo}"/>`
      + photoLayers(dark)
      + mockShell(dark, true)
      + '</svg>'
  }
  const drawn = dataFrom(backdropModule.backdropUrl(mode === 'photo' ? 'jersey' : mode, player, dark, accent))
  return drawn.replace(/<\/svg>$/, `${mockShell(dark, false)}</svg>`)
}

function render({ file, ...config }) {
  const svg = previewSvg(config)
  return sharp(Buffer.from(svg))
    .resize(1600, 900)
    .png({ compressionLevel: 9 })
    .toFile(file)
}

const playerOf = (n) => backdropModule.PLAYERS.find((p) => p.n === n)

// --art renders the drawn backdrops instead of real photos (used for the public
// release, whose previews must not redistribute press images), --out redirects
// the whole render.
const ART = process.argv.includes('--art')
const outIndex = process.argv.indexOf('--out')
const OUT_ROOT = outIndex >= 0 ? process.argv[outIndex + 1] : root
const previewDir = join(OUT_ROOT, 'preview')
const docsDir = join(OUT_ROOT, 'docs')

mkdirSync(previewDir, { recursive: true })
mkdirSync(docsDir, { recursive: true })

const jobs = [
  // two headline previews: home red (dark canvas) and away white (paper canvas)
  { file: join(previewDir, 'dark.png'), mode: ART ? 'jersey' : 'photo', dark: true, player: playerOf(9) },
  { file: join(previewDir, 'light.png'), mode: ART ? 'squad' : 'photo', dark: false, player: playerOf(42) },
  // backdrop catalogue
  { file: join(docsDir, 'backdrop-jersey.png'), mode: 'jersey', dark: true, player: playerOf(25) },
  { file: join(docsDir, 'backdrop-squad.png'), mode: 'squad', dark: true, player: playerOf(42) },
  { file: join(docsDir, 'backdrop-stadium.png'), mode: 'stadium', dark: true, player: playerOf(6) },
  { file: join(docsDir, 'backdrop-plain.png'), mode: 'plain', dark: true, player: playerOf(9), accent: 'blue' }
]

for (const job of jobs) {
  await render(job)
  console.log('wrote', job.file)
}
