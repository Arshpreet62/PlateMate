// Single source of truth for the app mark. Writes public/favicon.svg and the
// three PWA icons. Run with: node scripts/make-icons.js
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// A pass with a punched edge and a tick: what the app is for, in one glyph.
const MARK = `
  <rect x="12" y="18" width="40" height="28" rx="7" fill="#fff" mask="url(#ticket)"/>
  <path d="M24 32.5 l5 5 l11 -11" fill="none" stroke="#4338CA" stroke-width="4"
        stroke-linecap="round" stroke-linejoin="round"/>`

// scale < 1 keeps the mark inside the safe zone of a maskable icon, which
// launchers are free to crop to a circle. radius 0 lets the colour bleed out.
function icon({ radius = 15, scale = 1 } = {}) {
  const mark = scale === 1
    ? MARK
    : `<g transform="translate(32 32) scale(${scale}) translate(-32 -32)">${MARK}</g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#6366F1"/>
      <stop offset="1" stop-color="#4338CA"/>
    </linearGradient>
    <mask id="ticket">
      <rect x="12" y="18" width="40" height="28" rx="7" fill="#fff"/>
      <circle cx="12" cy="32" r="5" fill="#000"/>
      <circle cx="52" cy="32" r="5" fill="#000"/>
    </mask>
  </defs>
  <rect width="64" height="64" rx="${radius}" fill="url(#bg)"/>${mark}
</svg>
`
}

const square = icon()
const maskable = icon({ radius: 0, scale: 0.72 })

await mkdir(resolve(root, 'public/icons'), { recursive: true })
await writeFile(resolve(root, 'public/favicon.svg'), square)

const targets = [
  { file: 'icons/icon-192.png', size: 192, source: square },
  { file: 'icons/icon-512.png', size: 512, source: square },
  { file: 'icons/icon-maskable-512.png', size: 512, source: maskable },
]

for (const { file, size, source } of targets) {
  const png = await sharp(Buffer.from(source), { density: 512 }).resize(size, size).png().toBuffer()
  await writeFile(resolve(root, 'public', file), png)
  console.log(`wrote public/${file} (${size}x${size})`)
}
