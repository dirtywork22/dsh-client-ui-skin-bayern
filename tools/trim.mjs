/**
 * Trim the bottom strip off a backdrop photo (watermark / caption removal) and
 * re-fit it to the standard 1600x900 backdrop size.
 *
 * Usage: node tools/trim.mjs photos/34.jpg 0.86
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const requireFromDsh = createRequire(
  'C:/Users/陈天威/AppData/Local/npm-cache/_npx/1e7f6d9597241db0/node_modules/dshmarket/package.json'
)
const sharp = requireFromDsh('sharp')

const file = process.argv[2]
const keepRatio = Number(process.argv[3] || 0.86)
if (!file) throw new Error('usage: node tools/trim.mjs <photo.jpg> [keepRatio]')

const buffer = readFileSync(file)
const meta = await sharp(buffer).metadata()
const keep = Math.max(64, Math.round(meta.height * keepRatio))

const out = await sharp(buffer)
  .extract({ left: 0, top: 0, width: meta.width, height: keep })
  .resize(1600, 900, { fit: 'cover', position: 'top' })
  .jpeg({ quality: 78, mozjpeg: true })
  .toBuffer()

writeFileSync(file, out)
console.log(`trimmed ${file}: ${meta.width}x${meta.height} -> keep ${meta.width}x${keep} -> 1600x900, ${(out.length / 1024).toFixed(0)} KB`)
