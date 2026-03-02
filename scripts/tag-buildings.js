/**
 * Adds unique IDs (bldg-0, bldg-1, ...) to each <path> inside the BUILDINGS group
 * of map.svg, and outputs a JSON file with building centroids.
 */
import fs from 'fs'

const svgPath = 'src/assets/map.svg'
let svg = fs.readFileSync(svgPath, 'utf8')

// Find the BUILDINGS group
const groupMatch = svg.match(/(<g id="BUILDINGS"[^>]*>)([\s\S]*?)(<\/g>)/)
if (!groupMatch) {
  console.error('No BUILDINGS group found')
  process.exit(1)
}

const [fullMatch, openTag, content, closeTag] = groupMatch
const buildings = []
let pathIndex = 0

const newContent = content.replace(/<path\b([^>]*)(\/?>\s*(?:<\/path>)?)/g, (match, attrs, closing) => {
  const id = `bldg-${pathIndex}`

  // Extract d attribute for centroid calculation
  const dMatch = attrs.match(/d="([^"]*)"/)
  let cx = 0, cy = 0
  if (dMatch) {
    const d = dMatch[1]
    // Parse path coordinates - extract all M/L coordinate pairs
    const coords = []
    const re = /([ML])\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g
    let m
    while ((m = re.exec(d)) !== null) {
      coords.push({ x: parseFloat(m[2]), y: parseFloat(m[3]) })
    }
    if (coords.length > 0) {
      cx = coords.reduce((s, c) => s + c.x, 0) / coords.length
      cy = coords.reduce((s, c) => s + c.y, 0) / coords.length
    }

    // Also compute bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const c of coords) {
      if (c.x < minX) minX = c.x
      if (c.x > maxX) maxX = c.x
      if (c.y < minY) minY = c.y
      if (c.y > maxY) maxY = c.y
    }

    buildings.push({
      id,
      cx: Math.round(cx * 100) / 100,
      cy: Math.round(cy * 100) / 100,
      minX: Math.round(minX * 100) / 100,
      minY: Math.round(minY * 100) / 100,
      maxX: Math.round(maxX * 100) / 100,
      maxY: Math.round(maxY * 100) / 100,
      width: Math.round((maxX - minX) * 100) / 100,
      height: Math.round((maxY - minY) * 100) / 100,
    })
  }

  pathIndex++
  return `<path id="${id}"${attrs}${closing}`
})

// Replace in SVG
svg = svg.replace(fullMatch, openTag + newContent + closeTag)
fs.writeFileSync(svgPath, svg)
console.log(`Tagged ${pathIndex} building paths in ${svgPath}`)

// Write buildings data
const buildingsPath = 'src/data/buildings.json'
fs.mkdirSync('src/data', { recursive: true })
fs.writeFileSync(buildingsPath, JSON.stringify(buildings, null, 2))
console.log(`Wrote ${buildings.length} building records to ${buildingsPath}`)
