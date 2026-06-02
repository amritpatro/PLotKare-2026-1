const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'

export async function reverseGeocodeLabel(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(latitude),
      lon: String(longitude),
      zoom: '16',
      addressdetails: '1',
    })
    const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PlotKare/1.0',
      },
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) return null

    const data = (await response.json()) as { display_name?: unknown }
    return typeof data.display_name === 'string' ? data.display_name.slice(0, 500) : null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
