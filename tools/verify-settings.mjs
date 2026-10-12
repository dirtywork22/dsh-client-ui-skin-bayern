/**
 * Render the plugin's settings component in a real React server renderer.
 *
 * The settings shell silently drops a slot row whose component throws, and that
 * is exactly how the first settings surface failed in the browser. This harness
 * loads lib/client.js, captures the slot registration, and renders it — a
 * missing export, a bad hook order or a typo becomes a hard error here instead
 * of an invisible row.
 *
 * Usage: node tools/verify-settings.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const testRequire = createRequire(join(root, 'tools/.render-test/package.json'))

const React = testRequire('react')
const jsxRuntime = testRequire('react/jsx-runtime')
const server = testRequire('react-dom/server')

const src = readFileSync(join(root, 'lib/client.js'), 'utf8')

/** Roster size straight from the bundle, so the option count checks itself. */
const playerCount = (src.match(/\{ n: \d+, name: '/g) || []).length

/* ---- a stand-in for the client module table --------------------------- */

function defineStore(spec) {
  const state = spec.init()
  return {
    state,
    actions: spec.actions || {},
    bind: () => state
  }
}

const captured = {}
const fakeWindow = {
  __ModuleLoader__: {
    load: (registration) => {
      captured.registration = registration
    }
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  }
}

const requireMap = {
  react: React,
  'react/jsx-runtime': jsxRuntime,
  '@deepseek-ai/dsh-client-store': { defineStore }
}

new Function('window', 'document', src)(fakeWindow, makeFakeDocument())

const exportsObject = captured.registration.factory((specifier) => {
  if (!(specifier in requireMap)) throw new Error(`unexpected require: ${specifier}`)
  return requireMap[specifier]
})

if (typeof exportsObject.apply !== 'function') throw new Error('bundle exports no apply()')
if (captured.registration.id !== 'dsh-client-ui-skin-bayern') {
  throw new Error(`bundle id mismatch: ${captured.registration.id}`)
}

/* ---- run apply() against a fake client context ------------------------ */

const registrations = []
const effects = []
const locales = []

const fakeCtx = {
  effect: (callback) => {
    const result = typeof callback === 'function' ? callback() : undefined
    effects.push(result)
    return { dispose: () => {} }
  },
  slots: {
    inject: (name, callback) => {
      const value = callback()
      registrations.push({ name, value })
      return value
    },
    register: (spec, Component) => ({ spec, Component })
  },
  locale: {
    register: (ns, dictionaries) => {
      locales.push({ ns, dictionaries })
      return () => {}
    },
    bind: () => (key) => key
  }
}

exportsObject.apply(fakeCtx)

/* ---- assertions -------------------------------------------------------- */

const problems = []
if (registrations.length !== 1) problems.push(`expected 1 slot registration, got ${registrations.length}`)
const entry = registrations[0]?.value
if (!entry) problems.push('no slot registration captured')
if (entry && entry.spec.name !== 'settings.general.item') problems.push(`unexpected slot: ${entry.spec.name}`)
if (entry && !entry.spec.store) problems.push('registration carries no store')
if (entry && typeof entry.spec.inject !== 'function') problems.push('registration carries no inject')

if (locales.length !== 1) problems.push(`expected 1 locale registration, got ${locales.length}`)
const dictionaries = locales[0]?.dictionaries || {}
for (const key of ['kit.title', 'kit.red', 'kit.white', 'backdrop.photo', 'player.p9', 'accent.blue', 'image.apply']) {
  if (!dictionaries.zh || !(key in dictionaries.zh)) problems.push(`zh dictionary misses ${key}`)
  if (!dictionaries.en || !(key in dictionaries.en)) problems.push(`en dictionary misses ${key}`)
}

let html = ''
if (problems.length === 0) {
  // the shell pushes the seat's actions into the component's props, then renders
  const actions = { sync: () => {} }
  const business = entry.spec.inject(actions)
  const storeState = entry.spec.store.state
  const props = Object.assign({
    t: (key) => key,
    useStore: (selector) => selector(storeState)
  }, business)
  html = server.renderToStaticMarkup(React.createElement(entry.Component, props))
}

/* ---- report ------------------------------------------------------------ */

console.log('slot registrations :', registrations.length)
console.log('locale ns          :', locales.map((item) => item.ns).join(', '))

if (problems.length > 0) {
  console.log('\nPROBLEMS:')
  for (const problem of problems) console.log(' -', problem)
  process.exit(1)
}

const counts = {
  rows: (html.match(/class="dsh-bayern-row"/g) || []).length,
  selects: (html.match(/class="dsh-bayern-select"/g) || []).length,
  options: (html.match(/<option/g) || []).length,
  inputs: (html.match(/class="dsh-bayern-input"/g) || []).length,
  buttons: (html.match(/class="dsh-bayern-miniButton"/g) || []).length
}
const expectedOptions = 2 + 5 + playerCount + 4
console.log('rendered HTML      :', html.length, 'bytes')
console.log('rows               :', counts.rows, '(expect 5)')
console.log('selects            :', counts.selects, '(expect 4)')
console.log('options            :', counts.options, `(expect 2 kit + 5 backdrop + ${playerCount} player + 4 accent = ${expectedOptions})`)
console.log('url input          :', counts.inputs, '(expect 1)')
console.log('mini buttons       :', counts.buttons, '(expect 2)')

const expected = { rows: 5, selects: 4, options: expectedOptions, inputs: 1, buttons: 2 }
for (const [key, value] of Object.entries(expected)) {
  if (counts[key] !== value) {
    console.log(`\nFAIL: ${key} = ${counts[key]}, expected ${value}`)
    console.log(html.slice(0, 400))
    process.exit(1)
  }
}
console.log('\nOK: the settings surface renders five rows with native pickers.')

/** Minimal document stand-in for the apply() pass. */
function makeFakeDocument() {
  return {
    title: 'test',
    body: {
      setAttribute: () => {},
      removeAttribute: () => {},
      hasAttribute: () => false,
      style: { setProperty: () => {}, removeProperty: () => {} }
    },
    head: { appendChild: () => {} },
    createElement: () => ({ id: '', dataset: {}, textContent: '', remove: () => {} }),
    getElementById: () => null
  }
}
