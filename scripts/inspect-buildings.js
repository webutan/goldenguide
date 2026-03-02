import fs from 'fs'

const svg = fs.readFileSync('src/assets/map.svg', 'utf8')
const match = svg.match(/<g id="BUILDINGS"[^>]*>([\s\S]*?)<\/g>/)
if (!match) { console.log('No BUILDINGS group'); process.exit() }

const paths = match[1].match(/<path[^>]*\/?>(?:<\/path>)?/g) || []
console.log('Total building paths:', paths.length)

// For each path, extract the d attribute and compute a rough bounding box
paths.forEach((p, i) => {
  const dMatch = p.match(/d="([^"]*)"/)
  if (!dMatch) return
  const d = dMatch[1]
  // Extract all numbers from the path
  const nums = d.match(/-?\d+\.?\d*/g)
  if (!nums || nums.length < 4) return
  // Rough: take pairs as x,y
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let j = 0; j < nums.length - 1; j += 2) {
    const x = parseFloat(nums[j])
    const y = parseFloat(nums[j + 1])
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const cx = ((minX + maxX) / 2).toFixed(1)
  const cy = ((minY + maxY) / 2).toFixed(1)
  const w = (maxX - minX).toFixed(1)
  const h = (maxY - minY).toFixed(1)
  console.log(`  bldg-${i}: center(${cx}, ${cy}) size(${w}x${h})`)
})
