/**
 * Inline the photos/ directory into lib/client.js as data URIs.
 *
 * The client bundle is a single file served by dsh client-modules, so it cannot
 * fetch sibling assets at runtime — the photos travel inside the bundle,
 * between the @@PHOTOS_START@@ / @@PHOTOS_END@@ markers.
 *
 * Usage: node tools/embed-photos.mjs
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const photosDir = join(root, 'photos')
const clientFile = join(root, 'lib/client.js')

const START = '    // @@PHOTOS_START@@'
const END = '    // @@PHOTOS_END@@'

const files = existsSync(photosDir)
  ? readdirSync(photosDir).filter((name) => /^\d+\.(jpe?g|png|webp)$/i.test(name))
  : []

const entries = files
  .map((name) => {
    const number = name.replace(/\.[^.]+$/, '')
    const buf = readFileSync(join(photosDir, name))
    const mime = name.toLowerCase().endsWith('.png')
      ? 'image/png'
      : name.toLowerCase().endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg'
    return { number, uri: `data:${mime};base64,${buf.toString('base64')}`, bytes: buf.length }
  })
  .sort((a, b) => Number(a.number) - Number(b.number))

const table = entries
  .map((entry) => `      '${entry.number}': '${entry.uri}',`)
  .join('\n')

const block = `${START}\n    const PHOTOS = {\n${table}\n    }\n${END}`

const src = readFileSync(clientFile, 'utf8')
const start = src.indexOf(START)
const end = src.indexOf(END)
if (start < 0 || end < 0 || end <= start) throw new Error('photo markers not found in lib/client.js')
writeFileSync(clientFile, src.slice(0, start) + block + src.slice(end + END.length))

const total = entries.reduce((sum, entry) => sum + entry.bytes, 0)
console.log(`embedded ${entries.length} photos (${(total / 1024 / 1024).toFixed(2)} MB raw) into lib/client.js`)
console.log('numbers:', entries.map((entry) => entry.number).join(', '))
