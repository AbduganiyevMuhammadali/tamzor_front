<template>
  <Teleport to="body">
    <Transition name="dm-fade">
      <div v-if="open" class="dm-ov" @click.self="$emit('update:open', false)">
        <div class="dm-box">

          <div class="dm-hd">
            <div class="dm-hd-ic">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <div class="dm-hd-info">
              <span class="dm-hd-title">Hududga yo'lga chiqarish</span>
              <span class="dm-hd-sub">
                {{ data?.ariza?.mijoz_nomi }} · #{{ data?.ariza?.raqam }}
                <template v-if="hudud"> · shu hududda {{ hudud.soni }} ta zakaz</template>
              </span>
            </div>
            <button class="dm-close" @click="$emit('update:open', false)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="dm-body">
            <!-- Chap: xarita — hududdagi REAL zakazlar -->
            <div class="dm-map-wrap">
              <div v-if="!loading && !hudud" class="dm-map-empty">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>Bu arizada mijoz koordinatasi yo'q —<br>hudud aniqlanmadi, dostavchini qo'lda tanlang</span>
              </div>
              <div ref="mapEl" class="dm-map"/>

              <!-- Hudud xulosasi -->
              <div v-if="hudud" class="dm-hudud-card">
                <div class="dm-hudud-row">
                  <span class="dm-hudud-dot"/>
                  <span class="dm-hudud-title">Shu tarafdagi zakazlar</span>
                </div>
                <div class="dm-hudud-stats">
                  <b>{{ tanlanganlar.length }}</b> / {{ hudud.soni }} ta tanlandi
                  <span class="dm-hudud-sep">·</span>
                  {{ fmtSum(tanlanganSumma) }}
                </div>
              </div>
            </div>

            <!-- O'ng: zakazlar + dostavchilar -->
            <div class="dm-side">

              <!-- Tab -->
              <div class="dm-tabs">
                <button class="dm-tab" :class="{ on: tab === 'zakaz' }" @click="tab = 'zakaz'">
                  Zakazlar
                  <span class="dm-tab-badge">{{ tanlanganlar.length }}</span>
                </button>
                <button class="dm-tab" :class="{ on: tab === 'dostavchi' }" @click="tab = 'dostavchi'">
                  Dostavchi
                  <span v-if="pickedNomi" class="dm-tab-badge dm-tab-badge--ok">✓</span>
                </button>
              </div>

              <div v-if="loading" class="dm-list-empty"><span class="dm-spin"/> Yuklanmoqda...</div>

              <!-- ── ZAKAZLAR ── -->
              <div v-else-if="tab === 'zakaz'" class="dm-list">
                <template v-if="hudud">
                  <div class="dm-list-hint">
                    Bu dostavchi shu tarafga chiqadi — birga yuboriladigan
                    zakazlarni belgilang ({{ data.radius_km }} km doirasi).
                  </div>
                  <div class="dm-selall">
                    <button class="dm-mini" @click="hammasini(true)">Hammasi</button>
                    <button class="dm-mini" @click="hammasini(false)">Faqat joriysi</button>
                  </div>

                  <label
                    v-for="a in hudud.arizalar" :key="a.ariza_id"
                    class="dm-zrow"
                    :class="{ on: tanlangan.has(a.ariza_id), joriy: a.joriy }"
                  >
                    <input
                      type="checkbox"
                      :checked="tanlangan.has(a.ariza_id)"
                      :disabled="a.joriy"
                      @change="toggleZakaz(a.ariza_id)"
                    >
                    <div class="dm-zinfo">
                      <span class="dm-zname">
                        {{ a.mijoz_nomi }}
                        <span v-if="a.joriy" class="dm-zbadge">joriy</span>
                      </span>
                      <span class="dm-zmeta">
                        #{{ a.raqam }} · {{ fmtSum(a.jami_summa) }}
                        <template v-if="a.masofa_km !== null"> · {{ a.masofa_km }} km</template>
                      </span>
                    </div>
                  </label>
                </template>
                <div v-else class="dm-list-empty">
                  Hudud aniqlanmadi — faqat shu ariza yuboriladi
                </div>

                <!-- Boshqa hududlar — ogohlantirish -->
                <div v-if="boshqaHududlar.length" class="dm-other">
                  <div class="dm-other-t">Boshqa hududlar — alohida dostavchi kerak</div>
                  <div v-for="h in boshqaHududlar" :key="h.kod" class="dm-other-row">
                    <span class="dm-other-dot"/>
                    {{ h.soni }} ta zakaz · {{ fmtSum(h.jami_summa) }}
                    <span class="dm-other-km">{{ hududOrasi(h) }} km narida</span>
                  </div>
                </div>
              </div>

              <!-- ── DOSTAVCHILAR ── -->
              <div v-else class="dm-list">
                <div v-if="!dostavchilar.length" class="dm-list-empty">Faol dostavchi topilmadi</div>
                <template v-else>
                  <div v-if="data?.tavsiya_sabab" class="dm-list-hint">
                    Tavsiya sababi: {{ data.tavsiya_sabab }}
                  </div>
                  <div
                    v-for="d in dostavchilar" :key="d.id"
                    class="dm-drow"
                    :class="{ on: pickedId === d.id, tavsiya: d.id === data?.tavsiya_id, band: d.band_boshqa_tarafda }"
                    @click="pickedId = pickedId === d.id ? null : d.id"
                  >
                    <div class="dm-drow-top">
                      <div class="dm-dav" :style="{ background: avatarColor(d.id) }">{{ d.ism[0] }}</div>
                      <div class="dm-dinfo">
                        <span class="dm-dname">
                          {{ d.ism }}
                          <span v-if="d.id === data?.tavsiya_id" class="dm-tavsiya-badge">★ Tavsiya</span>
                        </span>
                        <span class="dm-dmeta">{{ d.transport || '—' }}{{ d.mashina_raqam ? ' · ' + d.mashina_raqam : '' }}</span>
                      </div>
                      <svg v-if="pickedId === d.id" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>

                    <div class="dm-drow-stats">
                      <span v-if="d.shu_hududda > 0" class="dm-stat dm-stat--ok">
                        Shu hududda {{ d.shu_hududda }} ta
                      </span>
                      <span v-else-if="d.bosh" class="dm-stat dm-stat--free">Bo'sh</span>
                      <span v-else-if="d.band_boshqa_tarafda" class="dm-stat dm-stat--warn">
                        Boshqa tarafda {{ d.boshqa_hududda }} ta
                      </span>
                      <span class="dm-stat">{{ d.aktiv_buyurtma }} ta band</span>
                    </div>

                    <div v-if="d.band_boshqa_tarafda" class="dm-warn-hint">
                      Bu dostavchi boshqa hududda ishlayapti — yuborilsa ikki
                      tarafga bo'linib qoladi
                    </div>
                  </div>
                </template>
              </div>

            </div>
          </div>

          <div class="dm-ft">
            <div class="dm-ft-info">
              <template v-if="pickedNomi">
                <b>{{ pickedNomi }}</b> · {{ tanlanganlar.length }} ta zakaz
              </template>
              <template v-else>Avval dostavchini tanlang — buyurtma uning ilovasiga tushadi</template>
            </div>
            <button class="dm-btn-cancel" @click="$emit('update:open', false)">Bekor qilish</button>
            <button class="dm-btn-send" :disabled="submitting || !tanlanganlar.length || !pickedId" @click="submit">
              <span v-if="submitting" class="dm-spin dm-spin--sm"/>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              {{ submitting ? 'Yuborilmoqda...' : `${tanlanganlar.length} ta zakazni yo'lga chiqarish` }}
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
// @ts-ignore
import { arizaApi, dostavchiApi } from '@/api/api'
import { fonQatlam } from '@/utils/xarita'

const props = defineProps({
  open:    { type: Boolean, default: false },
  arizaId: { type: [Number, String], default: null },
})
const emit = defineEmits(['update:open', 'assigned', 'error'])

const COLORS = ['#7c3aed','#8b5cf6','#6d28d9','#5b21b6']
const avatarColor = (id) => COLORS[id % COLORS.length]
const fmtSum = (n) => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0)) + " so'm"

const data       = ref(null)
const loading    = ref(false)
const submitting = ref(false)
const pickedId   = ref(null)
const tanlangan  = ref(new Set())
const tab        = ref('zakaz')
const mapEl      = ref(null)

const hudud         = computed(() => data.value?.hudud || null)
const dostavchilar  = computed(() => data.value?.dostavchilar || [])
const boshqaHududlar= computed(() => (data.value?.hududlar || []).filter(h => !h.joriy_hudud))
const tanlanganlar  = computed(() => [...tanlangan.value])
const pickedNomi    = computed(() => dostavchilar.value.find(d => d.id === pickedId.value)?.ism || null)
const tanlanganSumma = computed(() => {
  if (!hudud.value) return 0
  return hudud.value.arizalar
    .filter(a => tanlangan.value.has(a.ariza_id))
    .reduce((s, a) => s + a.jami_summa, 0)
})

// Ikki hudud markazi orasidagi masofa — operator "qanchalik uzoq" ekanini ko'rsin
function hududOrasi(h) {
  if (!hudud.value) return '—'
  const R = 6371, d2r = Math.PI / 180
  const [a, b] = [hudud.value.markaz, h.markaz]
  const dLat = (b.lat - a.lat) * d2r, dLng = (b.lng - a.lng) * d2r
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*d2r)*Math.cos(b.lat*d2r)*Math.sin(dLng/2)**2
  return (R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x))).toFixed(0)
}

let map = null, markersLayer = null, L = null

watch(() => props.open, async (v) => {
  if (v) await loadAndOpen()
  else if (map) { map.remove(); map = null }
})

function toggleZakaz(id) {
  const s = new Set(tanlangan.value)
  s.has(id) ? s.delete(id) : s.add(id)
  tanlangan.value = s
  drawMarkers()
}

function hammasini(hammasi) {
  if (!hudud.value) return
  tanlangan.value = hammasi
    ? new Set(hudud.value.arizalar.map(a => a.ariza_id))
    : new Set([Number(props.arizaId)])
  drawMarkers()
}

async function loadAndOpen() {
  data.value = null
  pickedId.value = null
  tanlangan.value = new Set()
  tab.value = 'zakaz'
  loading.value = true

  try {
    const d = await dostavchiApi.hududTavsiya(props.arizaId)
    data.value = d
    pickedId.value = d.tavsiya_id || null
    // Sukut bo'yicha hududdagi hamma zakaz tanlangan — asosiy maqsad shu
    tanlangan.value = new Set(
      d.hudud ? d.hudud.arizalar.map(a => a.ariza_id) : [Number(props.arizaId)]
    )
  } catch (e) {
    emit('error', e.message || 'Yuklash xatosi')
  } finally {
    loading.value = false
    await nextTick()
    await initMap()
  }
}

async function initMap() {
  if (!mapEl.value || !hudud.value) return
  L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')

  if (map) { map.remove(); map = null }

  map = L.map(mapEl.value, { zoomControl: true })
    .setView([hudud.value.markaz.lat, hudud.value.markaz.lng], 12)
  fonQatlam(L).addTo(map)

  markersLayer = L.layerGroup().addTo(map)
  drawMarkers(true)
}

// Xaritada dostavchi emas, REAL ZAKAZLAR ko'rsatiladi — operator shu
// tarafda nima borligini ko'rib, qaysilarini birga yuborishni hal qiladi
function drawMarkers(fit = false) {
  if (!map || !markersLayer || !hudud.value) return
  markersLayer.clearLayers()
  const bounds = []

  hudud.value.arizalar.forEach((a, i) => {
    if (a.lat == null || a.lng == null) return
    const tanlandi = tanlangan.value.has(a.ariza_id)
    const rang = a.joriy ? '#ef4444' : (tanlandi ? '#8b5cf6' : '#94a3b8')
    const sz   = a.joriy ? 34 : 28

    const icon = L.divIcon({
      html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${rang};
        border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;
        align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;
        ${tanlandi ? '' : 'opacity:.5;'}">${i + 1}</div>`,
      className: '', iconSize: [sz, sz], iconAnchor: [sz/2, sz/2],
    })

    L.marker([a.lat, a.lng], { icon })
      .addTo(markersLayer)
      .bindTooltip(
        `${a.mijoz_nomi}<br>#${a.raqam} · ${fmtSum(a.jami_summa)}${a.joriy ? '<br><b>joriy ariza</b>' : ''}`,
        { permanent: false }
      )
      .on('click', () => { if (!a.joriy) toggleZakaz(a.ariza_id) })

    bounds.push([a.lat, a.lng])
  })

  // Hudud doirasi — qamrov chegarasi ko'rinib tursin
  L.circle([hudud.value.markaz.lat, hudud.value.markaz.lng], {
    radius: (data.value?.radius_km || 15) * 1000,
    color: '#8b5cf6', weight: 1.5, opacity: .35,
    fillColor: '#8b5cf6', fillOpacity: .06,
  }).addTo(markersLayer)

  if (fit) {
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [50, 50] })
    else if (bounds.length === 1) map.setView(bounds[0], 13)
  }
}

async function submit() {
  if (!tanlanganlar.value.length || !pickedId.value) return
  submitting.value = true
  try {
    const res = await arizaApi.topluYolda({
      ariza_idlar:  tanlanganlar.value,
      dostavchi_id: pickedId.value || null,
    })
    emit('assigned', {
      result: res,
      dostavchiId: pickedId.value,
      dostavchiNomi: pickedNomi.value,
      yuborildi: res.yuborildi,
      xatolar: res.xatolar,
    })
    emit('update:open', false)
  } catch (e) {
    emit('error', e.message || 'Xatolik')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.dm-ov { position:fixed; inset:0; background:rgba(15,23,42,.5); backdrop-filter:blur(5px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
.dm-box { background:#fff; border-radius:20px; width:100%; max-width:1040px; height:84vh; display:flex; flex-direction:column; box-shadow:0 28px 80px rgba(0,0,0,.22); overflow:hidden; }
.dm-fade-enter-active, .dm-fade-leave-active { transition:opacity .18s, transform .18s; }
.dm-fade-enter-from, .dm-fade-leave-to { opacity:0; transform:scale(.97) translateY(8px); }

.dm-hd { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid #f1f5f9; flex-shrink:0; }
.dm-hd-ic { width:34px; height:34px; border-radius:10px; background:linear-gradient(135deg,#8b5cf6,#8b5cf6); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.dm-hd-info { display:flex; flex-direction:column; }
.dm-hd-title { font-size:15px; font-weight:800; color:#1e293b; }
.dm-hd-sub { font-size:12px; color:#94a3b8; margin-top:1px; }
.dm-close { margin-left:auto; width:28px; height:28px; border-radius:7px; border:none; background:#f1f5f9; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; transition:.13s; }
.dm-close:hover { background:#fee2e2; color:#ef4444; }

.dm-body { display:grid; grid-template-columns:1fr 340px; flex:1; overflow:hidden; min-height:0; }

.dm-map-wrap { position:relative; background:#f1f5f9; }
.dm-map { width:100%; height:100%; }
.dm-map-empty { position:absolute; inset:0; z-index:5; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; color:#94a3b8; font-size:12.5px; background:#f8fafc; text-align:center; padding:20px; line-height:1.6; }

.dm-hudud-card { position:absolute; left:12px; bottom:12px; z-index:500; background:rgba(255,255,255,.96); backdrop-filter:blur(6px); border-radius:11px; padding:9px 13px; box-shadow:0 4px 18px rgba(0,0,0,.14); }
.dm-hudud-row { display:flex; align-items:center; gap:6px; }
.dm-hudud-dot { width:8px; height:8px; border-radius:50%; background:#8b5cf6; }
.dm-hudud-title { font-size:11.5px; font-weight:700; color:#334155; }
.dm-hudud-stats { font-size:12px; color:#64748b; margin-top:3px; }
.dm-hudud-stats b { color:#8b5cf6; font-size:13px; }
.dm-hudud-sep { margin:0 4px; color:#cbd5e1; }

.dm-side { border-left:1px solid #f1f5f9; display:flex; flex-direction:column; overflow:hidden; }
.dm-tabs { display:flex; padding:10px 12px 0; gap:6px; flex-shrink:0; }
.dm-tab { flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:8px; border:none; background:var(--seg-track); border-radius:9px 9px 0 0; font-size:12.5px; font-weight:600; color:var(--seg-ink); cursor:pointer; transition:.13s; }
.dm-tab:hover:not(.on) { color:var(--seg-ink-h); }
.dm-tab.on { background:var(--chip-on-bg); color:var(--chip-on-ink); box-shadow:inset 0 2px 0 var(--tab-line); }
.dm-tab-badge { font-size:10px; font-weight:800; background:#8b5cf6; color:#fff; border-radius:7px; padding:1px 6px; }
.dm-tab-badge--ok { background:#10b981; }

.dm-list { flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:8px; }
.dm-list-empty { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; color:#94a3b8; font-size:12.5px; padding:20px; text-align:center; }
.dm-list-hint { font-size:11px; color:#94a3b8; line-height:1.5; }
.dm-selall { display:flex; gap:6px; }
.dm-mini { flex:1; padding:5px; border:1px solid #e2e8f0; background:#fff; border-radius:7px; font-size:11px; font-weight:600; color:#475569; cursor:pointer; }
.dm-mini:hover { background:#f8fafc; border-color:#ddd6fe; }

.dm-zrow { display:flex; align-items:center; gap:9px; border:1.5px solid #e2e8f0; border-radius:11px; padding:9px 11px; cursor:pointer; transition:.13s; }
.dm-zrow:hover { border-color:#ddd6fe; }
.dm-zrow.on { border-color:#8b5cf6; background:#f5f3ff; }
.dm-zrow.joriy { border-color:#fca5a5; background:#fef2f2; }
.dm-zrow input { width:15px; height:15px; accent-color:#8b5cf6; cursor:pointer; flex-shrink:0; }
.dm-zrow input:disabled { cursor:not-allowed; }
.dm-zinfo { min-width:0; flex:1; }
.dm-zname { display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:700; color:#1e293b; }
.dm-zbadge { font-size:9px; font-weight:800; color:#dc2626; background:rgba(239,68,68,.12); padding:1px 5px; border-radius:6px; }
.dm-zmeta { display:block; font-size:10.5px; color:#94a3b8; margin-top:2px; }

.dm-other { margin-top:6px; border-top:1px dashed #e2e8f0; padding-top:9px; }
.dm-other-t { font-size:10.5px; font-weight:700; color:#94a3b8; margin-bottom:6px; }
.dm-other-row { display:flex; align-items:center; gap:6px; font-size:11px; color:#64748b; padding:4px 0; }
.dm-other-dot { width:6px; height:6px; border-radius:50%; background:#cbd5e1; flex-shrink:0; }
.dm-other-km { margin-left:auto; font-size:10px; color:#94a3b8; }

.dm-drow { border:1.5px solid #e2e8f0; border-radius:12px; padding:10px 12px; cursor:pointer; transition:.13s; display:flex; flex-direction:column; gap:8px; }
.dm-drow:hover { border-color:#ddd6fe; }
.dm-drow.on { border-color:#8b5cf6; background:#f5f3ff; box-shadow:0 2px 10px rgba(139,92,246,.1); }
.dm-drow.tavsiya { border-color:#fbbf24; }
.dm-drow.tavsiya.on { border-color:#8b5cf6; }
.dm-drow.band { opacity:.62; }

.dm-drow-top { display:flex; align-items:center; gap:9px; }
.dm-dav { width:32px; height:32px; border-radius:9px; color:#fff; font-size:13px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.dm-dinfo { flex:1; min-width:0; }
.dm-dname { display:flex; align-items:center; gap:6px; font-size:13px; font-weight:700; color:#1e293b; }
.dm-dmeta { display:block; font-size:11px; color:#94a3b8; margin-top:1px; }
.dm-tavsiya-badge { font-size:9.5px; font-weight:800; color:#d97706; background:rgba(251,191,36,.15); padding:1px 6px; border-radius:8px; white-space:nowrap; }

.dm-drow-stats { display:flex; gap:6px; flex-wrap:wrap; }
.dm-stat { display:flex; align-items:center; gap:4px; font-size:10.5px; font-weight:600; color:#64748b; background:#f8fafc; padding:3px 8px; border-radius:7px; }
.dm-stat--ok   { color:#10b981; background:rgba(16,185,129,.09); }
.dm-stat--free { color:#7c3aed; background:rgba(124,58,237,.09); }
.dm-stat--warn { color:#d97706; background:rgba(245,158,11,.1); }
.dm-warn-hint { font-size:10px; color:#d97706; line-height:1.45; }

.dm-ft { display:flex; align-items:center; gap:10px; padding:13px 20px; border-top:1px solid #f1f5f9; background:#f8fafc; flex-shrink:0; }
.dm-ft-info { flex:1; font-size:12px; color:#64748b; min-width:0; }
.dm-ft-info b { color:#1e293b; }
.dm-btn-cancel { padding:8px 16px; border-radius:9px; border:1.5px solid #e2e8f0; background:#fff; font-size:13px; font-weight:600; color:#334155; cursor:pointer; }
.dm-btn-cancel:hover { background:#f1f5f9; }
.dm-btn-send { display:flex; align-items:center; gap:7px; padding:9px 18px; border-radius:9px; border:none; background:linear-gradient(135deg,#10b981,#059669); color:#fff; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 3px 12px rgba(16,185,129,.3); transition:.13s; white-space:nowrap; }
.dm-btn-send:hover:not(:disabled) { transform:translateY(-1px); }
.dm-btn-send:disabled { opacity:.55; cursor:not-allowed; transform:none; }

.dm-spin { display:inline-block; width:16px; height:16px; border:2px solid rgba(0,0,0,.1); border-top-color:#8b5cf6; border-radius:50%; animation:dm-rot .7s linear infinite; }
.dm-spin--sm { width:13px; height:13px; border-width:2px; border-color:rgba(255,255,255,.3); border-top-color:#fff; }
@keyframes dm-rot { to { transform:rotate(360deg) } }

@media(max-width:820px) {
  .dm-body { grid-template-columns:1fr; grid-template-rows:1fr 280px; }
  .dm-side { border-left:none; border-top:1px solid #f1f5f9; }
}
</style>
