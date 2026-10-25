// Mindora Instagram görsel üretici
// Kullanım: node marketing/instagram/render.mjs marketing/instagram/weeks/2026-W44.json
// Her gönderinin slaytlarını 1080x1350 PNG olarak weeks/<hafta>/ klasörüne yazar.
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// Playwright projede bağımlılık değil; yüklü olan kopyayı bul
async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    const require = createRequire(import.meta.url)
    const globalRoot = execSync('npm root -g').toString().trim()
    return require(path.join(globalRoot, 'playwright'))
  }
}
const { chromium } = await loadPlaywright()
const specPath = path.resolve(process.argv[2] || '')
if (!fs.existsSync(specPath)) {
  console.error('Hafta dosyası bulunamadı:', specPath)
  process.exit(1)
}
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'))
const outDir = specPath.replace(/\.json$/, '')
fs.mkdirSync(outDir, { recursive: true })

// setContent ile açılan sayfa file:// kaynaklarını yükleyemiyor; yazı tipleri ve logo gömülü
const font = (f) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(here, 'fonts', f)).toString('base64')
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(here, 'logo.png')).toString('base64')

const THEMES = {
  pine: { bg: '#1f3d34', fg: '#ffffff', muted: 'rgba(255,255,255,0.72)', accent: '#c9bdf0', chip: 'rgba(255,255,255,0.1)' },
  lilac: { bg: '#2b2245', fg: '#ffffff', muted: 'rgba(255,255,255,0.72)', accent: '#b8e0d2', chip: 'rgba(255,255,255,0.1)' },
  cream: { bg: '#f4f6f3', fg: '#1b2a25', muted: '#4c5c56', accent: '#254a3f', chip: '#e3ece7' },
  mint: { bg: '#e6f1ec', fg: '#16302a', muted: '#41564f', accent: '#5b47a0', chip: '#ffffff' },
}

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const rich = (s = '') => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')

function thread(theme, tall = false) {
  const dark = theme === 'pine' || theme === 'lilac'
  // Çizgi metnin altından geçsin diye alt bölgede tutuluyor
  const d = tall
    ? 'M-40 1780 C 220 1600, 440 1880, 660 1690 S 1000 1540, 1140 1620'
    : 'M-40 1270 C 240 1110, 460 1340, 700 1180 S 1010 1060, 1140 1130'
  return `<svg class="thread" viewBox="0 0 1080 ${tall ? 1920 : 1350}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#b6a6dd"/><stop offset="100%" stop-color="#8fd4bd"/></linearGradient></defs>
    <path d="${d}" fill="none" stroke="url(#g)" stroke-width="6" stroke-linecap="round" opacity="${dark ? 0.55 : 0.8}"/>
  </svg>`
}

function slideHtml(slide, index, total, post) {
  const theme = THEMES[slide.theme || post.theme || 'cream']
  const t = slide.theme || post.theme || 'cream'
  const counter = total > 1 ? `<div class="counter">${index + 1}/${total}</div>` : ''
  let body = ''

  if (slide.type === 'cover') {
    body = `
      ${slide.kicker ? `<div class="kicker">${esc(slide.kicker)}</div>` : ''}
      <h1 class="title">${rich(slide.title)}</h1>
      ${slide.subtitle ? `<p class="subtitle">${rich(slide.subtitle)}</p>` : ''}
      ${total > 1 ? `<div class="swipe">Kaydır →</div>` : ''}`
  } else if (slide.type === 'point') {
    body = `
      ${slide.number ? `<div class="number">${esc(slide.number)}</div>` : ''}
      <h2 class="heading">${rich(slide.heading)}</h2>
      <p class="text">${rich(slide.text)}</p>`
  } else if (slide.type === 'mythfact') {
    body = `
      <div class="myth"><span class="tag tag-myth">Mit</span><p>${rich(slide.myth)}</p></div>
      <div class="fact"><span class="tag tag-fact">Gerçek</span><p>${rich(slide.fact)}</p></div>`
  } else if (slide.type === 'quote') {
    body = `<p class="quote">${rich(slide.text)}</p>${slide.caption ? `<p class="text small">${rich(slide.caption)}</p>` : ''}`
  } else if (slide.type === 'lines') {
    body = `${slide.kicker ? `<div class="kicker">${esc(slide.kicker)}</div>` : ''}<div class="lines">${(slide.lines || [])
      .map((line, i) => `<p class="line${line.accent ? ' accent' : ''}" style="--i:${i}">${rich(line.text)}</p>`)
      .join('')}</div>`
  } else if (slide.type === 'poll') {
    body = `<h2 class="heading">${rich(slide.heading)}</h2>${slide.text ? `<p class="text">${rich(slide.text)}</p>` : ''}<div class="sticker-space">${esc(slide.sticker || 'Anket çıkartması buraya')}</div>`
  } else if (slide.type === 'cta') {
    body = `
      <h2 class="heading">${rich(slide.heading)}</h2>
      ${slide.text ? `<p class="text">${rich(slide.text)}</p>` : ''}
      <div class="button">${esc(slide.button || 'Ücretsiz eşleşmeyi başlat')}</div>
      <p class="url">${esc(slide.url || 'Bağlantı profilde')}</p>`
  }

  const footnote = slide.footnote || post.footnote
  const fmt = post.format === 'reel' || post.format === 'story' ? 'tall' : 'feed'
  return `<section class="slide ${fmt} ${t} ${slide.type}" style="--bg:${theme.bg};--fg:${theme.fg};--muted:${theme.muted};--accent:${theme.accent};--chip:${theme.chip}">
    <div class="glow"></div>
    ${thread(t, post.format === 'reel' || post.format === 'story')}
    <header><div class="brand"><img src="${logo}" alt=""/><span>mindora</span></div>${counter}</header>
    <main>${body}</main>
    <footer>${footnote ? `<p class="footnote">${rich(footnote)}</p>` : '<span></span>'}<span class="handle">@mindora.live</span></footer>
  </section>`
}

const css = `
@font-face { font-family: Onest; src: url(${font('onest-latin-wght-normal.woff2')}) format('woff2'); font-weight: 100 900; }
@font-face { font-family: Onest; src: url(${font('onest-latin-ext-wght-normal.woff2')}) format('woff2'); font-weight: 100 900; unicode-range: U+0100-024F, U+1E00-1EFF; }
@font-face { font-family: Bricolage; src: url(${font('bricolage-grotesque-latin-wght-normal.woff2')}) format('woff2'); font-weight: 200 800; }
@font-face { font-family: Bricolage; src: url(${font('bricolage-grotesque-latin-ext-wght-normal.woff2')}) format('woff2'); font-weight: 200 800; unicode-range: U+0100-024F, U+1E00-1EFF; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 1080px; }
.slide { position: relative; width: 1080px; height: 1350px; overflow: hidden; background: var(--bg); color: var(--fg); font-family: Onest, sans-serif; display: flex; flex-direction: column; padding: 84px 88px; }
.glow { position: absolute; inset: 0; background: radial-gradient(55% 45% at 85% 8%, rgba(201,189,240,0.35), transparent 70%), radial-gradient(50% 40% at 5% 100%, rgba(143,212,189,0.28), transparent 70%); }
.cream .glow, .mint .glow { background: radial-gradient(55% 45% at 85% 8%, rgba(201,189,240,0.55), transparent 70%), radial-gradient(50% 40% at 5% 100%, rgba(143,212,189,0.45), transparent 70%); }
.thread { position: absolute; inset: 0; width: 100%; height: 100%; }
header, main, footer { position: relative; z-index: 1; }
header { display: flex; align-items: center; justify-content: space-between; }
.brand { display: flex; align-items: center; gap: 16px; font-family: Bricolage; font-size: 38px; font-weight: 600; letter-spacing: -0.5px; }
.brand img { width: 56px; height: 56px; border-radius: 14px; }
.counter { font-size: 26px; font-weight: 600; color: var(--muted); background: var(--chip); padding: 10px 22px; border-radius: 999px; }
main { flex: 1; display: flex; flex-direction: column; justify-content: center; }
footer { display: flex; align-items: flex-end; justify-content: space-between; gap: 40px; }
.handle { font-size: 26px; color: var(--muted); font-weight: 500; white-space: nowrap; }
.footnote { font-size: 22px; line-height: 1.45; color: var(--muted); max-width: 640px; }
.kicker { display: inline-block; align-self: flex-start; font-size: 28px; font-weight: 600; color: var(--accent); background: var(--chip); padding: 12px 26px; border-radius: 999px; margin-bottom: 44px; }
.title { font-family: Bricolage; font-weight: 600; font-size: 104px; line-height: 1.02; letter-spacing: -2px; }
.title strong, .heading strong { color: var(--accent); font-weight: 600; }
.subtitle { margin-top: 40px; font-size: 38px; line-height: 1.4; color: var(--muted); max-width: 860px; }
.swipe { margin-top: 64px; font-size: 30px; font-weight: 600; color: var(--accent); }
.number { font-family: Bricolage; font-size: 150px; font-weight: 600; line-height: 1; color: var(--accent); margin-bottom: 28px; }
.heading { font-family: Bricolage; font-weight: 600; font-size: 76px; line-height: 1.06; letter-spacing: -1.2px; }
.text { margin-top: 36px; font-size: 38px; line-height: 1.45; color: var(--muted); }
.text strong { color: var(--fg); }
.text.small { font-size: 30px; }
.myth, .fact { border-radius: 40px; padding: 48px 52px; }
.myth { background: var(--chip); }
.myth p { margin-top: 22px; font-size: 44px; line-height: 1.3; text-decoration: line-through; text-decoration-thickness: 3px; text-decoration-color: rgba(220,90,110,0.7); opacity: 0.85; }
.fact { margin-top: 28px; background: #ffffff; color: #1b2a25; }
.fact p { margin-top: 22px; font-size: 40px; line-height: 1.4; }
.tag { display: inline-block; font-size: 26px; font-weight: 700; padding: 8px 20px; border-radius: 999px; }
.tag-myth { background: rgba(220,90,110,0.15); color: #c2405a; }
.tag-fact { background: #e3ece7; color: #254a3f; }
.quote { font-family: Bricolage; font-size: 84px; line-height: 1.1; font-weight: 500; letter-spacing: -1px; }
.button { margin-top: 56px; align-self: flex-start; background: var(--fg); color: var(--bg); font-size: 36px; font-weight: 700; padding: 30px 52px; border-radius: 999px; }
.url { margin-top: 26px; font-size: 28px; color: var(--muted); }

.slide.tall { height: 1920px; padding: 150px 88px 170px; }
.tall .title { font-size: 112px; }
.lines .line { font-family: Bricolage; font-size: 84px; line-height: 1.08; font-weight: 600; letter-spacing: -1.2px; margin-top: 34px; }
.lines .line.accent { color: var(--accent); }
.reel .lines .line { opacity: 0; transform: translateY(40px); animation: rise 0.7s cubic-bezier(.2,.7,.2,1) forwards; animation-delay: calc(var(--i) * var(--step, 1.6s) + 0.3s); }
@keyframes rise { to { opacity: 1; transform: none; } }
.reel .thread path { stroke-dasharray: 1800; stroke-dashoffset: 1800; animation: draw 6s ease forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
.sticker-space { margin-top: 70px; border: 4px dashed var(--muted); border-radius: 40px; padding: 70px 40px; text-align: center; font-size: 32px; color: var(--muted); }
`

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch())
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
const { execFileSync } = await import('node:child_process')

for (const post of spec.posts) {
  const total = post.slides.length
  const tall = post.format === 'reel' || post.format === 'story'
  const height = tall ? 1920 : 1350

  if (post.format === 'reel') {
    // Tek slaytlık animasyon: kareleri çekip ffmpeg ile mp4 yapar
    const slide = post.slides[0]
    const fps = 24
    const seconds = post.seconds || 12
    const frameDir = path.join(outDir, `${post.id}-kareler`)
    fs.mkdirSync(frameDir, { recursive: true })
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${css}</style></head><body>${slideHtml(slide, 0, 1, post).replace('class="slide', 'class="reel slide').replace('style="--bg:', `style="--step:${post.step || 1.6}s;--bg:`)}</body></html>`
    await page.setContent(html, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()))
    for (let f = 0; f < fps * seconds; f += 1) {
      const ms = (f / fps) * 1000
      await page.evaluate((t) => document.getAnimations().forEach((a) => { a.currentTime = t }), ms)
      await page.screenshot({ path: path.join(frameDir, `${String(f).padStart(4, '0')}.png`), clip: { x: 0, y: 0, width: 1080, height: 1920 } })
    }
    const mp4 = path.join(outDir, `${post.id}.mp4`)
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(frameDir, '%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '20', '-movflags', '+faststart', mp4])
    fs.copyFileSync(path.join(frameDir, `${String(fps * seconds - 1).padStart(4, '0')}.png`), path.join(outDir, `${post.id}-kapak.png`))
    fs.rmSync(frameDir, { recursive: true, force: true })
    console.log('yazıldı', path.relative(process.cwd(), mp4))
  } else {
    for (let i = 0; i < total; i += 1) {
      const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${css}</style></head><body>${slideHtml(post.slides[i], i, tall ? 1 : total, post)}</body></html>`
      await page.setContent(html, { waitUntil: 'load' })
      await page.evaluate(() => document.fonts.ready)
      const file = path.join(outDir, `${post.id}-${String(i + 1).padStart(2, '0')}.png`)
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1080, height } })
      console.log('yazıldı', path.relative(process.cwd(), file))
    }
  }
  if (post.caption) {
    fs.writeFileSync(path.join(outDir, `${post.id}-metin.txt`), `${post.caption}\n\n${(post.hashtags || []).join(' ')}\n\nAlt metin: ${post.alt || ''}\n`)
  }
}

await browser.close()
