// Generates public/icon-192.png and public/icon-512.png
// Pure Node.js — no extra packages needed (uses built-in zlib)

const zlib = require('zlib')
const fs   = require('fs')
const path = require('path')

// ── CRC32 ──────────────────────────────────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const t      = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4);  lenBuf.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4);  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([lenBuf, t, data, crcBuf])
}

// ── PNG builder ────────────────────────────────────────────────────────────
function makePNG(size) {
  const cx = size / 2
  const cy = size / 2

  // Leaf ellipse half-axes (in pixels)
  const leafLen = size * 0.34   // half-length (along 45° diagonal)
  const leafWid = size * 0.11   // half-width  (across diagonal)
  const C = Math.SQRT1_2        // cos45 = sin45 ≈ 0.7071

  // Green #1D9E75 = rgb(29,158,117)
  const [GR, GG, GB] = [29, 158, 117]

  const raw = []
  for (let y = 0; y < size; y++) {
    raw.push(0) // PNG filter byte: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy

      // Rotate pixel coords –45° into leaf-local space
      const rx =  dx * C + dy * C
      const ry = -dx * C + dy * C

      // White ellipse = leaf body
      const inLeaf = (rx / leafLen) ** 2 + (ry / leafWid) ** 2 <= 1

      // Thin white stem: a narrow vertical stripe below the leaf tip
      const stemHalfW = size * 0.022
      const stemTop   = cy + leafLen * C * 0.7   // just below lower tip
      const stemBot   = cy + leafLen * C * 1.1
      const inStem    = Math.abs(x - cx) <= stemHalfW && y >= stemTop && y <= stemBot

      if (inLeaf || inStem) {
        raw.push(255, 255, 255)
      } else {
        raw.push(GR, GG, GB)
      }
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // colour type: RGB

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),  // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.from(raw))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Write files ────────────────────────────────────────────────────────────
const pubDir = path.join(__dirname, 'public')
if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true })

fs.writeFileSync(path.join(pubDir, 'icon-192.png'), makePNG(192))
fs.writeFileSync(path.join(pubDir, 'icon-512.png'), makePNG(512))

console.log('✓ public/icon-192.png  (192×192)')
console.log('✓ public/icon-512.png  (512×512)')
