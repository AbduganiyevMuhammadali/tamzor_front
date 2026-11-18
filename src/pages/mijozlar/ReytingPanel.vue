<script setup lang="ts">
/* Mijoz paneli → Reyting: halqa ko'rsatkich (ball/200), daraja va tavsifi, buyurtma/to'lov intizomi,
   ogohlantirishlar, vaqt chizig'i ko'rinishidagi tarix va admin tuzatishi.
   Ma'lumot: GET /mijozlar/:id/reyting (beckend/src/utils/reyting.utils.js). */
import { ref, computed, watch } from 'vue'
// @ts-ignore
import { api } from '@/api/api'
import { authStore } from '@/stores/auth'
import { darajaOl, REYTING_MAX, TUR_NOMI } from '@/utils/reyting'

const props = defineProps<{ mijozId: number }>()
const emit = defineEmits<{ (e: 'ozgardi', v: { reyting: number }): void }>()

interface Yozuv { id: number; tur: string; yonalish: string; ball: number; reyting_keyin: number; sabab: string | null; izoh: string | null; summa: string | null; vada_sana: string | null; xodim_nomi: string | null; xodim_rol: string | null; sana: string }
interface Javob {
  reyting: number; daraja: string; savdo: number; moliya: number; rad_ketma_ket: number; kritikgacha: number
  tolov_vada_sana: string | null; yangilangan: string | null
  qoidalar: { buyurtma: number; rad_etildi: number; tolov_surildi: number; tolov_qabul: number; kritik_soni: number }
  statistika: Record<string, { soni: number; ball: number }>; tarix: Yozuv[]
}
const d = ref<Javob | null>(null)
const loading = ref(false)
const xato = ref('')
const hammasi = ref(false)
const admin = computed(() => authStore.isAdmin.value)
const tuzat = ref({ ochiq: false, ball: 10, ishora: 1 as 1 | -1, yonalish: 'savdo' as 'savdo' | 'moliya', izoh: '', band: false, xato: '' })

async function load() {
  loading.value = true; xato.value = ''
  try { d.value = await api.get(`/mijozlar/${props.mijozId}/reyting?limit=200`) }
  catch (e: any) { xato.value = e.message || 'Yuklanmadi' }
  finally { loading.value = false }
}
watch(() => props.mijozId, () => { hammasi.value = false; tuzat.value.ochiq = false; load() }, { immediate: true })

const TAVSIF: Record<string, string> = {
  alo: "Eng ishonchli mijoz: muntazam zakaz beradi, qarzini vaqtida to'laydi",
  yaxshi: "Ishonchli mijoz: zakaz va to'lov intizomi yaxshi",
  orta: 'Odatiy holat: yangi mijoz yoki ijobiy va salbiy hodisalar teng',
  past: "Ehtiyot bo'ling: rad etish yoki to'lov surilishi ko'p",
  kritik: "Xavfli: qarzga berishdan oldin o'ylang, nazoratda tuting",
}
const dr = computed(() => darajaOl(d.value?.reyting))
/* Halqa: r = 42 */
const R = 42, AYLANA = 2 * Math.PI * R
const dash = computed(() => `${(Math.max(0, Math.min(REYTING_MAX, d.value?.reyting ?? 0)) / REYTING_MAX) * AYLANA} ${AYLANA}`)
const tarix = computed(() => (d.value?.tarix || []).slice(0, hammasi.value ? 200 : 8))
const bugun = new Date().toISOString().slice(0, 10)
const vadaOtgan = computed(() => !!d.value?.tolov_vada_sana && d.value.tolov_vada_sana < bugun)

const OY = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const fmtKun = (s: string) => { const x = new Date(s.length === 10 ? s + 'T00:00:00' : s); return `${x.getDate()}-${OY[x.getMonth()]}` }
const fmtVaqt = (s: string) => { const x = new Date(s); return `${fmtKun(s)}, ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}` }
const fmtSum = (v: any) => Number(v || 0).toLocaleString('ru-RU')
const ishora = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n)
const XODIM: Record<string, string> = { agent: 'agent', dostavchi: 'dostavchik', web: 'ofis' }

async function saqla() {
  const t = tuzat.value
  const ball = t.ishora * Math.abs(Number(t.ball) || 0)
  if (!ball) { t.xato = 'Ballni kiriting'; return }
  if (t.izoh.trim().length < 3) { t.xato = 'Sababini yozing'; return }
  t.band = true; t.xato = ''
  try {
    const r = await api.post(`/mijozlar/${props.mijozId}/reyting`, { ball, yonalish: t.yonalish, izoh: t.izoh.trim() })
    tuzat.value = { ochiq: false, ball: 10, ishora: 1, yonalish: 'savdo', izoh: '', band: false, xato: '' }
    await load(); emit('ozgardi', { reyting: r.reyting })
  } catch (e: any) { t.xato = e.message || 'Saqlanmadi'; t.band = false }
}
</script>

<template>
  <div class="ry">
    <div v-if="loading && !d" class="ry-skel"/>
    <div v-else-if="xato" class="ry-err">{{ xato }}</div>
    <template v-else-if="d">
      <!-- Asosiy karta: halqa + daraja -->
      <div class="ry-hero" :style="{ '--r': dr.rang, '--f': dr.fon }">
        <div class="ry-ring-w">
          <svg class="ry-ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" :r="R" class="ry-ring-bg"/>
            <circle cx="50" cy="50" :r="R" class="ry-ring-fg" :stroke-dasharray="dash" transform="rotate(-90 50 50)"/>
          </svg>
          <div class="ry-ring-mat"><b>{{ d.reyting }}</b><span>/ {{ REYTING_MAX }}</span></div>
        </div>
        <div class="ry-hero-mat">
          <div class="ry-hero-t">
            <span class="ry-kicker">Mijoz reytingi</span>
            <button v-if="admin" class="ry-link" @click="tuzat.ochiq = !tuzat.ochiq">{{ tuzat.ochiq ? 'Yopish' : 'Tuzatish' }}</button>
          </div>
          <span class="ry-daraja">{{ dr.nom }}</span>
          <p class="ry-tavsif">{{ TAVSIF[dr.kod] }}</p>
        </div>
      </div>

      <!-- Admin tuzatishi -->
      <div v-if="tuzat.ochiq" class="ry-form">
        <div class="ry-form-row">
          <div class="ry-seg">
            <button :class="{ on: tuzat.ishora === 1 }" @click="tuzat.ishora = 1">+ Oshirish</button>
            <button :class="{ on: tuzat.ishora === -1, salbiy: tuzat.ishora === -1 }" @click="tuzat.ishora = -1">− Tushirish</button>
          </div>
          <input v-model.number="tuzat.ball" type="number" min="1" max="100" step="1" class="ry-in ry-in--ball"/>
          <span class="ry-form-u">ball</span>
        </div>
        <div class="ry-seg ry-seg--keng">
          <button :class="{ on: tuzat.yonalish === 'savdo' }" @click="tuzat.yonalish = 'savdo'">Buyurtma intizomi</button>
          <button :class="{ on: tuzat.yonalish === 'moliya' }" @click="tuzat.yonalish = 'moliya'">To'lov intizomi</button>
        </div>
        <input v-model="tuzat.izoh" class="ry-in" placeholder="Sabab, masalan: 3 yildan beri ishonchli mijoz" @keydown.enter="saqla"/>
        <div v-if="tuzat.xato" class="ry-err">{{ tuzat.xato }}</div>
        <div class="ry-form-ft">
          <button class="ry-btn ry-btn--ghost" @click="tuzat.ochiq = false">Bekor</button>
          <button class="ry-btn" :disabled="tuzat.band" @click="saqla">{{ tuzat.band ? 'Saqlanmoqda…' : 'Saqlash' }}</button>
        </div>
      </div>

      <!-- Ikki intizom -->
      <div class="ry-qism">
        <div class="ry-q">
          <span class="ry-q-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></span>
          <div class="ry-q-mat">
            <span class="ry-q-k">Buyurtma intizomi</span>
            <b :class="d.savdo > 0 ? 'ijobiy' : d.savdo < 0 ? 'salbiy' : ''">{{ ishora(d.savdo) || '0' }}</b>
            <span class="ry-q-s">{{ d.statistika.buyurtma?.soni || 0 }} zakaz · {{ d.statistika.rad_etildi?.soni || 0 }} rad</span>
          </div>
        </div>
        <div class="ry-q">
          <span class="ry-q-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg></span>
          <div class="ry-q-mat">
            <span class="ry-q-k">To'lov intizomi</span>
            <b :class="d.moliya > 0 ? 'ijobiy' : d.moliya < 0 ? 'salbiy' : ''">{{ ishora(d.moliya) || '0' }}</b>
            <span class="ry-q-s">{{ d.statistika.tolov_qabul?.soni || 0 }} to'lov · {{ d.statistika.tolov_surildi?.soni || 0 }} surilgan</span>
          </div>
        </div>
      </div>

      <!-- Ogohlantirishlar -->
      <div v-if="d.rad_ketma_ket > 0" class="ry-note" :class="d.kritikgacha <= 1 ? 'qizil' : 'sariq'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        <span><b>{{ d.rad_ketma_ket }} marta ketma-ket rad etdi.</b>
          <template v-if="d.kritikgacha > 0"> Yana {{ d.kritikgacha }} tasida reyting Kritik'ga tushadi.</template>
          <template v-else> Reyting Kritik'ga tushirildi.</template> Keyingi zakaz ketma-ketlikni tozalaydi.</span>
      </div>
      <div v-if="d.tolov_vada_sana" class="ry-note" :class="vadaOtgan ? 'qizil' : 'sariq'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>To'lash va'dasi: <b>{{ fmtKun(d.tolov_vada_sana) }}</b><template v-if="vadaOtgan"> — muddat o'tdi</template></span>
      </div>

      <!-- Tarix: vaqt chizig'i -->
      <div class="ry-tarix-hd">
        <span class="ry-kicker">O'zgarishlar tarixi</span>
        <span class="ry-tarix-soni" v-if="d.tarix.length">{{ d.tarix.length }} ta</span>
      </div>
      <div v-if="!tarix.length" class="ry-bosh">
        Hali o'zgarish yo'q. Ball 100 dan boshlanadi: zakaz va qarz to'lovi oshiradi, rad etish va to'lov surilishi tushiradi.
      </div>
      <ol v-else class="ry-tl">
        <li v-for="y in tarix" :key="y.id" class="ry-tl-i" :class="'ry-tl-i--' + (y.ball > 0 ? 'ijobiy' : y.ball < 0 ? 'salbiy' : 'neytral')">
          <span class="ry-tl-dot"/>
          <div class="ry-tl-mat">
            <div class="ry-tl-t">
              <span>{{ TUR_NOMI[y.tur] || y.tur }}<template v-if="y.sabab && (y.tur === 'rad_etildi' || y.tur === 'kritik')"> · {{ y.sabab }}</template></span>
              <span class="ry-tl-b">{{ y.ball ? ishora(y.ball) : '0' }}</span>
            </div>
            <div class="ry-tl-s">
              {{ fmtVaqt(y.sana) }}<template v-if="y.xodim_nomi"> · {{ y.xodim_nomi }}<template v-if="y.xodim_rol"> ({{ XODIM[y.xodim_rol] || y.xodim_rol }})</template></template>
              <template v-if="y.summa && Number(y.summa) > 0"> · {{ fmtSum(y.summa) }} so'm</template>
              <template v-if="y.vada_sana"> · va'da {{ fmtKun(y.vada_sana) }}</template>
            </div>
            <div v-if="y.izoh" class="ry-tl-iz">{{ y.izoh }}</div>
          </div>
          <span class="ry-tl-keyin" title="Shu hodisadan keyingi reyting">{{ y.reyting_keyin }}</span>
        </li>
      </ol>
      <button v-if="(d.tarix || []).length > 8" class="ry-link ry-link--blok" @click="hammasi = !hammasi">{{ hammasi ? 'Qisqartirish' : `Barcha tarix (${d.tarix.length})` }}</button>
    </template>
  </div>
</template>

<style scoped>
.ry { display:flex; flex-direction:column; gap:10px; }
.ry-skel { height:150px; border-radius:14px; background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:ry-sh 1.4s ease infinite; }
@keyframes ry-sh { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.ry-err { font-size:12.5px; color:#dc2626; }
.ry-kicker { font-size:11.5px; font-weight:700; color:#334155; text-transform:uppercase; letter-spacing:.05em; }
.ry-link { border:none; background:transparent; color:#4f46e5; font-size:12px; font-weight:600; cursor:pointer; padding:0; }
.ry-link:hover { text-decoration:underline; }
.ry-link--blok { align-self:center; padding:4px 10px; }

/* Asosiy karta */
.ry-hero { display:flex; align-items:center; gap:16px; padding:14px 16px; border-radius:14px; background:linear-gradient(135deg, var(--f), rgba(255,255,255,0) 72%); border:1px solid #eef2f7; }
.ry-ring-w { position:relative; width:96px; height:96px; flex-shrink:0; }
.ry-ring { width:96px; height:96px; display:block; }
.ry-ring-bg { fill:none; stroke:#eef2f7; stroke-width:9; }
.ry-ring-fg { fill:none; stroke:var(--r); stroke-width:9; stroke-linecap:round; transition:stroke-dasharray .5s ease; }
.ry-ring-mat { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; line-height:1; }
.ry-ring-mat b { font-size:26px; font-weight:800; color:var(--r); font-variant-numeric:tabular-nums; }
.ry-ring-mat span { font-size:11px; font-weight:600; color:#94a3b8; margin-top:3px; }
.ry-hero-mat { flex:1; min-width:0; display:flex; flex-direction:column; align-items:flex-start; gap:6px; }
.ry-hero-t { display:flex; align-items:center; justify-content:space-between; width:100%; }
.ry-daraja { padding:3px 12px; border-radius:999px; font-size:13px; font-weight:800; color:var(--r); background:var(--f); }
.ry-tavsif { margin:0; font-size:12.5px; color:#475569; line-height:1.45; }

/* Intizom kartalari */
.ry-qism { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.ry-q { display:flex; gap:10px; padding:10px 12px; border-radius:12px; background:#f8fafc; border:1px solid #eef2f7; }
.ry-q-ic { width:30px; height:30px; border-radius:9px; background:#eef2ff; color:#4f46e5; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ry-q-ic svg { width:16px; height:16px; }
.ry-q-mat { display:flex; flex-direction:column; min-width:0; }
.ry-q-k { font-size:11.5px; color:#64748b; font-weight:600; }
.ry-q b { font-size:18px; font-weight:800; color:#334155; font-variant-numeric:tabular-nums; line-height:1.3; }
.ry-q-s { font-size:11px; color:#94a3b8; }
.ijobiy { color:#16a34a !important; } .salbiy { color:#dc2626 !important; }

/* Ogohlantirish */
.ry-note { display:flex; gap:9px; align-items:flex-start; font-size:12.5px; line-height:1.45; padding:9px 12px; border-radius:10px; }
.ry-note svg { width:16px; height:16px; flex-shrink:0; margin-top:1px; }
.ry-note.sariq { background:rgba(217,119,6,.09); color:#92400e; }
.ry-note.qizil { background:rgba(220,38,38,.08); color:#b91c1c; }

/* Admin formasi */
.ry-form { display:flex; flex-direction:column; gap:8px; padding:12px; border-radius:12px; border:1px solid #c7d2fe; background:rgba(99,102,241,.04); }
.ry-form-row { display:flex; align-items:center; gap:8px; }
.ry-form-u { font-size:12px; color:#64748b; }
.ry-seg { display:inline-flex; background:#eef2f7; border-radius:9px; padding:3px; gap:2px; }
.ry-seg button { border:none; background:transparent; padding:6px 10px; border-radius:7px; font-size:12px; font-weight:600; color:#64748b; cursor:pointer; }
.ry-seg button.on { background:#fff; color:#4f46e5; box-shadow:0 1px 3px rgba(0,0,0,.08); }
.ry-seg button.on.salbiy { color:#dc2626; }
.ry-seg--keng { display:flex; } .ry-seg--keng button { flex:1; }
.ry-in { height:34px; padding:0 10px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:13px; background:#fff; color:#0f172a; outline:none; width:100%; }
.ry-in:focus { border-color:#6366f1; }
.ry-in--ball { width:72px; text-align:center; font-weight:700; }
.ry-form-ft { display:flex; justify-content:flex-end; gap:6px; }
.ry-btn { height:32px; padding:0 14px; border:none; border-radius:8px; background:#4f46e5; color:#fff; font-size:12.5px; font-weight:700; cursor:pointer; }
.ry-btn--ghost { background:transparent; color:#64748b; border:1px solid #e2e8f0; }
.ry-btn:disabled { opacity:.6; cursor:default; }

/* Tarix */
.ry-tarix-hd { display:flex; align-items:center; justify-content:space-between; margin-top:4px; }
.ry-tarix-soni { font-size:11.5px; color:#94a3b8; }
.ry-bosh { font-size:12.5px; color:#94a3b8; line-height:1.5; padding:10px 12px; border:1px dashed #e2e8f0; border-radius:10px; }
.ry-tl { list-style:none; margin:0; padding:0 0 0 4px; position:relative; }
.ry-tl::before { content:''; position:absolute; left:9px; top:8px; bottom:8px; width:2px; background:#eef2f7; border-radius:1px; }
.ry-tl-i { position:relative; display:flex; gap:12px; padding:7px 0; --c:#94a3b8; }
.ry-tl-i--ijobiy { --c:#16a34a; } .ry-tl-i--salbiy { --c:#dc2626; }
.ry-tl-dot { width:12px; height:12px; border-radius:50%; background:#fff; border:3px solid var(--c); flex-shrink:0; margin-top:3px; position:relative; z-index:1; }
.ry-tl-mat { flex:1; min-width:0; }
.ry-tl-t { display:flex; align-items:baseline; justify-content:space-between; gap:8px; font-size:13px; font-weight:600; color:#1e293b; }
.ry-tl-b { flex-shrink:0; padding:1px 8px; border-radius:999px; font-size:12px; font-weight:800; color:var(--c); background:color-mix(in srgb, var(--c) 12%, transparent); font-variant-numeric:tabular-nums; }
.ry-tl-s { font-size:11.5px; color:#94a3b8; line-height:1.4; margin-top:1px; }
.ry-tl-iz { font-size:12px; color:#475569; margin-top:3px; padding:4px 8px; background:#f8fafc; border-radius:6px; }
.ry-tl-keyin { font-size:11px; font-weight:700; color:#cbd5e1; font-variant-numeric:tabular-nums; margin-top:2px; min-width:22px; text-align:right; }

.shell.dark .ry-hero { border-color:rgba(255,255,255,.07); }
.shell.dark .ry-ring-bg { stroke:rgba(255,255,255,.08); }
.shell.dark .ry-tl::before { background:rgba(255,255,255,.08); }
.shell.dark .ry-q, .shell.dark .ry-tl-iz { background:rgba(255,255,255,.03); border-color:rgba(255,255,255,.06); }
.shell.dark .ry-q b, .shell.dark .ry-tl-t, .shell.dark .ry-kicker { color:#e2e8f0; }
.shell.dark .ry-tavsif, .shell.dark .ry-tl-iz { color:#cbd5e1; }
.shell.dark .ry-tl-dot { background:#0f172a; }
.shell.dark .ry-in { background:transparent; color:#e2e8f0; border-color:rgba(255,255,255,.12); }
.shell.dark .ry-seg { background:rgba(255,255,255,.06); }
.shell.dark .ry-seg button.on { background:rgba(255,255,255,.12); }
.shell.dark .ry-note.sariq { color:#fcd34d; }
.shell.dark .ry-note.qizil { color:#fca5a5; }
</style>
