/**
 * Drives the running dev server in a headless browser to prove the lessons
 * actually render. Run with the dev server up:  node scripts/smoke.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const URL = process.env.APP_URL ?? 'http://localhost:5173'
const OUT = 'screenshots'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 900, height: 1150 } })

const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

// Track the recorded clips: a 404 here would silently drop the app back to
// robotic browser speech, which is exactly what the audio work was to avoid.
const audioHits = []
page.on('response', (r) => {
  if (r.url().includes('/audio/')) audioHits.push({ status: r.status(), url: r.url() })
})

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  console.log(`  saved ${OUT}/${name}.png`)
}

console.log('0. onboarding')
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForSelector('.onboard-card')
await page.evaluate(() => document.fonts.ready)
await shot('00-onboard-welcome')
await page.locator('.btn', { hasText: "Let’s begin" }).click()

await page.waitForSelector('.name-input')
await page.fill('.name-input', 'Aisha')
await shot('00b-onboard-name')
await page.locator('.btn', { hasText: 'Next' }).click()

await page.waitForSelector('.age-chip')
await shot('00c-onboard-age')
await page.locator('.age-chip', { hasText: '6' }).first().click()

await page.waitForSelector('.avatar-choice')
await shot('00d-onboard-avatar')
await page.locator('.avatar-choice', { hasText: 'Girl' }).click()

console.log('1. home screen')
await page.waitForSelector('.lesson-grid .lesson-card')
console.log('   greeting:', (await page.locator('.greeting-name').innerText()).trim())
// Lesson cards enter on a 60ms-per-card stagger; let them settle before shooting.
await page.waitForTimeout(1100)
await shot('01-home')
console.log('   lessons:', await page.locator('.lesson-card h2').allInnerTexts())

console.log('2. open "Write the Letters"')
await page.locator('.lesson-card', { hasText: 'Write the Letters' }).click()
await page.waitForSelector('.letter-tile')
console.log('   letter tiles:', await page.locator('.letter-tile').count())
await shot('02-alphabet')

console.log('3. pick a letter -> tracing canvas')
await page.locator('.letter-tile').nth(1).click() // baa
await page.waitForSelector('.canvas-stage canvas.ink-layer')
await page.waitForTimeout(900) // let fonts.ready resolve and the guide paint

// The guide glyph is painted to a canvas, so "did it render" means "does the
// canvas have non-transparent pixels", not "is an element present".
const guideInk = await page.evaluate(() => {
  const c = document.querySelector('canvas.guide-layer')
  if (!c) return null
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let n = 0
  for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++
  return { w: c.width, h: c.height, inkPixels: n }
})
console.log('   guide canvas:', JSON.stringify(guideInk))
await shot('03-trace-empty')

console.log('4. trace the letter with a simulated finger')
const box = await page.locator('canvas.ink-layer').boundingBox()
// Rough right-to-left sweep across the middle, the way baa is written.
await page.mouse.move(box.x + box.width * 0.74, box.y + box.height * 0.46)
await page.mouse.down()
for (let i = 0; i <= 20; i++) {
  const p = i / 20
  await page.mouse.move(
    box.x + box.width * (0.74 - 0.48 * p),
    box.y + box.height * (0.46 + 0.1 * Math.sin(p * Math.PI)),
  )
}
await page.mouse.up()
await page.locator('button', { hasText: 'Check my writing' }).click()
await page.waitForTimeout(400)
console.log('   feedback:', (await page.locator('.feedback').innerText()).replace(/\n/g, ' | '))
await shot('04-trace-scored')

console.log('5. recorded audio')
await page.locator('button', { hasText: 'Listen' }).click()
await page.waitForTimeout(1200)
const audioState = await page.evaluate(() => {
  const el = [...document.querySelectorAll('audio')][0]
  // Audio elements created via `new Audio()` aren't in the DOM, so ask the
  // element the app is actually holding by probing one it has fetched.
  return el ? { src: el.currentSrc, duration: el.duration } : null
})
console.log('   audio requests:', JSON.stringify(audioHits))
console.log('   in-DOM audio element:', JSON.stringify(audioState))

console.log('6. reading lesson')
await page.locator('.icon-btn.back-arrow').click()
await page.locator('.icon-btn.back-arrow').click()
await page.locator('.lesson-card', { hasText: 'Read Words' }).click()
await page.waitForSelector('.read-card')
await shot('05-reading')
await page.locator('.tab', { hasText: "Qur'an Words" }).click()
await page.waitForTimeout(300)
await shot('06-quran-words')

console.log('7. letters-in-words lesson')
await page.locator('.icon-btn.back-arrow').click()
await page.locator('.lesson-card', { hasText: 'Letters in Words' }).click()
await page.locator('.letter-tile').nth(11).click() // seen — connects on both sides
await page.waitForSelector('.forms-grid')
await shot('07-forms')

console.log('8. Qur’an: surah list')
// Step 7 left us in the letter-forms detail: one back to the grid, one to home.
await page.locator('.icon-btn.back-arrow').click()
await page.locator('.icon-btn.back-arrow').click()
await page.locator('.lesson-card', { hasText: 'Qur' }).click()
await page.waitForSelector('.surah-card')
console.log('   surah cards:', await page.locator('.surah-card').count())
await shot('09-surah-list')

console.log('9. Qur’an: reader with tajweed colours')
// An-Nas (114) is short and exercises 6 different tajweed rules.
await page.locator('.surah-card', { hasText: 'An-Nas' }).last().click()
await page.waitForSelector('.ayah-text .tj')
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(500)

const tajweed = await page.evaluate(() => {
  const spans = [...document.querySelectorAll('.ayah-text .tj')]
  const colours = new Set(spans.map((s) => getComputedStyle(s).color))
  // Letters must keep joining across span boundaries. If a span were a
  // non-empty box, the browser would break shaping and the glyphs would
  // render in isolated form -- so assert the boxes really are empty.
  const boxy = spans.filter((s) => {
    const c = getComputedStyle(s)
    return (
      c.display !== 'inline' ||
      parseFloat(c.paddingLeft) + parseFloat(c.paddingRight) > 0 ||
      parseFloat(c.marginLeft) + parseFloat(c.marginRight) > 0 ||
      parseFloat(c.borderLeftWidth) + parseFloat(c.borderRightWidth) > 0
    )
  })
  return { spans: spans.length, distinctColours: colours.size, shapingBreakers: boxy.length }
})
console.log('   tajweed spans:', JSON.stringify(tajweed))
console.log('   ayahs:', await page.locator('.ayah').count())
await shot('10-quran-reader')

console.log('10. tajweed legend + rule sheet')
await page.locator('.pill', { hasText: 'Tajweed colours' }).click()
await page.waitForSelector('.legend-item')
console.log('   legend rules:', await page.locator('.legend-item').count())
await page.locator('.ayah-text .tj').first().click()
await page.waitForSelector('.sheet')
console.log('   rule sheet:', (await page.locator('.sheet h3').innerText()).trim())
await shot('11-tajweed-legend')
await page.locator('.sheet .btn').click()

console.log('11. translation fetch')
await page.locator('.pill', { hasText: 'Translation' }).click()
await page.waitForSelector('.ayah-translation', { timeout: 15000 }).catch(() => null)
const trCount = await page.locator('.ayah-translation').count()
console.log('   translated ayahs shown:', trCount)
await shot('12-translation')

console.log('12. Arabic UI toggle')
await page.locator('button[aria-label="Switch language"]').click()
await page.waitForTimeout(400)
console.log('   dir =', await page.evaluate(() => document.documentElement.dir))
await shot('08-arabic-rtl')

const badAudio = audioHits.filter((h) => h.status !== 200 && h.status !== 206)
console.log(
  `\nAudio: ${audioHits.length} request(s), ${badAudio.length} failed` +
    (badAudio.length ? `\n${badAudio.map((b) => `  ${b.status} ${b.url}`).join('\n')}` : ''),
)
console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'No console errors.')
await browser.close()
process.exit(errors.length || badAudio.length || audioHits.length === 0 ? 1 : 0)
