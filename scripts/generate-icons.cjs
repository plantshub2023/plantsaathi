const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const svgPath = path.join(__dirname, '../public/icon.svg')
const svgBuffer = fs.readFileSync(svgPath)

async function generate() {
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(__dirname, '../public/icon-192.png'))
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(__dirname, '../public/icon-512.png'))
  console.log('Icons generated: icon-192.png and icon-512.png')
}

generate().catch(console.error)
