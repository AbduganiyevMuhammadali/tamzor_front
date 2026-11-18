/* XARITA FONI — tizimdagi barcha Leaflet xaritalari fon qatlamini shu yerdan oladi.

   2026-10: CARTO basemaps kalitsiz so'rovga xarita o'rniga "API KEY REQUIRED" yozuvli rasm qaytara
   boshladi va hamma xaritalar bo'sh ko'rindi. Fon OpenStreetMap'ga o'tkazildi:
     - kalit kerak emas; foydalanish qoidasi — brauzer Referer yuboradi, atribusiya ko'rinib turadi;
     - ko'rinish main.css dagi `.sellz-fon` filtri bilan yumshatiladi (indigo markerlar ajralib turishi uchun),
       qorong'i mavzuda — teskari ranglarda;
     - OSM plitkalari ketma-ket yuklanmasa (tarmoq bloklasa) fon Esri ko'cha xaritasiga o'zi o'tadi.
   Yangi xarita qo'shsangiz `L.tileLayer(...)` yozmang — `fonQatlam(L).addTo(map)`. */

const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATR = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
const ESRI_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
const ESRI_ATR = '© Esri, HERE, Garmin, © OpenStreetMap'
const SPUTNIK_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

/** Asosiy fon: OpenStreetMap, ishlamasa — Esri ko'cha xaritasi */
export function fonQatlam(L: any, opts: Record<string, unknown> = {}) {
  const qatlam = L.tileLayer(OSM_URL, { maxZoom: 19, attribution: OSM_ATR, className: 'sellz-fon', ...opts })
  let xato = 0
  let almashdi = false
  qatlam.on('tileerror', () => {
    if (almashdi || ++xato < 4) return
    almashdi = true
    const atr = qatlam._map?.attributionControl
    atr?.removeAttribution(OSM_ATR)
    atr?.addAttribution(ESRI_ATR)
    qatlam.options.attribution = ESRI_ATR
    qatlam.setUrl(ESRI_URL)
  })
  return qatlam
}

/** Sun'iy yo'ldosh surati (Esri World Imagery) — filtrsiz */
export function sputnikQatlam(L: any, opts: Record<string, unknown> = {}) {
  return L.tileLayer(SPUTNIK_URL, { maxZoom: 19, attribution: '© Esri', ...opts })
}
