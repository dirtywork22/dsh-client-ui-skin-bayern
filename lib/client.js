/**
 * FC Bayern München skin for the dsh web GUI.
 *
 * Hand-written bundle in the official __ModuleLoader__ format (no build step):
 * apply() sets the `data-dsh-bayern` body attribute (the scope of the whole
 * stylesheet), generates one procedural player backdrop as an inline SVG data
 * URI, injects a <style> tag carrying the Bayern look, and pins the document
 * title. Its effect disposer retracts every write: body attributes, inline
 * custom properties, style tag, title (only while the title is still the
 * skin's own), the theme observer, and the Settings rows.
 *
 * Backdrops (all drawn in code — no club artwork is bundled):
 *   jersey  — the selected player's shirt back: number, name, four
 *             championship stars, pitch arc, Mia-san-mia caption (default)
 *   squad   — the whole 16-man roster as a number wall; the selected player
 *             is highlighted in the accent colour
 *   stadium — Allianz-style light band, crowd bokeh, mown-grass stripes and
 *             the centre circle carrying the selected player's number
 *   plain   — canvas only: accent glow over the base palette
 * A custom image URL (Settings row 4) overrides the generated backdrop.
 *
 * Palette: FC Bayern club colours (red #DC052D, dark red #8B0F22, blue
 * #0066B2, gold #C9A227) remapped onto dsh design tokens. Every surface that
 * reads --dsw-alias-bg-base becomes translucent so the backdrop shows through
 * the frame, the sidebar and the conversation column.
 *
 * Presentation-only: no services injected beyond slots/locale, no cordis
 * events, no model requests.
 */
window.__ModuleLoader__.load({
  id: 'dsh-client-ui-skin-bayern',
  factory: (require) => {
    'use strict'
    const module = { exports: {} }
    const exports = module.exports

    const react_jsx_runtime = require('react/jsx-runtime')
    const _react = require('react')
    const _store = require('@deepseek-ai/dsh-client-store')

    const SKIN_TITLE = 'FC Bayern München · DeepSeek Harness'
    const STYLE_ID = 'dsh-skin-bayern-style'
    const SETTINGS_NS = 'settings.bayernSkin'
    const KEY_PREFIX = 'dsh-client-ui-skin-bayern:2:'

    const DEFAULT_STATE = {
      backdrop: 'photo',
      kit: 'red',
      player: 9,
      accent: 'red',
      image: ''
    }

    const BACKDROPS = ['photo', 'jersey', 'squad', 'stadium', 'plain']
    const KITS = ['red', 'white']
    const ACCENTS = ['red', 'crimson', 'blue', 'gold']

    /**
     * Real match photos keyed by shirt number, injected as data URIs by
     * tools/embed-photos.mjs. An empty table means every backdrop falls back to
     * the drawn artwork.
     */
    // @@PHOTOS_START@@
    const PHOTOS = {}
    // @@PHOTOS_END@@

    /** Embedded match photo for one player, or '' when none is available. */
    function photoOf(number) {
      return PHOTOS[String(number)] || ''
    }

    /** FC Bayern first-team roster: shirt number, shirt name, Chinese name, position. */
    const PLAYERS = [
      { n: 1, name: 'NEUER', cn: '诺伊尔', pos: 'GK' },
      { n: 2, name: 'UPAMECANO', cn: '乌帕梅卡诺', pos: 'DF' },
      { n: 3, name: 'KIM', cn: '金玟哉', pos: 'DF' },
      { n: 4, name: 'TAH', cn: '塔', pos: 'DF' },
      { n: 6, name: 'KIMMICH', cn: '基米希', pos: 'MF' },
      { n: 7, name: 'GNARRY', cn: '格纳布里', pos: 'FW' },
      { n: 8, name: 'GORETZKA', cn: '格雷茨卡', pos: 'MF' },
      { n: 9, name: 'KANE', cn: '凯恩', pos: 'FW' },
      { n: 10, name: 'SANÉ', cn: '萨内', pos: 'FW' },
      { n: 11, name: 'COMAN', cn: '科曼', pos: 'FW' },
      { n: 14, name: 'DÍAZ', cn: '迪亚斯', pos: 'FW' },
      { n: 17, name: 'OLISE', cn: '奥利塞', pos: 'FW' },
      { n: 19, name: 'DAVIES', cn: '戴维斯', pos: 'DF' },
      { n: 21, name: 'BROWN', cn: '布朗', pos: 'DF' },
      { n: 25, name: 'MÜLLER', cn: '穆勒', pos: 'FW' },
      { n: 27, name: 'LAIMER', cn: '莱默', pos: 'MF' },
      { n: 34, name: 'SAIBARI', cn: '赛巴里', pos: 'FW' },
      { n: 42, name: 'MUSIALA', cn: '穆夏拉', pos: 'MF' },
      { n: 45, name: 'PAVLOVIĆ', cn: '帕夫洛维奇', pos: 'MF' }
    ]

    /** Club colours per accent id; soft/glow are alpha variants of the accent. */
    const ACCENT_COLORS = {
      red: { main: '#dc052d', hover: '#f4183f', soft: 'rgba(220, 5, 45, 0.18)', glow: 'rgba(220, 5, 45, 0.4)' },
      crimson: { main: '#8b0f22', hover: '#ab142c', soft: 'rgba(139, 15, 34, 0.22)', glow: 'rgba(170, 20, 45, 0.42)' },
      blue: { main: '#0066b2', hover: '#1a82d4', soft: 'rgba(0, 102, 178, 0.2)', glow: 'rgba(0, 122, 204, 0.42)' },
      gold: { main: '#c9a227', hover: '#e0b93a', soft: 'rgba(201, 162, 39, 0.22)', glow: 'rgba(214, 174, 45, 0.42)' }
    }

    /** Accent colour per id in the palette a backdrop SVG is drawn with. */
    function playerOf(number) {
      for (let i = 0; i < PLAYERS.length; i += 1) {
        if (PLAYERS[i].n === number) return PLAYERS[i]
      }
      return PLAYERS[7]
    }

    function xmlEscape(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    /** Deterministic LCG so a given seed always yields the same bokeh field. */
    function seeded(seed) {
      let state = (seed >>> 0) || 1
      return () => {
        state = (state * 1664525 + 1013904223) >>> 0
        return state / 4294967296
      }
    }

    const SANS = "Inter, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', Arial, Helvetica, sans-serif"

    /**
     * One palette per light/dark, so the procedural backdrop follows the native
     * theme switch instead of fighting it.
     */
    function palette(dark, accent) {
      const key = accent || 'red'
      const color = ACCENT_COLORS[key] || ACCENT_COLORS.red
      return dark
        ? {
            dark: true,
            canvas: '#0a0a10',
            canvas2: '#12121b',
            ink: '#f6f6f9',
            glass: 'rgba(255, 255, 255, 0.06)',
            line: 'rgba(255, 255, 255, 0.09)',
            accent: color.main,
            accentHover: color.hover,
            glow: 'rgba(220, 5, 45, 0.26)',
            glow2: 'rgba(0, 102, 178, 0.15)',
            pitch: 'rgba(255, 255, 255, 0.035)',
            pitch2: 'rgba(255, 255, 255, 0.018)',
            turf: '#0d1410'
          }
        : {
            dark: false,
            canvas: '#f6f5f2',
            canvas2: '#efece7',
            ink: '#16161a',
            glass: 'rgba(22, 22, 26, 0.05)',
            line: 'rgba(22, 22, 26, 0.1)',
            accent: color.main,
            accentHover: color.hover,
            glow: 'rgba(220, 5, 45, 0.14)',
            glow2: 'rgba(0, 102, 178, 0.1)',
            pitch: 'rgba(22, 22, 26, 0.03)',
            pitch2: 'rgba(22, 22, 26, 0.015)',
            turf: '#e4e9e2'
          }
    }

    /** Shared <defs>: accent glow, light band, shirt gradient, pitch stripes. */
    function defs(p) {
      return [
        '<defs>',
        '<radialGradient id="bglow" cx="0.72" cy="0.42" r="0.62">',
        `<stop offset="0" stop-color="${p.accent}" stop-opacity="${p.dark ? '0.42' : '0.2'}"/>`,
        '<stop offset="0.55" stop-color="#dc052d" stop-opacity="' + (p.dark ? '0.12' : '0.06') + '"/>',
        '<stop offset="1" stop-color="#dc052d" stop-opacity="0"/>',
        '</radialGradient>',
        '<radialGradient id="bblue" cx="0.14" cy="0.12" r="0.5">',
        `<stop offset="0" stop-color="#0066b2" stop-opacity="${p.dark ? '0.3' : '0.14'}"/>`,
        '<stop offset="1" stop-color="#0066b2" stop-opacity="0"/>',
        '</radialGradient>',
        '<linearGradient id="bband" x1="0" y1="0" x2="1" y2="0">',
        '<stop offset="0" stop-color="#dc052d" stop-opacity="0"/>',
        `<stop offset="0.35" stop-color="${p.accent}" stop-opacity="${p.dark ? '0.55' : '0.4'}"/>`,
        `<stop offset="0.68" stop-color="${p.accent}" stop-opacity="${p.dark ? '0.3' : '0.22'}"/>`,
        '<stop offset="1" stop-color="#0066b2" stop-opacity="0"/>',
        '</linearGradient>',
        '<linearGradient id="bshirt" x1="0.3" y1="0" x2="0.8" y2="1">',
        `<stop offset="0" stop-color="${p.accent}" stop-opacity="${p.dark ? '0.9' : '0.86'}"/>`,
        `<stop offset="0.62" stop-color="${p.accentHover}" stop-opacity="${p.dark ? '0.72' : '0.7'}"/>`,
        `<stop offset="1" stop-color="${p.dark ? '#6d0418' : '#9c0321'}" stop-opacity="${p.dark ? '0.86' : '0.78'}"/>`,
        '</linearGradient>',
        '<linearGradient id="bfade" x1="0" y1="0" x2="0" y2="1">',
        `<stop offset="0" stop-color="${p.canvas}" stop-opacity="0"/>`,
        `<stop offset="0.62" stop-color="${p.canvas}" stop-opacity="${p.dark ? '0.55' : '0.5'}"/>`,
        `<stop offset="1" stop-color="${p.canvas}" stop-opacity="${p.dark ? '0.92' : '0.82'}"/>`,
        '</linearGradient>',
        '</defs>'
      ].join('')
    }

    /** Canvas, glow, mown-grass stripes and the four championship stars. */
    function stage(p) {
      const parts = [
        `<rect width="1920" height="1080" fill="${p.canvas}"/>`,
        `<rect width="1920" height="1080" fill="url(#bglow)"/>`,
        `<rect width="1920" height="1080" fill="url(#bblue)"/>`,
        // mown-grass stripes on the lower half
        '<g>',
        ...Array.from({ length: 11 }, (_, i) => {
          const x = -600 + i * 260
          const fill = i % 2 === 0 ? p.pitch : p.pitch2
          return `<polygon points="${x},1080 ${x + 130},1080 ${x + 430},560 ${x + 300},560" fill="${fill}"/>`
        }),
        '</g>',
        // touchline
        `<path d="M -40 726 Q 960 618 1960 726" fill="none" stroke="${p.line}" stroke-width="3"/>`
      ]
      return parts.join('')
    }

    /** Five-point star path (championship stars on the shirt). */
    function starPath(cx, cy, r) {
      const points = []
      for (let i = 0; i < 10; i += 1) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5
        const radius = i % 2 === 0 ? r : r * 0.42
        points.push(`${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius).toFixed(1)}`)
      }
      return `M ${points.join(' L ')} Z`
    }

    /** The stylised crest placeholder (never the official mark). */
    function crest(x, y, scale, p, opacity) {
      return [
        `<g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity === undefined ? (p.dark ? '0.9' : '0.85') : opacity}">`,
        `<path d="M 0 -46 L 44 -20 L 44 26 Q 44 54 0 68 Q -44 54 -44 26 L -44 -20 Z" fill="${p.accent}" stroke="${p.ink}" stroke-opacity="0.35" stroke-width="3"/>`,
        `<path d="M 0 -46 L 44 -20 L 44 26 Q 44 54 0 68 Q -44 54 -44 26 L -44 -20 Z" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="2.5"/>`,
        `<text x="0" y="18" text-anchor="middle" font-family="${SANS}" font-size="34" font-weight="800" fill="#ffffff" letter-spacing="1">FCB</text>`,
        `<circle cx="-26" cy="-24" r="9" fill="#0066b2"/>`,
        `<circle cx="26" cy="-24" r="9" fill="#ffffff" fill-opacity="0.85"/>`,
        '</g>'
      ].join('')
    }

    /** jersey — the selected player's shirt back. */
    function backdropJersey(p, player) {
      const cx = 1462
      const shirt = [
        `M ${cx - 165} 200`,
        `Q ${cx} 340 ${cx + 165} 200`,
        `L ${cx + 300} 250`,
        `L ${cx + 360} 500`,
        `L ${cx + 255} 566`,
        `L ${cx + 200} 430`,
        `L ${cx + 210} 950`,
        `Q ${cx + 210} 998 ${cx + 158} 998`,
        `L ${cx - 158} 998`,
        `Q ${cx - 210} 998 ${cx - 210} 950`,
        `L ${cx - 200} 430`,
        `L ${cx - 255} 566`,
        `L ${cx - 360} 500`,
        `L ${cx - 300} 250`,
        'Z'
      ].join(' ')
      const stars = [cx - 135, cx - 45, cx + 45, cx + 135]
        .map((starX) => `<path d="${starPath(starX, 130, 16)}" fill="#c9a227" fill-opacity="0.8"/>`)
        .join('')
      const collar = `M ${cx - 165} 200 Q ${cx} 340 ${cx + 165} 200`
      return [
        stage(p),
        // The shirt sits right of the conversation column and is scaled down, so
        // chat text never has to fight the drawing for contrast.
        `<g transform="translate(391 136) scale(0.82)" opacity="${p.dark ? '0.5' : '0.34'}">`,
        stars,
        `<path d="${shirt}" fill="url(#bshirt)" stroke="#ffffff" stroke-opacity="0.22" stroke-width="3"/>`,
        `<path d="${collar}" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="7"/>`,
        `<path d="M ${cx - 255} 566 L ${cx - 200} 430" fill="none" stroke="#ffffff" stroke-opacity="0.3" stroke-width="9"/>`,
        `<path d="M ${cx + 255} 566 L ${cx + 200} 430" fill="none" stroke="#ffffff" stroke-opacity="0.3" stroke-width="9"/>`,
        `<path d="M ${cx - 158} 990 L ${cx + 158} 990" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="6"/>`,
        `<text x="${cx}" y="576" text-anchor="middle" font-family="${SANS}" font-size="96" font-weight="700" fill="#ffffff" letter-spacing="9">${xmlEscape(player.name)}</text>`,
        `<text x="${cx}" y="856" text-anchor="middle" font-family="${SANS}" font-size="300" font-weight="800" fill="#ffffff">${player.n}</text>`,
        '</g>',
        crest(672, 922, 1, p, p.dark ? '0.42' : '0.5'),
        `<text x="960" y="1056" text-anchor="middle" font-family="${SANS}" font-size="22" font-weight="600" fill="${p.ink}" fill-opacity="${p.dark ? '0.22' : '0.34'}" letter-spacing="20">MIA SAN MIA · FC BAYERN MÜNCHEN</text>`,
        `<rect y="0" width="1920" height="7" fill="url(#bband)"/>`,
        `<rect y="1073" width="1920" height="7" fill="url(#bband)" opacity="0.5"/>`
      ].join('')
    }

    /** squad — the full roster as a number wall; the selected player is lit. */
    function backdropSquad(p, player) {
      const columns = 4
      const rows = 5
      const left = 120
      const top = 206
      const stepX = 430
      const stepY = 152
      const cells = []
      PLAYERS.forEach((entry, index) => {
        const col = index % columns
        const row = Math.floor(index / columns) % rows
        const x = left + col * stepX
        const y = top + row * stepY
        const active = entry.n === player.n
        const ink = active ? p.accent : p.ink
        cells.push(
          `<g opacity="${active ? (p.dark ? '0.95' : '0.9') : (p.dark ? '0.42' : '0.5')}">`,
          `<text x="${x}" y="${y}" font-family="${SANS}" font-size="92" font-weight="800" fill="${ink}">${entry.n}</text>`,
          `<text x="${x + 8}" y="${y + 38}" font-family="${SANS}" font-size="27" font-weight="600" fill="${ink}" letter-spacing="5">${xmlEscape(entry.name)}</text>`,
          `<text x="${x + 8}" y="${y + 68}" font-family="${SANS}" font-size="22" font-weight="500" fill="${ink}" fill-opacity="0.72">${xmlEscape(entry.cn)} · ${entry.pos}</text>`,
          `<rect x="${x}" y="${y - 86}" width="${active ? 96 : 54}" height="4" fill="${ink}" fill-opacity="0.55"/>`,
          '</g>'
        )
      })
      return [
        stage(p),
        `<text x="960" y="700" text-anchor="middle" font-family="${SANS}" font-size="600" font-weight="800" fill="${p.ink}" fill-opacity="${p.dark ? '0.035' : '0.045'}" letter-spacing="20">FCB</text>`,
        cells.join(''),
        `<text x="96" y="1010" font-family="${SANS}" font-size="30" font-weight="700" fill="${p.ink}" fill-opacity="${p.dark ? '0.3' : '0.4'}" letter-spacing="12">FC BAYERN MÜNCHEN · MIA SAN MIA</text>`,
        crest(1790, 960, 1, p),
        `<rect y="0" width="1920" height="7" fill="url(#bband)"/>`
      ].join('')
    }

    /** stadium — Allianz-style light band, crowd bokeh, centre circle. */
    function backdropStadium(p, player) {
      const rand = seeded(20250831)
      const crowd = []
      for (let i = 0; i < 260; i += 1) {
        const x = 40 + rand() * 1840
        const y = 90 + rand() * 300
        const r = 1 + rand() * 2.4
        const warm = rand()
        const fill = warm > 0.78 ? '#c9a227' : warm > 0.4 ? p.accent : '#ffffff'
        crowd.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" fill-opacity="${(p.dark ? 0.5 : 0.35) * (0.4 + rand() * 0.6)}"/>`)
      }
      const grass = []
      for (let i = 0; i < 12; i += 1) {
        const y = 560 + i * 44
        grass.push(`<rect x="0" y="${y}" width="1920" height="22" fill="${p.dark ? 'rgba(255,255,255,0.022)' : 'rgba(22,22,26,0.028)'}"/>`)
      }
      return [
        `<rect width="1920" height="1080" fill="${p.canvas}"/>`,
        `<rect width="1920" height="1080" fill="url(#bglow)"/>`,
        `<rect x="0" y="0" width="1920" height="420" fill="${p.turf}" opacity="0.75"/>`,
        crowd.join(''),
        `<rect x="0" y="392" width="1920" height="9" fill="url(#bband)"/>`,
        `<rect x="0" y="412" width="1920" height="150" fill="url(#bblue)" opacity="0.6"/>`,
        '<g>',
        grass.join(''),
        '</g>',
        // pitch markings
        `<ellipse cx="960" cy="880" rx="620" ry="330" fill="none" stroke="${p.line}" stroke-width="4"/>`,
        `<ellipse cx="960" cy="880" rx="150" ry="82" fill="none" stroke="${p.line}" stroke-width="4"/>`,
        `<path d="M -40 604 L 1960 604" stroke="${p.line}" stroke-width="4"/>`,
        `<text x="960" y="892" text-anchor="middle" font-family="${SANS}" font-size="210" font-weight="800" fill="${p.ink}" fill-opacity="${p.dark ? '0.5' : '0.42'}" letter-spacing="6">${player.n}</text>`,
        `<text x="960" y="960" text-anchor="middle" font-family="${SANS}" font-size="42" font-weight="700" fill="${p.accent}" fill-opacity="${p.dark ? '0.85' : '0.75'}" letter-spacing="14">${xmlEscape(player.name)}</text>`,
        `<text x="96" y="300" font-family="${SANS}" font-size="64" font-weight="800" fill="${p.ink}" fill-opacity="${p.dark ? '0.34' : '0.4'}" letter-spacing="6">FC BAYERN MÜNCHEN</text>`,
        `<text x="96" y="352" font-family="${SANS}" font-size="28" font-weight="600" fill="${p.ink}" fill-opacity="${p.dark ? '0.26' : '0.34'}" letter-spacing="12">ALLIANZ ARENA · MIA SAN MIA</text>`,
        crest(1796, 220, 1.15, p),
        `<rect y="0" width="1920" height="7" fill="url(#bband)"/>`
      ].join('')
    }

    /** plain — canvas, glow and a single caption; nothing else. */
    function backdropPlain(p, player) {
      return [
        `<rect width="1920" height="1080" fill="${p.canvas}"/>`,
        `<rect width="1920" height="1080" fill="url(#bglow)"/>`,
        `<rect width="1920" height="1080" fill="url(#bblue)"/>`,
        `<text x="1860" y="1010" text-anchor="end" font-family="${SANS}" font-size="30" font-weight="800" fill="${p.ink}" fill-opacity="${p.dark ? '0.12' : '0.16'}" letter-spacing="10">FC BAYERN ${player.n}</text>`,
        `<rect y="0" width="1920" height="7" fill="url(#bband)" opacity="0.7"/>`
      ].join('')
    }

    /**
     * Render the requested backdrop as a data URI a CSS background-image can
     * carry. Pure function of (backdrop, player, dark, accent).
     */
    function backdropUrl(backdrop, player, dark, accent) {
      if (backdrop === 'photo') {
        const photo = photoOf(player.n)
        // a real photo needs no palette and has no dark/light variant
        if (photo) return `url("${photo}")`
        backdrop = 'jersey'
      }
      const p = palette(dark, accent)
      const body = backdrop === 'squad'
        ? backdropSquad(p, player)
        : backdrop === 'stadium'
          ? backdropStadium(p, player)
          : backdrop === 'plain'
            ? backdropPlain(p, player)
            : backdropJersey(p, player)
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080" preserveAspectRatio="xMidYMid slice">${defs(p)}${body}<rect width="1920" height="1080" fill="url(#bfade)" opacity="${p.dark ? '0.5' : '0.4'}"/></svg>`
      return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`
    }

    const CSS = [
      '/* ---- club variables shared by every kit ---------------------------- */',
      'html body[data-dsh-bayern] {',
      '  --dsh-bayern-accent: #dc052d;',
      '  --dsh-bayern-accent-hover: #f4183f;',
      '  --dsh-bayern-accent-soft: rgba(220, 5, 45, 0.18);',
      '  --dsh-bayern-accent-glow: rgba(220, 5, 45, 0.4);',
      '  --dsh-bayern-image: none;',
      '  --dsh-bayern-scrim: none;',
      '  --dsh-bayern-pane: rgba(10, 10, 16, 0.72);',
      '  --dsw-alias-bg-base: var(--dsh-bayern-pane) !important;',
      '  --dsw-alias-bg-layer-1: #12121a;',
      '  --dsw-alias-bg-layer-2: #1a1a24;',
      '  --dsw-alias-bg-layer-3: #23232f;',
      '  --dsw-alias-bg-overlay: rgba(18, 18, 26, 0.94);',
      '  --dsw-alias-bg-module-platform: rgba(255, 255, 255, 0.06);',
      '  --dsw-alias-border-l1: #22222c;',
      '  --dsw-alias-border-l2: #2b2b37;',
      '  --dsw-alias-border-l2-darkmode-thin: #2b2b37;',
      '  --dsw-alias-border-l3: #353542;',
      '  --dsw-alias-brand-primary: var(--dsh-bayern-accent);',
      '  --dsw-alias-brand-text: #ffffff;',
      '  --dsw-alias-button-info-fill: var(--dsh-bayern-accent);',
      '  --dsw-alias-button-info-hover: var(--dsh-bayern-accent-hover);',
      '  --dsw-alias-button-elevated-fill: rgba(255, 255, 255, 0.08);',
      '  --dsw-alias-button-floating-fill: rgba(26, 26, 36, 0.9);',
      '  --dsw-alias-button-floating-hover: #23232f;',
      '  --dsw-alias-interactive-bg-active: var(--dsh-bayern-accent-soft);',
      '  --dsw-alias-interactive-bg-hover: rgba(255, 255, 255, 0.06);',
      '  --dsw-alias-interactive-bg-hover-solid: #23232f;',
      '  --dsw-alias-label-primary: #f6f6f9;',
      '  --dsw-alias-label-primary-bluish: #f6f6f9;',
      '  --dsw-alias-label-secondary: #b6b6c2;',
      '  --dsw-alias-label-tertiary: #8c8c9a;',
      '  --dsw-alias-label-caption: #6d6d7b;',
      '  --dsw-alias-label-dimmed: #6d6d7b;',
      '  --dsw-alias-link: #6ba9e0;',
      '  --dsw-alias-state-business-primary: var(--dsh-bayern-accent);',
      '  --dsw-alias-state-business-tertiary: var(--dsh-bayern-accent-soft);',
      '  --dsw-alias-markdown-inline-code: rgba(255, 255, 255, 0.08);',
      '  --dsw-alias-markdown-code-block: rgba(6, 6, 10, 0.62);',
      '  --dsw-alias-markdown-code-block-banner: rgba(255, 255, 255, 0.04);',
      '  --dsw-alias-settings-card-fill: rgba(255, 255, 255, 0.03);',
      '  --dsw-alias-settings-card-stroke: #26262f;',
      '  --dsw-specific-input-major: rgba(6, 6, 10, 0.72) !important;',
      '  --dsw-specific-selector: #23232f;',
      '  --dsw-specific-sidebar-fill: rgba(10, 10, 16, 0.6) !important;',
      '  --dsw-specific-sidebar-nav-item-active: var(--dsh-bayern-accent-soft);',
      '  --dsw-specific-sidebar-nav-item-hover: rgba(255, 255, 255, 0.05);',
      '  --dsw-specific-bubble: rgba(255, 255, 255, 0.06) !important;',
      '  --dsw-specific-bubble-highlight: rgba(255, 255, 255, 0.1);',
      '  --dsw-specific-menu: rgba(20, 20, 28, 0.9);',
      '  --dsw-shadow-lv2: 0 18px 54px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.35);',
      '  --dsw-focus-ring-color: var(--dsh-bayern-accent);',
      '  color: #f6f6f9;',
      '  background-color: #0a0a10;',
      '}',
      '',
      '/* ---- accent colour variants ---------------------------------------- */',
      'html body[data-dsh-bayern][data-dsh-bayern-accent="crimson"] {',
      '  --dsh-bayern-accent: #8b0f22;',
      '  --dsh-bayern-accent-hover: #ab142c;',
      '  --dsh-bayern-accent-soft: rgba(139, 15, 34, 0.24);',
      '  --dsh-bayern-accent-glow: rgba(170, 20, 45, 0.42);',
      '}',
      '',
      'html body[data-dsh-bayern][data-dsh-bayern-accent="blue"] {',
      '  --dsh-bayern-accent: #0066b2;',
      '  --dsh-bayern-accent-hover: #1a82d4;',
      '  --dsh-bayern-accent-soft: rgba(0, 102, 178, 0.2);',
      '  --dsh-bayern-accent-glow: rgba(0, 122, 204, 0.42);',
      '}',
      '',
      'html body[data-dsh-bayern][data-dsh-bayern-accent="gold"] {',
      '  --dsh-bayern-accent: #c9a227;',
      '  --dsh-bayern-accent-hover: #e0b93a;',
      '  --dsh-bayern-accent-soft: rgba(201, 162, 39, 0.22);',
      '  --dsh-bayern-accent-glow: rgba(214, 174, 45, 0.42);',
      '}',
      '',
      '/* ---- home red, light system theme ---------------------------------- */',
      'html body[data-dsh-bayern][data-dsh-bayern-kit="red"]:not([data-ds-dark-theme]) {',
      '  --dsh-bayern-pane: rgba(252, 246, 244, 0.8);',
      '  --dsw-alias-bg-layer-1: #f7eeec;',
      '  --dsw-alias-bg-layer-2: #f1e5e2;',
      '  --dsw-alias-bg-layer-3: #e8d8d4;',
      '  --dsw-alias-bg-overlay: rgba(255, 252, 251, 0.96);',
      '  --dsw-alias-bg-module-platform: rgba(22, 22, 26, 0.05);',
      '  --dsw-alias-border-l1: #ecdcd8;',
      '  --dsw-alias-border-l2: #e4d2ce;',
      '  --dsw-alias-border-l2-darkmode-thin: #e4d2ce;',
      '  --dsw-alias-border-l3: #d6c1bd;',
      '  --dsw-alias-button-elevated-fill: rgba(255, 255, 255, 0.9);',
      '  --dsw-alias-button-floating-fill: rgba(255, 255, 255, 0.92);',
      '  --dsw-alias-button-floating-hover: #f7eeec;',
      '  --dsw-alias-interactive-bg-hover: rgba(22, 22, 26, 0.05);',
      '  --dsw-alias-interactive-bg-hover-solid: #f1e5e2;',
      '  --dsw-alias-label-primary: #1a1113;',
      '  --dsw-alias-label-primary-bluish: #1a1113;',
      '  --dsw-alias-label-secondary: #5a4a4d;',
      '  --dsw-alias-label-tertiary: #857174;',
      '  --dsw-alias-label-caption: #a99a9c;',
      '  --dsw-alias-label-dimmed: #a99a9c;',
      '  --dsw-alias-link: #b30525;',
      '  --dsw-alias-markdown-inline-code: rgba(22, 22, 26, 0.07);',
      '  --dsw-alias-markdown-code-block: rgba(255, 255, 255, 0.72);',
      '  --dsw-alias-markdown-code-block-banner: rgba(22, 22, 26, 0.04);',
      '  --dsw-alias-settings-card-fill: rgba(255, 255, 255, 0.6);',
      '  --dsw-alias-settings-card-stroke: #ecdcd8;',
      '  --dsw-specific-input-major: rgba(255, 255, 255, 0.88) !important;',
      '  --dsw-specific-selector: #f1e5e2;',
      '  --dsw-specific-sidebar-fill: rgba(252, 246, 244, 0.66) !important;',
      '  --dsw-specific-sidebar-nav-item-hover: rgba(22, 22, 26, 0.05);',
      '  --dsw-specific-bubble: rgba(255, 255, 255, 0.66) !important;',
      '  --dsw-specific-bubble-highlight: #f1e5e2;',
      '  --dsw-specific-menu: rgba(255, 255, 255, 0.92);',
      '  color: #1a1113;',
      '  background-color: #fcf6f4;',
      '}',
      '',
      '/* ---- away white: a paper-white canvas whatever the system theme says - */',
      'html body[data-dsh-bayern][data-dsh-bayern-kit="white"] {',
      '  --dsh-bayern-pane: rgba(255, 255, 255, 0.82);',
      '  --dsw-alias-bg-layer-1: #f4f4f3;',
      '  --dsw-alias-bg-layer-2: #ececeb;',
      '  --dsw-alias-bg-layer-3: #e2e2e1;',
      '  --dsw-alias-bg-overlay: rgba(255, 255, 255, 0.97);',
      '  --dsw-alias-bg-module-platform: rgba(20, 20, 22, 0.05);',
      '  --dsw-alias-border-l1: #e6e6e4;',
      '  --dsw-alias-border-l2: #dededc;',
      '  --dsw-alias-border-l2-darkmode-thin: #dededc;',
      '  --dsw-alias-border-l3: #cfcfcd;',
      '  --dsw-alias-button-elevated-fill: rgba(255, 255, 255, 0.94);',
      '  --dsw-alias-button-floating-fill: rgba(255, 255, 255, 0.95);',
      '  --dsw-alias-button-floating-hover: #f4f4f3;',
      '  --dsw-alias-interactive-bg-hover: rgba(20, 20, 22, 0.05);',
      '  --dsw-alias-interactive-bg-hover-solid: #ececeb;',
      '  --dsw-alias-label-primary: #141416;',
      '  --dsw-alias-label-primary-bluish: #141416;',
      '  --dsw-alias-label-secondary: #565658;',
      '  --dsw-alias-label-tertiary: #808082;',
      '  --dsw-alias-label-caption: #a4a4a6;',
      '  --dsw-alias-label-dimmed: #a4a4a6;',
      '  --dsw-alias-link: #b30525;',
      '  --dsw-alias-markdown-inline-code: rgba(20, 20, 22, 0.07);',
      '  --dsw-alias-markdown-code-block: rgba(255, 255, 255, 0.78);',
      '  --dsw-alias-markdown-code-block-banner: rgba(20, 20, 22, 0.04);',
      '  --dsw-alias-settings-card-fill: rgba(255, 255, 255, 0.7);',
      '  --dsw-alias-settings-card-stroke: #e6e6e4;',
      '  --dsw-specific-input-major: rgba(255, 255, 255, 0.92) !important;',
      '  --dsw-specific-selector: #ececeb;',
      '  --dsw-specific-sidebar-fill: rgba(255, 255, 255, 0.7) !important;',
      '  --dsw-specific-sidebar-nav-item-hover: rgba(20, 20, 22, 0.05);',
      '  --dsw-specific-bubble: rgba(255, 255, 255, 0.7) !important;',
      '  --dsw-specific-bubble-highlight: #ececeb;',
      '  --dsw-specific-menu: rgba(255, 255, 255, 0.93);',
      '  color: #141416;',
      '  background-color: #fbfbfa;',
      '}',
      '',
      '/* ---- photo mode: thinner surfaces so the player actually reads ------- */',
      'html body[data-dsh-bayern][data-dsh-bayern-backdrop="photo"] {',
      '  --dsh-bayern-pane: rgba(10, 10, 16, 0.48);',
      '  --dsw-specific-sidebar-fill: rgba(10, 10, 16, 0.4) !important;',
      '  --dsw-specific-bubble: rgba(10, 10, 16, 0.46) !important;',
      '  --dsw-specific-input-major: rgba(6, 6, 10, 0.56) !important;',
      '}',
      '',
      'html body[data-dsh-bayern][data-dsh-bayern-backdrop="photo"][data-dsh-bayern-kit="white"] {',
      '  --dsh-bayern-pane: rgba(255, 255, 255, 0.5);',
      '  --dsw-specific-sidebar-fill: rgba(255, 255, 255, 0.44) !important;',
      '  --dsw-specific-bubble: rgba(255, 255, 255, 0.56) !important;',
      '  --dsw-specific-input-major: rgba(255, 255, 255, 0.68) !important;',
      '}',
      '',
      'html body[data-dsh-bayern][data-dsh-bayern-backdrop="photo"][data-dsh-bayern-kit="red"]:not([data-ds-dark-theme]) {',
      '  --dsh-bayern-pane: rgba(252, 246, 244, 0.5);',
      '  --dsw-specific-sidebar-fill: rgba(252, 246, 244, 0.42) !important;',
      '  --dsw-specific-bubble: rgba(255, 255, 255, 0.54) !important;',
      '  --dsw-specific-input-major: rgba(255, 255, 255, 0.68) !important;',
      '}',
      '',
      '/* ---- the backdrop layer: generated art or a real match photo -------- */',
      'html body[data-dsh-bayern] {',
      '  background-image: var(--dsh-bayern-scrim), var(--dsh-bayern-image);',
      '  background-size: cover, cover;',
      '  background-position: center top, center top;',
      '  background-repeat: no-repeat, no-repeat;',
      '  background-attachment: fixed, fixed;',
      '}',
      '',
      'html:has(> body[data-dsh-bayern]) {',
      '  background-color: #0a0a10;',
      '}',
      '',
      'html:has(> body[data-dsh-bayern][data-dsh-bayern-kit="white"]),',
      'html:has(> body[data-dsh-bayern][data-dsh-bayern-kit="red"]:not([data-ds-dark-theme])) {',
      '  background-color: #fbfbfa;',
      '}',
      '',
      '/* club-colour hairline across the very top of the window */',
      'html body[data-dsh-bayern]::before {',
      '  content: "";',
      '  position: fixed;',
      '  inset: 0 0 auto 0;',
      '  height: 3px;',
      '  z-index: 9999;',
      '  pointer-events: none;',
      '  background: linear-gradient(90deg, transparent 0%, var(--dsh-bayern-accent) 28%, var(--dsh-bayern-accent-hover) 52%, rgba(0, 102, 178, 0.9) 82%, transparent 100%);',
      '}',
      '',
      '/* ---- surfaces: let the photo read through, keep text crisp ---------- */',
      'html body[data-dsh-bayern] :is([class*="sidebarCol"], [class*="centerCol"], [class*="frame"]) {',
      '  background-color: transparent;',
      '}',
      '',
      'html body[data-dsh-bayern] [class*="sidebarCol"] {',
      '  position: relative;',
      '  backdrop-filter: blur(18px) saturate(1.05);',
      '  -webkit-backdrop-filter: blur(18px) saturate(1.05);',
      '  border-right: 1px solid var(--dsw-alias-border-l1);',
      '}',
      '',
      'html body[data-dsh-bayern] [class*="sidebarCol"]::after {',
      '  content: "";',
      '  position: absolute;',
      '  inset: 0 auto 0 0;',
      '  width: 2px;',
      '  background: linear-gradient(180deg, var(--dsh-bayern-accent), transparent 62%);',
      '  opacity: 0.75;',
      '  pointer-events: none;',
      '}',
      '',
      'html body[data-dsh-bayern] [class*="composer"] {',
      '  background-color: transparent;',
      '}',
      '',
      '/* ---- club details --------------------------------------------------- */',
      'html body[data-dsh-bayern] button[class*="brand"] {',
      '  color: var(--dsh-bayern-accent);',
      '}',
      '',
      'html body[data-dsh-bayern] button[class*="newSession"],',
      'html body[data-dsh-bayern] [data-slot="sidebar.settings"] > :is(button, [role="button"]) {',
      '  background: linear-gradient(135deg, var(--dsh-bayern-accent) 0%, var(--dsh-bayern-accent-hover) 100%);',
      '  color: #ffffff;',
      '  border-radius: 10px;',
      '  box-shadow: 0 6px 20px -12px var(--dsh-bayern-accent-glow);',
      '}',
      '',
      'html body[data-dsh-bayern] a {',
      '  color: var(--dsw-alias-link);',
      '}',
      '',
      'html body[data-dsh-bayern] :is([class*="badge"], [class*="Badge"]) {',
      '  border-radius: 9999px;',
      '}',
      '',
      'html body[data-dsh-bayern] :is([class*="caption"], [class*="sectionLabel"]) {',
      '  letter-spacing: 0.06em;',
      '}',
      '',
      '/* ---- scrollbars / selection / focus --------------------------------- */',
      'html body[data-dsh-bayern] * {',
      '  scrollbar-width: thin;',
      '  scrollbar-color: var(--dsh-bayern-accent-soft) transparent;',
      '}',
      '',
      'html body[data-dsh-bayern] ::-webkit-scrollbar {',
      '  width: 8px;',
      '  height: 8px;',
      '}',
      '',
      'html body[data-dsh-bayern] ::-webkit-scrollbar-track {',
      '  background: transparent;',
      '}',
      '',
      'html body[data-dsh-bayern] ::-webkit-scrollbar-thumb {',
      '  background: var(--dsh-bayern-accent-soft);',
      '  border-radius: 9999px;',
      '}',
      '',
      'html body[data-dsh-bayern] ::-webkit-scrollbar-thumb:hover {',
      '  background: var(--dsh-bayern-accent-glow);',
      '}',
      '',
      'html body[data-dsh-bayern] ::selection {',
      '  background: var(--dsh-bayern-accent-soft);',
      '  color: inherit;',
      '}',
      '',
      'html body[data-dsh-bayern] :is(button, input, textarea, select, [role="button"], [role="tab"], [role="treeitem"]):focus-visible {',
      '  outline: 2px solid var(--dsh-bayern-accent-glow);',
      '  outline-offset: 1px;',
      '}',
      '',
      '/* TurnStatus shimmer in club red */',
      'html body[data-dsh-bayern] [role="status"][aria-live="polite"] {',
      '  color: #0000;',
      '  -webkit-text-fill-color: transparent;',
      '  background: linear-gradient(90deg, var(--dsh-bayern-accent) 0%, var(--dsh-bayern-accent) 40%, var(--dsh-bayern-accent-hover) 50%, var(--dsh-bayern-accent) 60%, var(--dsh-bayern-accent) 100%);',
      '  background-size: 250% 100%;',
      '  background-position: 100% 0;',
      '  -webkit-background-clip: text;',
      '  background-clip: text;',
      '  animation: 1.8s linear infinite dsh-bayern-turn-status-shimmer;',
      '}',
      '',
      '@keyframes dsh-bayern-turn-status-shimmer {',
      '  to { background-position: 0 0; }',
      '}',
      '',
      '/* ---- Settings rows (native row geometry, like the EnterBehavior row) - */',
      'html body[data-dsh-bayern] .dsh-bayern-row {',
      '  border-bottom: 1px solid var(--dsw-alias-border-l2);',
      '  align-items: center;',
      '  gap: 8px;',
      '  padding: 16px 0;',
      '  display: flex;',
      '}',
      '',
      'html body[data-dsh-bayern] .dsh-bayern-rowText {',
      '  flex-direction: column;',
      '  flex: 1;',
      '  gap: 4px;',
      '  min-width: 0;',
      '  padding-right: 48px;',
      '  display: flex;',
      '}',
      '',
      'html body[data-dsh-bayern] .dsh-bayern-rowTitle {',
      '  color: var(--dsw-alias-label-primary);',
      '  font-size: 14px;',
      '  font-weight: 400;',
      '  line-height: 22px;',
      '}',
      '',
      'html body[data-dsh-bayern] .dsh-bayern-rowDesc {',
      '  color: var(--dsw-alias-label-tertiary);',
      '  font-size: 12px;',
      '  font-weight: 400;',
      '  line-height: 18px;',
      '}',
      '',
      'html body[data-dsh-bayern] .dsh-bayern-select {',
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
      'html body[data-dsh-bayern] .dsh-bayern-select:hover {',
      '  background-color: var(--dsw-alias-interactive-bg-hover);',
      '}',
      '',
      'html body[data-dsh-bayern] .dsh-bayern-select option {',
      '  background: var(--dsw-alias-bg-layer-2);',
      '  color: var(--dsw-alias-label-primary);',
      '}',
      '',
      'html body[data-dsh-bayern] .dsh-bayern-imageBox {',
      '  align-items: center;',
      '  gap: 8px;',
      '  display: flex;',
      '}',
      '',
      'html body[data-dsh-bayern] .dsh-bayern-input {',
      '  background: var(--dsw-alias-bg-module-platform);',
      '  height: 36px;',
      '  width: 240px;',
      '  color: var(--dsw-alias-label-primary);',
      '  border: none;',
      '  border-radius: 18px;',
      '  padding: 0 14px;',
      '  font-size: 13px;',
      '  font-family: inherit;',
      '}',
      '',
      'html body[data-dsh-bayern] .dsh-bayern-input::placeholder {',
      '  color: var(--dsw-alias-label-caption);',
      '}',
      '',
      'html body[data-dsh-bayern] .dsh-bayern-miniButton {',
      '  background: var(--dsw-alias-bg-module-platform);',
      '  color: var(--dsw-alias-label-secondary);',
      '  cursor: pointer;',
      '  border: none;',
      '  border-radius: 18px;',
      '  height: 36px;',
      '  padding: 0 14px;',
      '  font-size: 13px;',
      '  font-family: inherit;',
      '}',
      '',
      'html body[data-dsh-bayern] .dsh-bayern-miniButton:hover {',
      '  background: var(--dsw-alias-interactive-bg-hover);',
      '  color: var(--dsw-alias-label-primary);',
      '}',
      '',
      'html body[data-dsh-bayern] .dsh-bayern-miniButton[data-active="true"] {',
      '  background: var(--dsh-bayern-accent-soft);',
      '  color: var(--dsh-bayern-accent);',
      '}',
    ].join('\n')

    /* ------------------------------------------------------------------ *
     * Persistence: localStorage — DSH exposes only allowlisted setting    *
     * namespaces to browser clients, which keeps the skin self-contained. *
     * ------------------------------------------------------------------ */
    function readStorage(key) {
      try {
        const value = window.localStorage.getItem(key)
        return typeof value === 'string' ? value : null
      } catch {
        return null
      }
    }

    function writeStorage(key, value) {
      try {
        if (value === null) window.localStorage.removeItem(key)
        else window.localStorage.setItem(key, value)
      } catch {
        // storage unavailable — the preference stays process-local
      }
    }

    const zh = {
      'kit.title': '球衣配色',
      'kit.hint': '主场红：深红画布，跟随系统明暗。客场白：纸白画布，不随系统明暗变化。',
      'kit.red': '主场红 · 深红画布',
      'kit.white': '客场白 · 纸白画布',
      'backdrop.title': '背景主题',
      'backdrop.hint': '真实赛场照片 / 球员球衣 / 阵容号码墙 / 安联球场 / 纯色。',
      'backdrop.photo': '真实赛场照片（当前球员）',
      'backdrop.jersey': '球员球衣（球衣背影 + 号码 + 姓名）',
      'backdrop.squad': '阵容号码墙（16 人一线队）',
      'backdrop.stadium': '安联球场（光带 + 观众席 + 草坪）',
      'backdrop.plain': '纯色（仅俱乐部配色）',
      'player.title': '背景球员',
      'player.hint': '背景里出场的拜仁球员；球衣与球场主题会显示他的号码和姓名。',
      'accent.title': '强调色',
      'accent.hint': '按钮、焦点环、选中文本与背景光晕使用的俱乐部颜色。',
      'accent.red': '拜仁红 #DC052D',
      'accent.crimson': '深红 #8B0F22',
      'accent.blue': '拜仁蓝 #0066B2',
      'accent.gold': '冠军金 #C9A227',
      'image.title': '自定义背景图',
      'image.hint': '填入图片地址（http(s) 或 data:）即用你自己的球员照片替换上面的背景主题；留空恢复。',
      'image.placeholder': 'https://…/player.jpg',
      'image.apply': '应用',
      'image.clear': '清除'
    }

    const en = {
      'kit.title': 'Kit colour',
      'kit.hint': 'Home red: deep-red canvas that follows the system theme. Away white: paper-white canvas that ignores it.',
      'kit.red': 'Home red · deep-red canvas',
      'kit.white': 'Away white · paper-white canvas',
      'backdrop.title': 'Backdrop',
      'backdrop.hint': 'Real match photo / player shirt / squad number wall / Allianz Arena / plain.',
      'backdrop.photo': 'Real match photo (current player)',
      'backdrop.jersey': 'Player shirt (back, number + name)',
      'backdrop.squad': 'Squad number wall (16-man first team)',
      'backdrop.stadium': 'Allianz Arena (light band, crowd, turf)',
      'backdrop.plain': 'Plain (club palette only)',
      'player.title': 'Backdrop player',
      'player.hint': 'Which Bayern player stars in the backdrop; the shirt and stadium themes print his number and name.',
      'accent.title': 'Accent colour',
      'accent.hint': 'Club colour used by buttons, focus rings, selection and the backdrop glow.',
      'accent.red': 'Bayern red #DC052D',
      'accent.crimson': 'Deep red #8B0F22',
      'accent.blue': 'Bayern blue #0066B2',
      'accent.gold': 'Champions gold #C9A227',
      'image.title': 'Custom backdrop image',
      'image.hint': 'Paste an image URL (http(s) or data:) to use your own player photo instead of the backdrop above; empty restores it.',
      'image.placeholder': 'https://…/player.jpg',
      'image.apply': 'Apply',
      'image.clear': 'Clear'
    }

    PLAYERS.forEach((player) => {
      zh['player.p' + player.n] = `${player.n} ${player.cn} ${player.name}`
      en['player.p' + player.n] = `${player.n} ${player.name} (${player.cn})`
    })

    /* ------------------------------------------------------------------ *
     * Skin state                                                          *
     * ------------------------------------------------------------------ */
    function isDark() {
      return !!(document.body && document.body.hasAttribute('data-ds-dark-theme'))
    }

    function readState() {
      const rawBackdrop = readStorage(KEY_PREFIX + 'backdrop')
      const rawAccent = readStorage(KEY_PREFIX + 'accent')
      const rawKit = readStorage(KEY_PREFIX + 'kit')
      const rawPlayer = Number(readStorage(KEY_PREFIX + 'player'))
      const rawImage = readStorage(KEY_PREFIX + 'image')
      const playerOk = PLAYERS.some((player) => player.n === rawPlayer)
      return {
        backdrop: BACKDROPS.indexOf(rawBackdrop) !== -1 ? rawBackdrop : DEFAULT_STATE.backdrop,
        kit: KITS.indexOf(rawKit) !== -1 ? rawKit : DEFAULT_STATE.kit,
        player: playerOk ? rawPlayer : DEFAULT_STATE.player,
        accent: ACCENTS.indexOf(rawAccent) !== -1 ? rawAccent : DEFAULT_STATE.accent,
        image: typeof rawImage === 'string' ? rawImage.trim() : ''
      }
    }

    /**
     * Whether the canvas is drawn dark: the away white kit is paper-white
     * whatever the system theme says, the home red kit follows it.
     */
    function canvasDark(kit) {
      if (kit === 'white') return false
      return isDark()
    }

    /** Scrim laid over a real photo so interface text keeps its contrast. */
    function scrimFor(kit) {
      return canvasDark(kit)
        ? 'linear-gradient(180deg, rgba(10, 10, 16, 0.58) 0%, rgba(10, 10, 16, 0.24) 45%, rgba(10, 10, 16, 0.76) 100%)'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.44) 0%, rgba(255, 255, 255, 0.12) 45%, rgba(255, 255, 255, 0.72) 100%)'
    }

    /**
     * Project the current state onto the document: body attributes for the CSS
     * variants, one inline custom property carrying the generated backdrop and
     * one carrying the photo scrim.
     */
    function project(state) {
      const body = document.body
      if (!body) return
      body.setAttribute('data-dsh-bayern', '')
      body.setAttribute('data-dsh-bayern-backdrop', state.backdrop)
      body.setAttribute('data-dsh-bayern-kit', state.kit)
      body.setAttribute('data-dsh-bayern-accent', state.accent)
      body.setAttribute('data-dsh-bayern-player', String(state.player))
      let image = 'none'
      let scrim = 'none'
      if (state.image) {
        const safe = state.image.replace(/"/g, '%22').replace(/\s/g, '%20').replace(/'/g, '%27')
        image = 'url("' + safe + '")'
        scrim = scrimFor(state.kit)
      } else {
        image = backdropUrl(state.backdrop, playerOf(state.player), canvasDark(state.kit), state.accent)
        if (state.backdrop === 'photo' && photoOf(state.player)) scrim = scrimFor(state.kit)
      }
      body.style.setProperty('--dsh-bayern-image', image)
      body.style.setProperty('--dsh-bayern-scrim', scrim)
    }

    function clearProjection() {
      const body = document.body
      if (!body) return
      body.removeAttribute('data-dsh-bayern')
      body.removeAttribute('data-dsh-bayern-backdrop')
      body.removeAttribute('data-dsh-bayern-kit')
      body.removeAttribute('data-dsh-bayern-accent')
      body.removeAttribute('data-dsh-bayern-player')
      body.style.removeProperty('--dsh-bayern-image')
      body.style.removeProperty('--dsh-bayern-scrim')
    }

    /**
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

    /**
     * Apply the Bayern skin: body attributes, generated backdrop, style tag,
     * document title, and the four Settings → General rows. Every write is
     * retracted by the effect disposer.
     * @param ctx - owning context (the effect lifecycle owns retraction).
     */
    function apply(ctx) {
      const body = document.body
      const originalTitle = document.title
      let state = readState()

      const style = document.createElement('style')
      style.id = STYLE_ID
      style.dataset.skinChrome = 'bayern-style'
      style.textContent = CSS
      document.head.appendChild(style)

      project(state)
      document.title = SKIN_TITLE

      // The native palette switch rewrites body[data-ds-dark-theme]; redraw the
      // backdrop so a light canvas never carries the dark drawing.
      const observer = typeof MutationObserver === 'function'
        ? new MutationObserver(() => project(state))
        : null
      if (observer) observer.observe(body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })

      ctx.effect(() => () => {
        if (observer) observer.disconnect()
        clearProjection()
        const el = document.getElementById(STYLE_ID)
        if (el) el.remove()
        // Only restore when the skin's own title still stands — a session title
        // projected by the shell must not be clobbered by teardown.
        if (document.title === SKIN_TITLE) document.title = originalTitle
      }, 'ui-skin-bayern: Bayern chrome')

      if (ctx.slots && ctx.locale) {
        ctx.effect(() => ctx.locale.register(SETTINGS_NS, { zh, en }), 'ui-skin-bayern: settings locale')

        let revision = 0
        const bindings = []

        const snapshot = () => ({
          backdrop: state.backdrop,
          kit: state.kit,
          player: state.player,
          accent: state.accent,
          image: state.image
        })

        const broadcast = () => {
          revision += 1
          const next = snapshot()
          bindings.forEach((binding) => binding.sync(next, revision))
        }

        const makeStore = () => _store.defineStore({
          init: () => Object.assign({ revision: -1 }, snapshot()),
          actions: {
            sync: (draft, next, rev) => {
              if (rev <= draft.revision) return
              draft.revision = rev
              draft.backdrop = next.backdrop
              draft.kit = next.kit
              draft.player = next.player
              draft.accent = next.accent
              draft.image = next.image
            }
          }
        })

        const commit = (patch) => {
          state = Object.assign({}, state, patch)
          if ('backdrop' in patch) writeStorage(KEY_PREFIX + 'backdrop', state.backdrop)
          if ('kit' in patch) writeStorage(KEY_PREFIX + 'kit', state.kit)
          if ('player' in patch) writeStorage(KEY_PREFIX + 'player', String(state.player))
          if ('accent' in patch) writeStorage(KEY_PREFIX + 'accent', state.accent)
          if ('image' in patch) writeStorage(KEY_PREFIX + 'image', state.image ? state.image : null)
          project(state)
          broadcast()
        }

        const store = makeStore()
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

    exports.inject = ['slots', 'locale']
    exports.apply = apply
    return module.exports
  },
})
