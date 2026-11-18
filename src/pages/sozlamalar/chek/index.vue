<script setup lang="ts">
/* Sozlamalar → Chek: 80 mm termo printer (Xprinter XP-80C) uchun chek rekvizitlari.
   Chek Buyurtmalar'da "Yo'lga chiqarish" bosilganda avtomatik va "Chek" tugmasi bilan chop etiladi
   (utils/chek.js). Bu yerda sarlavha (firma, telefon, manzil), oxirgi matn va jonli ko'rinish. */
import { ref, reactive, computed, onMounted } from 'vue'
import { sozlamaApi } from '@/api/api'
// @ts-ignore
import { chekHtml, chekChop } from '@/utils/chek'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const form = reactive({ nomi: '', telefon: '', manzil: '', izoh: '' })
const loading = ref(false)
const saving = ref(false)

/* Namuna buyurtma — ko'rinish va sinov cheki uchun */
const NAMUNA = {
  id: 0, raqam: 'AR-2026-0151', jonatish_sana: new Date().toISOString().slice(0, 10),
  mijoz_nomi: 'Mukammalxon', mijoz: { telefon: '90 058 95 07', manzil: "Chilonzor, 12-kvartal", balans: -150000 },
  agent_nomi: 'Mukammalxon', dostavchi_nomi: 'Nurmuhammad', dostavchi: { telefon: '', mashina_raqam: '40C730TB' },
  tolov_turi: 'naqt', jami_summa: 98000, chegirma_summa: 0, izoh: '',
  qatorlar: [
    { tovar_nomi: 'Akarachka', turkum: "To'vuq go'shti", jami_dona: 1, narx: 27000, summa: 27000, olchov: 'kg' },
    { tovar_nomi: 'Doner Kebab', turkum: 'Safi mahsulotlari', jami_dona: 1, narx: 36000, summa: 36000, olchov: 'kg' },
    { tovar_nomi: 'Qanotcha chili', turkum: 'Safi mahsulotlari', jami_dona: 1.25, narx: 28000, summa: 35000, olchov: 'kg' },
  ],
}
const preview = computed(() => chekHtml([NAMUNA], { ...form }))

async function load() {
  loading.value = true
  try { Object.assign(form, await sozlamaApi.getChek()) }
  catch (e: any) { toast.error('Yuklash xatosi', e.message) }
  finally { loading.value = false }
}
async function save() {
  saving.value = true
  try {
    Object.assign(form, await sozlamaApi.updateChek({ ...form }))
    toast.success('Saqlandi', 'Chek rekvizitlari yangilandi — keyingi cheklar shu bilan chiqadi')
  } catch (e: any) { toast.error('Saqlash xatosi', e.message) }
  finally { saving.value = false }
}
function sinov() { chekChop([NAMUNA], { ...form }) }
onMounted(load)
</script>

<template>
  <div class="ck-page">
    <div class="ck-hd">
      <div class="ck-hd-left">
        <div class="ck-hd-ic">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        </div>
        <div>
          <h2 class="ck-title">Chek — 80 mm printer</h2>
          <p class="ck-sub">Buyurtma yo'lga chiqarilganda dostavchik uchun chek chop etiladi (Xprinter XP-80C va boshqa 80 mm termo printerlar)</p>
        </div>
      </div>
      <button class="ck-btn ck-btn--ghost" @click="sinov">Sinov chekini chop etish</button>
    </div>

    <div class="ck-grid">
      <div class="ck-card">
        <div class="ck-card-t">Chek sarlavhasi</div>
        <div class="ck-field"><label>Firma nomi</label><input v-model="form.nomi" class="ck-in" placeholder="Masalan: BRULLER" :disabled="loading"/></div>
        <div class="ck-field"><label>Telefon</label><input v-model="form.telefon" class="ck-in" placeholder="+998 90 000 00 00" :disabled="loading"/></div>
        <div class="ck-field"><label>Manzil</label><input v-model="form.manzil" class="ck-in" placeholder="Shahar, ko'cha" :disabled="loading"/></div>
        <div class="ck-field"><label>Chek oxiridagi matn</label><input v-model="form.izoh" class="ck-in" placeholder="Xaridingiz uchun rahmat!" :disabled="loading"/></div>
        <div class="ck-actions"><button class="ck-btn" :disabled="saving || loading" @click="save">{{ saving ? 'Saqlanmoqda…' : 'Saqlash' }}</button></div>

        <div class="ck-card-t" style="margin-top:18px">Printer sozlash (bir marta)</div>
        <ol class="ck-steps">
          <li>Windows: Xprinter drayverini o'rnating, printerni <b>standart (default)</b> qiling.</li>
          <li>Printer xususiyatlarida qog'oz: <b>80 mm × Receipt</b> (yoki "80(72) × 297"), chekka (margin) <b>0</b>.</li>
          <li>Brauzer chop oynasida: printer — XP-80C, "Margins: None", "Headers and footers" o'chiq. "Always use these settings" belgilansa, keyingi cheklar bir bosishda chiqadi.</li>
          <li>Chrome'da butunlay oynasiz chop etish kerak bo'lsa: yorliqqa <code>--kiosk-printing</code> parametri qo'shiladi.</li>
        </ol>
      </div>

      <div class="ck-card ck-card--preview">
        <div class="ck-card-t">Ko'rinishi (80 mm)</div>
        <div class="ck-paper"><iframe class="ck-frame" :srcdoc="preview" title="Chek ko'rinishi"/></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ck-page { display:flex; flex-direction:column; gap:14px; }
.ck-hd { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.ck-hd-left { display:flex; align-items:center; gap:12px; }
.ck-hd-ic { width:40px; height:40px; border-radius:11px; background:rgba(99,102,241,.12); color:#6366f1; display:flex; align-items:center; justify-content:center; }
.ck-title { margin:0; font-size:17px; font-weight:700; color:var(--ink,#0f172a); }
.ck-sub { margin:2px 0 0; font-size:12px; color:var(--mut,#64748b); }
.ck-grid { display:grid; grid-template-columns:1fr 360px; gap:14px; align-items:start; }
@media (max-width: 900px) { .ck-grid { grid-template-columns:1fr; } }
.ck-card { border:1px solid var(--line,#e2e8f0); border-radius:12px; background:var(--surface,#fff); padding:16px; }
.ck-card-t { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--mut,#94a3b8); margin-bottom:10px; }
.ck-field { display:flex; flex-direction:column; gap:5px; margin-bottom:10px; }
.ck-field label { font-size:12px; font-weight:600; color:var(--mut,#475569); }
.ck-in { height:38px; padding:0 11px; border:1px solid var(--line,#e2e8f0); border-radius:9px; font-size:13px; background:var(--surface,#fff); color:var(--ink,#0f172a); outline:none; }
.ck-in:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.15); }
.ck-actions { display:flex; justify-content:flex-end; }
.ck-btn { padding:9px 16px; border-radius:9px; border:none; background:#4f46e5; color:#fff; font-size:13px; font-weight:600; cursor:pointer; }
.ck-btn:hover:not(:disabled) { background:#4338ca; } .ck-btn:disabled { opacity:.55; cursor:default; }
.ck-btn--ghost { background:transparent; color:#4f46e5; border:1px solid rgba(99,102,241,.4); }
.ck-btn--ghost:hover { background:rgba(99,102,241,.08); }
.ck-steps { margin:0; padding-left:18px; font-size:12.5px; color:var(--ink2,#334155); line-height:1.6; }
.ck-steps code { font-size:11.5px; background:var(--hov,#f1f5f9); padding:1px 5px; border-radius:4px; }
.ck-paper { background:#e5e7eb; border-radius:10px; padding:14px; display:flex; justify-content:center; }
.ck-frame { width:302px; height:820px; border:none; background:#fff; box-shadow:0 6px 24px rgba(0,0,0,.15); }
</style>
