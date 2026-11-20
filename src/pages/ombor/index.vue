<template>
  <div class="od-page">

    <!-- ── Header ──────────────────────────────────────────────────────── -->
    <div class="od-header">
      <div>
        <h2 class="od-title">Ombor boshqaruvi</h2>
        <p class="od-sub">Zaxira, kirim va harakatlar umumiy ko'rinishi</p>
      </div>
      <div class="od-header-actions">
        <button class="od-btn od-btn--ghost" @click="load">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.07-8.33"/>
          </svg>
          Yangilash
        </button>
        <button class="od-btn od-btn--primary" @click="$router.push('/ombor/prixod')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Yangi kirim
        </button>
      </div>
    </div>

    <!-- ── Loading ─────────────────────────────────────────────────────── -->
    <div class="od-loading" v-if="loading">
      <div class="od-spinner"/>
    </div>

    <template v-else>

      <!-- ── KPI Cards ──────────────────────────────────────────────────── -->
      <div class="od-kpi-grid">
        <div
          class="od-kpi"
          v-for="k in kpiCards" :key="k.key"
          @click="k.route && $router.push(k.route)"
          :class="{ 'od-kpi--link': k.route }"
        >
          <div class="od-kpi-stripe" :style="{ background: k.color }"/>
          <div class="od-kpi-icon" :style="{ background: k.bg }">
            <span v-html="k.svg" :style="{ color: k.color }"/>
          </div>
          <div class="od-kpi-body">
            <div class="od-kpi-val">{{ k.value }}</div>
            <div class="od-kpi-lbl">{{ k.label }}</div>
          </div>
          <div class="od-kpi-arrow" v-if="k.route">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
      </div>

      <!-- ── Quick nav cards ────────────────────────────────────────────── -->
      <div class="od-nav-grid">
        <div class="od-nav-card" v-for="n in navCards" :key="n.path" @click="$router.push(n.path)">
          <div class="od-nav-ic" :style="{ background: n.bg, color: n.color }" v-html="n.svg"/>
          <div class="od-nav-body">
            <div class="od-nav-title">{{ n.title }}</div>
            <div class="od-nav-desc">{{ n.desc }}</div>
          </div>
          <svg class="od-nav-arr" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>

      <!-- ── Main: Qoldiqlar + Top & Trend ─────────────────────────────── -->
      <div class="od-main-grid">

        <!-- Tovar qoldiqlari -->
        <div class="od-box">
          <div class="od-box-head">
            <div class="od-box-head-left">
              <span class="od-box-title">Tovar qoldiqlari</span>
              <span class="od-box-cnt">{{ qoldiqlar.length }} xil tovar</span>
            </div>
            <button class="od-link-btn" @click="$router.push('/ombor/qoldiqlar')">
              Barchasi
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <div class="od-chips" v-if="omborlar.length > 1">
            <button class="od-chip" :class="{ 'od-chip--on': activeOmbor === '' }" @click="activeOmbor = ''">Barchasi</button>
            <button
              class="od-chip"
              :class="{ 'od-chip--on': activeOmbor === o, 'od-chip--brak': brakmi(o) }"
              v-for="o in omborlar" :key="o"
              :title="brakmi(o) ? 'Brak ombori — sotilmaydi, sotiladigan qoldiqqa kirmaydi' : ''"
              @click="activeOmbor = o"
            >{{ o }}</button>
          </div>

          <div class="od-qoldiq-list">
            <div class="od-qoldiq-row" v-for="(q, i) in filteredQoldiqlar.slice(0, 8)" :key="i">
              <div class="od-q-rank">{{ i + 1 }}</div>
              <div class="od-q-info">
                <div class="od-q-name">{{ q.tovar_nomi }}</div>
                <div class="od-q-meta">{{ q.turkum }} · {{ q.ombor }}</div>
              </div>
              <div class="od-q-right">
                <div class="od-q-bar-wrap">
                  <div class="od-q-bar" :style="{ width: qPct(q) + '%', background: qColor(q) }"/>
                </div>
                <div class="od-q-nums">
                  <span class="od-q-val" :style="{ color: qColor(q) }">{{ q.qoldiq_dona }} kg</span>
                  <span class="od-q-sum">{{ fmtSumShort(q.qoldiq_summa) }}</span>
                </div>
              </div>
            </div>
            <div class="od-empty" v-if="filteredQoldiqlar.length === 0">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              <span>Qoldiq yo'q</span>
            </div>
          </div>
        </div>

        <!-- Right col: Top + Trend -->
        <div class="od-right-col">

          <!-- Top tovarlar -->
          <div class="od-box">
            <div class="od-box-head">
              <span class="od-box-title">Top tovarlar</span>
              <span class="od-box-cnt">Kirim bo'yicha</span>
            </div>
            <div class="od-top-list">
              <div class="od-top-row" v-for="(t, i) in topTovarlar" :key="t.tovar_id">
                <div class="od-top-rank" :class="`rk${i+1}`">{{ i + 1 }}</div>
                <div class="od-top-info">
                  <div class="od-top-name">{{ t.tovar_nomi }}</div>
                  <div class="od-top-bar-wrap">
                    <div class="od-top-bar" :style="{ width: topPct(t) + '%' }"/>
                  </div>
                </div>
                <div class="od-top-right">
                  <div class="od-top-sum">{{ fmtSumShort(t.summa) }}</div>
                  <div class="od-top-dona">{{ t.dona }} kg</div>
                </div>
              </div>
              <div class="od-empty" v-if="topTovarlar.length === 0">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                <span>Ma'lumot yo'q</span>
              </div>
            </div>
          </div>

          <!-- Oylik trend -->
          <div class="od-box">
            <div class="od-box-head">
              <span class="od-box-title">Oylik kirim trendi</span>
            </div>
            <div class="od-trend-bars" v-if="oylikTrend.length">
              <div class="od-trend-item" v-for="t in oylikTrend" :key="t.oy">
                <div class="od-trend-bar-wrap">
                  <div class="od-trend-bar" :style="{ height: trendPct(t) + '%' }" :title="t.oy"/>
                </div>
                <div class="od-trend-lbl">{{ formatOy(t.oy) }}</div>
                <div class="od-trend-val">{{ fmtSumShort(t.summa) }}</div>
              </div>
            </div>
            <div class="od-empty" v-else>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <span>Trend ma'lumoti yo'q</span>
            </div>
          </div>

        </div>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api/api'

const loading     = ref(true)
const umumiy      = ref({})
const qoldiqlar   = ref([])
const topTovarlar = ref([])
const oylikTrend  = ref([])
const activeOmbor = ref('')

async function load() {
  loading.value = true
  try {
    const [u, q, top, trend] = await Promise.all([
      api.get('/hisobot/umumiy'),
      api.get('/hisobot/qoldiqlar'),
      api.get('/hisobot/top-tovarlar'),
      api.get('/hisobot/oylik-trend'),
    ])
    umumiy.value      = u || {}
    qoldiqlar.value   = Array.isArray(q)     ? q     : []
    topTovarlar.value = Array.isArray(top)   ? top   : []
    oylikTrend.value  = Array.isArray(trend) ? trend : []
  } catch { /* silent */ }
  finally { loading.value = false }
}

onMounted(load)

// Brak omborlari: umumiy "Brak ombori" va har agentning "Agent: <ism> (brak)" — sotilmaydi, ro'yxat oxirida
const brakmi = (o) => /\(brak\)\s*$/i.test(o || '') || /^brak ombori$/i.test((o || '').trim())
const omborlar = computed(() => [...new Set(qoldiqlar.value.map(q => q.ombor).filter(Boolean))].sort((a, b) => Number(brakmi(a)) - Number(brakmi(b))))

const filteredQoldiqlar = computed(() =>
  activeOmbor.value
    ? qoldiqlar.value.filter(q => q.ombor === activeOmbor.value)
    : qoldiqlar.value
)

const maxQoldiq = computed(() => Math.max(...qoldiqlar.value.map(q => q.qoldiq_dona), 1))
const maxTop    = computed(() => Math.max(...topTovarlar.value.map(t => t.summa), 1))
const maxTrend  = computed(() => Math.max(...oylikTrend.value.map(t => t.summa), 1))

function qPct(q)     { return Math.round((q.qoldiq_dona / maxQoldiq.value) * 100) }
function topPct(t)   { return Math.round((t.summa / maxTop.value) * 100) }
function trendPct(t) { return Math.max(Math.round((t.summa / maxTrend.value) * 100), 6) }

function qColor(q) {
  const p = qPct(q)
  if (p >= 60) return '#10b981'
  if (p >= 30) return '#f59e0b'
  return '#ef4444'
}

function fmtSumShort(v) {
  if (!v) return '0'
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' mln'
  if (v >= 1_000)     return (v / 1_000).toFixed(0) + ' ming'
  return String(v)
}

function formatOy(str) {
  if (!str) return ''
  const [y, m] = str.split('-')
  const oylar = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek']
  return (oylar[parseInt(m) - 1] || m) + " '" + y.slice(2)
}

const kpiCards = computed(() => [
  {
    key: 'summa', label: 'Jami kirim summasi', value: fmtSumShort(umumiy.value.jami_summa),
    color: '#8b5cf6', bg: 'rgba(139,92,246,.1)',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  },
  {
    key: 'dona', label: 'Jami qabul qilingan', value: (umumiy.value.jami_dona || 0) + ' kg',
    color: '#7c3aed', bg: 'rgba(124,58,237,.1)',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
  },
  {
    key: 'prixod', label: 'Prixodlar soni', value: (umumiy.value.prixod_son || 0) + ' ta',
    color: '#8b5cf6', bg: 'rgba(139,92,246,.1)', route: '/ombor/prixod',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  },
  {
    key: 'tovar', label: 'Tovar turlari', value: (umumiy.value.qator_son || 0) + ' xil',
    color: '#8b5cf6', bg: 'rgba(139,92,246,.1)', route: '/ombor/qoldiqlar',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  },
  {
    key: 'oylik_summa', label: 'Oylik kirim', value: fmtSumShort(umumiy.value.oylik_summa),
    color: '#8b5cf6', bg: 'rgba(139,92,246,.1)',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  },
  {
    key: 'oylik_dona', label: 'Oylik kg', value: (umumiy.value.oylik_dona || 0) + ' kg',
    color: '#8b5cf6', bg: 'rgba(139,92,246,.08)',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  },
])

const navCards = [
  {
    path: '/ombor/prixod', title: 'Kirim (Prixod)', desc: 'Tovar qabul qilish va tasdiqlash',
    color: '#8b5cf6', bg: 'rgba(139,92,246,.1)',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  },
  {
    path: '/ombor/qoldiqlar', title: 'Qoldiqlar', desc: "Joriy zaxira holati",
    color: '#8b5cf6', bg: 'rgba(139,92,246,.1)',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
  },
  {
    path: '/ombor/partiya', title: 'Partiya qoldiqlari', desc: "Partiya bo'yicha tahlil",
    color: '#8b5cf6', bg: 'rgba(139,92,246,.1)',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  },
  {
    path: '/yetkazuvchilar', title: 'Yetkazuvchilar', desc: "Ta'minotchilar va qarz holati",
    color: '#8b5cf6', bg: 'rgba(139,92,246,.1)',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  },
]
</script>

<style scoped>
.od-page { padding: 24px; display: flex; flex-direction: column; gap: 18px; }

/* Header */
.od-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.od-title { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0 0 3px; }
.od-sub { font-size: 13px; color: #94a3b8; margin: 0; }
.od-header-actions { display: flex; gap: 10px; }
.od-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 10px; border: none; font-size: 13.5px; font-weight: 600; cursor: pointer; transition: all .15s; }
.od-btn--ghost   { background: #f1f5f9; color: #334155; }
.od-btn--ghost:hover { background: #e2e8f0; }
.od-btn--primary { background: #8b5cf6; color: #fff; box-shadow: 0 2px 8px rgba(139,92,246,.3); }
.od-btn--primary:hover { background: #7c3aed; }

/* Loading */
.od-loading { display: flex; justify-content: center; padding: 80px; }
.od-spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #8b5cf6; border-radius: 50%; animation: od-spin .7s linear infinite; }
@keyframes od-spin { to { transform: rotate(360deg); } }

/* KPI Grid */
.od-kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
.od-kpi {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
  padding: 18px 16px; display: flex; align-items: center; gap: 13px;
  position: relative; overflow: hidden;
  transition: box-shadow .15s, transform .15s;
}
.od-kpi--link { cursor: pointer; }
.od-kpi--link:hover { box-shadow: 0 6px 24px rgba(0,0,0,.09); transform: translateY(-2px); }
.od-kpi-stripe { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
.od-kpi-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.od-kpi-icon :deep(svg) { width: 20px; height: 20px; }
.od-kpi-body { flex: 1; min-width: 0; }
.od-kpi-val { font-size: 19px; font-weight: 800; color: #1e293b; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.od-kpi-lbl { font-size: 11.5px; color: #94a3b8; margin-top: 3px; }
.od-kpi-arrow { color: #cbd5e1; flex-shrink: 0; }

/* Nav grid */
.od-nav-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.od-nav-card {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
  padding: 16px; display: flex; align-items: center; gap: 13px;
  cursor: pointer; transition: box-shadow .15s, transform .15s, border-color .15s;
}
.od-nav-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.08); transform: translateY(-2px); border-color: #ddd6fe; }
.od-nav-ic { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.od-nav-ic :deep(svg) { width: 20px; height: 20px; }
.od-nav-body { flex: 1; min-width: 0; }
.od-nav-title { font-size: 13.5px; font-weight: 700; color: #1e293b; }
.od-nav-desc  { font-size: 12px; color: #94a3b8; margin-top: 2px; }
.od-nav-arr   { color: #cbd5e1; flex-shrink: 0; }

/* Main grid */
.od-main-grid { display: grid; grid-template-columns: 1fr 380px; gap: 16px; align-items: start; }
.od-right-col { display: flex; flex-direction: column; gap: 16px; }

/* Box */
.od-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; }
.od-box-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.od-box-head-left { display: flex; align-items: center; gap: 8px; }
.od-box-title { font-size: 14px; font-weight: 700; color: #1e293b; }
.od-box-cnt   { font-size: 12px; color: #94a3b8; background: #f1f5f9; padding: 2px 8px; border-radius: 20px; }
.od-link-btn  { display: flex; align-items: center; gap: 4px; background: none; border: none; color: #8b5cf6; font-size: 12.5px; font-weight: 600; cursor: pointer; padding: 4px 8px; border-radius: 7px; transition: background .13s; }
.od-link-btn:hover { background: rgba(139,92,246,.08); }

/* Chips */
.od-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.od-chip { padding: 4px 12px; border-radius: 20px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 12px; font-weight: 500; color: #64748b; cursor: pointer; transition: all .13s; }
.od-chip--on { border-color: #8b5cf6; background: #f5f3ff; color: #8b5cf6; font-weight: 700; }
.od-chip:hover:not(.od-chip--on) { border-color: #ddd6fe; color: #7c3aed; }

/* Qoldiqlar */
.od-qoldiq-list { display: flex; flex-direction: column; gap: 11px; }
.od-qoldiq-row  { display: flex; align-items: center; gap: 10px; }
.od-q-rank { width: 20px; font-size: 11px; font-weight: 700; color: #94a3b8; text-align: center; flex-shrink: 0; }
.od-q-info { width: 150px; flex-shrink: 0; }
.od-q-name { font-size: 13px; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.od-q-meta { font-size: 11px; color: #94a3b8; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.od-q-right { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.od-q-bar-wrap { height: 6px; background: #f1f5f9; border-radius: 99px; overflow: hidden; }
.od-q-bar { height: 100%; border-radius: 99px; transition: width .5s ease; min-width: 4px; }
.od-q-nums { display: flex; justify-content: space-between; }
.od-q-val { font-size: 12px; font-weight: 700; }
.od-q-sum { font-size: 11px; color: #94a3b8; }

/* Top */
.od-top-list { display: flex; flex-direction: column; gap: 10px; }
.od-top-row  { display: flex; align-items: center; gap: 10px; }
.od-top-rank { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0; background: #f1f5f9; color: #64748b; }
.od-top-rank.rk1 { background: #fef3c7; color: #d97706; }
.od-top-rank.rk2 { background: #f1f5f9; color: #475569; }
.od-top-rank.rk3 { background: #ede9fe; color: #7c3aed; }
.od-top-info { flex: 1; min-width: 0; }
.od-top-name { font-size: 13px; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.od-top-bar-wrap { height: 4px; background: #f1f5f9; border-radius: 99px; overflow: hidden; margin-top: 5px; }
.od-top-bar { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #8b5cf6, #8b5cf6); transition: width .5s ease; }
.od-top-right { text-align: right; flex-shrink: 0; }
.od-top-sum  { font-size: 13px; font-weight: 700; color: #1e293b; }
.od-top-dona { font-size: 11px; color: #94a3b8; }

/* Trend */
.od-trend-bars { display: flex; align-items: flex-end; gap: 8px; height: 90px; }
.od-trend-item { display: flex; flex-direction: column; align-items: center; gap: 3px; flex: 1; height: 100%; }
.od-trend-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
.od-trend-bar { width: 100%; border-radius: 5px 5px 0 0; background: linear-gradient(180deg, #8b5cf6, #8b5cf6); min-height: 6px; transition: height .5s ease; }
.od-trend-lbl { font-size: 10px; color: #94a3b8; white-space: nowrap; }
.od-trend-val { font-size: 10px; font-weight: 700; color: #334155; white-space: nowrap; }

/* Empty */
.od-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px; color: #94a3b8; font-size: 13px; }

@media (max-width: 1400px) { .od-kpi-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 1100px) { .od-main-grid { grid-template-columns: 1fr; } .od-nav-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 700px)  { .od-kpi-grid { grid-template-columns: repeat(2, 1fr); } .od-nav-grid { grid-template-columns: 1fr 1fr; } .od-page { padding: 16px; } }
.od-chip--brak { border-style:dashed; color:#b91c1c; }
</style>
