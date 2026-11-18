<template>
  <div class="hap-page">
    <!-- Head -->
    <div class="hap-head">
      <div class="hap-head-left">
        <h2 class="hap-title">Agentlar plan-fakt</h2>
        <span class="hap-count" v-if="!loading">{{ filtered.length }} ta agent</span>
      </div>
      <div class="hap-head-right">
        <div class="hap-search-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="hap-search" v-model="search" placeholder="Agent qidirish..."/>
        </div>
        <div class="hap-period">
          <button v-for="p in PERIODS" :key="p.key"
            class="hap-pbtn" :class="{ on: period === p.key }"
            @click="period = p.key; load()">{{ p.label }}</button>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div class="hap-summary" v-if="!loading">
      <div class="hap-scard">
        <div class="hap-sc-ic" style="background:rgba(139,92,246,.1);color:#8b5cf6">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div><div class="hap-sc-val">{{ kpi.jami_agentlar || 0 }}</div><div class="hap-sc-lbl">Agentlar</div></div>
      </div>
      <div class="hap-scard">
        <div class="hap-sc-ic" style="background:rgba(124,58,237,.1);color:#7c3aed">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/></svg>
        </div>
        <div><div class="hap-sc-val">{{ fmtShort(kpi.jami_plan_summa) }}</div><div class="hap-sc-lbl">Jami plan</div></div>
      </div>
      <div class="hap-scard">
        <div class="hap-sc-ic" style="background:rgba(16,185,129,.1);color:#10b981">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <div><div class="hap-sc-val" style="color:#10b981">{{ fmtShort(kpi.jami_fakt_summa) }}</div><div class="hap-sc-lbl">Bajarildi</div></div>
      </div>
      <div class="hap-scard">
        <div class="hap-sc-ic" style="background:rgba(245,158,11,.1);color:#f59e0b">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div><div class="hap-sc-val" style="color:#f59e0b">{{ fmtShort(kpi.jami_bonus_summa) }}</div><div class="hap-sc-lbl">Jami bonus</div></div>
      </div>
      <div class="hap-scard">
        <div class="hap-sc-ic" style="background:rgba(139,92,246,.1);color:#8b5cf6">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        </div>
        <div><div class="hap-sc-val">{{ kpi.orta_plan_foiz || 0 }}%</div><div class="hap-sc-lbl">O'rtacha plan</div></div>
      </div>
    </div>

    <!-- Table -->
    <div class="hap-table-wrap">
      <div class="hap-loading" v-if="loading"><div class="hap-spinner"/></div>
      <table class="hap-table" v-else>
        <thead>
          <tr>
            <th>#</th>
            <th>Agent</th>
            <th class="r">Plan</th>
            <th class="r">Bajarildi</th>
            <th>Plan %</th>
            <th class="r">Qolgan</th>
            <th class="r">Savdo</th>
            <th class="r">Bonus</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(a, i) in filtered" :key="a.id">
            <td class="hap-num">{{ i + 1 }}</td>
            <td>
              <div class="hap-agent">
                <div class="hap-av" :style="{ background: avatarColor(a.id) }">{{ (a.fullname||'?')[0].toUpperCase() }}</div>
                <div>
                  <div class="hap-agent-name">{{ a.fullname }}</div>
                  <div class="hap-agent-sub">{{ a.territoriya?.nomi || '—' }}</div>
                </div>
              </div>
            </td>
            <td class="r hap-mono">{{ fmtSum(a.plan_summa) }}</td>
            <td class="r hap-mono" style="color:#10b981;font-weight:700">{{ fmtSum(a.fakt_summa) }}</td>
            <td>
              <div class="hap-plan">
                <div class="hap-plan-bar"><div :style="{ width: Math.min(a.plan_pct,100)+'%', background: planColor(a.plan_pct) }"/></div>
                <span :style="{ color: planColor(a.plan_pct) }">{{ a.plan_pct }}%</span>
              </div>
            </td>
            <td class="r hap-mono" style="color:#f59e0b">{{ fmtSum(a.qolgan_plan) }}</td>
            <td class="r">{{ a.buyurtmalar_soni || 0 }}</td>
            <td class="r hap-mono" style="color:#10b981;font-weight:800">+{{ fmtSum(a.bonus_summa) }}</td>
          </tr>
          <tr v-if="!filtered.length"><td colspan="8" class="hap-empty">Agent topilmadi</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
// @ts-ignore
import { agentApi } from '@/api/api'

const COLORS = ['#7c3aed','#8b5cf6','#6d28d9','#5b21b6']
const avatarColor = (id: number) => COLORS[id % COLORS.length]
const PERIODS = [
  { key: 'today', label: 'Bugun' },
  { key: 'week',  label: 'Hafta' },
  { key: 'month', label: 'Oy' },
  { key: 'year',  label: 'Yil' },
]

const loading  = ref(false)
const search   = ref('')
const period   = ref('month')
const agentlar = ref<any[]>([])
const kpi      = ref<any>({})

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return q ? agentlar.value.filter(a => a.fullname?.toLowerCase().includes(q)) : agentlar.value
})

async function load() {
  loading.value = true
  try {
    const res = await agentApi.statistika(period.value)
    agentlar.value = (res.agentlar || []).sort((a: any, b: any) => (b.plan_pct||0) - (a.plan_pct||0))
    kpi.value = res.kpi || {}
  } catch { agentlar.value = []; kpi.value = {} }
  finally { loading.value = false }
}

function planColor(pct: number) {
  if (pct >= 100) return '#10b981'
  if (pct >= 70)  return '#7c3aed'
  if (pct >= 40)  return '#f59e0b'
  return '#ef4444'
}
function fmtSum(v: number) { return v ? Math.round(v).toLocaleString('uz-UZ') : '0' }
function fmtShort(v: number) {
  const n = parseFloat(String(v||0))
  if (!n) return '0'
  if (n >= 1e9) return (n/1e9).toFixed(1)+' mlrd'
  if (n >= 1e6) return (n/1e6).toFixed(1)+' mln'
  if (n >= 1e3) return (n/1e3).toFixed(0)+' ming'
  return String(Math.round(n))
}

onMounted(load)
</script>

<style scoped>
.hap-page { display:flex; flex-direction:column; gap:16px; }
.hap-head { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.hap-head-left { display:flex; align-items:center; gap:10px; }
.hap-title { font-size:18px; font-weight:900; color:#1e293b; margin:0; }
.hap-count { font-size:12px; color:#94a3b8; background:#f1f5f9; padding:3px 10px; border-radius:20px; }
.hap-head-right { display:flex; align-items:center; gap:10px; }
.hap-search-wrap { display:flex; align-items:center; gap:7px; background:#fff; border:1.5px solid #e2e8f0; border-radius:10px; padding:0 11px; height:36px; }
.hap-search-wrap svg { color:#94a3b8; }
.hap-search { border:none; outline:none; font-size:13px; color:#1e293b; background:transparent; width:160px; }
.hap-period { display:flex; background:#f1f5f9; border-radius:10px; padding:3px; gap:2px; }
.hap-pbtn { padding:6px 13px; border:none; background:transparent; border-radius:8px; font-size:12.5px; font-weight:600; color:#64748b; cursor:pointer; transition:.13s; }
.hap-pbtn.on { background:#fff; color:#1e293b; box-shadow:0 2px 6px rgba(0,0,0,.08); }

.hap-summary { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; }
.hap-scard { background:#fff; border:1.5px solid #e8ecf8; border-radius:14px; padding:14px; display:flex; align-items:center; gap:11px; }
.hap-sc-ic { width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.hap-sc-val { font-size:17px; font-weight:900; color:#1e293b; line-height:1; }
.hap-sc-lbl { font-size:11px; color:#94a3b8; margin-top:3px; }

.hap-table-wrap { background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; overflow:hidden; }
.hap-loading { display:flex; justify-content:center; padding:50px; }
.hap-spinner { width:32px; height:32px; border:3px solid #e2e8f0; border-top-color:#8b5cf6; border-radius:50%; animation:hap-rot .7s linear infinite; }
@keyframes hap-rot { to { transform:rotate(360deg) } }
.hap-table { width:100%; border-collapse:collapse; }
.hap-table thead th { font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.04em; text-align:left; padding:11px 14px; border-bottom:1.5px solid #f1f5f9; background:#fbfaff; }
.hap-table thead th.r { text-align:right; }
.hap-table tbody td { padding:11px 14px; border-bottom:1px solid #f1f5f9; font-size:13px; color:#1e293b; }
.hap-table tbody td.r { text-align:right; }
.hap-table tbody tr:last-child td { border-bottom:none; }
.hap-table tbody tr:hover { background:#fbfaff; }
.hap-num { color:#94a3b8; font-size:12px; }
.hap-mono { font-variant-numeric:tabular-nums; }
.hap-agent { display:flex; align-items:center; gap:10px; }
.hap-av { width:34px; height:34px; border-radius:10px; color:#fff; font-size:13px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.hap-agent-name { font-size:13px; font-weight:700; color:#1e293b; }
.hap-agent-sub { font-size:11px; color:#94a3b8; margin-top:1px; }
.hap-plan { display:flex; align-items:center; gap:8px; }
.hap-plan-bar { width:60px; height:6px; background:#f1f5f9; border-radius:99px; overflow:hidden; }
.hap-plan-bar div { height:100%; border-radius:99px; transition:width .4s; }
.hap-plan span { font-size:12px; font-weight:800; min-width:34px; }
.hap-empty { text-align:center; color:#94a3b8; padding:40px; font-size:13px; }

@media(max-width:1100px) { .hap-summary { grid-template-columns:repeat(3,1fr); } }
@media(max-width:640px)  { .hap-summary { grid-template-columns:1fr 1fr; } .hap-table-wrap { overflow-x:auto; } }
</style>
