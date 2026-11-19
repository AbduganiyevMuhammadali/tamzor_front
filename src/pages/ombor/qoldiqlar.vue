<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick, toRef } from 'vue'
import { useRoute } from 'vue-router'
import { hisobotApi } from '@/api/api'
import { useToast } from '@/composables/useToast'
import { useQidiruv } from '@/composables/useQidiruv'

const toast = useToast()
const route = useRoute()

// ?ombor=... — boshqa sahifadan (masalan Ishlab chiqarish → Xom ashyo ombori) shu ombor bilan ochish
const filter = reactive({ ombor: typeof route.query.ombor === 'string' ? route.query.ombor : '', turkum: '', search: '' })

const rows    = ref([])
const loading = ref(false)

const qd = useQidiruv({
  matn: toRef(filter, 'search'), yuklanmoqda: loading,
  kalit: () => [filter.ombor, filter.turkum],
  yukla: q => {
    const p = {}
    if (filter.ombor)   p.ombor   = filter.ombor
    if (filter.turkum)  p.turkum  = filter.turkum
    if (q)              p.search  = q
    return hisobotApi.qoldiqlar(p)
  },
  qolla: d => { rows.value = d },
  xato: e => toast.error('Yuklash xatosi', e.message || ''),
})
const load = () => qd.qayta()

onMounted(load)
watch(() => [filter.ombor, filter.turkum], load)

// Turkumlar (filter uchun)
const turkumlar = computed(() => [...new Set(rows.value.map(r => r.turkum))].sort())
const omborlar  = computed(() => [...new Set(rows.value.map(r => r.ombor))].sort())

// Jami
const jamiDona    = computed(() => rows.value.reduce((s, r) => s + r.qoldiq_dona, 0))
const jamiSumma    = computed(() => rows.value.reduce((s, r) => s + r.qoldiq_summa, 0))
const jamiKirim    = computed(() => rows.value.reduce((s, r) => s + Number(r.kirim_dona || 0), 0))
const jamiChiqim   = computed(() => rows.value.reduce((s, r) => s + Number(r.chiqim_dona || 0), 0))
const aylanishFoiz = computed(() => jamiKirim.value > 0 ? Math.min(100, (jamiChiqim.value / jamiKirim.value) * 100) : 0)
const tugaganSoni  = computed(() => rows.value.filter(r => r.qoldiq_dona <= 0).length)
const kamSoni      = computed(() => rows.value.filter(r => r.qoldiq_dona > 0 && r.qoldiq_dona <= 10).length)

function fmtSum(n) { return Number(n || 0).toLocaleString('uz-UZ') }
function fmtDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  return d.toLocaleDateString('uz-UZ') + ' ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}
function shortSum(n) {
  n = Number(n || 0)
  if (n >= 1e9) return (n / 1e9).toFixed(1) + ' mlrd'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' mln'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + ' ming'
  return n.toString()
}
function pachkaLabel(r) {
  const blok = Number(r.blokdagi_soni || 1)
  if (blok <= 1) return null
  const pachka = r.qoldiq_pachka_dona ?? Math.floor(Number(r.qoldiq_dona || 0) / blok)
  const qoldiq = r.qoldiq_ortiqcha_dona ?? (Number(r.qoldiq_dona || 0) - pachka * blok)
  return qoldiq > 0 ? `${pachka} pach. + ${qoldiq}` : `${pachka} pach.`
}

const COLORS = ['#7c3aed','#8b5cf6','#6d28d9','#5b21b6']
function avatarColor(name) {
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return COLORS[Math.abs(h) % COLORS.length]
}

// Qoldiq holati — nisbiy (o'sha tovarning eng katta kirimiga nisbatan foiz sifatida bar uchun)
function qoldiqPct(r) {
  if (!r.kirim_dona) return 0
  return Math.max(2, Math.min(100, (r.qoldiq_dona / r.kirim_dona) * 100))
}
function qoldiqClass(dona) {
  if (dona <= 0)   return 'qd-zero'
  if (dona <= 10)  return 'qd-low'
  if (dona <= 50)  return 'qd-mid'
  return 'qd-ok'
}
function qoldiqLabel(dona) {
  if (dona <= 0)   return 'Tugagan'
  if (dona <= 10)  return 'Kam'
  if (dona <= 50)  return 'O\'rta'
  return 'Yetarli'
}

// ─── Detail drawer ──────────────────────────────────────────────────────
const activeRow      = ref(null)
const detailLoading   = ref(false)
const detailRows      = ref([])

async function openDetail(r) {
  activeRow.value = r
  detailLoading.value = true
  detailRows.value = []
  try {
    detailRows.value = await hisobotApi.qoldiqDetail(r.tovar_id, { ombor: r.ombor })
  } catch (e) {
    toast.error('Tafsilot yuklanmadi', e.message || '')
  } finally {
    detailLoading.value = false
  }
}
function closeDetail() { activeRow.value = null }

// ─── Sana bo'yicha jonli mini-diagramma (oxirgi 14 kunlik chiqim) ───────
const sparkPoints = computed(() => {
  if (!detailRows.value.length) return ''
  const now = new Date()
  const days = 14
  const buckets = Array.from({ length: days }, () => 0)
  detailRows.value.forEach(r => {
    if (r.yonalish !== 'chiqim') return
    const d = new Date(r.sana)
    const diff = Math.floor((now - d) / 86400000)
    if (diff >= 0 && diff < days) buckets[days - 1 - diff] += r.dona
  })
  const max = Math.max(...buckets, 1)
  const w = 260, h = 48, step = w / (days - 1)
  return buckets.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h * 0.85 - 4).toFixed(1)}`).join(' ')
})
</script>

<template>
  <div class="qd">

    <!-- ══ HEADER ══ -->
    <div class="qd-header">
      <div class="qd-header-l">
        <div class="qd-icon">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd"/></svg>
        </div>
        <div>
          <h1 class="qd-title">Ombor qoldiqlari</h1>
          <p class="qd-sub">Har bir tovar va omborning joriy holati — jonli</p>
        </div>
      </div>
    </div>

    <!-- ══ KPI STRIP ══ -->
    <div class="qd-kpis">
      <div class="qd-kpi" style="--d:0ms">
        <div class="qd-kpi-ic qd-kpi-ic--indigo"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg></div>
        <div class="qd-kpi-body">
          <span class="qd-kpi-val">{{ rows.length }}</span>
          <span class="qd-kpi-lbl">Pozitsiya</span>
        </div>
      </div>
      <div class="qd-kpi" style="--d:60ms">
        <div class="qd-kpi-ic qd-kpi-ic--violet"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1V4a1 1 0 00-1-1H4zM4 8a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1V9a1 1 0 00-1-1H4zM4 13a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1v-1a1 1 0 00-1-1H4zM9 3a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1V4a1 1 0 00-1-1H9zM9 8a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1V9a1 1 0 00-1-1H9zM9 13a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1v-1a1 1 0 00-1-1H9zM14 3a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1V4a1 1 0 00-1-1h-1zM14 8a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1V9a1 1 0 00-1-1h-1zM14 13a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1v-1a1 1 0 00-1-1h-1z"/></svg></div>
        <div class="qd-kpi-body">
          <span class="qd-kpi-val">{{ fmtSum(jamiDona) }}</span>
          <span class="qd-kpi-lbl">Jami kg</span>
        </div>
      </div>
      <div class="qd-kpi qd-kpi--accent" style="--d:120ms">
        <div class="qd-kpi-ic qd-kpi-ic--emerald"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/></svg></div>
        <div class="qd-kpi-body">
          <span class="qd-kpi-val">{{ shortSum(jamiSumma) }}</span>
          <span class="qd-kpi-lbl">Ombor qiymati</span>
        </div>
      </div>
      <div class="qd-kpi" style="--d:180ms">
        <div class="qd-kpi-ring">
          <svg viewBox="0 0 40 40" class="qd-ring-svg">
            <circle cx="20" cy="20" r="17" fill="none" stroke="var(--card-border,#e5e7eb)" stroke-width="4"/>
            <circle cx="20" cy="20" r="17" fill="none" stroke="#8b5cf6" stroke-width="4" stroke-linecap="round"
              :stroke-dasharray="`${aylanishFoiz * 1.068} 1000`" transform="rotate(-90 20 20)" class="qd-ring-prog"/>
          </svg>
          <span class="qd-ring-txt">{{ aylanishFoiz.toFixed(0) }}%</span>
        </div>
        <div class="qd-kpi-body">
          <span class="qd-kpi-val" style="font-size:14px">Aylanish</span>
          <span class="qd-kpi-lbl">kirim → sotildi</span>
        </div>
      </div>
      <div class="qd-kpi" :class="{ 'qd-kpi--warn': kamSoni + tugaganSoni > 0 }" style="--d:240ms">
        <div class="qd-kpi-ic qd-kpi-ic--amber"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg></div>
        <div class="qd-kpi-body">
          <span class="qd-kpi-val">{{ kamSoni + tugaganSoni }}</span>
          <span class="qd-kpi-lbl">Diqqat talab (kam/tugagan)</span>
        </div>
      </div>
    </div>

    <!-- ══ FILTERS ══ -->
    <div class="qd-filters">
      <div class="qd-srch">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
        <input v-model="filter.search" maxlength="100" @keydown.enter="qd.darhol()" class="qd-srch-in" placeholder="Tovar nomi bo'yicha qidirish..."/>
        <button v-if="filter.search" class="qd-srch-clear" @click="filter.search = ''">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
        </button>
      </div>
      <select v-model="filter.ombor" class="qd-sel">
        <option value="">Barcha omborlar</option>
        <option v-for="o in omborlar" :key="o" :value="o">{{ o }}</option>
      </select>
      <select v-model="filter.turkum" class="qd-sel">
        <option value="">Barcha turkumlar</option>
        <option v-for="t in turkumlar" :key="t">{{ t }}</option>
      </select>
      <button class="qd-refresh" @click="load" :class="{ 'qd-refresh--spin': loading }" title="Yangilash">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>
      </button>
    </div>

    <!-- ══ TABLE ══ -->
    <div class="qd-card">
      <div class="qd-tbl-wrap">
        <div v-if="loading && !rows.length" class="qd-loading">
          <span class="qd-spin"/>
          Yuklanmoqda...
        </div>
        <table v-else class="qd-tbl">
          <thead>
            <tr>
              <th class="qd-th qd-th--av"></th>
              <th class="qd-th">Tovar nomi</th>
              <th class="qd-th">Turkum</th>
              <th class="qd-th">Ombor</th>
              <th class="qd-th qd-th--r">Kirim</th>
              <th class="qd-th qd-th--r">Chiqim</th>
              <th class="qd-th qd-th--bar">Zaxira darajasi</th>
              <th class="qd-th qd-th--r qd-th--accent">Qoldiq</th>
              <th class="qd-th qd-th--r qd-th--sum">Qiymati</th>
              <th class="qd-th qd-th--c">Holat</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="rows.length === 0">
              <td colspan="10" class="qd-empty">
                <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd"/></svg>
                Qoldiqlar topilmadi
              </td>
            </tr>
            <tr v-for="(r, i) in rows" :key="`${r.tovar_id}_${r.ombor}`" class="qd-tr" :style="{ '--ri': i }" @click="openDetail(r)">
              <td class="qd-td qd-td--av">
                <div class="qd-av" :style="{ background: avatarColor(r.tovar_nomi) + '22', color: avatarColor(r.tovar_nomi) }">
                  {{ (r.tovar_nomi || '?').charAt(0).toUpperCase() }}
                </div>
              </td>
              <td class="qd-td qd-td--name">{{ r.tovar_nomi }}</td>
              <td class="qd-td">
                <span v-if="r.turkum" class="qd-chip">{{ r.turkum }}</span>
                <span v-else class="qd-muted">—</span>
              </td>
              <td class="qd-td">
                <span class="qd-ombor-tag">{{ r.ombor }}</span>
              </td>
              <td class="qd-td qd-td--r qd-td--num">{{ fmtSum(r.kirim_dona) }}</td>
              <td class="qd-td qd-td--r qd-td--num">
                <span :class="r.chiqim_dona > 0 ? 'qd-chiqim' : 'qd-muted'">{{ fmtSum(r.chiqim_dona) }}</span>
              </td>
              <td class="qd-td qd-td--bar">
                <div class="qd-bar-track">
                  <div class="qd-bar-fill" :class="qoldiqClass(r.qoldiq_dona)" :style="{ '--pct': qoldiqPct(r) + '%' }"/>
                </div>
              </td>
              <td class="qd-td qd-td--r qd-td--accent">
                <span class="qd-qoldiq-val">{{ fmtSum(r.qoldiq_dona) }}</span>
                <span v-if="pachkaLabel(r)" class="qd-pachka-sub">{{ pachkaLabel(r) }}</span>
              </td>
              <td class="qd-td qd-td--r qd-td--sum">
                {{ fmtSum(r.qoldiq_summa) }}
                <span v-if="r.qoldiq_summa_usd > 0" class="qd-sum-usd">${{ r.qoldiq_summa_usd.toFixed(2) }}</span>
              </td>
              <td class="qd-td qd-td--c">
                <span class="qd-status" :class="qoldiqClass(r.qoldiq_dona)">
                  <span class="qd-status-dot"/>{{ qoldiqLabel(r.qoldiq_dona) }}
                </span>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="rows.length > 0">
            <tr class="qd-tr-jami">
              <td class="qd-td-jami" colspan="4">Jami ({{ rows.length }} pozitsiya)</td>
              <td class="qd-td-jami qd-td--r">{{ fmtSum(jamiKirim) }}</td>
              <td class="qd-td-jami qd-td--r">{{ fmtSum(jamiChiqim) }}</td>
              <td class="qd-td-jami"></td>
              <td class="qd-td-jami qd-td--r qd-td--accent">{{ fmtSum(jamiDona) }}</td>
              <td class="qd-td-jami qd-td--r qd-td--sum">{{ fmtSum(jamiSumma) }}</td>
              <td class="qd-td-jami"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- ══ DETAIL DRAWER ══ -->
    <Transition name="qd-fade">
      <div v-if="activeRow" class="qd-overlay" @click.self="closeDetail">
        <Transition name="qd-slide" appear>
          <div v-if="activeRow" class="qd-drawer">
            <div class="qd-drawer-head">
              <div class="qd-drawer-av" :style="{ background: avatarColor(activeRow.tovar_nomi) + '22', color: avatarColor(activeRow.tovar_nomi) }">
                {{ (activeRow.tovar_nomi || '?').charAt(0).toUpperCase() }}
              </div>
              <div class="qd-drawer-title-wrap">
                <h2 class="qd-drawer-title">{{ activeRow.tovar_nomi }}</h2>
                <span class="qd-ombor-tag">{{ activeRow.ombor }}</span>
              </div>
              <button class="qd-drawer-close" @click="closeDetail">
                <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
              </button>
            </div>

            <div class="qd-drawer-stats">
              <div class="qd-dstat">
                <span class="qd-dstat-lbl">Joriy qoldiq</span>
                <span class="qd-dstat-val">{{ fmtSum(activeRow.qoldiq_dona) }} kg</span>
                <span v-if="pachkaLabel(activeRow)" class="qd-dstat-sub">{{ pachkaLabel(activeRow) }}</span>
              </div>
              <div class="qd-dstat">
                <span class="qd-dstat-lbl">Qiymati</span>
                <span class="qd-dstat-val">{{ fmtSum(activeRow.qoldiq_summa) }}</span>
                <span class="qd-dstat-sub">so'm{{ activeRow.qoldiq_summa_usd > 0 ? ' · $' + activeRow.qoldiq_summa_usd.toFixed(2) : '' }}</span>
              </div>
              <div class="qd-dstat qd-dstat--accent">
                <span class="qd-dstat-lbl">Kirim narxi</span>
                <span class="qd-dstat-val">{{ fmtSum(activeRow.kirim_narx) }}</span>
              </div>
              <div class="qd-dstat">
                <span class="qd-dstat-lbl">Sotuv narxi</span>
                <span class="qd-dstat-val">{{ fmtSum(activeRow.sotuv_narx) }}</span>
              </div>
            </div>

            <!-- 14 kunlik chiqim sparkline -->
            <div v-if="!detailLoading && detailRows.length" class="qd-spark-block">
              <span class="qd-spark-lbl">So'nggi 14 kun — kunlik chiqim tendensiyasi</span>
              <svg viewBox="0 0 260 48" class="qd-spark-svg" preserveAspectRatio="none">
                <polyline :points="sparkPoints" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="qd-spark-line"/>
              </svg>
            </div>

            <div class="qd-drawer-body">
              <div class="qd-drawer-section-title">Harakat tarixi</div>

              <div v-if="detailLoading" class="qd-loading">
                <span class="qd-spin"/> Yuklanmoqda...
              </div>
              <div v-else-if="!detailRows.length" class="qd-empty" style="padding:32px 0">
                Harakat tarixi topilmadi
              </div>
              <div v-else class="qd-detail-list">
                <div v-for="(row, idx) in detailRows" :key="row.id" class="qd-detail-item" :style="{ '--ri': idx }">
                  <div class="qd-detail-ic" :class="row.yonalish === 'kirim' ? 'qd-detail-ic--in' : 'qd-detail-ic--out'">
                    <svg v-if="row.yonalish === 'kirim'" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59L7.3 9.24a.75.75 0 00-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75z" clip-rule="evenodd"/></svg>
                    <svg v-else viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm.75 11.25a.75.75 0 01-1.5 0V8.66l-1.95 2.1a.75.75 0 11-1.1-1.02l3.25-3.5a.75.75 0 011.1 0l3.25 3.5a.75.75 0 11-1.1 1.02l-1.95-2.1v4.59z" clip-rule="evenodd"/></svg>
                  </div>
                  <div class="qd-detail-mid">
                    <div class="qd-detail-title">{{ row.manba_nomi }}</div>
                    <div class="qd-detail-meta">{{ fmtDate(row.sana) }}</div>
                  </div>
                  <div class="qd-detail-r">
                    <div class="qd-detail-dona" :class="row.yonalish === 'kirim' ? 'qd-detail-dona--in' : 'qd-detail-dona--out'">
                      {{ row.yonalish === 'kirim' ? '+' : '−' }}{{ fmtSum(row.dona) }}
                    </div>
                    <div class="qd-detail-summa">{{ fmtSum(row.summa) }} so'm</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.qd { display:flex; flex-direction:column; gap:16px; }

/* Header */
.qd-header { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.qd-header-l { display:flex; align-items:center; gap:14px; }
.qd-icon { width:44px; height:44px; border-radius:13px; background:linear-gradient(135deg,rgba(139,92,246,.15),rgba(139,92,246,.12)); border:1.5px solid rgba(139,92,246,.25); display:flex; align-items:center; justify-content:center; color:#8b5cf6; flex-shrink:0; }
.qd-icon svg { width:20px; height:20px; }
.qd-title { font-size:22px; font-weight:800; color:var(--title,#111827); margin:0; letter-spacing:-.3px; }
.qd-sub   { font-size:12px; color:var(--muted,#9ca3af); margin:2px 0 0; }

/* KPI strip */
.qd-kpis { display:grid; grid-template-columns:repeat(auto-fit, minmax(170px,1fr)); gap:10px; }
.qd-kpi {
  display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:14px;
  border:1.5px solid var(--card-border,#e5e7eb); background:var(--card-bg,#fff);
  opacity:0; animation:qd-kpi-in .45s cubic-bezier(.2,.8,.2,1) forwards; animation-delay:var(--d,0ms);
}
@keyframes qd-kpi-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
.qd-kpi--accent { border-color:rgba(16,185,129,.3); background:linear-gradient(180deg, rgba(16,185,129,.05), transparent); }
.qd-kpi--warn { border-color:rgba(239,68,68,.3); background:linear-gradient(180deg, rgba(239,68,68,.05), transparent); }
.qd-kpi-ic { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.qd-kpi-ic svg { width:17px; height:17px; }
.qd-kpi-ic--indigo  { background:rgba(139,92,246,.12);  color:#8b5cf6; }
.qd-kpi-ic--violet  { background:rgba(139,92,246,.12);  color:#8b5cf6; }
.qd-kpi-ic--emerald { background:rgba(16,185,129,.12);  color:#10b981; }
.qd-kpi-ic--amber   { background:rgba(245,158,11,.12);  color:#f59e0b; }
.qd-kpi-body { display:flex; flex-direction:column; min-width:0; }
.qd-kpi-val { font-size:19px; font-weight:800; color:var(--title,#111827); font-variant-numeric:tabular-nums; line-height:1.2; }
.qd-kpi-lbl { font-size:10.5px; font-weight:600; color:var(--muted,#9ca3af); white-space:nowrap; }

/* Aylanish ring */
.qd-kpi-ring { position:relative; width:36px; height:36px; flex-shrink:0; }
.qd-ring-svg { width:100%; height:100%; }
.qd-ring-prog { transition:stroke-dasharray 1s cubic-bezier(.2,.8,.2,1); }
.qd-ring-txt { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:9.5px; font-weight:800; color:#8b5cf6; }

/* Filters */
.qd-filters { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.qd-srch { display:flex; align-items:center; gap:8px; height:38px; padding:0 12px; background:var(--card-bg,#fff); border:1.5px solid var(--card-border,#e5e7eb); border-radius:10px; flex:1; min-width:220px; max-width:340px; transition:.12s; }
.qd-srch:focus-within { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,.1); }
.qd-srch svg { width:14px; height:14px; color:var(--muted,#9ca3af); flex-shrink:0; }
.qd-srch-in { flex:1; border:none; background:transparent; outline:none; font-size:13px; color:var(--body,#374151); font-family:inherit; }
.qd-srch-in::placeholder { color:var(--muted,#9ca3af); }
.qd-srch-clear { width:16px; height:16px; border:none; background:none; color:var(--muted,#9ca3af); cursor:pointer; padding:0; display:flex; align-items:center; justify-content:center; }
.qd-srch-clear svg { width:14px; height:14px; }
.qd-sel { height:38px; padding:0 10px; border-radius:9px; border:1.5px solid var(--card-border,#e5e7eb); background:var(--card-bg,#fff); color:var(--body,#374151); font-size:12.5px; outline:none; cursor:pointer; font-family:inherit; }
.qd-sel:focus { border-color:#8b5cf6; }
.qd-refresh { width:38px; height:38px; border-radius:9px; border:1.5px solid var(--card-border,#e5e7eb); background:var(--card-bg,#fff); color:var(--muted,#9ca3af); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:.15s; }
.qd-refresh:hover { border-color:#8b5cf6; color:#8b5cf6; }
.qd-refresh svg { width:15px; height:15px; }
.qd-refresh--spin svg { animation:spin .7s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }

/* Card + Table */
.qd-card { background:var(--card-bg,#fff); border:1.5px solid var(--card-border,#e5e7eb); border-radius:16px; overflow:hidden; }
.qd-tbl-wrap { overflow-x:auto; }
.qd-loading { display:flex; align-items:center; justify-content:center; gap:10px; padding:48px; color:var(--muted,#9ca3af); font-size:13px; }
.qd-spin { display:inline-block; width:18px; height:18px; border:2px solid var(--card-border,#e5e7eb); border-top-color:#8b5cf6; border-radius:50%; animation:spin .7s linear infinite; }
.qd-tbl { width:100%; border-collapse:collapse; font-size:12.5px; min-width:960px; }
.qd-th { padding:10px 12px; font-size:10px; font-weight:700; color:var(--muted,#9ca3af); text-transform:uppercase; letter-spacing:.05em; background:var(--mini-bg,#f8fafc); border-bottom:1.5px solid var(--card-border,#e5e7eb); white-space:nowrap; text-align:left; }
.qd-th--av     { width:44px; }
.qd-th--r      { text-align:right; }
.qd-th--c      { text-align:center; }
.qd-th--bar    { width:120px; }
.qd-th--accent { color:#8b5cf6; }
.qd-th--sum    { color:#8b5cf6; }

.qd-tr { border-bottom:1px solid var(--card-border,#e5e7eb); transition:background .12s; cursor:pointer; opacity:0; animation:qd-row-in .35s ease forwards; animation-delay:calc(var(--ri,0) * 22ms); }
@keyframes qd-row-in { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
.qd-tr:hover { background:rgba(139,92,246,.045); }
.qd-td { padding:9px 12px; color:var(--body,#374151); vertical-align:middle; }
.qd-td--av   { width:44px; padding-left:14px; }
.qd-td--name { font-weight:600; font-size:13px; min-width:150px; }
.qd-td--r    { text-align:right; font-variant-numeric:tabular-nums; }
.qd-td--c    { text-align:center; }
.qd-td--num  { color:var(--body,#374151); }
.qd-td--accent { font-weight:700; color:#8b5cf6; font-size:13px; }
.qd-td--sum    { font-weight:700; color:#8b5cf6; font-size:13px; }
.qd-sum-usd    { display:block; font-size:10px; font-weight:600; color:#f59e0b; margin-top:1px; }
.qd-td--bar  { min-width:110px; }

.qd-av { width:32px; height:32px; border-radius:9px; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; }
.qd-chip { display:inline-flex; padding:2px 7px; border-radius:5px; font-size:10px; font-weight:600; background:rgba(124,58,237,.08); color:#7c3aed; border:1px solid rgba(124,58,237,.15); white-space:nowrap; }
.qd-ombor-tag { padding:2px 8px; border-radius:5px; font-size:10.5px; font-weight:600; background:rgba(139,92,246,.08); color:#8b5cf6; border:1px solid rgba(139,92,246,.15); white-space:nowrap; }
.qd-muted  { color:var(--muted,#9ca3af); font-size:11.5px; }
.qd-chiqim { color:#ef4444; font-weight:600; }
.qd-qoldiq-val { font-weight:800; font-size:14px; display:block; }
.qd-pachka-sub { font-size:10px; color:var(--muted,#9ca3af); font-variant-numeric:tabular-nums; }

/* Zaxira bar */
.qd-bar-track { position:relative; height:7px; border-radius:99px; background:var(--mini-bg,#f1f5f9); overflow:hidden; }
.qd-bar-fill { position:absolute; inset:0; width:var(--pct,0%); border-radius:99px; transition:width 1s cubic-bezier(.2,.8,.2,1); }
.qd-bar-fill.qd-ok   { background:linear-gradient(90deg,#10b981,#34d399); }
.qd-bar-fill.qd-mid  { background:linear-gradient(90deg,#f59e0b,#fbbf24); }
.qd-bar-fill.qd-low  { background:linear-gradient(90deg,#ef4444,#f87171); }
.qd-bar-fill.qd-zero { background:#cbd5e1; }

/* Status badges */
.qd-status { display:inline-flex; align-items:center; gap:5px; padding:2px 9px; border-radius:6px; font-size:10px; font-weight:700; white-space:nowrap; }
.qd-status-dot { width:5px; height:5px; border-radius:50%; }
.qd-ok   { background:rgba(16,185,129,.1);  color:#10b981; border:1px solid rgba(16,185,129,.2); } .qd-ok .qd-status-dot { background:#10b981; }
.qd-mid  { background:rgba(245,158,11,.1);  color:#f59e0b; border:1px solid rgba(245,158,11,.2); } .qd-mid .qd-status-dot { background:#f59e0b; }
.qd-low  { background:rgba(239,68,68,.1);   color:#ef4444; border:1px solid rgba(239,68,68,.2); }  .qd-low .qd-status-dot { background:#ef4444; }
.qd-zero { background:rgba(148,163,184,.1); color:#94a3b8; border:1px solid rgba(148,163,184,.2); } .qd-zero .qd-status-dot { background:#94a3b8; }

/* Jami row */
.qd-tr-jami { background:var(--mini-bg,#f8fafc); border-top:2px solid var(--card-border,#e5e7eb); }
.qd-td-jami { padding:10px 12px; font-weight:700; color:var(--title,#111827); font-size:12.5px; font-variant-numeric:tabular-nums; }

/* Empty */
.qd-empty { text-align:center; padding:48px; color:var(--muted,#9ca3af); font-size:13px; display:flex; flex-direction:column; align-items:center; gap:10px; }
.qd-empty svg { width:36px; height:36px; opacity:.25; }

/* ══ Drawer ══ */
.qd-overlay { position:fixed; inset:0; background:rgba(15,15,20,.4); backdrop-filter:blur(2px); z-index:1000; display:flex; justify-content:flex-end; }
.qd-fade-enter-active, .qd-fade-leave-active { transition:opacity .2s ease; }
.qd-fade-enter-from, .qd-fade-leave-to { opacity:0; }
.qd-slide-enter-active { transition:transform .28s cubic-bezier(.2,.8,.2,1); }
.qd-slide-leave-active { transition:transform .2s ease; }
.qd-slide-enter-from, .qd-slide-leave-to { transform:translateX(100%); }

.qd-drawer { width:min(520px, 100vw); height:100%; background:var(--card-bg,#fff); box-shadow:-8px 0 32px rgba(0,0,0,.12); display:flex; flex-direction:column; overflow:hidden; }
.qd-drawer-head { display:flex; align-items:center; gap:14px; padding:22px 22px 16px; border-bottom:1px solid var(--card-border,#e5e7eb); flex-shrink:0; }
.qd-drawer-av { width:44px; height:44px; border-radius:12px; font-size:17px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.qd-drawer-title-wrap { flex:1; min-width:0; display:flex; flex-direction:column; gap:5px; }
.qd-drawer-title { font-size:17px; font-weight:800; color:var(--title,#111827); margin:0; letter-spacing:-.2px; }
.qd-drawer-close { width:32px; height:32px; border-radius:9px; border:none; background:var(--mini-bg,#f8fafc); color:var(--muted,#9ca3af); cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:.15s; }
.qd-drawer-close:hover { background:rgba(239,68,68,.1); color:#ef4444; }
.qd-drawer-close svg { width:15px; height:15px; }

.qd-drawer-stats { display:grid; grid-template-columns:repeat(2, 1fr); gap:1px; background:var(--card-border,#e5e7eb); flex-shrink:0; }
.qd-dstat { background:var(--card-bg,#fff); padding:14px 20px; display:flex; flex-direction:column; gap:3px; }
.qd-dstat--accent { background:rgba(139,92,246,.05); }
.qd-dstat-lbl { font-size:10.5px; font-weight:600; color:var(--muted,#9ca3af); text-transform:uppercase; letter-spacing:.04em; }
.qd-dstat-val { font-size:15px; font-weight:800; color:var(--title,#111827); font-variant-numeric:tabular-nums; }
.qd-dstat--accent .qd-dstat-val { color:#8b5cf6; }
.qd-dstat-sub { font-size:10.5px; color:var(--muted,#9ca3af); margin-top:1px; }

.qd-spark-block { padding:14px 22px; border-bottom:1px solid var(--card-border,#e5e7eb); flex-shrink:0; }
.qd-spark-lbl { font-size:10.5px; font-weight:600; color:var(--muted,#9ca3af); display:block; margin-bottom:6px; }
.qd-spark-svg { width:100%; height:48px; display:block; }
.qd-spark-line { stroke-dasharray:400; stroke-dashoffset:400; animation:qd-spark-draw 1s cubic-bezier(.2,.8,.2,1) forwards .1s; }
@keyframes qd-spark-draw { to { stroke-dashoffset:0; } }

.qd-drawer-body { flex:1; overflow-y:auto; padding:18px 22px 30px; }
.qd-drawer-section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--muted,#9ca3af); margin-bottom:12px; }

.qd-detail-list { display:flex; flex-direction:column; gap:8px; }
.qd-detail-item { display:flex; align-items:center; gap:12px; padding:11px 12px; border-radius:11px; background:var(--mini-bg,#f8fafc); opacity:0; animation:qd-row-in .3s ease forwards; animation-delay:calc(var(--ri,0) * 30ms); }
.qd-detail-ic { width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.qd-detail-ic svg { width:16px; height:16px; }
.qd-detail-ic--in  { background:rgba(16,185,129,.12); color:#10b981; }
.qd-detail-ic--out { background:rgba(239,68,68,.12);  color:#ef4444; }
.qd-detail-mid { flex:1; min-width:0; }
.qd-detail-title { font-size:12.5px; font-weight:700; color:var(--title,#111827); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.qd-detail-meta { font-size:10.5px; color:var(--muted,#9ca3af); margin-top:2px; }
.qd-detail-r { text-align:right; flex-shrink:0; }
.qd-detail-dona { font-size:13px; font-weight:800; font-variant-numeric:tabular-nums; }
.qd-detail-dona--in  { color:#10b981; }
.qd-detail-dona--out { color:#ef4444; }
.qd-detail-summa { font-size:10.5px; color:var(--muted,#9ca3af); font-variant-numeric:tabular-nums; }

@media (max-width:640px) {
  .qd-drawer { width:100vw; }
  .qd-drawer-stats { grid-template-columns:1fr 1fr; }
}
</style>
