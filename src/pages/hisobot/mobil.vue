<template>
  <div class="hp-wrap">
    <!-- Header -->
    <div class="hp-head">
      <div>
        <h1 class="hp-title">Mobil hisobotlar</h1>
        <p class="hp-sub">Agentlarning maydondagi faoliyati — audit, sotmaslik, savdo va marshrut</p>
      </div>
      <div class="hp-filters">
        <select v-model="fAgent" class="hp-select" @change="reload">
          <option value="">Barcha agentlar</option>
          <option v-for="a in agentlar" :key="a.id" :value="a.id">{{ a.fullname }}</option>
        </select>
        <input v-model="dateFrom" type="date" class="hp-date" @change="reload"/>
        <input v-model="dateTo" type="date" class="hp-date" @change="reload"/>
      </div>
    </div>

    <!-- Tabs -->
    <div class="hp-tabs">
      <button v-for="t in TABS" :key="t.key"
        :class="['hp-tab', tab===t.key && 'hp-tab--on']" @click="setTab(t.key)">
        {{ t.label }}
      </button>
    </div>

    <!-- ══ AUDIT ══ -->
    <div v-if="tab==='audit'" class="hp-panel">
      <div v-if="loading" class="hp-skel-list"><div v-for="i in 4" :key="i" class="hp-skel"/></div>
      <div v-else-if="!audit.length" class="hp-empty">Audit ma'lumoti yo'q</div>
      <div v-else class="hp-cards">
        <div v-for="a in audit" :key="a.id" class="hp-card">
          <div class="hp-card-hd">
            <span class="hp-card-mijoz">{{ a.mijoz_nomi || '—' }}</span>
            <span class="hp-card-date">{{ fmtDate(a.sana) }}</span>
          </div>
          <div class="hp-card-agent">👤 {{ a.agent_nomi || '—' }}</div>
          <div class="hp-audit-grid">
            <div class="hp-audit-cell"><span>Maydon</span><b>{{ a.maydon || 0 }} m²</b></div>
            <div class="hp-audit-cell"><span>Stend</span><b>{{ a.stend || 0 }}</b></div>
            <div class="hp-audit-cell hp-audit-cell--good"><span>Biz bilan</span><b>{{ a.biz_bilan || 0 }}%</b></div>
            <div class="hp-audit-cell hp-audit-cell--bad"><span>Bizsiz</span><b>{{ a.bizsiz || 0 }}%</b></div>
          </div>
          <div v-if="a.tovarlar && a.tovarlar.length" class="hp-audit-goods">
            <span class="hp-goods-lbl">Tovarlar:</span>
            <span v-for="(g,i) in a.tovarlar" :key="i" class="hp-goods-chip">
              brend {{ g.brand_id }} · {{ g.count }} ta
            </span>
          </div>
          <div v-if="a.shikoyat || a.taklif" class="hp-audit-notes">
            <div v-if="a.shikoyat"><b>Shikoyat:</b> {{ a.shikoyat }}</div>
            <div v-if="a.taklif"><b>Taklif:</b> {{ a.taklif }}</div>
          </div>
          <!-- Audit rasmlari (mobildan yuklangan) -->
          <div v-if="a.rasmlar && a.rasmlar.length" class="hp-audit-photos">
            <img v-for="(r,i) in a.rasmlar" :key="i" :src="r" class="hp-photo-thumb"
              loading="lazy" @click="lightbox = r" :alt="`audit rasm ${Number(i)+1}`"/>
          </div>
          <div class="hp-card-ft">
            <span v-if="a.kirish_vaqt || a.chiqish_vaqt">🕐 {{ a.kirish_vaqt || '?' }} – {{ a.chiqish_vaqt || '?' }}</span>
            <span v-if="a.lat && a.lng">📍 {{ a.lat }}, {{ a.lng }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ SOTMASLIK ══ -->
    <div v-if="tab==='sotmaslik'" class="hp-panel">
      <div v-if="loading" class="hp-skel-list"><div v-for="i in 5" :key="i" class="hp-skel hp-skel--sm"/></div>
      <div v-else-if="!sotmaslik.length" class="hp-empty">Sotmaslik yozuvlari yo'q</div>
      <div v-else class="hp-table-wrap">
        <table class="hp-table">
          <thead>
            <tr><th>Mijoz</th><th>Agent</th><th>Sabab</th><th>Sana</th></tr>
          </thead>
          <tbody>
            <tr v-for="s in sotmaslik" :key="s.id">
              <td>{{ s.mijoz_nomi || '—' }}</td>
              <td>{{ s.agent_nomi || '—' }}</td>
              <td><span class="hp-sabab">{{ s.sabab_nomi || ('#' + (s.sabab_id || '?')) }}</span></td>
              <td class="hp-td-date">{{ fmtDate(s.sana) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ AGENT SAVDO ══ -->
    <div v-if="tab==='savdo'" class="hp-panel">
      <div v-if="loading" class="hp-skel-list"><div v-for="i in 4" :key="i" class="hp-skel hp-skel--sm"/></div>
      <div v-else-if="!agentSavdo.length" class="hp-empty">Savdo ma'lumoti yo'q</div>
      <div v-else class="hp-savdo-list">
        <div v-for="(a,i) in agentSavdo" :key="a.id" class="hp-savdo-item">
          <div class="hp-savdo-rank">{{ i + 1 }}</div>
          <div class="hp-savdo-body">
            <div class="hp-savdo-top">
              <span class="hp-savdo-name">{{ a.fullname }}</span>
              <span class="hp-savdo-sum">{{ fmtSum(a.savdo_summa) }} so'm</span>
            </div>
            <div class="hp-savdo-bar"><div class="hp-savdo-fill" :style="{ width: a.foiz + '%' }"/></div>
            <div class="hp-savdo-meta">
              <span>{{ a.savdo_soni }} zakaz · {{ a.yetkazilgan }} yetkazilgan</span>
              <span class="hp-savdo-foiz">{{ a.foiz }}% reja</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ MARSHRUT (GPS) ══ -->
    <div v-if="tab==='marshrut'" class="hp-panel">
      <div class="hp-marshrut-note" v-if="!fAgent">
        Marshrutni ko'rish uchun yuqoridan <b>agent tanlang</b>.
      </div>
      <template v-else>
        <div v-if="loading" class="hp-skel hp-skel--map"/>
        <div v-else-if="!marshrut.length && !tashriflar.length" class="hp-empty">Bu agent uchun GPS/tashrif ma'lumoti yo'q</div>
        <div v-else class="hp-marshrut">
          <div class="hp-marshrut-info">
            <span><b>{{ marshrut.length }}</b> ta GPS nuqta · <b>{{ tashriflar.length }}</b> ta tashrif</span>
            <span v-if="marshrut.length">{{ fmtTime(marshrut[0].sana) }} – {{ fmtTime(marshrut[marshrut.length-1].sana) }}</span>
          </div>
          <!-- Leaflet xarita -->
          <div id="hp-marshrut-map" class="hp-map-leaflet"/>
          <div class="hp-map-legend">
            <span><i style="background:#10b981"/>A — boshlanish · savdo</span>
            <span><i style="background:#ef4444"/>B — tugash · sotilmadi</span>
            <span><i style="background:#6366f1"/>Bosib o'tilgan yo'l</span>
          </div>
        </div>
      </template>
    </div>

    <!-- Lightbox (rasmni katta ko'rish) -->
    <div v-if="lightbox" class="hp-lightbox" @click="lightbox = null">
      <img :src="lightbox" alt="audit rasm"/>
      <button class="hp-lightbox-close" @click="lightbox = null">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
// @ts-ignore
import { hisobotApi } from '@/api/api'
import { fonQatlam, sputnikQatlam } from '@/utils/xarita'
// @ts-ignore
import { useToast } from '@/composables/useToast'

const toast = useToast()

const TABS = [
  { key: 'audit',     label: 'Audit' },
  { key: 'sotmaslik', label: 'Sotilmagan' },
  { key: 'savdo',     label: 'Agent savdo' },
  { key: 'marshrut',  label: 'Marshrut (GPS)' },
]

const tab = ref('audit')
const loading = ref(false)
const fAgent = ref<string | number>('')
const dateFrom = ref('')
const dateTo = ref('')

const agentlar = ref<any[]>([])
const lightbox = ref<string | null>(null)
const audit = ref<any[]>([])
const sotmaslik = ref<any[]>([])
const agentSavdo = ref<any[]>([])
const marshrut = ref<any[]>([])
const tashriflar = ref<any[]>([])

function params() {
  const p: any = {}
  if (fAgent.value) p.agent_id = fAgent.value
  if (dateFrom.value) p.date_from = dateFrom.value
  if (dateTo.value) p.date_to = dateTo.value
  return p
}

async function loadTab() {
  // Marshrut tabi: agent tanlanmagan bo'lsa birinchisini avtomatik tanlaymiz
  if (tab.value === 'marshrut' && !fAgent.value && agentlar.value.length) {
    fAgent.value = agentlar.value[0].id
  }
  loading.value = true
  try {
    if (tab.value === 'audit')       audit.value = await hisobotApi.audit(params())
    else if (tab.value === 'sotmaslik') sotmaslik.value = await hisobotApi.sotmaslik(params())
    else if (tab.value === 'savdo')  agentSavdo.value = await hisobotApi.agentSavdo(params())
    else if (tab.value === 'marshrut') {
      if (fAgent.value) {
        // date faqat tanlangan bo'lsa yuboriladi (undefined "undefined" matni bo'lib ketmasin)
        const p: any = { agent_id: fAgent.value }
        if (dateFrom.value) p.date = dateFrom.value
        const j = await hisobotApi.marshrut(p)
        marshrut.value = j.nuqtalar || []
        tashriflar.value = j.tashriflar || []
      } else { marshrut.value = []; tashriflar.value = [] }
    }
  } catch (e: any) {
    toast.error('Yuklash xatosi', e.message || 'Server bilan aloqa yo\'q')
  } finally {
    loading.value = false
  }
  // Xarita konteyneri loading tugagach DOM'da paydo bo'ladi — shundan keyin chizamiz
  if (tab.value === 'marshrut' && fAgent.value && (marshrut.value.length || tashriflar.value.length)) {
    await nextTick()
    await renderMap()
  }
}

function setTab(k: string) { tab.value = k; loadTab() }
function reload() { loadTab() }

// ── Marshrut: Leaflet xarita (mijozlar/supervayzer sahifalari uslubida) ──
let leafletMap: any = null

// GPS nuqtalar orqali HAQIQIY ko'cha yo'lini olish (OSRM — OpenStreetMap routing).
// Nuqtalar ko'chalarga yopishtirilib, burilishlar bilan to'liq geometriya qaytadi.
// Servis ishlamasa null → to'g'ri chiziq fallback.
async function fetchRoadRoute(pts: { lat: number; lng: number }[]): Promise<[number, number][] | null> {
  if (pts.length < 2) return null
  // OSRM demo server chekloviga sig'ish uchun ko'pi bilan 90 nuqta
  const step = Math.ceil(pts.length / 90)
  const sampled = pts.filter((_, i) => i % step === 0 || i === pts.length - 1)
  const coords = sampled.map(p => `${p.lng},${p.lat}`).join(';')
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`)
    const j = await r.json()
    if (j.code === 'Ok' && j.routes?.length) return j.routes[0].geometry.coordinates
  } catch { /* fallback: to'g'ri chiziq */ }
  return null
}

async function renderMap() {
  const el = document.getElementById('hp-marshrut-map')
  if (!el) return
  const L = (await import('leaflet')).default
  // @ts-ignore
  await import('leaflet/dist/leaflet.css')

  // Tab qayta ochilganda konteyner yangi — eski xaritani butunlay o'chiramiz
  if (leafletMap) { leafletMap.remove(); leafletMap = null }

  // Zamonaviy basemap: CARTO Voyager (toza, retina) + Sputnik (Esri) almashinuvi
  const xarita = fonQatlam(L)
  const sputnik = sputnikQatlam(L)
  leafletMap = L.map(el, { layers: [xarita] }).setView([41.2995, 69.2401], 12)
  L.control.layers({ 'Xarita': xarita, 'Sputnik': sputnik }, undefined, { position: 'topright' }).addTo(leafletMap)

  // Navigator-uslub A/B pin ikonkalar
  const pinIcon = (label: string, color: string) => L.divIcon({
    className: 'hp-pin-wrap',
    html: `<div class="hp-pin" style="background:${color}"><span>${label}</span></div>`,
    iconSize: [32, 40], iconAnchor: [16, 38], tooltipAnchor: [0, -34],
  })

  const bounds: any[] = []

  // GPS marshrut — ko'chalar bo'ylab (taksi ilovalaridagidek)
  const pts = marshrut.value
    .filter(p => p.lat != null && p.lng != null)
    .map(p => ({ ...p, lat: Number(p.lat), lng: Number(p.lng) }))
  if (pts.length) {
    // OSRM'dan yo'l geometriyasi ([lng,lat] massivi) — kelmasa to'g'ri chiziq
    const road = await fetchRoadRoute(pts)
    const latlngs = road
      ? road.map(([lng, lat]) => [lat, lng])
      : pts.map(p => [p.lat, p.lng])

    // Taksi-uslub: ostida to'q "casing", ustida asosiy chiziq
    L.polyline(latlngs, { color: '#312e81', weight: 8, opacity: .85 }).addTo(leafletMap)
    L.polyline(latlngs, { color: '#6366f1', weight: 4.5, opacity: 1 }).addTo(leafletMap)
    bounds.push(...latlngs)

    pts.forEach((p, i) => {
      const isStart = i === 0
      const isEnd = i === pts.length - 1
      const tooltipHtml =
        `${isStart ? '🟢 Boshlanish' : isEnd ? '🏁 Oxirgi nuqta' : 'Nuqta ' + (i + 1)}<br>` +
        `🕐 ${fmtTime(p.sana)}${p.battery != null ? ' · 🔋 ' + p.battery + '%' : ''}`

      if (isStart || isEnd) {
        // Navigator-uslub A/B pin
        L.marker([p.lat, p.lng], { icon: pinIcon(isStart ? 'A' : 'B', isStart ? '#10b981' : '#ef4444'), zIndexOffset: 500 })
          .addTo(leafletMap)
          .bindTooltip(tooltipHtml, { direction: 'top' })
      } else {
        L.circleMarker([p.lat, p.lng], {
          radius: 4.5, color: '#fff', weight: 2, fillColor: '#6366f1', fillOpacity: 1,
        }).addTo(leafletMap)
          .bindTooltip(tooltipHtml, { direction: 'top', offset: [0, -6] })
      }
    })
  }

  // Tashrif markerlar: savdo=yashil, sotmaslik=qizil
  tashriflar.value
    .filter(t => t.lat != null && t.lng != null)
    .forEach(t => {
      const savdo = t.tur === 'savdo'
      const marker = L.circleMarker([t.lat, t.lng], {
        radius: 9,
        color: savdo ? '#059669' : '#dc2626', weight: 2.5,
        fillColor: savdo ? '#10b981' : '#ef4444',
        fillOpacity: .85,
      }).addTo(leafletMap)
      marker.bindTooltip(
        `${savdo ? '🛒 Savdo' : '🚫 Sotilmadi'} — <b>${t.nomi}</b><br>${t.info || ''}<br>🕐 ${fmtTime(t.sana)}`,
        { direction: 'top', offset: [0, -8] },
      )
      bounds.push([t.lat, t.lng])
    })

  if (bounds.length) leafletMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 })
}

onUnmounted(() => { if (leafletMap) { leafletMap.remove(); leafletMap = null } })

// ── Formatters ───────────────────────────────────────────
function fmtSum(v: number) {
  if (!v) return '0'
  if (v >= 1e6) return (v/1e6).toFixed(1) + ' mln'
  if (v >= 1e3) return (v/1e3).toFixed(0) + ' ming'
  return Number(v).toLocaleString('uz-UZ')
}
function fmtDate(s: string) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('uz-UZ', { day:'2-digit', month:'2-digit', year:'2-digit' })
}
function fmtTime(s: string) {
  if (!s) return ''
  return new Date(s).toLocaleTimeString('uz-UZ', { hour:'2-digit', minute:'2-digit' })
}

onMounted(async () => {
  try { agentlar.value = await hisobotApi.agentlar() } catch {}
  await loadTab()
})
</script>

<style scoped>
.hp-wrap { display:flex; flex-direction:column; gap:18px; padding:2px 0 40px; }

/* Header */
.hp-head { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; flex-wrap:wrap; }
.hp-title { font-size:22px; font-weight:900; color:#1e293b; margin:0 0 4px; letter-spacing:-.3px; }
.hp-sub { font-size:13px; color:#94a3b8; margin:0; }
.hp-filters { display:flex; gap:8px; flex-wrap:wrap; }
.hp-select, .hp-date { border:1.5px solid #e2e8f0; background:#fff; border-radius:10px; padding:8px 12px; font-size:13px; color:#1e293b; cursor:pointer; }
.hp-select:focus, .hp-date:focus { outline:none; border-color:#6366f1; }

/* Tabs */
.hp-tabs { display:flex; gap:4px; background:#f1f5f9; border-radius:12px; padding:4px; width:fit-content; max-width:100%; overflow-x:auto; }
.hp-tab { padding:8px 16px; border:none; background:transparent; border-radius:9px; font-size:13.5px; font-weight:600; color:#64748b; cursor:pointer; white-space:nowrap; transition:.15s; }
.hp-tab--on { background:#fff; color:#6366f1; box-shadow:0 2px 6px rgba(0,0,0,.08); }

.hp-panel { min-height:200px; }
.hp-empty { text-align:center; padding:60px 20px; color:#94a3b8; font-size:14px; background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; }

/* Skeleton */
.hp-skel-list { display:flex; flex-direction:column; gap:12px; }
.hp-skel { height:130px; border-radius:16px; background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:hp-shim 1.4s ease infinite; }
.hp-skel--sm { height:52px; }
.hp-skel--map { height:280px; }
@keyframes hp-shim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* Audit cards */
.hp-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:14px; }
.hp-card { background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:10px; }
.hp-card-hd { display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
.hp-card-mijoz { font-size:15px; font-weight:800; color:#1e293b; }
.hp-card-date { font-size:12px; color:#94a3b8; }
.hp-card-agent { font-size:12.5px; color:#64748b; }
.hp-audit-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:8px; }
.hp-audit-cell { background:#f8fafc; border-radius:10px; padding:8px; text-align:center; }
.hp-audit-cell span { display:block; font-size:10.5px; color:#94a3b8; margin-bottom:3px; }
.hp-audit-cell b { font-size:14px; color:#1e293b; }
.hp-audit-cell--good b { color:#10b981; }
.hp-audit-cell--bad b { color:#ef4444; }
.hp-audit-goods { display:flex; flex-wrap:wrap; gap:5px; align-items:center; }
.hp-goods-lbl { font-size:12px; color:#94a3b8; }
.hp-goods-chip { font-size:11.5px; background:#eef2ff; color:#6366f1; border-radius:6px; padding:2px 7px; }
.hp-audit-notes { font-size:12.5px; color:#475569; display:flex; flex-direction:column; gap:3px; }
.hp-audit-notes b { color:#1e293b; }
.hp-card-ft { display:flex; gap:12px; flex-wrap:wrap; font-size:11.5px; color:#94a3b8; border-top:1px solid #f1f5f9; padding-top:9px; }

/* Sotmaslik table */
.hp-table-wrap { background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; overflow:hidden; overflow-x:auto; }
.hp-table { width:100%; border-collapse:collapse; min-width:520px; }
.hp-table th { text-align:left; font-size:11.5px; font-weight:700; color:#94a3b8; text-transform:uppercase; padding:12px 16px; background:#f8fafc; border-bottom:1px solid #f1f5f9; }
.hp-table td { padding:12px 16px; font-size:13px; color:#1e293b; border-bottom:1px solid #f8fafc; }
.hp-table tr:last-child td { border-bottom:none; }
.hp-sabab { background:#fef2f2; color:#ef4444; border-radius:6px; padding:3px 9px; font-size:12px; font-weight:600; }
.hp-td-date { color:#94a3b8; }

/* Agent savdo */
.hp-savdo-list { display:flex; flex-direction:column; gap:12px; }
.hp-savdo-item { display:flex; align-items:flex-start; gap:12px; background:#fff; border:1.5px solid #e8ecf8; border-radius:14px; padding:14px 16px; }
.hp-savdo-rank { width:28px; height:28px; border-radius:9px; background:#eef2ff; color:#6366f1; font-size:13px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.hp-savdo-body { flex:1; min-width:0; }
.hp-savdo-top { display:flex; align-items:baseline; justify-content:space-between; gap:8px; margin-bottom:7px; }
.hp-savdo-name { font-size:14px; font-weight:700; color:#1e293b; }
.hp-savdo-sum { font-size:13.5px; font-weight:800; color:#475569; }
.hp-savdo-bar { height:8px; border-radius:999px; background:#f1f5f9; overflow:hidden; }
.hp-savdo-fill { height:100%; border-radius:999px; background:linear-gradient(90deg,#6366f1,#6366f1); transition:width .5s; min-width:2px; }
.hp-savdo-meta { display:flex; justify-content:space-between; gap:8px; margin-top:6px; font-size:12px; color:#94a3b8; }
.hp-savdo-foiz { font-weight:700; color:#6366f1; }

/* Marshrut */
.hp-marshrut-note { text-align:center; padding:50px 20px; color:#64748b; font-size:14px; background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; }
.hp-marshrut { background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; padding:16px; }
.hp-marshrut-info { display:flex; justify-content:space-between; gap:12px; margin-bottom:12px; font-size:13px; color:#64748b; }
.hp-marshrut-info b { color:#1e293b; }
.hp-map-leaflet { width:100%; height:460px; border-radius:14px; border:1px solid #e8ecf8; z-index:0; box-shadow:inset 0 0 0 1px rgba(0,0,0,.02); }

/* Navigator-uslub A/B pin (leaflet divIcon — :deep kerak) */
:deep(.hp-pin-wrap) { background:transparent; border:none; }
:deep(.hp-pin) {
  width:32px; height:32px; border-radius:50% 50% 50% 0;
  transform:rotate(-45deg); transform-origin:center;
  display:flex; align-items:center; justify-content:center;
  border:3px solid #fff; box-shadow:0 4px 12px rgba(0,0,0,.35);
}
:deep(.hp-pin span) {
  transform:rotate(45deg);
  color:#fff; font-weight:900; font-size:13.5px; font-family:inherit;
}
/* Qatlam almashtirgich (Xarita/Sputnik) loyiha uslubida */
:deep(.leaflet-control-layers) { border-radius:10px; border:1.5px solid #e8ecf8; box-shadow:0 4px 14px rgba(0,0,0,.08); }
.hp-map-legend { display:flex; gap:16px; margin-top:10px; font-size:12px; color:#64748b; flex-wrap:wrap; }
.hp-map-legend span { display:flex; align-items:center; gap:5px; }
.hp-map-legend i { width:10px; height:10px; border-radius:50%; display:inline-block; }

/* Audit rasmlari */
.hp-audit-photos { display:flex; flex-wrap:wrap; gap:7px; }
.hp-photo-thumb { width:64px; height:64px; object-fit:cover; border-radius:9px; border:1.5px solid #e8ecf8; cursor:pointer; transition:.15s; }
.hp-photo-thumb:hover { transform:scale(1.05); border-color:#6366f1; }

/* Lightbox */
.hp-lightbox { position:fixed; inset:0; background:rgba(15,23,42,.85); z-index:1000; display:flex; align-items:center; justify-content:center; padding:24px; cursor:zoom-out; }
.hp-lightbox img { max-width:92vw; max-height:88vh; border-radius:14px; box-shadow:0 20px 60px rgba(0,0,0,.5); }
.hp-lightbox-close { position:absolute; top:18px; right:22px; width:38px; height:38px; border:none; border-radius:50%; background:rgba(255,255,255,.15); color:#fff; font-size:16px; cursor:pointer; }
.hp-lightbox-close:hover { background:rgba(255,255,255,.3); }

/* Responsive */
@media(max-width:640px) {
  .hp-cards { grid-template-columns:1fr; }
  .hp-audit-grid { grid-template-columns:1fr 1fr; }
  .hp-filters { width:100%; }
  .hp-select, .hp-date { flex:1; min-width:120px; }
}
</style>
