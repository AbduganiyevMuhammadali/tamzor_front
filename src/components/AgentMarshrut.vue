<template>
  <div class="mr">

    <!-- ═══ Yuqori panel ═══ -->
    <div class="mr-top">
      <div class="mr-stats">
        <div class="mr-stat">
          <span class="mr-stat-v">{{ d.jami.agent_soni }}</span>
          <span class="mr-stat-l">Yo'ldagi agent</span>
        </div>
        <i class="mr-div"/>
        <div class="mr-stat">
          <span class="mr-stat-v">{{ d.jami.tashrif_soni }}</span>
          <span class="mr-stat-l">Tashrif</span>
        </div>
        <i class="mr-div"/>
        <div class="mr-stat">
          <span class="mr-stat-v">{{ jamiKm }} km</span>
          <span class="mr-stat-l">Bosib o'tildi</span>
        </div>
        <i class="mr-div"/>
        <div class="mr-stat">
          <span class="mr-stat-v mr-ok">{{ fmtShort(d.jami.summa) }}</span>
          <span class="mr-stat-l">Savdo</span>
        </div>
      </div>

      <div class="mr-ctrl">
        <button class="mr-btn" :class="{ on: sana === bugunISO }" @click="sana = bugunISO; load()">Bugun</button>
        <input type="date" v-model="sana" class="mr-date" @change="load">
      </div>
    </div>

    <div v-if="loading" class="mr-load"><span class="mr-spin"/> Marshrut yuklanmoqda...</div>

    <BoshHolat v-else-if="!faolAgentlar.length" turi="reja"
      sarlavha="Bu kuni marshrut yo'q"
      :matn="sana === bugunISO
        ? 'Bugun hali birorta agent tashrif qayd etmagan.'
        : 'Tanlangan sanada agentlar tashrif qayd etmagan.'"
      :amal="sana !== bugunISO ? 'Bugunga qaytish' : ''"
      @amal="sana = bugunISO; load()"/>

    <div v-else class="mr-body">

      <!-- ── Chap: agentlar ── -->
      <div class="mr-side">
        <div class="mr-side-hd">Agentlar</div>
        <div
          v-for="a in faolAgentlar" :key="a.agent_id"
          class="mr-arow" :class="{ on: tanlangan === a.agent_id }"
          @click="tanla(a.agent_id)"
        >
          <span class="mr-adot" :style="{ background: rang(a.agent_id) }"/>
          <div class="mr-ainfo">
            <div class="mr-aname">{{ a.agent_nomi }}</div>
            <div class="mr-ameta">
              {{ a.tashrif_soni }}/{{ a.reja_soni }} tashrif · {{ a.jami_km }} km
            </div>
          </div>
          <div class="mr-aprog">
            <svg viewBox="0 0 32 32" class="mr-aring">
              <circle cx="16" cy="16" r="13" fill="none" stroke="#f1f5f9" stroke-width="4"/>
              <circle cx="16" cy="16" r="13" fill="none" :stroke="rang(a.agent_id)" stroke-width="4"
                stroke-linecap="round" transform="rotate(-90 16 16)"
                :stroke-dasharray="RING"
                :stroke-dashoffset="RING - RING * Math.min(1, a.reja_soni ? a.tashrif_soni / a.reja_soni : 1)"/>
            </svg>
            <span class="mr-apct">{{ a.reja_soni ? Math.round(a.tashrif_soni / a.reja_soni * 100) : 100 }}%</span>
          </div>
        </div>
      </div>

      <!-- ── O'rta: xarita ── -->
      <div class="mr-map-wrap">
        <div ref="mapEl" class="mr-map"/>
        <div class="mr-legend">
          <span><i class="mr-ld" style="background:#10b981"/> Savdo</span>
          <span><i class="mr-ld" style="background:#ef4444"/> Sotmaslik</span>
          <span><i class="mr-ld" style="background:#94a3b8"/> Ochiq</span>
          <span v-if="joriy" class="mr-lsep"/>
          <span v-if="joriy" :title="yolIzoh">{{ yolBelgi }}</span>
        </div>
      </div>

      <!-- ── O'ng: vaqt chizig'i ── -->
      <div class="mr-tl-wrap">
        <div class="mr-tl-hd">
          <span>{{ joriy?.agent_nomi }}</span>
          <span class="mr-tl-sub" v-if="joriy">
            {{ vaqt(joriy.boshlanish) }} — {{ vaqt(joriy.tugash) }}
            <template v-if="joriy.ish_vaqti_daq"> · {{ soat(joriy.ish_vaqti_daq) }}</template>
          </span>
        </div>

        <div class="mr-tl">
          <div
            v-for="t in (joriy?.toxtashlar || [])" :key="t.tashrif_id"
            class="mr-stop" :class="{ on: faolStop === t.tashrif_id }"
            @click="stopgaBor(t)"
          >
            <div class="mr-stop-l">
              <span class="mr-stop-n" :style="{ background: natijaRang(t.natija) }">{{ t.tartib }}</span>
              <i class="mr-stop-line"/>
            </div>
            <div class="mr-stop-r">
              <div class="mr-stop-t">
                {{ t.mijoz_nomi }}
                <span v-if="!t.rejada_bor" class="mr-badge">rejasiz</span>
              </div>
              <div class="mr-stop-m">
                {{ vaqt(t.checkin_vaqt) }}<template v-if="t.davomiylik_daq"> · {{ t.davomiylik_daq }} daq</template>
                <template v-if="t.oraliq_km"> · {{ t.oraliq_km }} km yo'l</template>
              </div>
              <div class="mr-stop-b">
                <span class="mr-pill" :class="natijaCls(t.natija)">{{ natijaLbl(t.natija) }}</span>
                <span v-if="t.summa" class="mr-sum">{{ fmtShort(t.summa) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
// @ts-ignore
import { hisobotApi } from '@/api/api'
import { fonQatlam } from '@/utils/xarita'
import BoshHolat from '@/components/BoshHolat.vue'

const props = defineProps({
  agentId: { type: [Number, String], default: '' },
})

const COLORS = ['#4f46e5','#059669','#d97706','#e11d48','#475569','#818cf8','#047857','#b45309']
const rang = (id) => COLORS[id % COLORS.length]
const RING = 2 * Math.PI * 13

const bugunISO = new Date().toISOString().slice(0, 10)
const sana      = ref(bugunISO)
const loading   = ref(false)
const tanlangan = ref(null)
const faolStop  = ref(null)
const mapEl     = ref(null)

const d = reactive({ sana: '', agentlar: [], jami: { agent_soni: 0, tashrif_soni: 0, km: 0, summa: 0 } })

const faolAgentlar = computed(() => d.agentlar.filter(a => a.tashrif_soni > 0))
const joriy = computed(() => faolAgentlar.value.find(a => a.agent_id === tanlangan.value) || null)

// Jami masofa: OSRM haqiqiy yo'l bo'yicha hisoblagan bo'lsa o'shani olamiz,
// aks holda to'xtashlar orasidagi to'g'ri chiziq yig'indisi
const jamiKm = computed(() =>
  +faolAgentlar.value.reduce((s, a) => s + (a.yol_km ?? a.jami_km), 0).toFixed(1))

// Yo'l qaysi manbadan chizilgani — operator ishonchi uchun ochiq ko'rsatiladi
const yolBelgi = computed(() => {
  const a = joriy.value
  if (!a) return ''
  if (a.yol_manba === 'gps')  return `GPS izi · ${a.jami_km} km`
  if (a.yol_manba === 'osrm') return `Yo'l bo'ylab · ${a.yol_km ?? a.jami_km} km`
  return `Taxminiy · ${a.jami_km} km`
})
const yolIzoh = computed(() => {
  const m = joriy.value?.yol_manba
  if (m === 'gps')  return "Agent telefonidan kelgan GPS izi bo'yicha"
  if (m === 'osrm') return "To'xtashlar orasidagi haqiqiy avtomobil yo'li"
  return "Yo'l ma'lumoti yo'q — to'xtashlar to'g'ri chiziq bilan bog'landi"
})

let map = null, layer = null, L = null

async function load() {
  loading.value = true
  try {
    const p = { sana: sana.value }
    if (props.agentId) p.agent_id = props.agentId

    const r = await hisobotApi.agentMarshrut(p)
    Object.assign(d, {
      sana: r.sana,
      agentlar: r.agentlar || [],
      jami: r.jami || d.jami,
    })
    // Avval tanlangani saqlanadi, bo'lmasa eng faoli
    const bor = faolAgentlar.value.some(a => a.agent_id === tanlangan.value)
    if (!bor) tanlangan.value = faolAgentlar.value[0]?.agent_id ?? null
    faolStop.value = null
  } catch (e) {
    console.error('Marshrut xatosi:', e)
    d.agentlar = []
  } finally {
    loading.value = false
    await nextTick()
    await chiz()
  }
}

function tanla(id) {
  tanlangan.value = id
  faolStop.value = null
  chiz()
}

// Vaqt chizig'idan bosilganda xaritada o'sha nuqtaga uchamiz
function stopgaBor(t) {
  faolStop.value = t.tashrif_id
  if (map && t.lat != null) map.flyTo([t.lat, t.lng], 15, { duration: .6 })
}

async function chiz() {
  const a = joriy.value
  if (!mapEl.value || !a) return

  if (!L) {
    L = (await import('leaflet')).default
    await import('leaflet/dist/leaflet.css')
  }
  if (!map) {
    map = L.map(mapEl.value, { zoomControl: true })
      .setView([a.markaz?.lat || 40.39, a.markaz?.lng || 71.78], 12)
    fonQatlam(L).addTo(map)
    layer = L.layerGroup().addTo(map)
  }
  layer.clearLayers()

  const nuqtalar = a.toxtashlar.filter(t => t.lat != null)
  if (!nuqtalar.length) return

  // Backend haqiqiy yo'lni beradi (GPS izi yoki OSRM ko'chalar bo'ylab).
  // Bo'lmasa — to'xtashlarni to'g'ri chiziq bilan bog'laymiz.
  const yol = (a.yol && a.yol.length > 1)
    ? a.yol
    : nuqtalar.map(t => [t.lat, t.lng])

  const haqiqiy = a.yol_manba === 'gps' || a.yol_manba === 'osrm'

  // Oq "ko'lanka" — yo'l xarita ustida aniq ko'rinsin
  L.polyline(yol, { color: '#fff', weight: haqiqiy ? 8 : 7, opacity: .9 }).addTo(layer)
  L.polyline(yol, {
    color: rang(a.agent_id),
    weight: haqiqiy ? 4.5 : 3.5,
    opacity: .95,
    lineCap: 'round',
    lineJoin: 'round',
    // Haqiqiy yo'l — yaxlit chiziq; taxminiy — punktir
    ...(haqiqiy ? {} : { dashArray: '1 8' }),
  }).addTo(layer)

  // To'xtash markerlari — tartib raqami bilan
  nuqtalar.forEach(t => {
    const oxirgi = t.tartib === nuqtalar.length
    const sz = oxirgi ? 34 : 30
    const rng = natijaRang(t.natija)

    const icon = L.divIcon({
      html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${rng};
        border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.32);display:flex;
        align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:800">
        ${t.tartib}</div>`,
      className: '', iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
    })

    L.marker([t.lat, t.lng], { icon })
      .addTo(layer)
      .bindPopup(`
        <div style="font-size:12.5px;line-height:1.65;min-width:180px">
          <b style="font-size:13px">${t.tartib}. ${t.mijoz_nomi}</b><br>
          ${t.manzil ? t.manzil + '<br>' : ''}
          ${vaqt(t.checkin_vaqt)}${t.davomiylik_daq ? ' · ' + t.davomiylik_daq + ' daq' : ''}<br>
          ${t.oraliq_km ? 'Oldingisidan: ' + t.oraliq_km + ' km<br>' : ''}
          <span style="color:${rng};font-weight:700">${natijaLbl(t.natija)}</span>
          ${t.summa ? ' · ' + fmtShort(t.summa) : ''}
        </div>`)
      .on('click', () => { faolStop.value = t.tashrif_id })
  })

  // Boshlanish nuqtasi — alohida belgi
  if (yol.length) {
    L.marker(yol[0], {
      icon: L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#fff;
          border:3px solid ${rang(a.agent_id)};box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
        className: '', iconSize: [14, 14], iconAnchor: [7, 7],
      }),
    }).addTo(layer).bindTooltip('Boshlanish', { permanent: false })
  }

  // Butun yo'l ko'rinsin (faqat to'xtashlar emas)
  map.fitBounds(yol, { padding: [45, 45], maxZoom: 15 })
}

// ── Formatters ──
function fmtShort(v) {
  const n = Number(v || 0)
  if (n >= 1e9) return (n / 1e9).toFixed(1) + ' mlrd'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' mln'
  if (n >= 1e3) return Math.round(n / 1e3) + ' ming'
  return String(Math.round(n))
}
function vaqt(s) {
  if (!s) return '—'
  const dt = new Date(s)
  return isNaN(dt) ? '—' : dt.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}
function soat(daq) {
  const h = Math.floor(daq / 60), m = daq % 60
  return h ? `${h} soat ${m ? m + ' daq' : ''}`.trim() : `${m} daq`
}
function natijaRang(n) { return n === 'savdo' ? '#10b981' : (n === 'sotmaslik' ? '#ef4444' : '#94a3b8') }
function natijaCls(n)  { return n === 'savdo' ? 'g' : (n === 'sotmaslik' ? 'r' : 'y') }
function natijaLbl(n)  { return n === 'savdo' ? 'Savdo' : (n === 'sotmaslik' ? 'Sotmaslik' : 'Ochiq') }

watch(() => props.agentId, load)
onMounted(load)
onBeforeUnmount(() => { if (map) { map.remove(); map = null } })
</script>

<style scoped>
.mr { display:flex; flex-direction:column; gap:12px; }

/* ── Yuqori panel ── */
.mr-top { display:flex; align-items:center; gap:14px; flex-wrap:wrap;
          background:#fff; border:1px solid #e2e8f0; border-radius:13px; padding:12px 16px; }
.mr-stats { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.mr-stat { display:flex; flex-direction:column; }
.mr-stat-v { font-size:16px; font-weight:800; color:#1e293b; line-height:1.15; }
.mr-stat-l { font-size:10.5px; color:#94a3b8; margin-top:2px; }
.mr-ok { color:#10b981; }
.mr-div { width:1px; height:26px; background:#e2e8f0; }
.mr-ctrl { margin-left:auto; display:flex; align-items:center; gap:8px; }
.mr-btn { padding:7px 14px; border:1px solid #e2e8f0; border-radius:8px; background:#fff;
          font-size:12.5px; font-weight:600; color:#475569; cursor:pointer; transition:.14s; }
.mr-btn:hover { background:#f8fafc; }
.mr-btn.on { background:#eef2ff; border-color:#c7d2fe; color:#4f46e5; }
.mr-date { padding:6px 10px; border:1px solid #e2e8f0; border-radius:8px; font-size:12px; color:#334155; outline:none; }

/* ── Tana ── */
.mr-body { display:grid; grid-template-columns:230px 1fr 290px; gap:12px; height:560px; }

.mr-side { background:#fff; border:1px solid #e2e8f0; border-radius:13px; padding:9px; overflow-y:auto; }
.mr-side-hd { font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase;
              letter-spacing:.04em; padding:5px 8px 9px; }
.mr-arow { display:flex; align-items:center; gap:9px; padding:9px 10px; border-radius:10px;
           cursor:pointer; transition:.14s; }
.mr-arow:hover { background:#f8fafc; }
.mr-arow.on { background:#eef2ff; }
.mr-adot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
.mr-ainfo { flex:1; min-width:0; }
.mr-aname { font-size:12.5px; font-weight:700; color:#1e293b; overflow:hidden;
            text-overflow:ellipsis; white-space:nowrap; }
.mr-ameta { font-size:10.5px; color:#94a3b8; margin-top:2px; }
.mr-aprog { position:relative; width:32px; height:32px; flex-shrink:0; }
.mr-aring { width:32px; height:32px; }
.mr-apct { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
           font-size:8.5px; font-weight:800; color:#475569; }

.mr-map-wrap { position:relative; border:1px solid #e2e8f0; border-radius:13px; overflow:hidden; background:#e2e8f0; }
.mr-map { width:100%; height:100%; }
.mr-legend { position:absolute; left:10px; bottom:10px; z-index:500; display:flex; gap:11px;
             background:rgba(255,255,255,.95); backdrop-filter:blur(5px); padding:6px 11px;
             border-radius:9px; box-shadow:0 3px 12px rgba(0,0,0,.12); font-size:10.5px; color:#475569; }
.mr-ld { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:4px; }
.mr-lsep { width:1px; height:12px; background:#e2e8f0; margin:0 2px; }

/* ── Vaqt chizig'i ── */
.mr-tl-wrap { background:#fff; border:1px solid #e2e8f0; border-radius:13px;
              display:flex; flex-direction:column; overflow:hidden; }
.mr-tl-hd { padding:12px 14px; border-bottom:1px solid #f1f5f9; }
.mr-tl-hd > span:first-child { font-size:13px; font-weight:800; color:#1e293b; display:block; }
.mr-tl-sub { font-size:11px; color:#94a3b8; margin-top:2px; display:block; }
.mr-tl { flex:1; overflow-y:auto; padding:12px 14px; }

.mr-stop { display:flex; gap:11px; cursor:pointer; }
.mr-stop-l { display:flex; flex-direction:column; align-items:center; flex-shrink:0; }
.mr-stop-n { width:25px; height:25px; border-radius:50%; color:#fff; font-size:11px; font-weight:800;
             display:flex; align-items:center; justify-content:center; flex-shrink:0;
             box-shadow:0 2px 5px rgba(0,0,0,.14); }
.mr-stop-line { flex:1; width:2px; background:#e2e8f0; margin:3px 0; border-radius:1px; }
.mr-stop:last-child .mr-stop-line { display:none; }
.mr-stop-r { flex:1; min-width:0; padding-bottom:15px; border-radius:8px; transition:.14s; }
.mr-stop.on .mr-stop-r { background:#eef2ff; padding:5px 8px 12px; margin:-5px -8px 0; }
.mr-stop-t { font-size:12.5px; font-weight:700; color:#1e293b; display:flex; align-items:center; gap:6px; }
.mr-stop-m { font-size:10.5px; color:#94a3b8; margin-top:2px; }
.mr-stop-b { display:flex; align-items:center; gap:7px; margin-top:5px; }
.mr-badge { font-size:8.5px; font-weight:800; color:#d97706; background:rgba(245,158,11,.14);
            padding:1px 5px; border-radius:5px; }
.mr-pill { font-size:10px; font-weight:700; padding:2px 8px; border-radius:7px; }
.mr-pill.g { background:rgba(16,185,129,.1); color:#10b981; }
.mr-pill.r { background:rgba(239,68,68,.1); color:#ef4444; }
.mr-pill.y { background:rgba(148,163,184,.14); color:#64748b; }
.mr-sum { font-size:11px; font-weight:700; color:#1e293b; }

.mr-load { display:flex; align-items:center; justify-content:center; gap:10px;
           padding:60px; color:#94a3b8; font-size:13px; }
.mr-spin { display:inline-block; width:18px; height:18px; border:2.5px solid rgba(0,0,0,.08);
           border-top-color:#6366f1; border-radius:50%; animation:mr-rot .7s linear infinite; }
@keyframes mr-rot { to { transform:rotate(360deg) } }

@media(max-width:1100px) {
  .mr-body { grid-template-columns:1fr; height:auto; grid-auto-rows:min-content; }
  .mr-map-wrap { height:360px; }
  .mr-side, .mr-tl-wrap { max-height:280px; }
}
</style>
