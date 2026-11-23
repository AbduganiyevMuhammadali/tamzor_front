<script setup>
/* VILOYAT NARXLARI — ommaviy tahrirlash (backend §20): bitta viloyat tanlanadi, tovarlar jadvalida
   chakana va optom narx joyida tahrirlanadi. Faqat o'zgargan qatorlar yuboriladi; bo'sh qiymat narxni o'chiradi.
   Jadvalga faqat faol savdo tovarlari kiradi (xom ashyoga narx qo'yilmaydi). Saqlash — ombor:edit. */
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import NumberInput from '@/components/NumberInput.vue'
import { viloyatNarxApi, agentApi } from '@/api/api'
import { authStore } from '@/stores/auth'
import { useQidiruv } from '@/composables/useQidiruv'

const tahrir = computed(() => authStore.hasPerm('ombor', 'edit'))
const viloyatlar = ref([]), viloyatId = ref(''), qidiruv = ref(''), faqatYoq = ref(false)
const rows = ref([]), jami = ref(0), sahifa = ref(1), limit = ref(100)
const yuklanmoqda = ref(false), band = ref(false), xato = ref(''), xabar = ref('')

const son = (v) => (v === '' || v == null ? null : Number(v) > 0 ? Number(v) : null)
const vaqt = (s) => { if (!s) return ''; const d = new Date(s); return isNaN(+d) ? '' : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }
const xatoMatn = (e) => (e?.message === 'session_expired' ? '' : e?.status === 403 ? "Ruxsat yo'q" : e?.status === 404 ? "Viloyat narxlari serverda hali yo'q — backend yangilanishi kerak" : e?.message || 'Xatolik')
const ozgarganmi = (r) => son(r.c) !== r.c0 || son(r.o) !== r.o0
const ozgargan = computed(() => rows.value.filter(ozgarganmi))
const korinadi = computed(() => (faqatYoq.value ? rows.value.filter(r => !son(r.c) || !son(r.o) || ozgarganmi(r)) : rows.value))
const narxsiz = computed(() => rows.value.filter(r => !r.c0 && !r.o0).length)
const sahifalar = computed(() => Math.max(1, Math.ceil(jami.value / limit.value)))
// Saqlanmagan o'zgarish bo'lsa — davom etishdan oldin so'raladi (viloyat, sahifa, qidiruv almashganda ham)
const tashlaymi = () => !ozgargan.value.length || confirm(`${ozgargan.value.length} ta narx saqlanmagan. Tashlab yuborilsinmi?`)

const qd = useQidiruv({
  matn: qidiruv, sahifa, yuklanmoqda,
  kalit: () => [viloyatId.value, limit.value],
  yukla: (q) => viloyatNarxApi.viloyat({ territoriya_id: viloyatId.value, page: sahifa.value, limit: limit.value, ...(q ? { qidiruv: q } : {}) }),
  qolla: (d) => {
    rows.value = (d?.data || []).map(r => ({ ...r, c: son(r.chakana_narx), o: son(r.optom_narx), c0: son(r.chakana_narx), o0: son(r.optom_narx) }))
    jami.value = d?.jami || 0; xato.value = ''
  },
  xato: (e) => { xato.value = xatoMatn(e) },
})
const yukla = () => (viloyatId.value ? qd.qayta() : null)

let eskiViloyat = ''
function viloyatAlmash() {
  if (!tashlaymi()) { viloyatId.value = eskiViloyat; return }
  eskiViloyat = viloyatId.value; xabar.value = ''; sahifa.value = 1; yukla()
}
function sahifaga(n) { if (n < 1 || n > sahifalar.value || !tashlaymi()) return; sahifa.value = n; xabar.value = ''; yukla() }
// "Narxi yo'qlar" filtri joriy sahifada ishlaydi — hammasini bir sahifada ko'rish uchun hajm kattalashtiriladi
function yoqFiltr() { if (faqatYoq.value && limit.value < 1000) { if (!tashlaymi()) { faqatYoq.value = false; return } limit.value = 1000; sahifa.value = 1; yukla() } }

async function saqla() {
  if (band.value || !ozgargan.value.length) return
  band.value = true; xato.value = ''; xabar.value = ''
  try {
    const narxlar = ozgargan.value.map(r => ({ tovar_id: r.tovar_id, ...(son(r.c) !== r.c0 ? { chakana_narx: son(r.c) } : {}), ...(son(r.o) !== r.o0 ? { optom_narx: son(r.o) } : {}) }))
    const d = await viloyatNarxApi.viloyatSaqla(viloyatId.value, narxlar)
    await yukla()
    xabar.value = `${d?.saqlandi ?? narxlar.length} ta narx saqlandi — darhol kuchga kirdi`
  } catch (e) { xato.value = xatoMatn(e) } finally { band.value = false }
}
function bekor() { rows.value.forEach(r => { r.c = r.c0; r.o = r.o0 }) }

// Qidiruv matni o'zgarganda saqlanmagan o'zgarishlar yo'qoladi — shuning uchun qidiruv faqat toza holatda ishlaydi
watch(qidiruv, () => { xabar.value = '' })
const chiqish = (e) => { if (ozgargan.value.length) { e.preventDefault(); e.returnValue = '' } }
onMounted(async () => {
  window.addEventListener('beforeunload', chiqish)
  try { const d = await agentApi.spravochnik(); viloyatlar.value = d?.territoriyalar || []; if (viloyatlar.value.length) { viloyatId.value = viloyatlar.value[0].id; eskiViloyat = viloyatId.value; yukla() } }
  catch (e) { xato.value = xatoMatn(e) }
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', chiqish))
onBeforeRouteLeave(() => tashlaymi())
defineExpose({ ozgargan })
</script>

<template>
  <div class="pl vnp">
    <div class="pl-hd">
      <div><h1>Viloyat narxlari</h1><p>Har viloyat uchun tovarning chakana va optom narxi. Shu viloyatdagi agentlar shu narxda sotadi; narxi yo'q tovarni sota olmaydi</p></div>
      <div class="pl-hd-r">
        <span v-if="ozgargan.length" class="vnp-kut">{{ ozgargan.length }} ta saqlanmagan</span>
        <button v-if="tahrir" class="pl-btn" :disabled="band || !ozgargan.length" @click="bekor">Bekor qilish</button>
        <button v-if="tahrir" class="pl-btn pl-btn--p" :disabled="band || !ozgargan.length" @click="saqla">{{ band ? 'Saqlanmoqda…' : 'Saqlash' }}</button>
      </div>
    </div>

    <div class="pl-fil">
      <select v-model="viloyatId" @change="viloyatAlmash"><option v-for="v in viloyatlar" :key="v.id" :value="v.id">{{ v.nomi }}</option></select>
      <input v-model="qidiruv" maxlength="100" placeholder="Tovar qidirish…" :disabled="!!ozgargan.length" :title="ozgargan.length ? 'Avval o\'zgarishlarni saqlang yoki bekor qiling' : ''" style="min-width:220px" @keydown.enter="qd.darhol()"/>
      <label class="vnp-chk"><input v-model="faqatYoq" type="checkbox" @change="yoqFiltr"/> Narxi yo'qlar</label>
      <span class="pl-mut" style="font-size:12.5px">{{ jami }} ta tovar<template v-if="narxsiz"> · <b class="pl-neg">{{ narxsiz }} tasida narx yo'q</b></template></span>
    </div>

    <p v-if="xato" class="pl-err">{{ xato }}</p>
    <p v-if="xabar" class="vnp-ok">{{ xabar }}</p>
    <p v-if="!tahrir" class="pl-mut" style="margin:0;font-size:12.5px">Faqat ko'rish: narxni o'zgartirish uchun "Ombor → Tahrirlash" ruxsati kerak.</p>

    <div class="pl-card">
      <table class="pl-tbl">
        <thead><tr><th>Tovar</th><th>Turkum</th><th class="r">Chakana narx</th><th class="r">Optom narx</th><th>O'zgargan sana</th></tr></thead>
        <tbody>
          <tr v-for="r in korinadi" :key="r.tovar_id" :class="{ 'vnp-oz': ozgarganmi(r) }">
            <td><b>{{ r.nomi }}</b><small v-if="!son(r.c) && !son(r.o)" class="pl-neg">⚠ Narx yo'q — agentlar sotolmaydi</small></td>
            <td>{{ r.turkum || '—' }}</td>
            <td class="r"><NumberInput v-model="r.c" :bosh="null" :disabled="!tahrir" css-class="vnp-in" placeholder="—" :aria-label="`${r.nomi} chakana narx`"/></td>
            <td class="r"><NumberInput v-model="r.o" :bosh="null" :disabled="!tahrir" css-class="vnp-in" placeholder="—" :aria-label="`${r.nomi} optom narx`"/></td>
            <td>{{ vaqt(r.updatedAt) || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!korinadi.length && !yuklanmoqda && !xato" class="pl-bosh"><b>{{ faqatYoq ? "Narxi yo'q tovar qolmadi" : 'Tovar topilmadi' }}</b>{{ viloyatlar.length ? '' : "Avval Sozlamalar → Hudud bo'limida viloyat qo'shing." }}</div>
      <div v-if="yuklanmoqda && !rows.length" class="pl-bosh">Yuklanmoqda…</div>
    </div>
    <div v-if="sahifalar > 1" class="pl-sah">
      <button class="pl-btn sm" :disabled="sahifa <= 1" @click="sahifaga(sahifa - 1)">‹ Oldingi</button><span>{{ sahifa }} / {{ sahifalar }}</span><button class="pl-btn sm" :disabled="sahifa >= sahifalar" @click="sahifaga(sahifa + 1)">Keyingi ›</button>
    </div>
  </div>
</template>

<style scoped>
.vnp { padding:4px 2px; }
.vnp :deep(.vnp-in) { width:140px; height:34px; padding:0 10px; border:1.5px solid var(--line, #e2e8f0); border-radius:8px; text-align:right; font-size:13.5px; font-variant-numeric:tabular-nums; background:var(--surface, #fff); color:var(--ink, #0f172a); outline:none; }
.vnp :deep(.vnp-in:focus) { border-color:var(--acc, #7c3aed); }
.vnp :deep(.vnp-in:disabled) { background:var(--hov, #f8fafc); }
.vnp-oz td { background:rgba(124,58,237,.06); }
.vnp-kut { color:#b45309; font-weight:600; font-size:12.5px; }
.vnp-ok { margin:0; padding:9px 12px; border-radius:9px; background:rgba(5,150,105,.1); color:#047857; font-size:12.5px; font-weight:600; }
.vnp-chk { display:inline-flex; align-items:center; gap:6px; font-size:13px; cursor:pointer; }
</style>
