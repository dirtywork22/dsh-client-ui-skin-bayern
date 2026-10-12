/**
 * Turn a user-supplied (often portrait) image into a backdrop photo, with a
 * framing mode that decides how a tall image fills a 16:9 canvas.
 *
 *   cover  crop to 16:9 from a vertical anchor            (default)
 *   blur   full image centred, sides filled with a blurred copy of itself
 *   plain  full image centred, sides filled with a dimmed dominant colour
 *
 * `--preview` writes to docs/ instead of photos/, so a framing can be shown for
 * approval before it replaces the live backdrop.
 *
 * Usage:
 *   node tools/from-image.mjs <image> <number> [--frame blur|plain|cover]
 *       [--anchor 0..1] [--preview] [--keep-source]
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromDsh = createRequire(
  'C:/Users/陈天威/AppData/Local/npm-cache/_npx/1e7f6d9597241db0/node_modules/dshmarket/package.json'
)
const sharp = requireFromDsh('sharp')

const W = 1600
const H = 900

const args = process.argv.slice(2)
function takeFlag(name, fallback) {
  const index = args.indexOf(name)
  if (index < 0) return fallback
  const value = args[index + 1]
  args.splice(index, 1)
  if (value === undefined || value.startsWith('--')) return true
  args.splice(index, 1)
  return value
}

const frame = String(takeFlag('--frame', 'cover'))
const anchor = Number(takeFlag('--anchor', 0))
const preview = Boolean(takeFlag('--preview', false))
const keepSource = Boolean(takeFlag('--keep-source', false))

const [input, number] = args
if (!input || !number) throw new Error('usage: node tools/from-image.mjs <image> <shirtNumber> [--frame blur|plain|cover]')

const buffer = readFileSync(input)
const meta = await sharp(buffer).metadata()
const portraitRatio = meta.width / meta.height

/** Portrait foreground stood on a full-bleed base, every pixel of the original kept. */
async function framed() {
  const fgWidth = Math.max(2, Math.round(H * portraitRatio))
  const foreground = await sharp(buffer).resize(fgWidth, H, { fit: 'inside' }).toBuffer()

  let base
  if (frame === 'blur') {
    base = await sharp(buffer)
      .resize(W, H, { fit: 'cover' })
      .blur(34)
      .modulate({ brightness: 0.66, saturation: 0.88 })
      .toBuffer()
  } else {
    const stats = await sharp(buffer).stats()
    const dominant = stats.dominant || { r: 40, g: 20, b: 30 }
    base = await sharp({
      create: {
        width: W,
        height: H,
        channels: 3,
        background: {
          r: Math.round(dominant.r * 0.28),
          g: Math.round(dominant.g * 0.28),
          b: Math.round(dominant.b * 0.28)
        }
      }
    }).png().toBuffer()
  }

  // NOTE: sharp's composite() REPLACES the overlay list on each call, so the
  // foreground has to be flattened here before the caller adds the red wash.
  return sharp(base)
    .composite([{ input: foreground, left: Math.round((W - fgWidth) / 2), top: 0 }])
    .png()
    .toBuffer()
}

let image
if (frame === 'cover') {
  const targetRatio = W / H
  let cropW = meta.width
  let cropH = Math.round(cropW / targetRatio)
  if (cropH > meta.height) {
    cropH = meta.height
    cropW = Math.round(cropH * targetRatio)
  }
  const maxTop = meta.height - cropH
  image = sharp(buffer)
    .extract({
      left: Math.round((meta.width - cropW) / 2),
      top: Math.max(0, Math.min(maxTop, Math.round(maxTop * anchor))),
      width: cropW,
      height: cropH
    })
    .resize(W, H)
} else {
  // wrap the flattened frame back into a sharp pipeline for the shared grade
  image = sharp(await framed())
}

const graded = await image
  .composite([{
    input: Buffer.from(`<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#7a0418" fill-opacity="0.22"/></svg>`),
    blend: 'over'
  }])
  .modulate({ saturation: 0.92 })
  .jpeg({ quality: 78, mozjpeg: true })
  .toBuffer()

const target = preview
  ? join(root, 'docs', `preview-${number}-${frame}.jpg`)
  : join(root, 'photos', `${number}.jpg`)
mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, graded)

if (keepSource && !preview) {
  const dir = join(root, 'photos', '_user')
  mkdirSync(dir, { recursive: true })
  copyFileSync(input, join(dir, `${number}${extname(input) || '.jpg'}`))
}

console.log(`${preview ? 'preview' : 'wrote'} ${target}  [frame=${frame}]`)
console.log(`  source ${meta.width}x${meta.height} ratio ${portraitRatio.toFixed(2)} -> ${(graded.length / 1024).toFixed(0)} KB`)
