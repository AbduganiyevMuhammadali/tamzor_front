<script setup>
/* Tovar kartasidagi "Viloyat narxlari" bloki (backend §20).
   Har viloyat — bir qator: chakana va optom narx. Narxi yo'q viloyatda agentlar bu tovarni sota olmaydi.
   Saqlashda faqat o'zgargan qatorlar va faqat o'zgargan narx maydoni yuboriladi; bo'sh qiymat narxni o'chiradi. */
import { ref, computed, watch } from 'vue'
import NumberInput from '@/components/NumberInput.vue'
import { viloyatNarxApi } from '@/api/api'
import { authStore } from '@/stores/auth'

const props = defineProps({ tovarId: { type: [Number, String], default: null } })
const tahrir = computed(() => authStore.hasPerm('ombor', 'edit'))
const rows = ref([]), yuklanmoqda = ref(false), band = ref(false), xato = ref(''), xabar = ref('')

const son = (v) => (v === '' || v == null ? null : Number(v) > 0 ? Number(v) : null)
const vaqt = (s) => { if (!s) return ''; const d = new Date(s); return isNaN(+d) ? '' : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }
const qolla = (d) => { rows.value = (d?.narxlar || []).map(r => ({ ...r, c: son(r.chakana_narx), o: son(r.optom_narx), c0: son(r.chakana_narx), o0: son(r.optom_narx) })) }
const ozgargan = computed(() => rows.value.filter(r => son(r.c) !== r.c0 || son(r.o) !== r.o0))
const xatoMatn = (e) => (e?.message === 'session_expired' ? '' : e?.status === 403 ? "Ruxsat yo'q" : e?.message || 'Xatolik')

async function yukla() {
  if (!props.tovarId) { rows.value = []; return }
  yuklanmoqda.value = true; xato.value = ''; xabar.value = ''
  try { qolla(await viloyatNarxApi.tovar(props.tovarId)) }
  catch (e) { xato.value = e?.status === 404 ? "Viloyat narxlari serverda hali yo'q — backend yangilanishi kerak" : xatoMatn(e) }
  finally { yuklanmoqda.value = false }
}
async function saqla() {
  if (band.value || !ozgargan.value.length) return
  band.value = true; xato.value = ''; xabar.value = ''
  try {
    const narxlar = ozgargan.value.map(r => ({ territoriya_id: r.territoriya_id, ...(son(r.c) !== r.c0 ? { chakana_narx: son(r.c) } : {}), ...(son(r.o) !== r.o0 ? { optom_narx: son(r.o) } : {}) }))
    const n = narxlar.length
    qolla(await viloyatNarxApi.tovarSaqla(props.tovarId, narxlar))
    xabar.value = `${n} ta viloyat narxi saqlandi — darhol kuchga kirdi`
  } catch (e) { xato.value = xatoMatn(e) } finally { band.value = false }
}
watch(() => props.tovarId, yukla, { immediate: true })
defineExpose({ ozgargan })
</script>

<template>
  <div class="vn">
    <p class="vn-izoh">Agent o'z viloyatining narxida sotadi: mijoz narx turi chakana bo'lsa — chakana, optom bo'lsa — optom narx. Mijoz toifasiga narx ro'yxati biriktirilgan bo'lsa, o'sha ustun turadi.</p>
    <p v-if="xato" class="pl-err">{{ xato }}</p>
    <div v-if="yuklanmoqda && !rows.length" class="pl-bosh">Yuklanmoqda…</div>
    <div v-else-if="rows.length" class="pl-card">
      <table class="pl-tbl">
        <thead><tr><th>Viloyat</th><th class="r">Chakana narx</th><th class="r">Optom narx</th><th>Oxirgi o'zgarish</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.territoriya_id" :class="{ 'vn-oz': son(r.c) !== r.c0 || son(r.o) !== r.o0 }">
            <td><b>{{ r.territoriya_nomi }}</b><small v-if="!son(r.c) && !son(r.o)" class="pl-neg">⚠ Narx yo'q — agentlar sotolmaydi</small><small v-else-if="!son(r.c) || !son(r.o)" class="vn-yarim">{{ !son(r.c) ? 'Chakana' : 'Optom' }} narx yo'q — shu narx turidagi mijozga sotilmaydi</small></td>
            <td class="r"><NumberInput v-model="r.c" :bosh="null" :disabled="!tahrir" css-class="vn-in" placeholder="—" :aria-label="`${r.territoriya_nomi} chakana narx`"/></td>
            <td class="r"><NumberInput v-model="r.o" :bosh="null" :disabled="!tahrir" css-class="vn-in" placeholder="—" :aria-label="`${r.territoriya_nomi} optom narx`"/></td>
            <td><template v-if="r.updatedAt">{{ vaqt(r.updatedAt) }}<small>{{ r.user_nomi || '' }}</small></template><span v-else class="pl-mut">—</span></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else-if="!xato" class="pl-bosh"><b>Viloyat yo'q</b>Avval Sozlamalar → Hudud bo'limida viloyat qo'shing.</div>
    <div v-if="rows.length" class="vn-ft">
      <span v-if="xabar" class="vn-ok">{{ xabar }}</span>
      <span v-else-if="ozgargan.length" class="vn-kut">{{ ozgargan.length }} ta qator o'zgardi — saqlanmagan</span>
      <span v-else-if="!tahrir" class="pl-mut">Narxni o'zgartirish uchun "Ombor → Tahrirlash" ruxsati kerak</span>
      <span style="flex:1"/>
      <button v-if="tahrir" type="button" class="pl-btn" :disabled="band || !ozgargan.length" @click="yukla">Bekor qilish</button>
      <button v-if="tahrir" type="button" class="pl-btn pl-btn--p" :disabled="band || !ozgargan.length" @click="saqla">{{ band ? 'Saqlanmoqda…' : 'Narxlarni saqlash' }}</button>
    </div>
  </div>
</template>

<style scoped>
/* Blok tovar oynasi ichida (sahifa qobig'idan tashqarida) chiziladi — umumiy .pl-* uslublari uchun rang o'zgaruvchilari shu yerda beriladi */
.vn { display:flex; flex-direction:column; gap:10px; grid-column:1 / -1;
  --surface:#ffffff; --line:#e6e3ef; --line2:#f0eef6; --ink:#0f172a; --ink2:#334155; --mut:#64748b; --sub:#94a3b8;
  --hov:#f3f1f9; --acc:var(--brand-600, #7c3aed); --acc-soft:var(--brand-50, #f5f3ff); --acc-ink:var(--brand-700, #6d28d9); }
.vn-izoh { margin:0; font-size:12.5px; color:var(--mut, #64748b); line-height:1.45; }
.vn :deep(.vn-in) { width:140px; height:34px; padding:0 10px; border:1.5px solid var(--line, #e2e8f0); border-radius:8px; text-align:right; font-size:13.5px; font-variant-numeric:tabular-nums; background:var(--surface, #fff); color:var(--ink, #0f172a); outline:none; }
.vn :deep(.vn-in:focus) { border-color:var(--acc, #7c3aed); }
.vn :deep(.vn-in:disabled) { background:var(--hov, #f8fafc); }
.vn-oz td { background:rgba(124,58,237,.06); }
.vn-yarim { color:#b45309 !important; }
.vn-ft { display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:12.5px; }
.vn-ok { color:#047857; font-weight:600; } .vn-kut { color:#b45309; font-weight:600; }
</style>
