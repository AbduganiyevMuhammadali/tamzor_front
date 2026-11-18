<template>
  <div class="ao">

    <!-- ═══ HEADER ═══ -->
    <div class="ao-hd">
      <div>
        <h1 class="ao-title">
          Agentlar xaritada
          <span v-if="autoOn" class="ao-live"><span class="ao-dot"/>jonli</span>
        </h1>
        <p class="ao-sub">
          {{ yangilangan }} holatiga
          <template v-if="d"> · {{ d.jami.jami }} agent</template>
        </p>
      </div>
      <div class="ao-hd-r">
        <button class="ao-ib" :class="{ on: autoOn }"
          :title="autoOn ? 'Avto yangilanish yoqilgan' : 'Avto yangilanish'" @click="autoToggle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 01-15 6.7L3 16"/></svg>
        </button>
        <button class="ao-ib" :disabled="yuklanmoqda" title="Yangilash" @click="yukla()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'ao-spin': yuklanmoqda }"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
        </button>
      </div>
    </div>

    <!-- ═══ HOLAT KARTALARI ═══ -->
    <div v-if="d" class="ao-stats">
      <button v-for="s in holatlar" :key="s.key" class="ao-stat"
        :class="{ on: filtr === s.key }" :style="{ '--c': `var(${s.tone})` }"
        @click="filtr = filtr === s.key ? 'bari' : s.key">
        <span class="ao-stat-ic"><span class="ao-bubble"/></span>
        <span class="ao-stat-b">
          <span class="ao-stat-v">{{ s.son }}</span>
          <span class="ao-stat-l">{{ s.label }}</span>
        </span>
      </button>
    </div>

    <!-- ═══ ASOSIY ═══ -->
    <div class="ao-body">
      <aside class="ao-side">
        <div v-if="yuklanmoqda && !d" class="ao-load"><span class="ao-spin2"/> Yuklanmoqda...</div>
        <div v-else-if="!korinadigan.length" class="ao-empty-sm">Bu holatda agent yo'q</div>

        <button v-for="a in korinadigan" :key="a.id" class="ao-row"
          :class="{ on: tanlangan === a.id }" @click="agentTanla(a.id)">
          <span class="ao-av" :style="{ background: rang(a.id) }">
            {{ (a.fullname || '?')[0] }}
            <span class="ao-badge" :style="{ background: `var(${TONE[a.holat]})` }"/>
          </span>
          <span class="ao-row-b">
            <span class="ao-row-n">{{ a.fullname }}</span>
            <span class="ao-row-s">
              <template v-if="a.oxirgi">{{ yoshMatn(a.oxirgi.yosh_daq) }}</template>
              <template v-else>GPS ma'lumoti yo'q</template>
            </span>
            <span v-if="a.bugun.hozir_mijozda" class="ao-now">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {{ a.bugun.hozir_mijozda }}
            </span>
          </span>
          <span class="ao-row-r">
            <span v-if="a.oxirgi && a.oxirgi.battery != null" class="ao-bat"
              :class="{ low: a.oxirgi.battery < 20 }">{{ a.oxirgi.battery }}%</span>
            <span class="ao-mini">{{ a.bugun.tashrif }}/{{ a.bugun.reja }}</span>
          </span>
        </button>
      </aside>

      <div class="ao-map-wrap">
        <div v-if="!d || !koordBor" class="ao-map-ov">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <p>{{ yuklanmoqda ? 'Yuklanmoqda...' : 'GPS signali kelmagan' }}</p>
        </div>
        <div ref="mapEl" class="ao-map"/>

        <div v-if="d && koordBor" class="ao-legend">
          <span><i style="background:var(--good)"/>Online</span>
          <span><i style="background:var(--warning)"/>Kutish</span>
          <span><i style="background:var(--muted)"/>Oflayn</span>
          <label class="ao-trek">
            <input type="checkbox" v-model="trekKorsat" @change="chiz()">
            Yo'l izi
          </label>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
// @ts-ignore
import { hisobotApi } from '@/api/api'
import { fonQatlam } from '@/utils/xarita'

interface Oxirgi { lat: number; lng: number; vaqt: string; battery: number | null; yosh_daq: number }
interface TrekN  { lat: number; lng: number; vaqt: string }
interface Agent {
  id: number; fullname: string; telefon: string
  holat: 'online' | 'kutish' | 'oflayn' | 'malumot_yoq'
  oxirgi: Oxirgi | null; trek: TrekN[]
  bugun: { reja: number; tashrif: number; savdo: number; hozir_mijozda: string | null }
}
interface Javob {
  sana: string; hozir: string
  markaz: { lat: number; lng: number } | null
  chegara: { ONLINE_DAQ: number; KUTISH_DAQ: number }
  agentlar: Agent[]
  jami: { online: number; kutish: number; oflayn: number; malumot_yoq: number; jami: number; yolda: number }
}

const TONE: Record<string, string> = {
  online: '--good', kutish: '--warning', oflayn: '--muted', malumot_yoq: '--muted',
}
const RANGLAR = ['#4f46e5','#059669','#d97706','#e11d48','#475569','#818cf8','#047857','#b45309']
const rang = (id: number) => RANGLAR[id % RANGLAR.length]

const d = ref<Javob | null>(null)
const yuklanmoqda = ref(false)
const autoOn = ref(true)
const filtr = ref<Filtr>('bari')
const tanlangan = ref<number | null>(null)
const trekKorsat = ref(true)
const yangilangan = ref('—')
const mapEl = ref<HTMLElement | null>(null)

let map: any = null, layer: any = null, L: any = null
let timer: number | undefined

const AUTO_KEY = 'sellz_agent_online_auto'

type Filtr = 'bari' | 'online' | 'kutish' | 'oflayn'
const holatlar = computed<{ key: Filtr; label: string; son: number; tone: string }[]>(() => {
  if (!d.value) return []
  const j = d.value.jami
  return [
    { key: 'online', label: 'Online',  son: j.online, tone: '--good' },
    { key: 'kutish', label: 'Kutish',  son: j.kutish, tone: '--warning' },
    { key: 'oflayn', label: 'Oflayn',  son: j.oflayn + j.malumot_yoq, tone: '--muted' },
    { key: 'bari',   label: "Yo'lda",  son: j.yolda,  tone: '--accent' },
  ]
})

const korinadigan = computed(() => {
  if (!d.value) return []
  const list = d.value.agentlar
  if (filtr.value === 'bari') return list
  if (filtr.value === 'oflayn')
    return list.filter(a => a.holat === 'oflayn' || a.holat === 'malumot_yoq')
  return list.filter(a => a.holat === filtr.value)
})

const koordBor = computed(() => !!d.value?.agentlar.some(a => a.oxirgi))

function yoshMatn(daq: number) {
  if (daq < 1) return 'Hozir'
  if (daq < 60) return daq + ' daqiqa oldin'
  const s = Math.floor(daq / 60)
  if (s < 24) return s + ' soat oldin'
  return Math.floor(s / 24) + ' kun oldin'
}

/* ── Yuklash ── */
async function yukla(jim = false) {
  if (!jim) yuklanmoqda.value = true
  try {
    d.value = await hisobotApi.agentOnline({ trek: trekKorsat.value ? 'true' : 'false' })
    yangilangan.value = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    await nextTick()
    await chiz()
  } catch (e) {
    console.error('Agent online yuklanmadi:', e)
  } finally {
    yuklanmoqda.value = false
  }
}

/* ── Xarita ── */
async function chiz() {
  const bor = d.value?.agentlar.filter(a => a.oxirgi) || []
  if (!mapEl.value || !bor.length) return

  if (!L) {
    L = (await import('leaflet')).default
    await import('leaflet/dist/leaflet.css')
  }
  if (!map) {
    const m = d.value!.markaz
    map = L.map(mapEl.value, { zoomControl: true })
      .setView(m ? [m.lat, m.lng] : [40.38, 71.78], 12)
    fonQatlam(L).addTo(map)
    layer = L.layerGroup().addTo(map)
  }
  layer.clearLayers()

  const bounds: [number, number][] = []

  bor.forEach(a => {
    const o = a.oxirgi!
    const tone = a.holat === 'online' ? '#047857'
      : a.holat === 'kutish' ? '#b45309' : '#64748b'
    const jonli = a.holat === 'online'

    // Yo'l izi
    if (trekKorsat.value && a.trek.length > 1) {
      L.polyline(a.trek.map(t => [t.lat, t.lng]), {
        color: rang(a.id), weight: 2.5, opacity: .5, dashArray: '5 5',
      }).addTo(layer)
    }

    const ic = L.divIcon({
      html: `<div class="ao-pin${jonli ? ' ao-pin--live' : ''}" style="--pc:${tone};--ac:${rang(a.id)}">
               <span class="ao-pin-l">${(a.fullname || '?')[0]}</span>
             </div>`,
      className: '', iconSize: [36, 36], iconAnchor: [18, 18],
    })

    L.marker([o.lat, o.lng], { icon: ic })
      .addTo(layer)
      .bindPopup(`
        <div style="font-size:12.5px;line-height:1.6;min-width:190px">
          <b style="font-size:13.5px">${a.fullname}</b><br>
          <span style="color:${tone};font-weight:700">
            ${a.holat === 'online' ? '● Online' : a.holat === 'kutish' ? '◐ Kutish' : '○ Oflayn'}
          </span> · ${yoshMatn(o.yosh_daq)}<br>
          ${o.battery != null ? 'Batareya: ' + o.battery + '%<br>' : ''}
          ${a.telefon ? a.telefon + '<br>' : ''}
          Bugun: ${a.bugun.tashrif}/${a.bugun.reja} tashrif · ${a.bugun.savdo} savdo
          ${a.bugun.hozir_mijozda ? '<br><b>Hozir: ' + a.bugun.hozir_mijozda + '</b>' : ''}
        </div>`)
      .on('click', () => { tanlangan.value = a.id })

    bounds.push([o.lat, o.lng])
  })

  // Kadrlash faqat birinchi chizishda — keyin foydalanuvchi ko'rinishi saqlanadi
  if (!map._kadrlandi && bounds.length) {
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [50, 50] })
    else map.setView(bounds[0], 14)
    map._kadrlandi = true
  }
}

function agentTanla(id: number) {
  tanlangan.value = id
  const a = d.value?.agentlar.find(x => x.id === id)
  if (a?.oxirgi && map) map.setView([a.oxirgi.lat, a.oxirgi.lng], 15, { animate: true })
}

/* ── Avto-yangilanish ── */
function boshla() {
  toxtat()
  // 30 soniya — "jonli" tuyulishi uchun yetarli, serverni ham ortiqcha yuklamaydi
  timer = window.setInterval(() => {
    if (document.visibilityState === 'visible') yukla(true)
  }, 30000)
}
function toxtat() { if (timer) { clearInterval(timer); timer = undefined } }
function autoToggle() {
  autoOn.value = !autoOn.value
  try { localStorage.setItem(AUTO_KEY, autoOn.value ? '1' : '0') } catch { /* xotira to'la */ }
  autoOn.value ? boshla() : toxtat()
}

onMounted(async () => {
  try { autoOn.value = localStorage.getItem(AUTO_KEY) !== '0' } catch { /* o'qib bo'lmadi */ }
  await yukla()
  if (autoOn.value) boshla()
})
onUnmounted(() => {
  toxtat()
  if (map) { map.remove(); map = null }
})
</script>

<style scoped>
.ao {
  --surface:#fff; --sunken:#f8fafc; --border:rgba(15,23,42,.09);
  --shadow:0 1px 2px rgba(15,23,42,.04), 0 2px 8px rgba(15,23,42,.05);
  --ink:#0f172a; --ink2:#334155; --muted:#5d6b7f;
  --accent:#4338ca; --accent-wash:rgba(15,118,110,.08);
  --good:#047857; --warning:#b45309; --critical:#be123c;
  display:flex; flex-direction:column; gap:12px; padding:2px 0 24px;
  color:var(--ink); height:calc(100vh - 92px);
}
:global(:root[data-theme="dark"]) .ao,
:global(.shell.dark) .ao {
  --surface:#212836; --sunken:#181e29; --border:rgba(255,255,255,.09);
  --shadow:0 1px 2px rgba(0,0,0,.24), 0 2px 8px rgba(0,0,0,.28);
  --ink:#e8eaf0; --ink2:#a8b0c0; --muted:#8b93a7;
  --accent:#818cf8; --accent-wash:rgba(129,140,248,.14);
  --good:#34d399; --warning:#fbbf24; --critical:#fb7185;
}

/* HEADER */
.ao-hd { display:flex; align-items:flex-start; gap:12px; flex-wrap:wrap; flex-shrink:0; }
.ao-title { display:flex; align-items:center; gap:9px; font-size:19px; font-weight:800;
            margin:0; letter-spacing:-.02em; }
.ao-live { display:inline-flex; align-items:center; gap:5px; font-size:10.5px; font-weight:800;
           text-transform:uppercase; letter-spacing:.4px; color:var(--good);
           background:color-mix(in oklab,var(--good) 12%,transparent);
           padding:3px 9px; border-radius:20px; }
.ao-dot { width:6px; height:6px; border-radius:50%; background:var(--good); position:relative; }
.ao-dot::after { content:''; position:absolute; inset:-3px; border-radius:50%;
                 border:2px solid color-mix(in oklab,var(--good) 40%,transparent);
                 animation:ao-ping 1.6s ease-out infinite; }
@keyframes ao-ping { 0%{transform:scale(.7);opacity:1} 100%{transform:scale(1.6);opacity:0} }
.ao-sub { font-size:12px; color:var(--muted); margin:3px 0 0; }
.ao-hd-r { margin-left:auto; display:flex; gap:8px; }
.ao-ib { width:34px; height:34px; border-radius:10px; border:1px solid var(--border);
         background:var(--surface); color:var(--ink2); cursor:pointer;
         display:flex; align-items:center; justify-content:center; }
.ao-ib svg { width:16px; height:16px; }
.ao-ib:hover:not(:disabled) { border-color:var(--accent); color:var(--accent); }
.ao-ib.on { background:var(--accent-wash); border-color:var(--accent); color:var(--accent); }
.ao-ib:disabled { opacity:.5; cursor:not-allowed; }
.ao-spin { animation:ao-rot 1s linear infinite; }
@keyframes ao-rot { to { transform:rotate(360deg) } }

/* HOLAT KARTALARI */
.ao-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; flex-shrink:0; }
.ao-stat { display:flex; align-items:center; gap:10px; padding:11px 13px;
           border:1px solid var(--border); border-radius:12px; background:var(--surface);
           box-shadow:var(--shadow); cursor:pointer; font:inherit; text-align:left;
           position:relative; overflow:hidden; --c:var(--accent); transition:.16s; }
.ao-stat::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--c); }
.ao-stat:hover { transform:translateY(-2px); box-shadow:0 8px 20px rgba(15,23,42,.09); }
.ao-stat.on { border-color:var(--c); background:color-mix(in oklab,var(--c) 6%,var(--surface)); }
.ao-stat-ic { width:32px; height:32px; border-radius:10px; flex-shrink:0;
              display:flex; align-items:center; justify-content:center;
              background:color-mix(in oklab,var(--c) 13%,transparent); }
.ao-bubble { width:11px; height:11px; border-radius:50%; background:var(--c); }
.ao-stat-v { display:block; font-size:19px; font-weight:800; line-height:1.1;
             font-variant-numeric:tabular-nums; }
.ao-stat-l { display:block; font-size:10.5px; color:var(--muted); margin-top:1px; }

/* ASOSIY */
.ao-body { display:grid; grid-template-columns:296px 1fr; gap:12px; flex:1; min-height:0; }

.ao-side { background:var(--surface); border:1px solid var(--border); border-radius:12px;
           box-shadow:var(--shadow); overflow-y:auto; padding:7px; }
.ao-row { width:100%; display:flex; align-items:center; gap:10px; padding:9px 10px;
          border:none; border-radius:10px; background:none; cursor:pointer;
          font:inherit; text-align:left; transition:background .14s; }
.ao-row:hover { background:var(--sunken); }
.ao-row.on { background:var(--accent-wash); }
.ao-av { position:relative; width:36px; height:36px; border-radius:11px; flex-shrink:0;
         color:#fff; font-size:14px; font-weight:800;
         display:flex; align-items:center; justify-content:center; }
.ao-badge { position:absolute; right:-2px; bottom:-2px; width:11px; height:11px;
            border-radius:50%; border:2px solid var(--surface); }
.ao-row-b { flex:1; min-width:0; display:block; }
.ao-row-n { display:block; font-size:12.5px; font-weight:700;
            overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ao-row-s { display:block; font-size:10.5px; color:var(--muted); margin-top:1px; }
.ao-now { display:flex; align-items:center; gap:4px; font-size:10px; font-weight:600;
          color:var(--accent); margin-top:3px; }
.ao-now svg { width:10px; height:10px; flex-shrink:0; }
.ao-row-r { display:flex; flex-direction:column; align-items:flex-end; gap:3px; flex-shrink:0; }
.ao-bat { font-size:10px; font-weight:700; color:var(--muted);
          background:var(--sunken); padding:2px 6px; border-radius:6px; }
.ao-bat.low { color:var(--critical); background:color-mix(in oklab,var(--critical) 12%,transparent); }
.ao-mini { font-size:10px; color:var(--muted); font-variant-numeric:tabular-nums; }

/* XARITA */
.ao-map-wrap { position:relative; border:1px solid var(--border); border-radius:12px;
               overflow:hidden; background:var(--sunken); box-shadow:var(--shadow); }
.ao-map { width:100%; height:100%; }
.ao-map-ov { position:absolute; inset:0; z-index:500; display:flex; flex-direction:column;
             align-items:center; justify-content:center; gap:10px;
             background:var(--sunken); color:var(--muted); font-size:13px; }
.ao-map-ov svg { width:32px; height:32px; opacity:.5; }
.ao-map-ov p { margin:0; }

.ao-legend { position:absolute; left:12px; bottom:12px; z-index:500;
             display:flex; align-items:center; gap:14px; flex-wrap:wrap;
             background:var(--surface); border:1px solid var(--border);
             border-radius:10px; padding:8px 13px; box-shadow:var(--shadow);
             font-size:11px; color:var(--ink2); }
.ao-legend i { display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:6px; }
.ao-trek { display:flex; align-items:center; gap:6px; cursor:pointer;
           padding-left:12px; border-left:1px solid var(--border); }
.ao-trek input { width:13px; height:13px; accent-color:var(--accent); cursor:pointer; }

.ao-load, .ao-empty-sm { display:flex; align-items:center; justify-content:center; gap:9px;
                         padding:36px 16px; color:var(--muted); font-size:12.5px; text-align:center; }
.ao-spin2 { width:16px; height:16px; border:2.5px solid var(--border);
            border-top-color:var(--accent); border-radius:50%;
            animation:ao-rot .7s linear infinite; }

@media (max-width:900px) {
  .ao { height:auto; }
  .ao-body { grid-template-columns:1fr; }
  .ao-side { max-height:260px; }
  .ao-map-wrap { height:400px; }
  .ao-stats { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
@media (prefers-reduced-motion: reduce) {
  .ao-dot::after, .ao-spin, .ao-spin2 { animation:none; }
  .ao-stat:hover { transform:none; }
}
</style>

<!-- Leaflet marker uslublari — scoped emas, chunki divIcon body ga chiqadi -->
<style>
.ao-pin { position:relative; width:36px; height:36px; border-radius:50%;
          background:var(--ac); border:3px solid #fff;
          box-shadow:0 2px 10px rgba(0,0,0,.32);
          display:flex; align-items:center; justify-content:center; }
.ao-pin::after { content:''; position:absolute; right:-1px; bottom:-1px;
                 width:12px; height:12px; border-radius:50%;
                 background:var(--pc); border:2px solid #fff; }
.ao-pin-l { color:#fff; font-size:14px; font-weight:800; line-height:1; }
.ao-pin--live::before { content:''; position:absolute; inset:-6px; border-radius:50%;
                        border:2px solid var(--pc); opacity:.6;
                        animation:ao-pulse 1.8s ease-out infinite; }
@keyframes ao-pulse {
  0%   { transform:scale(.85); opacity:.7 }
  100% { transform:scale(1.45); opacity:0 }
}
</style>
