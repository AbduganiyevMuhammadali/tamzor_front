<script setup lang="ts">
/* Sozlamalar → Mijoz reytingi: har hodisa necha ball berishi va ketma-ket rad etish chegarasi.
   Qoidalar backendda: beckend/src/utils/reyting.utils.js (GET/PATCH /sozlama/reyting, o'zgartirish — Admin). */
import { ref, reactive, onMounted } from 'vue'
// @ts-ignore
import { sozlamaApi } from '@/api/api'
// @ts-ignore
import { useToast } from '@/composables/useToast'
import { DARAJALAR, REYTING_MAX } from '@/utils/reyting'

const toast = useToast()
const loading = ref(false)
const saving = ref(false)
const f = reactive({ buyurtma: 10, rad_etildi: -10, tolov_surildi: -15, tolov_qabul: 15, kritik_soni: 5 })

async function load() {
  loading.value = true
  try { Object.assign(f, pick(await sozlamaApi.getReyting())) }
  catch (e: any) { toast.error('Yuklash xatosi', e.message) }
  finally { loading.value = false }
}
const pick = (r: any) => ({ buyurtma: r.buyurtma, rad_etildi: r.rad_etildi, tolov_surildi: r.tolov_surildi, tolov_qabul: r.tolov_qabul, kritik_soni: r.kritik_soni })
async function save() {
  saving.value = true
  try {
    Object.assign(f, pick(await sozlamaApi.updateReyting({
      buyurtma: Math.abs(Number(f.buyurtma)), tolov_qabul: Math.abs(Number(f.tolov_qabul)),
      rad_etildi: -Math.abs(Number(f.rad_etildi)), tolov_surildi: -Math.abs(Number(f.tolov_surildi)), kritik_soni: Number(f.kritik_soni),
    })))
    toast.success('Saqlandi', 'Yangi ballar bundan keyingi hodisalarga qo\'llanadi')
  } catch (e: any) { toast.error('Saqlash xatosi', e.message) }
  finally { saving.value = false }
}
onMounted(load)

const HODISALAR = [
  { k: 'buyurtma' as const, nom: 'Zakaz berdi', izoh: "Mijoz agent so'roviga rozi bo'lib zakaz berdi yoki Won Sell'dan sotib oldi. Zakaz bekor qilinsa ball qaytadi.", ishora: '+' },
  { k: 'rad_etildi' as const, nom: 'Buyurtmani rad etdi', izoh: "Agent ilovada \"Rad etdi\" va sababni belgiladi. \"Do'kon yopiq\" sababi ball tushirmaydi.", ishora: '−' },
  { k: 'tolov_qabul' as const, nom: "Qarzni to'ladi", izoh: "Qarzdor mijozdan to'lov olindi: agent, dostavchik yoki kassa orqali. To'lov o'chirilsa ball qaytadi.", ishora: '+' },
  { k: 'tolov_surildi' as const, nom: "To'lov surildi", izoh: "Mijoz to'lamay \"falon kuni keling\" dedi. Agent ilovada yangi sanani belgiladi.", ishora: '−' },
]
</script>

<template>
  <div class="rs-page">
    <div class="rs-hd">
      <div class="rs-hd-ic">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </div>
      <div>
        <h2 class="rs-title">Mijoz reytingi</h2>
        <p class="rs-sub">Har mijoz 100 balldan boshlaydi, ball 0 dan {{ REYTING_MAX }} gacha. Zakaz va to'lov ballni oshiradi, rad etish va to'lov surilishi tushiradi.</p>
      </div>
    </div>

    <div class="rs-grid">
      <div class="rs-card">
        <div class="rs-card-t">Hodisalar uchun ball</div>
        <div v-for="h in HODISALAR" :key="h.k" class="rs-row">
          <div class="rs-row-mat">
            <div class="rs-row-nom">{{ h.nom }}</div>
            <div class="rs-row-iz">{{ h.izoh }}</div>
          </div>
          <div class="rs-row-in" :class="h.ishora === '+' ? 'rs-plus' : 'rs-minus'">
            <span>{{ h.ishora }}</span>
            <input :value="Math.abs(f[h.k])" type="number" min="0" max="100" step="1" class="rs-in" :disabled="loading"
              @input="f[h.k] = (h.ishora === '+' ? 1 : -1) * Math.abs(Number(($event.target as HTMLInputElement).value) || 0)"/>
          </div>
        </div>
        <div class="rs-row">
          <div class="rs-row-mat">
            <div class="rs-row-nom">Ketma-ket rad etish chegarasi</div>
            <div class="rs-row-iz">Mijoz shuncha marta ketma-ket rad etsa, reyting avtomatik Kritik darajaga tushadi. Keyingi zakaz ketma-ketlikni tozalaydi.</div>
          </div>
          <div class="rs-row-in"><input v-model.number="f.kritik_soni" type="number" min="2" max="30" step="1" class="rs-in" :disabled="loading"/><span class="rs-mark">marta</span></div>
        </div>
        <div class="rs-actions"><button class="rs-btn" :disabled="saving || loading" @click="save">{{ saving ? 'Saqlanmoqda…' : 'Saqlash' }}</button></div>
      </div>

      <div class="rs-card rs-card--info">
        <div class="rs-card-t">Darajalar</div>
        <div v-for="(d, i) in DARAJALAR" :key="d.kod" class="rs-dar">
          <span class="rs-dar-chip" :style="{ color: d.rang, background: d.fon }">{{ d.nom }}</span>
          <span class="rs-dar-or">{{ d.min }} – {{ i === 0 ? REYTING_MAX : DARAJALAR[i - 1]!.min - 1 }} ball</span>
        </div>
        <div class="rs-card-t" style="margin-top:16px">Qoidalar</div>
        <ul class="rs-list">
          <li>Har tur bo'yicha kuniga bitta hodisa ball oladi. Bir kunda bir nechta zakaz yoki to'lov tarixda ko'rinadi, lekin reytingni qayta oshirmaydi.</li>
          <li>To'lov faqat qarzdor mijozdan olinganda hisoblanadi. Oldindan to'lov reytingga ta'sir qilmaydi.</li>
          <li>Har bir o'zgarish mijoz kartasida tarix bilan saqlanadi: kim, qachon, nima sababdan.</li>
          <li>Admin mijoz kartasida ballni qo'lda tuzata oladi, sababi yoziladi.</li>
          <li>Ball o'zgarishi faqat bundan keyingi hodisalarga qo'llanadi, eski tarix qayta hisoblanmaydi.</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rs-page { display:flex; flex-direction:column; gap:14px; }
.rs-hd { display:flex; align-items:center; gap:12px; }
.rs-hd-ic { width:40px; height:40px; border-radius:11px; background:rgba(139,92,246,.12); color:#8b5cf6; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.rs-title { margin:0; font-size:17px; font-weight:700; color:var(--ink,#0f172a); }
.rs-sub { margin:2px 0 0; font-size:12px; color:var(--mut,#64748b); }
.rs-grid { display:grid; grid-template-columns:minmax(0,1.4fr) minmax(0,1fr); gap:14px; align-items:start; }
@media (max-width: 1000px) { .rs-grid { grid-template-columns:1fr; } }
.rs-card { border:1px solid var(--line,#e2e8f0); border-radius:12px; background:var(--surface,#fff); padding:16px; }
.rs-card--info { background:var(--hov,#f8fafc); }
.rs-card-t { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--mut,#94a3b8); margin-bottom:8px; }
.rs-row { display:flex; align-items:center; gap:14px; padding:11px 0; border-bottom:1px solid var(--line,#eef2f7); }
.rs-row-mat { flex:1; min-width:0; }
.rs-row-nom { font-size:13.5px; font-weight:700; color:var(--ink,#0f172a); }
.rs-row-iz { font-size:12px; color:var(--mut,#64748b); line-height:1.45; margin-top:2px; }
.rs-row-in { display:flex; align-items:center; gap:6px; flex-shrink:0; }
.rs-row-in > span:first-child { font-size:18px; font-weight:800; width:14px; text-align:center; }
.rs-plus > span:first-child { color:#16a34a; } .rs-minus > span:first-child { color:#dc2626; }
.rs-in { width:72px; height:36px; padding:0 10px; border:1.5px solid var(--line,#e2e8f0); border-radius:9px; font-size:15px; font-weight:700; text-align:center; background:var(--surface,#fff); color:var(--ink,#0f172a); outline:none; }
.rs-in:focus { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,.15); }
.rs-mark { font-size:12px; color:var(--mut,#64748b); }
.rs-actions { display:flex; justify-content:flex-end; margin-top:12px; }
.rs-btn { padding:9px 16px; border-radius:9px; border:none; background:#7c3aed; color:#fff; font-size:13px; font-weight:600; cursor:pointer; }
.rs-btn:hover:not(:disabled) { background:#6d28d9; } .rs-btn:disabled { opacity:.55; cursor:default; }
.rs-dar { display:flex; align-items:center; justify-content:space-between; padding:6px 0; }
.rs-dar-chip { padding:3px 11px; border-radius:999px; font-size:12.5px; font-weight:700; }
.rs-dar-or { font-size:12.5px; color:var(--ink2,#334155); font-variant-numeric:tabular-nums; }
.rs-list { margin:0; padding-left:18px; font-size:12.5px; color:var(--ink2,#334155); line-height:1.65; }
</style>
