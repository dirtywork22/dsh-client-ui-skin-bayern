/**
 * Codemod: rebuild the settings surface of lib/client.js.
 *
 * Why: the settings shell silently DROPS a slot row whose component throws while
 * rendering, and the four `Menu`-based rows did exactly that — only the row that
 * used plain elements survived. This replaces them with
 *   - native <select> rows (no component-library dependency at all),
 *   - ONE slot registration rendering all five rows (the shell hands each
 *     registration one store seat),
 * - and drops the now-unused primitives require.
 *
 * Usage: node tools/patch-settings.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const file = join(root, 'lib/client.js')
let src = readFileSync(file, 'utf8')

function replaceBetween(startAnchor, endAnchor, replacement, label) {
  const start = src.indexOf(startAnchor)
  if (start < 0) throw new Error(`start anchor not found: ${label}`)
  const end = src.indexOf(endAnchor, start)
  if (end < 0) throw new Error(`end anchor not found: ${label}`)
  src = src.slice(0, start) + replacement + src.slice(end)
}

/* ---- 1. the components ------------------------------------------------ */

const components = `    /**
     * One settings row: title + hint on the left, a native picker on the right.
     *
     * Deliberately plain React elements only — the settings shell drops a row
     * whose component throws, and a component-library import is one more thing
     * that can reject the whole row silently.
     */
    function BayernSelectRow({ title, hint, value, options, onChange }) {
      return react_jsx_runtime.jsxs('div', {
        className: 'dsh-bayern-row',
        children: [
          react_jsx_runtime.jsxs('div', {
            className: 'dsh-bayern-rowText',
            children: [
              react_jsx_runtime.jsx('div', { className: 'dsh-bayern-rowTitle', children: title }),
              react_jsx_runtime.jsx('div', { className: 'dsh-bayern-rowDesc', children: hint })
            ]
          }),
          react_jsx_runtime.jsx('select', {
            className: 'dsh-bayern-select',
            value: String(value),
            onChange: (event) => onChange(event.target.value),
            children: options.map((option) => react_jsx_runtime.jsx('option', {
              value: String(option.id),
              children: option.label
            }, String(option.id)))
          })
        ]
      })
    }

    /** Settings row for the free-form custom backdrop image URL. */
    function BayernImageRow({ title, hint, placeholder, applyLabel, clearLabel, value, onCommit }) {
      const [draft, setDraft] = _react.useState(value)
      _react.useEffect(() => {
        setDraft(value)
      }, [value])
      const commit = () => {
        onCommit(draft.trim())
      }
      return react_jsx_runtime.jsxs('div', {
        className: 'dsh-bayern-row',
        children: [
          react_jsx_runtime.jsxs('div', {
            className: 'dsh-bayern-rowText',
            children: [
              react_jsx_runtime.jsx('div', { className: 'dsh-bayern-rowTitle', children: title }),
              react_jsx_runtime.jsx('div', { className: 'dsh-bayern-rowDesc', children: hint })
            ]
          }),
          react_jsx_runtime.jsxs('div', {
            className: 'dsh-bayern-imageBox',
            children: [
              react_jsx_runtime.jsx('input', {
                className: 'dsh-bayern-input',
                type: 'text',
                spellCheck: false,
                placeholder,
                value: draft,
                onChange: (event) => {
                  setDraft(event.target.value)
                },
                onKeyDown: (event) => {
                  if (event.key === 'Enter') commit()
                }
              }),
              react_jsx_runtime.jsx('button', {
                type: 'button',
                className: 'dsh-bayern-miniButton',
                onClick: commit,
                children: applyLabel
              }),
              react_jsx_runtime.jsx('button', {
                type: 'button',
                className: 'dsh-bayern-miniButton',
                'data-active': value ? 'true' : 'false',
                onClick: () => onCommit(''),
                children: clearLabel
              })
            ]
          })
        ]
      })
    }

    /**
     * Every Bayern row inside ONE slot registration: the shell hands each
     * registration exactly one store seat, and a component may render as many
     * rows as it likes.
     */
    function BayernSettings({ t, setValue, setImage, useStore }) {
      const kit = useStore((s) => s.kit)
      const backdrop = useStore((s) => s.backdrop)
      const player = useStore((s) => s.player)
      const accent = useStore((s) => s.accent)
      const image = useStore((s) => s.image)
      return react_jsx_runtime.jsxs('div', {
        className: 'dsh-bayern-panel',
        children: [
          react_jsx_runtime.jsx(BayernSelectRow, {
            title: t('kit.title'),
            hint: t('kit.hint'),
            value: kit,
            options: KITS.map((id) => ({ id, label: t('kit.' + id) })),
            onChange: (id) => setValue('kit', id)
          }, 'kit'),
          react_jsx_runtime.jsx(BayernSelectRow, {
            title: t('backdrop.title'),
            hint: t('backdrop.hint'),
            value: backdrop,
            options: BACKDROPS.map((id) => ({ id, label: t('backdrop.' + id) })),
            onChange: (id) => setValue('backdrop', id)
          }, 'backdrop'),
          react_jsx_runtime.jsx(BayernSelectRow, {
            title: t('player.title'),
            hint: t('player.hint'),
            value: player,
            options: PLAYERS.map((entry) => ({ id: entry.n, label: t('player.p' + entry.n) })),
            onChange: (id) => setValue('player', id)
          }, 'player'),
          react_jsx_runtime.jsx(BayernSelectRow, {
            title: t('accent.title'),
            hint: t('accent.hint'),
            value: accent,
            options: ACCENTS.map((id) => ({ id, label: t('accent.' + id) })),
            onChange: (id) => setValue('accent', id)
          }, 'accent'),
          react_jsx_runtime.jsx(BayernImageRow, {
            title: t('image.title'),
            hint: t('image.hint'),
            placeholder: t('image.placeholder'),
            applyLabel: t('image.apply'),
            clearLabel: t('image.clear'),
            value: image,
            onCommit: (url) => setImage(url)
          }, 'image')
        ]
      })
    }

`

replaceBetween(
  '    /**\n     * Settings row for one enumerated preference',
  '    /**\n     * Apply the Bayern skin',
  components,
  'settings components'
)

/* ---- 2. the registration --------------------------------------------- */

const registration = `        const store = makeStore()
        ctx.slots.inject('settings.general.item', () => ctx.slots.register({
          name: 'settings.general.item',
          id: 'bayern-skin-settings',
          order: 40,
          store,
          locale: SETTINGS_NS,
          inject: (actions) => {
            bindings.push(actions)
            broadcast()
            return {
              setValue: (key, id) => {
                if (key === 'kit') commit({ kit: KITS.indexOf(id) !== -1 ? id : DEFAULT_STATE.kit })
                else if (key === 'backdrop') commit({ backdrop: BACKDROPS.indexOf(id) !== -1 ? id : DEFAULT_STATE.backdrop })
                else if (key === 'player') {
                  const number = Number(id)
                  commit({ player: PLAYERS.some((entry) => entry.n === number) ? number : DEFAULT_STATE.player })
                } else if (key === 'accent') commit({ accent: ACCENTS.indexOf(id) !== -1 ? id : DEFAULT_STATE.accent })
              },
              setImage: (url) => commit({ image: typeof url === 'string' ? url.trim() : '' })
            }
          }
        }, BayernSettings))
      }
    }
`

replaceBetween(
  '        const rows = [',
  '\n    exports.inject',
  registration,
  'slot registration'
)

/* ---- 3. the stylesheet: Menu pill -> native select -------------------- */

const css = `      'body[data-dsh-bayern] .dsh-bayern-select {',
      '  background: var(--dsw-alias-bg-module-platform);',
      '  color: var(--dsw-alias-label-primary);',
      '  height: 36px;',
      '  max-width: 280px;',
      '  font: inherit;',
      '  font-size: 13px;',
      '  line-height: 22px;',
      '  cursor: pointer;',
      '  border: none;',
      '  border-radius: 18px;',
      '  padding: 0 34px 0 14px;',
      '  appearance: none;',
      '  -webkit-appearance: none;',
      '  background-image: linear-gradient(45deg, transparent 50%, var(--dsw-alias-label-secondary) 50%), linear-gradient(135deg, var(--dsw-alias-label-secondary) 50%, transparent 50%);',
      '  background-position: calc(100% - 18px) 15px, calc(100% - 13px) 15px;',
      '  background-size: 6px 6px, 6px 6px;',
      '  background-repeat: no-repeat, no-repeat;',
      '}',
      '',
      'body[data-dsh-bayern] .dsh-bayern-select:hover {',
      '  background-color: var(--dsw-alias-interactive-bg-hover);',
      '}',
      '',
      'body[data-dsh-bayern] .dsh-bayern-select option {',
      '  background: var(--dsw-alias-bg-layer-2);',
      '  color: var(--dsw-alias-label-primary);',
      '}',
      '',
`

replaceBetween(
  "      'body[data-dsh-bayern] .dsh-bayern-selector {',",
  "      'body[data-dsh-bayern] .dsh-bayern-imageBox {',",
  css,
  'select styles'
)

/* ---- 4. drop the now-unused primitives require ------------------------ */

src = src.replace("    const _primitives = require('@deepseek-ai/dsh-client-ui-primitives')\n", '')

writeFileSync(file, src)
console.log('settings surface rebuilt;', (src.length / 1024).toFixed(0), 'KB')
console.log('primitives still referenced:', src.includes('_primitives'))
console.log('Menu still referenced:', src.includes('_primitives.Menu'))
