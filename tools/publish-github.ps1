<#
.SYNOPSIS
  Publish the release tree to GitHub and (optionally) open the marketplace PR.

.DESCRIPTION
  Three steps, each skippable if already done:
    1. create the repository (private=false) with the dsh-plugin topic
    2. push the local release repo to it
    3. fork awesome-dsh-plugin, add data/plugins/<owner>__<repo>.yml and open a PR

  Needs a GitHub Personal Access Token with the `repo` scope (classic) or
  Contents + Pull requests: write (fine-grained) for the target account.

.EXAMPLE
  pwsh -File tools/publish-github.ps1 -Token ghp_xxx -Owner yourname
  pwsh -File tools/publish-github.ps1 -Token ghp_xxx -Owner yourname -SkipMarket
#>
param(
  [Parameter(Mandatory = $true)][string]$Token,
  [string]$Owner = 'dirtywork22',
  [string]$Repo = 'dsh-client-ui-skin-bayern',
  [switch]$SkipMarket
)

$ErrorActionPreference = 'Stop'
$api = 'https://api.github.com'
$headers = @{
  Authorization          = "Bearer $Token"
  Accept                 = 'application/vnd.github+json'
  'X-GitHub-Api-Version' = '2022-11-28'
  'User-Agent'           = 'dsh-client-ui-skin-bayern-release'
}
$repoDir = Join-Path (Split-Path $PSScriptRoot -Parent) "release\$Repo"
if (-not (Test-Path (Join-Path $repoDir '.git'))) { throw "no git repo at $repoDir — run: node tools/prepare-release.mjs" }

function Api {
  param([string]$Method, [string]$Path, $Body)
  $params = @{ Method = $Method; Uri = "$api$Path"; Headers = $headers; TimeoutSec = 60 }
  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 6 -Compress)
    $params.ContentType = 'application/json'
  }
  try { return Invoke-RestMethod @params } catch {
    $detail = $_.Exception.Response.StatusCode.value__
    $text = $_.ErrorDetails.Message
    if ($detail -eq 404 -and $Method -eq 'GET') { return $null }
    throw "API $Method $Path -> $detail $text"
  }
}

Write-Host "== 1/3 repository =="
$who = Api GET '/user'
$login = $who.login
Write-Host "   authenticated as $login"
if ($login -ne $Owner) { Write-Host "   note: owner is '$Owner' but the token belongs to '$login' — will publish under '$login'"; $Owner = $login }

$existing = Api GET "/repos/$Owner/$Repo"
if ($existing) {
  Write-Host "   repository exists: $($existing.html_url)"
} else {
  $created = Api POST '/user/repos' @{
    name        = $Repo
    description = 'Bayern Munich skin for the dsh web GUI — home-red/away-white canvases, match-photo and drawn backdrops, 19 first-team players.'
    homepage    = ''
    private     = $false
    has_issues  = $true
    has_wiki    = $false
    topics      = @('dsh', 'dsh-plugin', 'deepseek-harness', 'skin', 'theme', 'bayern', 'football')
  }
  Write-Host "   created: $($created.html_url)"
}

Write-Host "== 2/3 push =="
git -C $repoDir remote remove origin 2>$null
git -C $repoDir remote add origin "https://$Owner`:$Token@github.com/$Owner/$Repo.git"
git -C $repoDir push -u origin main --force
git -C $repoDir remote set-url origin "https://github.com/$Owner/$Repo.git"
Write-Host "   pushed main -> https://github.com/$Owner/$Repo"

if ($SkipMarket) { Write-Host '== market PR skipped (-SkipMarket) =='; exit 0 }

Write-Host "== 3/3 marketplace PR =="
$upstream = 'awesome-dsh-plugin/awesome-dsh-plugin'
$mine = Api GET "/repos/$login/$($upstream.Split('/')[1])"
if (-not $mine) {
  Api POST "/repos/$upstream/forks" @{} | Out-Null
  Write-Host '   forked, waiting for it to appear…'
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 3
    $mine = Api GET "/repos/$login/$($upstream.Split('/')[1])"
    if ($mine) { break }
  }
  if (-not $mine) { throw 'fork did not appear in time' }
}
Write-Host "   fork: $($mine.html_url)"

$path = "data/plugins/$Owner`__$Repo.yml"
$entry = @"
url: https://github.com/$Owner/$Repo
name: $Owner/$Repo
category: theme
description:
  en: 'Bayern Munich skin for the dsh web GUI: home-red/away-white canvases, real match-photo backdrops for 19 first-team players plus drawn shirt, squad-wall, Allianz-Arena and plain backdrops, switchable player and accent colour.'
  zh: '拜仁慕尼黑主题的 dsh Web 皮肤：主场红/客场白双配色画布，19 名一线队球员的真实赛场照背景，外加球员球衣、阵容号码墙、安联球场、纯色四种程序绘制背景，可切换球员与强调色。'
"@
$bytes = [Text.Encoding]::UTF8.GetBytes($entry)
$content = [Convert]::ToBase64String($bytes)

$current = Api GET "/repos/$login/$($upstream.Split('/')[1])/contents/$path"
$body = @{
  message = "Add $Owner/$Repo (theme: Bayern Munich skin)"
  content = $content
  branch  = 'main'
}
if ($current) { $body.sha = $current.sha; $body.message = "Update $Owner/$Repo entry" }
Api PUT "/repos/$login/$($upstream.Split('/')[1])/contents/$path" $body | Out-Null
Write-Host "   wrote $path"

$prBody = @"
Adds **$Owner/$Repo** to `theme`.

- `package.json` declares the `dsh.bundle` manifest, so `dsh plugin --profile web add github:$Owner/$Repo` installs it
- browser-side skin bundle (`dsh.client.platform = web`), no host-side code, no build step
- remaps the shell's `--dsw-*` design tokens; five settings rows under Settings → General
- ships **no** third-party photography: match photos stay local and are fetched by the user (`tools/fetch-photos.mjs`); the bundled previews use the drawn backdrops
"@
$pr = Api POST "/repos/$upstream/pulls" @{
  title = "Add $Owner/$Repo (theme: Bayern Munich skin)"
  head  = "$login`:main"
  base  = 'main'
  body  = $prBody
}
Write-Host "   PR opened: $($pr.html_url)"
Write-Host ''
Write-Host 'done. note: the list requires the repository to be at least 1 day old before CI passes.'
