/**
 * Renders the iOS app icon and launch image.
 *
 *   node scripts/ios-assets.mjs
 *
 * The artwork below is a redraw of the Android launcher icon -- same gradient,
 * same mosque, same gold crescent -- so a family with an iPhone and an Android
 * tablet sees one app, not two. Its shapes come from `src/components/Mascot.tsx`
 * (`Dome` and `Crescent`), which is also what the app draws on screen.
 *
 * Two iOS rules drive the odd parts of this file:
 *
 * 1. An app icon may not have an alpha channel at all. App Store Connect
 *    rejects the upload with "Invalid Image - can't be transparent nor contain
 *    an alpha channel", and it rejects it *after* a full archive and upload, so
 *    it is an expensive thing to discover late. Every PNG writer that is easy
 *    to reach from Node -- including Playwright's own `screenshot()` and
 *    canvas `toDataURL` -- emits RGBA. So the pixels are rasterised in the
 *    browser and encoded here as PNG colour type 2 (truecolour, no alpha).
 * 2. Icons are masked to a squircle by iOS, so the artwork is drawn full-bleed
 *    with nothing important in the corners, and no rounded corners of its own.
 *    The Android PNG bakes its corners in; this one must not.
 */
import { chromium } from 'playwright'
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const OUT = 'ios/App/App/Assets.xcassets'

/* ------------------------------------------------------------- artwork -- */

/** Vertical gradient sampled from the Android icon: #16a37c at the top down to #0b5c48. */
const SKY = `
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#16a37c"/>
    <stop offset="1" stop-color="#0b5c48"/>
  </linearGradient>`

/**
 * The mosque, in a 192-unit square, positioned exactly where it sits in
 * `android/.../mipmap-xxxhdpi/ic_launcher.png`.
 */
const MOSQUE = `
  <circle cx="96" cy="50" r="5.5" fill="#f2a93b"/>
  <path d="M96 58c16.5 12.4 26 27.2 26 42H70c0-14.8 9.5-29.6 26-42z" fill="#fffdf6"/>
  <rect x="64" y="99" width="64" height="42" rx="5" fill="#fff0c4"/>
  <path d="M90 141v-21a6 6 0 0 1 12 0v21z" fill="#0b5c48"/>`

/**
 * `Crescent` from Mascot.tsx, tilted so its horns point up and to the right.
 * The inner translate re-centres the path, whose own bounding box is not
 * centred in its 100-unit viewBox.
 */
const crescent = (x, y, scale, rotate = -40) => `
  <g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale}) translate(-29.6 -50)">
    <path d="M62 8a46 46 0 1 0 0 84A38 38 0 0 1 62 8z" fill="#f2a93b"/>
  </g>`

/** The app icon: mosque, crescent and three specks of night sky. */
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <defs>${SKY}</defs>
  <rect width="192" height="192" fill="url(#sky)"/>
  <circle cx="35" cy="35" r="2.4" fill="#f2a93b" opacity=".9"/>
  <circle cx="148" cy="27" r="1.4" fill="#fffdf6" opacity=".7"/>
  <circle cx="157" cy="46.5" r="1.9" fill="#fffdf6" opacity=".85"/>
  ${crescent(156.5, 152, 0.2745)}
  ${MOSQUE}
</svg>`

/**
 * The launch image. It is shown scale-to-fill inside a square, so a portrait
 * phone crops away roughly a quarter of the width on each side: everything
 * that must survive stays near the middle. The mosque is drawn at a third of
 * the size it has in the icon for that reason, and the specks are dropped --
 * they would land in the cropped-off margins.
 */
const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <defs>${SKY}</defs>
  <rect width="192" height="192" fill="url(#sky)"/>
  <g transform="translate(96 96) scale(0.62) translate(-96 -96)">
    ${MOSQUE}
  </g>
  ${crescent(128, 62, 0.14)}
</svg>`

/* ------------------------------------------------------------ PNG bytes -- */

const CRC = Int32Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})

function crc32(buf) {
  let c = ~0
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return ~c >>> 0
}

function chunk(type, data) {
  const head = Buffer.alloc(4)
  head.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([head, body, crc])
}

/**
 * Encodes raw RGB into a PNG with no alpha channel.
 *
 * Every row uses the Up filter, which stores each row as its difference from
 * the one above. The background is a vertical gradient, so most of that
 * difference is a constant few bytes per row and deflate collapses it -- with
 * no filtering at all the 2732px launch image is several megabytes.
 */
function encodePng(rgb, size) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bits per channel
  header[9] = 2 // colour type 2: truecolour, no alpha

  const stride = size * 3
  const raw = Buffer.alloc(size * (1 + stride))
  for (let y = 0; y < size; y++) {
    const row = y * (1 + stride)
    raw[row] = 2 // filter: Up
    for (let i = 0; i < stride; i++) {
      const above = y === 0 ? 0 : rgb[(y - 1) * stride + i]
      raw[row + 1 + i] = (rgb[y * stride + i] - above) & 0xff
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ----------------------------------------------------------------- run -- */

const browser = await chromium.launch()
const page = await browser.newPage()

/** Rasterises an SVG at `size` square and returns its pixels as RGB triples. */
async function raster(svg, size) {
  const b64 = await page.evaluate(
    async ([svg, size]) => {
      const img = new Image()
      img.src = 'data:image/svg+xml;base64,' + btoa(svg)
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, size, size)
      const { data } = ctx.getImageData(0, 0, size, size)
      // Drop alpha here rather than shipping a quarter more bytes to Node.
      const rgb = new Uint8Array(size * size * 3)
      for (let i = 0, o = 0; i < data.length; i += 4) {
        rgb[o++] = data[i]
        rgb[o++] = data[i + 1]
        rgb[o++] = data[i + 2]
      }
      let s = ''
      for (let i = 0; i < rgb.length; i += 0x8000) {
        s += String.fromCharCode.apply(null, rgb.subarray(i, i + 0x8000))
      }
      return btoa(s)
    },
    [svg, size],
  )
  return Buffer.from(b64, 'base64')
}

const write = (path, bytes) => {
  writeFileSync(path, bytes)
  console.log(`  ${path}  ${(bytes.length / 1024).toFixed(0)} KB`)
}

write(`${OUT}/AppIcon.appiconset/AppIcon-512@2x.png`, encodePng(await raster(icon, 1024), 1024))

// The asset catalogue names three launch images at 1x/2x/3x and Xcode expects
// all three to exist; the same square serves every one of them.
const launch = encodePng(await raster(splash, 2732), 2732)
for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  write(`${OUT}/Splash.imageset/${name}`, launch)
}

await browser.close()
