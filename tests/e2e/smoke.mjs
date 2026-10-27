/**
 * Duman testleri: herkese açık sayfalar, formlar ve giriş sayfaları.
 * Kullanım: önce `npm run build && npm start` (ya da BASE_URL ile önizleme adresi), sonra `npm run test:e2e`.
 * Veritabanına yazmaz: form gönderimleri yakalanır, istek gövdesi kontrol edilir.
 */
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import path from 'node:path'

const require = createRequire(import.meta.url)
let pw
try {
  pw = require('playwright')
} catch {
  pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))
}

const BASE = process.env.BASE_URL || 'http://localhost:3123'
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await pw.chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const consoleErrors = []
page.on('console', (m) => {
  // ALLOW_DB_ERRORS=1: veritabanına erişilemeyen ortamlarda (yerel sandbox) veri yükleme hataları beklenir
  const dbError = process.env.ALLOW_DB_ERRORS === '1' && /alınamadı|yüklenemedi/.test(m.text())
  if (m.type() === 'error' && !dbError && !/Failed to load resource|_next\/image|images\.unsplash/.test(m.text())) consoleErrors.push(`${page.url()} :: ${m.text()}`)
})
page.on('pageerror', (e) => consoleErrors.push(`${page.url()} :: ${e.message}`))
await page.route('**/_next/image**', (r) => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>' }))

async function visit(url) {
  const res = await page.goto(BASE + url, { waitUntil: 'networkidle' })
  return res?.status() ?? 0
}
const text = () => page.evaluate(() => document.body.innerText)

// 1) Sayfalar açılıyor mu, beklenen başlıklar var mı
const pages = [
  ['/', 'Zihnin, beslenmen ve bedenin için doğru uzman.'],
  ['/diyetisyen', 'Beslenmeni hayatına uyan'],
  ['/kisisel-antrenor', 'antrenman'],
  ['/eslesme', 'Doğru psikoloğu aramak senin işin olmasın.'],
  ['/eslesme?meslek=diyetisyen', 'Sana uygun diyetisyeni birlikte bulalım.'],
  ['/eslesme?meslek=antrenor', 'Sana uygun antrenörü birlikte bulalım.'],
  ['/uzman-basvuru', 'Danışanını düşün.'],
  ['/uzman-basvuru?meslek=diyetisyen', 'Beslenme ve Diyetetik'],
  ['/uzman-basvuru?meslek=antrenor', 'diyet listesi hazırlamaz'],
  ['/uzmanlar', 'Onaylı psikologlar'],
  ['/uzmanlar?meslek=diyetisyen', 'Onaylı diyetisyenler'],
  ['/uzmanlar?meslek=antrenor', 'Onaylı kişisel antrenörler'],
  ['/hakkimizda', 'diyetisyen'],
  ['/sss', 'Antrenörle salonda da çalışabilir miyim?'],
  ['/danisan-girisi', 'Tüm görüşmelerin tek yerde.'],
  ['/expert/login', 'Uzman girişi'],
  ['/psikolojik-testler', 'nasıl hissettiğine'],
  ['/supervizyon', 'İyi terapist de birine danışır.'],
]
for (const [url, expected] of pages) {
  const status = await visit(url)
  const body = await text()
  check(`${url} açılıyor (200)`, status === 200, `durum ${status}`)
  check(`${url} beklenen metni içeriyor`, body.includes(expected), expected)
  check(`${url} "panel" kelimesi yok`, !/\bpanel/i.test(body))
}

// 2) Eski sayfa yönlendirmesi
await visit('/psikolog-basvuru')
check('/psikolog-basvuru → /uzman-basvuru', page.url().endsWith('/uzman-basvuru'), page.url())

// 3) Diyetisyen/antrenör sayfalarında psikolog ifadeleri sızmıyor
for (const url of ['/diyetisyen', '/kisisel-antrenor', '/eslesme?meslek=diyetisyen', '/eslesme?meslek=antrenor']) {
  await visit(url)
  const body = await text()
  check(`${url} psikolog formu ifadeleri yok`, !/Psikolog tercihin|Kadın psikolog|Seni en çok zorlayan konu/.test(body))
}

// 4) Formlar mesleğe göre alan gösteriyor ve doğru veri gönderiyor
async function fillAndCapture(url, extra) {
  await visit(url)
  let captured = null
  await page.route('**/api/eslesme', async (route) => {
    captured = JSON.parse(route.request().postData() || '{}')
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  await page.fill('input[name=name]', 'Test Danışan')
  await page.fill('input[name=phone]', '05000000000')
  await page.fill('input[name=email]', 'test@example.com')
  for (const name of ['age', 'topic', 'duration', 'previousSupport', 'startTime', 'preference']) {
    await page.selectOption(`select[name=${name}]`, { index: 1 })
  }
  await page.check('input[name=availability] >> nth=0')
  if (extra) await extra()
  await page.click('button[type=submit]')
  await page.waitForTimeout(600)
  await page.unroute('**/api/eslesme')
  return captured
}

{
  await visit('/eslesme')
  check('psikolog formunda sağlık sorusu yok', (await page.locator('input[name=healthScreen]').count()) === 0)
  const payload = await fillAndCapture('/eslesme')
  check('psikolog formu meslek=psychologist gönderiyor', payload?.profession === 'psychologist', JSON.stringify(payload?.profession))
  check('başarı mesajı görünüyor', (await text()).includes('Başvurun alındı'))
}
{
  await visit('/eslesme?meslek=diyetisyen')
  check('diyetisyen formunda sağlık sorusu var', (await page.locator('input[name=healthScreen]').count()) === 3)
  check('diyetisyen formunda antrenman yeri sorusu yok', (await page.locator('input[name=setting]').count()) === 0)
  const payload = await fillAndCapture('/eslesme?meslek=diyetisyen', () => page.check('input[name=healthScreen][value="Hayır"]'))
  check('diyetisyen formu doğru gönderiyor', payload?.profession === 'dietitian' && payload?.healthScreen === 'Hayır', JSON.stringify({ p: payload?.profession, h: payload?.healthScreen }))
}
{
  await visit('/eslesme?meslek=antrenor')
  check('antrenör formunda antrenman yeri sorusu var', (await page.locator('input[name=setting]').count()) === 3)
  const payload = await fillAndCapture('/eslesme?meslek=antrenor', async () => {
    await page.check('input[name=healthScreen][value="Emin değilim"]')
    await page.check('input[name=setting][value="Salonda"]')
  })
  check('antrenör formu doğru gönderiyor', payload?.profession === 'trainer' && payload?.setting === 'Salonda' && payload?.healthScreen === 'Emin değilim', JSON.stringify({ p: payload?.profession, s: payload?.setting }))
}
{
  // Sağlık sorusu boşsa form gönderilmemeli (zorunlu)
  await visit('/eslesme?meslek=diyetisyen')
  let called = false
  await page.route('**/api/eslesme', (r) => { called = true; r.fulfill({ status: 200, body: '{"ok":true}' }) })
  await page.fill('input[name=name]', 'Test')
  await page.fill('input[name=phone]', '05000000000')
  await page.fill('input[name=email]', 'test@example.com')
  for (const name of ['age', 'topic', 'duration', 'previousSupport', 'startTime', 'preference']) await page.selectOption(`select[name=${name}]`, { index: 1 })
  await page.check('input[name=availability] >> nth=0')
  await page.click('button[type=submit]')
  await page.waitForTimeout(400)
  await page.unroute('**/api/eslesme')
  check('sağlık sorusu boşken gönderilmiyor', !called)
}

// 5) Uzman başvurusu
async function applyCapture(url, setup) {
  await visit(url)
  let captured = null
  await page.route('**/api/uzman-basvuru', async (route) => {
    captured = JSON.parse(route.request().postData() || '{}')
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  await page.fill('input[name=name]', 'Test Uzman')
  await page.fill('input[name=phone]', '05000000000')
  await page.fill('input[name=email]', 'uzman@example.com')
  await page.fill('input[name=title]', 'Unvan')
  if (setup) await setup()
  await page.check('input[name=areas] >> nth=0')
  await page.selectOption('select[name=experience]', { index: 1 })
  await page.selectOption('select[name=online]', { index: 1 })
  await page.fill('input[name=price]', '1000')
  await page.check('input[name=availability] >> nth=0')
  await page.fill('textarea[name=expectation]', 'Test')
  await page.click('button[type=submit]')
  await page.waitForTimeout(600)
  await page.unroute('**/api/uzman-basvuru')
  return captured
}
{
  await visit('/uzman-basvuru?meslek=antrenor')
  check('antrenör başvurusunda "yalnızca süpervizyon" seçeneği yok', !(await text()).includes('Yalnızca süpervizyon'))
  const areas = await page.locator('input[name=areas]').evaluateAll((els) => els.map((e) => e.value))
  check('antrenör uzmanlık alanlarında salon programı var', areas.includes('Salon programı'))
  const payload = await applyCapture('/uzman-basvuru?meslek=antrenor')
  check('antrenör başvurusu meslek=trainer gönderiyor', payload?.profession === 'trainer' && payload?.account_type === 'therapist')
}
{
  const payload = await applyCapture('/uzman-basvuru?meslek=diyetisyen')
  check('diyetisyen başvurusu meslek=dietitian gönderiyor', payload?.profession === 'dietitian')
  await visit('/uzman-basvuru')
  check('psikolog başvurusunda süpervizyon seçeneği var', (await text()).includes('Yalnızca süpervizyon'))
}

// 6) Meslek sekmeleri arasında geçiş
await visit('/eslesme')
await page.click('nav[aria-label="Hizmet seç"] >> text=Diyetisyen')
await page.waitForURL(/meslek=diyetisyen/)
check('eşleşme formunda sekmeyle meslek değişiyor', (await text()).includes('Sana uygun diyetisyeni'))

// 7) Ana sayfadaki hizmet kartları doğru yere gidiyor
await visit('/')
const hrefs = await page.locator('a').evaluateAll((els) => els.map((e) => e.getAttribute('href')))
for (const h of ['/eslesme?meslek=diyetisyen', '/eslesme?meslek=antrenor', '/diyetisyen', '/kisisel-antrenor', '/uzman-basvuru?meslek=antrenor']) {
  check(`ana sayfada ${h} bağlantısı var`, hrefs.includes(h))
}

// 8) Telefon görünümü: yatay kaydırma yok
await page.setViewportSize({ width: 390, height: 844 })
for (const url of ['/', '/diyetisyen', '/kisisel-antrenor', '/eslesme?meslek=antrenor', '/danisan-girisi', '/expert/login', '/uzman-basvuru?meslek=diyetisyen']) {
  await visit(url)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check(`${url} telefonda taşma yok`, overflow <= 1, `${overflow}px`)
}

check('konsolda JavaScript hatası yok', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '))

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} kontrol geçti`)
process.exit(failed.length ? 1 : 0)
