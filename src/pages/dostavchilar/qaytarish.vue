<template>
  <div class="hp-wrap">
    <div class="hp-head">
      <div>
        <h1 class="hp-title">Qaytarish va Brak</h1>
        <p class="hp-sub">Yetkazishda qaytgan mahsulotlar va nosoz (brak) tovarlar ro'yxati</p>
      </div>
    </div>

    <!-- KPI -->
    <div class="qr-kpi-row">
      <div class="qr-kpi">
        <div class="qr-kpi-val">{{ rows.length }}</div>
        <div class="qr-kpi-label">Jami yozuv</div>
      </div>
      <div class="qr-kpi">
        <div class="qr-kpi-val">{{ qaytarmaCount }}</div>
        <div class="qr-kpi-label">Qaytarma</div>
      </div>
      <div class="qr-kpi qr-kpi--danger">
        <div class="qr-kpi-val">{{ brakCount }}</div>
        <div class="qr-kpi-label">Brak</div>
      </div>
      <div class="qr-kpi">
        <div class="qr-kpi-val">{{ fmtSum(jamiSumma) }}</div>
        <div class="qr-kpi-label">Jami summa (so'm)</div>
      </div>
    </div>

    <!-- Filtrlar -->
    <div class="hp-filters">
      <select v-model="fTur" class="hp-select" @change="load">
        <option value="">Barcha turlar</option>
        <option value="qaytarma">Qaytarma</option>
        <option value="brak">Brak</option>
      </select>
      <select v-model="fDostavchi" class="hp-select" @change="load">
        <option value="">Barcha dostavchilar</option>
        <option v-for="d in dostavchilar" :key="d.id" :value="d.id">{{ d.ism }}</option>
      </select>
      <input v-model="fFrom" type="date" class="hp-date" @change="load"/>
      <input v-model="fTo" type="date" class="hp-date" @change="load"/>
    </div>

    <!-- Jadval -->
    <div class="hp-card" style="padding:0; overflow:auto">
      <table class="qr-table" v-if="!loading && rows.length">
        <thead>
          <tr>
            <th>Sana</th>
            <th>Tovar</th>
            <th>Kg</th>
            <th>Summa</th>
            <th>Tur</th>
            <th>Sabab</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ fmtDate(r.sana) }}</td>
            <td>{{ r.tovar_nomi }}</td>
            <td>{{ r.dona }}</td>
            <td>{{ fmtSum(r.summa) }}</td>
            <td><span class="ts-badge" :class="r.tur === 'brak' ? 'ts-badge--danger' : 'ts-badge--info'">{{ r.tur === 'brak' ? 'Brak' : 'Qaytarma' }}</span></td>
            <td class="qr-sabab">{{ r.sabab || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else-if="loading" class="hp-skel hp-skel--sm" style="margin:16px"/>
      <div v-else class="hp-empty">Ma'lumot topilmadi</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
// @ts-ignore
import { tripSheetApi, dostavchiApi } from '@/api/api'
// @ts-ignore
import { useToast } from '@/composables/useToast'

const toast = useToast()

const rows = ref<any[]>([])
const dostavchilar = ref<any[]>([])
const loading = ref(false)
const fTur = ref('')
const fDostavchi = ref<string | number>('')
const fFrom = ref('')
const fTo = ref('')

const qaytarmaCount = computed(() => rows.value.filter(r => r.tur === 'qaytarma').length)
const brakCount = computed(() => rows.value.filter(r => r.tur === 'brak').length)
const jamiSumma = computed(() => rows.value.reduce((s, r) => s + Number(r.summa || 0), 0))

async function load() {
  loading.value = true
  try {
    const p: any = {}
    if (fTur.value) p.tur = fTur.value
    if (fDostavchi.value) p.dostavchi_id = fDostavchi.value
    if (fFrom.value) p.date_from = fFrom.value
    if (fTo.value) p.date_to = fTo.value
    rows.value = await tripSheetApi.qaytarish(p)
  } catch (e: any) {
    toast.error('Yuklash xatosi', e.message || '')
  } finally {
    loading.value = false
  }
}

function fmtSum(v: number) {
  if (!v) return '0'
  return Number(v).toLocaleString('uz-UZ')
}
function fmtDate(v: string) {
  if (!v) return ''
  const d = new Date(v)
  return d.toLocaleDateString('uz-UZ') + ' ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  try {
    const d = await dostavchiApi.getAll()
    dostavchilar.value = d.rows || d || []
  } catch {}
  await load()
})
</script>

<style scoped>
.hp-wrap { display:flex; flex-direction:column; gap:18px; padding:2px 0 40px; }
.hp-head { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; flex-wrap:wrap; }
.hp-title { font-size:22px; font-weight:900; color:#1e293b; margin:0 0 4px; letter-spacing:-.3px; }
.hp-sub { font-size:13px; color:#94a3b8; margin:0; }
.hp-filters { display:flex; gap:8px; flex-wrap:wrap; }
.hp-select, .hp-date { border:1.5px solid #e2e8f0; background:#fff; border-radius:10px; padding:8px 12px; font-size:13px; color:#1e293b; }
.hp-select:focus, .hp-date:focus { outline:none; border-color:#8b5cf6; }
.hp-empty { text-align:center; padding:60px 20px; color:#94a3b8; font-size:14px; }
.hp-card { background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; }
.hp-skel { border-radius:12px; height:60px; background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:hp-shim 1.4s ease infinite; }
@keyframes hp-shim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

.qr-kpi-row { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px,1fr)); gap:12px; }
.qr-kpi { background:#fff; border:1.5px solid #e8ecf8; border-radius:14px; padding:14px 16px; }
.qr-kpi--danger { border-color:#fecaca; background:#fff5f5; }
.qr-kpi-val { font-size:20px; font-weight:900; color:#1e293b; }
.qr-kpi--danger .qr-kpi-val { color:#dc2626; }
.qr-kpi-label { font-size:11.5px; color:#94a3b8; margin-top:2px; }

.qr-table { width:100%; border-collapse:collapse; font-size:13px; }
.qr-table th { text-align:left; padding:12px 14px; font-size:11.5px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.3px; border-bottom:1.5px solid #f1f5f9; white-space:nowrap; }
.qr-table td { padding:11px 14px; border-bottom:1px solid #f8fafc; color:#334155; white-space:nowrap; }
.qr-sabab { white-space:normal; max-width:260px; color:#64748b; }

.ts-badge { font-size:10.5px; font-weight:700; padding:3px 9px; border-radius:999px; white-space:nowrap; }
.ts-badge--danger { background:#fef2f2; color:#dc2626; }
.ts-badge--info { background:#f5f3ff; color:#7c3aed; }
</style>
