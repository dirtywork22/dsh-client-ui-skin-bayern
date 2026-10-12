/**
 * Build the public release tree (a clean git repo ready for GitHub) from this
 * working copy.
 *
 * What differs from the working copy:
 *   - lib/client.js ships with an EMPTY photo table: the match photos are press
 *     images whose rights stay with the original outlets, so they are not
 *     redistributed. tools/fetch-photos.mjs rebuilds them locally in one command.
 *   - preview/docs art is the drawn-backdrop set (no press photography).
 *   - package.json gets repository/keywords/author for the marketplace.
 *
 * The release tree doubles as the git working copy, so .git survives a rebuild.
 *
 * Usage: node tools/prepare-release.mjs [--owner githubUser] [--out path]
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const ownerArg = args.indexOf('--owner')
const OWNER = ownerArg >= 0 ? args[ownerArg + 1] : 'dirtywork22'
const outArg = args.indexOf('--out')
const OUT = outArg >= 0 ? args[outArg + 1] : join(root, 'release', 'dsh-client-ui-skin-bayern')
const REPO = 'dsh-client-ui-skin-bayern'
const REPO_URL = `https://github.com/${OWNER}/${REPO}`

// Rebuild in place, never touching .git.
if (existsSync(OUT)) {
  for (const name of readdirSync(OUT)) {
    if (name === '.git') continue
    rmSync(join(OUT, name), { recursive: true, force: true })
  }
} else {
  mkdirSync(OUT, { recursive: true })
}

/* ---- lib: strip the photo table --------------------------------------- */
const client = readFileSync(join(root, 'lib/client.js'), 'utf8')
const stripped = client.replace(
  /    \/\/ @@PHOTOS_START@@[\s\S]*?    \/\/ @@PHOTOS_END@@/,
  '    // @@PHOTOS_START@@\n    const PHOTOS = {}\n    // @@PHOTOS_END@@'
)
if (stripped === client) throw new Error('photo markers not found — refusing to ship the photo payload')
mkdirSync(join(OUT, 'lib'), { recursive: true })
writeFileSync(join(OUT, 'lib/client.js'), stripped)
cpSync(join(root, 'lib/index.js'), join(OUT, 'lib/index.js'))

/* ---- package.json ------------------------------------------------------ */
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
pkg.version = '0.3.0'
pkg.author = OWNER
// Keep the published description in sync with the shipped roster rather than
// inheriting whatever the working copy happens to say.
pkg.description = 'FC Bayern München skin for the dsh web GUI: home-red / away-white canvases, five backdrops (real match photo, drawn shirt, squad wall, Allianz-Arena, plain), 19 first-team players, 4 accent colours.'
pkg.homepage = `${REPO_URL}#readme`
pkg.repository = { type: 'git', url: `${REPO_URL}.git` }
pkg.bugs = { url: `${REPO_URL}/issues` }
pkg.keywords = [
  'dsh', 'dsh-plugin', 'dsh-client', 'deepseek-harness',
  'skin', 'theme', 'bayern', 'fcb', 'football', 'soccer'
]
pkg.files = ['lib', 'skin.json', 'cordis.patch.yml', 'README.md', 'LICENSE', 'preview', 'docs']
delete pkg.scripts
writeFileSync(join(OUT, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')

/* ---- plain copies ------------------------------------------------------ */
for (const file of ['skin.json', 'cordis.patch.yml', 'LICENSE']) {
  cpSync(join(root, file), join(OUT, file))
}

// Previews and catalogue art must not redistribute press photos: the public
// tree uses the drawn backdrops.
// Regenerate with: node tools/preview.mjs --art --out release-art
const artRoot = join(root, 'release-art')
if (!existsSync(join(artRoot, 'preview/dark.png'))) {
  throw new Error('missing release-art/ — run: node tools/preview.mjs --art --out release-art')
}
cpSync(join(artRoot, 'preview'), join(OUT, 'preview'), { recursive: true })
cpSync(join(artRoot, 'docs'), join(OUT, 'docs'), { recursive: true })

cpSync(join(root, 'tools'), join(OUT, 'tools'), {
  recursive: true,
  filter: (source) => !source.includes('.render-test') && !source.endsWith('.log')
})

/* ---- .gitignore -------------------------------------------------------- */
writeFileSync(join(OUT, '.gitignore'), [
  'node_modules/',
  'tools/.render-test/',
  'photos/_user/',
  'release/',
  'release-art/',
  '*.log',
  ''
].join('\n'))

/* ---- README ------------------------------------------------------------ */
const readme = `# ${REPO}

[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

拜仁慕尼黑（FC Bayern München）主题的 DSH Web 界面皮肤 —— 主场红 / 客场白双配色，
真实赛场球员照片背景，外加四种程序绘制的插画背景。全部通过 dsh 的 \`--dsw-*\` 设计 token
重映射，与 \`@pakiknowledge/dsh-client-ui-skin-claude\` 同构（一个 \`dsh.client.platform = web\`
的浏览器端 bundle）。

![暗色 · 主场红](preview/dark.png)
![亮色 · 客场白](preview/light.png)

## 特性

- **球衣配色（主场红 ⇄ 客场白）**：一键切换整个画布
  - 主场红：深红黑画布（跟随系统明暗，亮色时是暖红纸面）
  - 客场白：纸白画布，不随系统明暗变化
- **背景主题** 五档：\`photo\` 真实赛场照片 / \`jersey\` 球员球衣 / \`squad\` 阵容号码墙 /
  \`stadium\` 安联球场 / \`plain\` 纯色
- **19 名一线队球员**：诺伊尔 1、乌帕梅卡诺 2、金玟哉 3、塔 4、基米希 6、格纳布里 7、
  格雷茨卡 8、凯恩 9、萨内 10、科曼 11、迪亚斯 14、奥利塞 17、戴维斯 19、布朗 21、
  穆勒 25、莱默 27、赛巴里 34、穆夏拉 42、帕夫洛维奇 45
- **4 种强调色**：拜仁红 #DC052D / 深红 #8B0F22 / 拜仁蓝 #0066B2 / 冠军金 #C9A227
- **自定义背景图**：设置行里粘图片 URL 即可替换
- 亮 / 暗双主题跟随系统；侧栏毛玻璃、俱乐部色顶部细线、俱乐部色滚动条与选中色
- 照片缺失时优雅回退：某个球员没有照片，\`photo\` 主题会自动改用该球员的球衣插画

![插画背景](docs/backdrop-squad.png)
![安联球场](docs/backdrop-stadium.png)

## 安装

\`\`\`sh
# 从 GitHub 安装（推荐）
dsh plugin --profile web add github:${OWNER}/${REPO}

# 或发布到 npm 之后
dsh plugin --profile web add ${REPO}
\`\`\`

\`dsh plugin add\` 会自动把这个包登记进 profile 的 \`dsh.profile.bundles\`，
**不需要手改任何配置文件**；刷新页面即可看到皮肤。

想关掉皮肤时把它从 \`bundles\` 里去掉，或给对应的加载项加 \`disabled: true\`。

皮肤互斥：同一时刻只启用一个皮肤，启用本皮肤时给其它皮肤行加 \`disabled: true\`。

## 照片不随包分发

这个仓库**不含**任何球员照片：赛场照的版权属于原媒体 / 摄影师。安装后你是
「四种程序绘制的插画背景 + 空照片表」，两种方式补上照片：

\`\`\`sh
# 1) 一键抓取（从公开图片索引，排除图库 / 水印源，抓完自动嵌入并重新嵌入 bundle）
node tools/fetch-photos.mjs

# 2) 或者用你自己的图：把图片放进 photos/<球衣号码>.jpg
node tools/embed-photos.mjs
\`\`\`

\`embed-photos.mjs\` 会把 \`photos/\` 里的图片以 data URI 内联进 \`lib/client.js\`，
所以刷新页面即生效，不需要重新安装。照片仅供本地个人使用，请自行确认素材授权。

想用竖构图 / 海报当背景时，\`tools/from-image.mjs\` 可以完整保留原图内容
（两侧用图自身的模糊延伸填满 16:9）：

\`\`\`sh
node tools/from-image.mjs photos/_user/my-poster.jpg 42 --frame blur --keep-source
\`\`\`

## 设置（设置 → 通用）

1. **球衣配色** — 主场红 / 客场白
2. **背景主题** — 真实赛场照片 / 球员球衣 / 阵容号码墙 / 安联球场 / 纯色
3. **背景球员** — 19 名一线队球员
4. **强调色** — 拜仁红 / 深红 / 拜仁蓝 / 冠军金
5. **自定义背景图** — 粘 URL 应用，留空恢复

选择即时生效并保存在浏览器 localStorage。

> 这 5 行由**一次** slot 注册渲染，且只用原生 React 元素（\`<select>\` / \`<input>\`）。
> 设置面板会静默丢弃渲染时报错的行，改动设置行后跑一次 \`node tools/verify-settings.mjs\`
> 就能在真 React 渲染里发现问题。

## 工具

| 用途 | 命令 |
|---|---|
| 抓取球员照片 | \`node tools/fetch-photos.mjs\`（\`--only 9 42\` 指定号码，\`FORCE=1\` 覆盖） |
| 嵌入照片 | \`node tools/embed-photos.mjs\` |
| 生成预览图 | \`node tools/preview.mjs\`（\`--art\` 出插画版） |
| 设置面板自检 | \`node tools/verify-settings.mjs\` |
| 人脸留白自检 | \`python tools/facecheck.py 0.12\`（OpenCV 检出脸部并量化头顶空间） |
| 补顶部保护带 | \`python tools/headroom.py 0.15 [号码...]\`（头顶太贴边时自动下压） |
| 裁剪参考线 | \`node tools/safearea.mjs 0.12\`（标出页面会裁掉的区域，目视复核） |
| 重裁全部照片 | \`node tools/reframe.mjs\` |
| 用自己的图 | \`node tools/from-image.mjs <图片> <号码> --frame blur\\|plain\\|cover\` |
| 发布到 GitHub | \`pwsh -File tools/publish-github.ps1 -Token <PAT> -Owner <用户>\` |

隔离冒烟测试（另起实例在 3099 端口验证插件在真实启动流程里不报错）：

\`\`\`sh
dsh web --patch tools/smoke-overlay.yml --port 3099 --no-open
\`\`\`

## 许可

MIT（见 [LICENSE](LICENSE)）。插画背景全部是代码绘制的几何图形与文字，队徽为占位图形，
不含任何俱乐部官方素材；球员姓名与号码仅用于个人非商业的主题化描述，相关商标归其权利人所有。
`

writeFileSync(join(OUT, 'README.md'), readme)

/* ---- marketplace entry ------------------------------------------------- */
const entry = `url: ${REPO_URL}
name: ${OWNER}/${REPO}
category: theme
description:
  en: 'Bayern Munich skin for the dsh web GUI: home-red/away-white canvases, real match-photo backdrops for 19 first-team players plus drawn shirt, squad-wall, Allianz-Arena and plain backdrops, switchable player and accent colour.'
  zh: '拜仁慕尼黑主题的 dsh Web 皮肤：主场红/客场白双配色画布，19 名一线队球员的真实赛场照背景，外加球员球衣、阵容号码墙、安联球场、纯色四种程序绘制背景，可切换球员与强调色。'
`
mkdirSync(join(root, 'release'), { recursive: true })
writeFileSync(join(root, 'release', `${OWNER}__${REPO}.yml`), entry)

console.log(`release tree: ${OUT}`)
console.log(`market entry: ${join(root, 'release', `${OWNER}__${REPO}.yml`)}`)
console.log(`  submit as  : data/plugins/${OWNER}__${REPO}.yml  (category: theme)`)
console.log(`  client.js  : ${(stripped.length / 1024).toFixed(0)} KB (photos stripped)`)
