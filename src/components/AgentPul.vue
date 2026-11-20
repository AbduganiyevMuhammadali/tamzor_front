<script setup>
/* AGENT PUL DAFTARI — agent qo'lidagi naqd va uning tarixi (backend §17, GET /agents/:id/pul).
   Qo'lida = naqd kirim − naqd qaytarish − tasdiqlangan topshiruvlar (butun davr bo'yicha; manfiy bo'lishi mumkin).
   Plastik agent majburiyatiga kirmaydi — faqat ma'lumot sifatida ko'rsatiladi. */
import { ref, reactive, watch } from 'vue'
import { agentApi, faylniOch, faylTuri } from '@/api/api'

const props = defineProps({ agentId: { type: [Number, String], default: null }, agentNomi: { type: String, default: '' } })
const emit = defineEmits(['yop'])

const fmt = (v) => Math.round(Number(v) || 0).toLocaleString('ru-RU').replace(/,/g, ' ')
const vaqt = (s) => { if (!s) return '—'; const d = new Date(s); return isNaN(+d) ? String(s) : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }
const kun = (d) => { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
const bugun = new Date()
const f = reactive({ dan: kun(new Date(bugun.getFullYear(), bugun.getMonth(), 1)), gacha: kun(bugun) })
const d = ref(null), yuklanmoqda = ref(false), xato = ref('')

const TUR = { naqd: ['Naqd oldi', '+', 'pl-bg--ok'], qaytarish: ['Naqd qaytardi', '−', 'pl-bg--rad'], topshiruv: ['Topshirdi', '−', 'pl-bg--pl'], plastik: ['Plastik', '', ''] }
const HOLAT = { kutilmoqda: ['kutilmoqda', 'pl-bg--kut'], tasdiqlangan: ['tasdiqlangan', 'pl-bg--ok'], rad_etildi: ['rad etildi', 'pl-bg--rad'] }
// Qo'ldagi pulga ta'sir qiladimi: naqd (+), qaytarish (−), tasdiqlangan topshiruv (−); plastik va kutilayotgan/rad — yo'q
const ishora = (t) => (t.tur === 'naqd' ? '+' : t.tur === 'qaytarish' ? '−' : t.tur === 'topshiruv' && t.holat === 'tasdiqlangan' ? '−' : '')

async function yukla() {
  if (!props.agentId) return
  if (f.dan && f.gacha && f.dan > f.gacha) { xato.value = "Boshlanish sanasi tugash sanasidan keyin bo'lmasin"; return }
  yuklanmoqda.value = true; xato.value = ''
  try { d.value = await agentApi.pul(props.agentId, { dan: f.dan, gacha: f.gacha, limit: 1000 }) }
  catch (e) { xato.value = e?.status === 403 ? "Ruxsat yo'q" : e?.status === 404 ? "Pul daftari serverda hali yo'q — backend yangilanishi kerak" : e?.message === 'session_expired' ? '' : e?.message || 'Yuklanmadi' }
  finally { yuklanmoqda.value = false }
}
async function chekOch(y) { try { await faylniOch(y, 'chek') } catch (e) { xato.value = e?.message || 'Chek ochilmadi' } }
watch(() => props.agentId, (v) => { d.value = null; if (v) yukla() }, { immediate: true })
</script>

<template>
  <div v-if="agentId" class="pl-ov" @mousedown.self="emit('yop')">
    <div class="pl-m pl-m--keng">
      <div class="pl-m-hd"><div><h3>Pul daftari — {{ d?.agent?.fullname || agentNomi }}</h3><p>Agent qo'lidagi naqd: mijozlardan olgani, qaytargani va kassaga topshirgani</p></div><button class="pl-m-x" @click="emit('yop')">×</button></div>
      <div class="pl-m-bd">
        <div v-if="d" class="pl-kpi">
          <div class="pl-k"><small>Hozir qo'lida</small><b :class="{ 'pl-neg': d.pul?.qolda < 0 }">{{ fmt(d.pul?.qolda) }}</b><em>so'm · butun davr bo'yicha</em></div>
          <div class="pl-k"><small>Naqd oldi</small><b>{{ fmt(d.davr?.naqd) }}</b><em>so'm · davrda</em></div>
          <div class="pl-k"><small>Naqd qaytardi</small><b>{{ fmt(d.davr?.qaytarish) }}</b><em>so'm · davrda</em></div>
          <div class="pl-k" :class="{ 'pl-k--warn': d.davr?.topshiruv_kutilmoqda > 0 }"><small>Topshirdi</small><b>{{ fmt(d.davr?.topshiruv_tasdiqlangan) }}</b><em>so'm<template v-if="Number(d.davr?.topshiruv_kutilmoqda)"> · kutilmoqda {{ fmt(d.davr.topshiruv_kutilmoqda) }}</template></em></div>
          <div class="pl-k" :class="{ 'pl-k--warn': d.davr?.plastik_kutilmoqda > 0 }"><small>Plastik (kassaga)</small><b>{{ fmt(d.davr?.plastik_tasdiqlangan) }}</b><em>so'm<template v-if="Number(d.davr?.plastik_kutilmoqda)"> · kutilmoqda {{ fmt(d.davr.plastik_kutilmoqda) }}</template></em></div>
        </div>
        <div class="pl-fil">
          <input v-model="f.dan" type="date" :max="f.gacha || undefined" @change="yukla"/><span class="pl-mut">—</span><input v-model="f.gacha" type="date" :min="f.dan || undefined" @change="yukla"/>
          <span v-if="yuklanmoqda" class="pl-mut">Yuklanmoqda…</span>
        </div>
        <p v-if="xato" class="pl-err">{{ xato }}</p>
        <div v-if="d" class="pl-card">
          <table class="pl-tbl">
            <thead><tr><th>Sana</th><th>Tur</th><th>Mijoz / kassa</th><th class="r">Summa</th><th>Holat</th><th>Chek</th></tr></thead>
            <tbody>
              <tr v-for="t in d.tarix || []" :key="t.id">
                <td>{{ vaqt(t.sana) }}</td>
                <td><span class="pl-bg" :class="TUR[t.tur]?.[2]">{{ TUR[t.tur]?.[0] || t.tur }}</span><small v-if="t.tur === 'topshiruv' && t.usul">{{ t.usul === 'karta' ? 'Karta' : 'Naqd' }}</small></td>
                <td>{{ t.klient || t.kassa || '—' }}<small v-if="t.klient && t.kassa">{{ t.kassa }}</small><small v-if="t.izoh">{{ t.izoh }}</small></td>
                <td class="r m" :class="{ 'pl-neg': ishora(t) === '−', 'pl-mut': !ishora(t) }">{{ ishora(t) }}{{ fmt(t.summa) }}</td>
                <td><span v-if="t.holat" class="pl-bg" :class="HOLAT[t.holat]?.[1]">{{ HOLAT[t.holat]?.[0] || t.holat }}</span><small v-if="t.sabab" class="pl-neg">{{ t.sabab }}</small></td>
                <td><button v-if="t.chek_rasm" class="pl-link" @click="chekOch(t.chek_rasm)">Chek{{ faylTuri(t.chek_rasm) ? ` (${faylTuri(t.chek_rasm)})` : '' }}</button><span v-else class="pl-mut">—</span></td>
              </tr>
            </tbody>
          </table>
          <div v-if="!(d.tarix || []).length" class="pl-bosh"><b>Bu davrda pul harakati yo'q</b></div>
        </div>
        <p class="pl-mut" style="margin:0;font-size:12px">Kulrang summalar (plastik, kutilayotgan yoki rad etilgan topshiruv) qo'ldagi naqdga ta'sir qilmaydi.</p>
      </div>
      <div class="pl-m-ft"><button class="pl-btn" @click="emit('yop')">Yopish</button></div>
    </div>
  </div>
</template>
