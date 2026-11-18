<template>
  <div class="xm-page">

    <!-- ═══ HEAD ═══ -->
    <div class="xm-head">
      <button class="xm-back" @click="$router.push('/mijozlar')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      </button>
      <h2 class="xm-title">Xaritadagi mijozlar</h2>
      <div class="xm-head-right">
        <span class="xm-head-stat">
          Ko'rib chiqish:
          <b :class="{ 'xm-zero': !stat.koordinatali }">
            {{ stat.koordinatali ? stat.koordinatali + ' ta mijoz' : "Mijozlar yo'q" }}
          </b>
        </span>
      </div>
    </div>

    <!-- ═══ FILTRLAR ═══ -->
    <div class="xm-filters">
      <select v-model="f.kun" class="xm-sel">
        <option value="">Hafta kunlari</option>
        <option v-for="k in KUNLAR" :key="k" :value="k">{{ k }}</option>
      </select>

      <select v-model="f.agent_id" class="xm-sel">
        <option value="">Agentlar</option>
        <option v-for="a in sprav.agentlar" :key="a.id" :value="a.id">{{ a.fullname }}</option>
      </select>

      <select v-model="f.territoriya_id" class="xm-sel">
        <option value="">Hudud</option>
        <option v-for="t in sprav.territoriyalar" :key="t.id" :value="t.id">{{ t.nomi }}</option>
      </select>

      <select v-model="f.kategoriya_id" class="xm-sel">
        <option value="">Mijoz kategoriyasi</option>
        <option v-for="k in sprav.kategoriyalar" :key="k.id" :value="k.id">{{ k.nomi }}</option>
      </select>

      <select v-model="f.sinf" class="xm-sel">
        <option value="">Mijoz turi</option>
        <option v-for="s in ['A','B','C','D']" :key="s" :value="s">{{ s }} sinf</option>
      </select>

      <select v-model="f.faol" class="xm-sel">
        <option value="">Mijozlar faolligi</option>
        <option value="true">Faol</option>
        <option value="false">Nofaol</option>
      </select>

      <select v-model="f.tashrif" class="xm-sel">
        <option value="bari">Tashrif turi</option>
        <option value="qamralgan">Qamralgan</option>
        <option value="qamralmagan">Qamralmagan</option>
      </select>

      <button class="xm-btn-filter" @click="load">
        <span v-if="loading" class="xm-spin xm-spin--sm"/>
        Filtr
      </button>
      <button class="xm-btn-clear" @click="tozala">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        Filterni tozalash
      </button>
    </div>

    <!-- ═══ BODY ═══ -->
    <div class="xm-body">

      <!-- Chap panel -->
      <div class="xm-side">

        <!-- Agentlar -->
        <div class="xm-acc">
          <button class="xm-acc-hd" @click="openAgent = !openAgent">
            <svg class="xm-caret" :class="{ on: openAgent }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            <span class="xm-acc-t">Agentlar</span>
            <span class="xm-acc-badge">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg>
              {{ stat.qamralgan }} / {{ stat.jami }}
            </span>
          </button>

          <div v-if="openAgent" class="xm-acc-body">
            <div v-if="!agentlar.length" class="xm-empty-sm">Agent topilmadi</div>
            <div
              v-for="a in agentlar" :key="a.id"
              class="xm-arow"
              :class="{ on: String(f.agent_id) === String(a.id) }"
              @click="agentTanla(a.id)"
            >
              <span class="xm-adot" :style="{ background: agentRang(a.id) }"/>
              <span class="xm-aname">{{ a.fullname }}</span>
              <span class="xm-aqam" :class="qamClass(a)">{{ a.qamralgan }} / {{ a.mijoz_soni }}</span>
            </div>
          </div>
        </div>

        <!-- Statistika -->
        <div class="xm-acc">
          <button class="xm-acc-hd" @click="openStat = !openStat">
            <svg class="xm-caret" :class="{ on: openStat }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            <span class="xm-acc-t">Statistika</span>
          </button>

          <div v-if="openStat" class="xm-acc-body">
            <div class="xm-srow"><span>Jami mijoz</span><b>{{ stat.jami }}</b></div>
            <div class="xm-srow"><span>Xaritada</span><b>{{ stat.koordinatali }}</b></div>
            <div class="xm-srow">
              <span>Koordinatasiz</span>
              <b :class="{ 'xm-warn': koordsiz }">{{ koordsiz }}</b>
            </div>
            <div class="xm-srow"><span>Qamralgan</span><b class="xm-ok">{{ stat.qamralgan }}</b></div>
            <div class="xm-srow">
              <span>Qamralmagan</span>
              <b class="xm-bad">{{ stat.jami - stat.qamralgan }}</b>
            </div>

            <div class="xm-progress-wrap">
              <div class="xm-progress"><div class="xm-progress-in" :style="{ width: qamrovFoiz + '%' }"/></div>
              <span class="xm-progress-lbl">{{ qamrovFoiz }}% qamrov</span>
            </div>

            <!-- Kategoriya kesimi -->
            <template v-if="katStat.length">
              <div class="xm-sdiv">Kategoriya bo'yicha</div>
              <div v-for="k in katStat" :key="k.nomi" class="xm-srow">
                <span>{{ k.nomi }}</span><b>{{ k.soni }}</b>
              </div>
            </template>
          </div>
        </div>

        <!-- Legenda -->
        <div class="xm-legend">
          <div class="xm-lrow"><span class="xm-ldot" style="background:#10b981"/> Qamralgan</div>
          <div class="xm-lrow"><span class="xm-ldot" style="background:#ef4444"/> Qamralmagan</div>
        </div>
      </div>

      <!-- Xarita -->
      <div class="xm-map-wrap">
        <div v-if="loading" class="xm-map-ov"><span class="xm-spin"/> Yuklanmoqda...</div>
        <div v-else-if="!stat.koordinatali" class="xm-map-ov">
          <BoshHolat turi="qidiruv" sarlavha="Xaritada mijoz yo'q"
            matn="Tanlangan filtr bo'yicha koordinatasi kiritilgan mijoz topilmadi."
            amal="Filtrni tozalash" @amal="tozala"/>
        </div>
        <div ref="mapEl" class="xm-map"/>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
// @ts-ignore
import { api } from '@/api/api'
import { fonQatlam } from '@/utils/xarita'
import BoshHolat from '@/components/BoshHolat.vue'

const KUNLAR = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh']
const COLORS = ['#4f46e5','#059669','#d97706','#e11d48','#475569','#818cf8','#047857','#b45309']
const agentRang = (id) => COLORS[id % COLORS.length]

const loading  = ref(false)
const mijozlar = ref([])
const agentlar = ref([])
const openAgent = ref(true)
const openStat  = ref(true)
const mapEl = ref(null)

const sprav = reactive({ agentlar: [], territoriyalar: [], kategoriyalar: [] })
const stat  = reactive({ jami: 0, koordinatali: 0, qamralgan: 0 })

const f = reactive({
  kun: '', agent_id: '', territoriya_id: '', kategoriya_id: '',
  sinf: '', faol: '', tashrif: 'bari',
})

const koordsiz   = computed(() => stat.jami - stat.koordinatali)
const qamrovFoiz = computed(() => stat.jami ? Math.round(stat.qamralgan / stat.jami * 100) : 0)

// Kategoriya kesimi — filtrlangan ro'yxat ustidan sanaladi
const katStat = computed(() => {
  const m = new Map()
  mijozlar.value.forEach(x => {
    const nomi = x.kategoriya?.nomi || 'Kategoriyasiz'
    m.set(nomi, (m.get(nomi) || 0) + 1)
  })
  return [...m.entries()].map(([nomi, soni]) => ({ nomi, soni })).sort((a, b) => b.soni - a.soni)
})

function qamClass(a) {
  if (!a.mijoz_soni) return ''
  const p = a.qamralgan / a.mijoz_soni
  return p >= 0.8 ? 'xm-ok' : (p >= 0.4 ? 'xm-mid' : 'xm-bad')
}

function agentTanla(id) {
  f.agent_id = String(f.agent_id) === String(id) ? '' : id
  load()
}

function tozala() {
  Object.assign(f, {
    kun: '', agent_id: '', territoriya_id: '', kategoriya_id: '',
    sinf: '', faol: '', tashrif: 'bari',
  })
  load()
}

let map = null, layer = null, L = null

async function load() {
  loading.value = true
  try {
    const p = new URLSearchParams()
    Object.entries(f).forEach(([k, v]) => { if (v !== '' && v != null) p.append(k, v) })

    const d = await api.get('/mijozlar/xarita?' + p.toString())
    mijozlar.value = d.mijozlar || []
    agentlar.value = d.agentlar || []
    stat.jami         = d.jami || 0
    stat.koordinatali = d.koordinatali || 0
    stat.qamralgan    = d.qamralgan || 0
  } catch (e) {
    console.error('Xarita yuklash xatosi:', e)
    mijozlar.value = []
    agentlar.value = []
    Object.assign(stat, { jami: 0, koordinatali: 0, qamralgan: 0 })
  } finally {
    loading.value = false
    await nextTick()
    await chiz()
  }
}

async function chiz() {
  const bor = mijozlar.value.filter(m => m.lat != null && m.lng != null)
  if (!mapEl.value || !bor.length) return

  if (!L) {
    L = (await import('leaflet')).default
    await import('leaflet/dist/leaflet.css')
  }
  if (!map) {
    map = L.map(mapEl.value, { zoomControl: true }).setView([41.2995, 69.2401], 11)
    fonQatlam(L).addTo(map)
    layer = L.layerGroup().addTo(map)
  }
  layer.clearLayers()

  const bounds = []
  bor.forEach(m => {
    // Rang qamrov bo'yicha: yashil = tashrif bo'lgan, qizil = qamralmagan
    const rang = m.qamralgan ? '#10b981' : '#ef4444'
    const icon = L.divIcon({
      html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:${rang};
        transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.28);
        display:flex;align-items:center;justify-content:center">
        <div style="transform:rotate(45deg);color:#fff;font-size:10px;font-weight:800">
        ${(m.nomi || '?')[0].toUpperCase()}</div></div>`,
      className: '', iconSize: [26, 26], iconAnchor: [13, 26],
    })

    L.marker([m.lat, m.lng], { icon })
      .addTo(layer)
      .bindPopup(`
        <div style="font-size:12.5px;line-height:1.6;min-width:170px">
          <b style="font-size:13px">${m.nomi || ''}</b><br>
          ${m.manzil ? m.manzil + '<br>' : ''}
          ${m.agent?.fullname ? 'Agent: <b>' + m.agent.fullname + '</b><br>' : ''}
          ${m.kategoriya?.nomi ? 'Kategoriya: ' + m.kategoriya.nomi + '<br>' : ''}
          ${m.sinf ? 'Sinf: ' + m.sinf + '<br>' : ''}
          ${m.telefon ? m.telefon + '<br>' : ''}
          <span style="color:${rang};font-weight:700">
            ${m.qamralgan ? '✓ Qamralgan' : '✗ Qamralmagan'}</span>
        </div>`)

    bounds.push([m.lat, m.lng])
  })

  if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] })
  else if (bounds.length === 1) map.setView(bounds[0], 14)
}

onMounted(async () => {
  try {
    const d = await api.get('/mijozlar/spravochnik')
    sprav.agentlar      = d.agentlar || []
    sprav.territoriyalar = d.territoriyalar || []
    sprav.kategoriyalar  = d.kategoriyalar || []
  } catch (e) {
    console.error('Spravochnik xatosi:', e)
  }
  await load()
})

onBeforeUnmount(() => { if (map) { map.remove(); map = null } })
</script>

<style scoped>
.xm-page { display:flex; flex-direction:column; height:calc(100vh - 64px); background:#f8fafc; }

.xm-head { display:flex; align-items:center; gap:12px; padding:14px 20px; background:#fff; border-bottom:1px solid #e2e8f0; flex-shrink:0; }
.xm-back { width:30px; height:30px; border-radius:8px; border:1px solid #e2e8f0; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#475569; }
.xm-back:hover { background:#f1f5f9; }
.xm-title { font-size:17px; font-weight:800; color:#1e293b; margin:0; }
.xm-head-right { margin-left:auto; }
.xm-head-stat { font-size:13px; color:#64748b; }
.xm-head-stat b { color:#1e293b; margin-left:4px; }
.xm-head-stat b.xm-zero { color:#ef4444; }

.xm-filters { display:flex; flex-wrap:wrap; gap:8px; padding:12px 20px; background:#fff; border-bottom:1px solid #e2e8f0; flex-shrink:0; }
.xm-sel { flex:1; min-width:150px; max-width:220px; padding:8px 11px; border:1px solid #e2e8f0; border-radius:8px; font-size:12.5px; color:#334155; background:#fff; cursor:pointer; outline:none; }
.xm-sel:focus { border-color:#6366f1; }
.xm-btn-filter { display:flex; align-items:center; gap:6px; padding:8px 22px; border:none; border-radius:8px; background:#10b981; color:#fff; font-size:12.5px; font-weight:700; cursor:pointer; }
.xm-btn-filter:hover { background:#059669; }
.xm-btn-clear { display:flex; align-items:center; gap:6px; padding:8px 16px; border:1px solid #e2e8f0; border-radius:8px; background:#fff; color:#475569; font-size:12.5px; font-weight:600; cursor:pointer; }
.xm-btn-clear:hover { background:#f1f5f9; }

.xm-body { display:grid; grid-template-columns:320px 1fr; flex:1; min-height:0; }

.xm-side { background:#fff; border-right:1px solid #e2e8f0; overflow-y:auto; display:flex; flex-direction:column; }
.xm-acc { border-bottom:1px solid #f1f5f9; }
.xm-acc-hd { width:100%; display:flex; align-items:center; gap:8px; padding:12px 14px; border:none; background:#f8fafc; cursor:pointer; text-align:left; }
.xm-acc-hd:hover { background:#f1f5f9; }
.xm-caret { color:#94a3b8; transition:transform .15s; flex-shrink:0; }
.xm-caret.on { transform:rotate(90deg); }
.xm-acc-t { font-size:13px; font-weight:800; color:#1e293b; }
.xm-acc-badge { margin-left:auto; display:flex; align-items:center; gap:4px; font-size:11.5px; font-weight:700; color:#10b981; background:rgba(16,185,129,.1); padding:2px 8px; border-radius:9px; }
.xm-acc-body { padding:8px; }

.xm-arow { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:8px; cursor:pointer; transition:.12s; }
.xm-arow:hover { background:#f8fafc; }
.xm-arow.on { background:#eef2ff; }
.xm-adot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
.xm-aname { flex:1; font-size:12.5px; font-weight:600; color:#334155; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.xm-aqam { font-size:11.5px; font-weight:800; color:#64748b; }

.xm-srow { display:flex; align-items:center; justify-content:space-between; padding:6px 10px; font-size:12.5px; color:#64748b; }
.xm-srow b { color:#1e293b; font-size:13px; }
.xm-ok   { color:#10b981 !important; }
.xm-mid  { color:#f59e0b !important; }
.xm-bad  { color:#ef4444 !important; }
.xm-warn { color:#f59e0b !important; }
.xm-sdiv { font-size:10.5px; font-weight:700; color:#94a3b8; padding:10px 10px 4px; border-top:1px dashed #e2e8f0; margin-top:6px; }

.xm-progress-wrap { padding:8px 10px 4px; }
.xm-progress { height:6px; background:#f1f5f9; border-radius:4px; overflow:hidden; }
.xm-progress-in { height:100%; background:linear-gradient(90deg,#10b981,#059669); transition:width .3s; }
.xm-progress-lbl { display:block; font-size:11px; color:#94a3b8; margin-top:5px; }

.xm-legend { padding:12px 14px; margin-top:auto; border-top:1px solid #f1f5f9; }
.xm-lrow { display:flex; align-items:center; gap:7px; font-size:11.5px; color:#64748b; padding:3px 0; }
.xm-ldot { width:9px; height:9px; border-radius:50%; }

.xm-map-wrap { position:relative; background:#e2e8f0; }
.xm-map { width:100%; height:100%; }
.xm-map-ov { position:absolute; inset:0; z-index:500; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; background:rgba(248,250,252,.92); color:#94a3b8; font-size:13px; }

.xm-empty-sm { padding:14px; text-align:center; font-size:12px; color:#94a3b8; }
.xm-spin { display:inline-block; width:20px; height:20px; border:2.5px solid rgba(0,0,0,.08); border-top-color:#6366f1; border-radius:50%; animation:xm-rot .7s linear infinite; }
.xm-spin--sm { width:12px; height:12px; border-width:2px; border-color:rgba(255,255,255,.35); border-top-color:#fff; }
@keyframes xm-rot { to { transform:rotate(360deg) } }

@media(max-width:900px) {
  .xm-body { grid-template-columns:1fr; grid-template-rows:auto 1fr; }
  .xm-side { border-right:none; border-bottom:1px solid #e2e8f0; max-height:260px; }
}
</style>
