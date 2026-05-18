/**
 * One-off: extracts Indian admin1 polygons from Natural Earth 50m shapefile into GeoJSON.
 * Source shapefile must exist at NE_SHAPE_PATH (download ne_50m_admin_1_states_provinces from Natural Earth).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as shapefile from 'shapefile'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const NE_SHAPE_PATH =
  process.env.NE_SHAPE_PATH ||
  path.join(process.env.TEMP || '/tmp', 'ne50', 'ne_50m_admin_1_states_provinces.shp')
const OUT = path.join(__dirname, '..', 'public', 'geo', 'india-states.geojson')

async function main() {
  if (!fs.existsSync(NE_SHAPE_PATH)) {
    console.error('Missing shapefile:', NE_SHAPE_PATH)
    process.exit(1)
  }

  const features = []
  const source = await shapefile.open(NE_SHAPE_PATH)

  let result = await source.read()
  while (!result.done) {
    const f = result.value
    const iso = f.properties?.adm0_a3 ?? f.properties?.ADM0_A3
    if (iso === 'IND') {
      const clean = (s) => (typeof s === 'string' ? s.replace(/\0/g, '').trim() : String(s ?? ''))
      features.push({
        type: 'Feature',
        properties: {
          name: clean(f.properties?.name ?? f.properties?.NAME ?? 'Unknown'),
          iso_3166_2: clean(f.properties?.iso_3166_2 ?? f.properties?.ISO_3166_2 ?? ''),
        },
        geometry: f.geometry,
      })
    }
    result = await source.read()
  }

  const fc = { type: 'FeatureCollection', features }
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(fc))
  console.log('Wrote', OUT, 'features:', features.length)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
