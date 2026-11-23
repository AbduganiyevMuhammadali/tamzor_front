<script setup>
/* TASDIQ KUTAYOTGAN XARAJATLAR (backend §22): limitdan katta xarajat darhol yozilmaydi — so'rov bo'lib saqlanadi.
   moliya:approve ruxsati bor foydalanuvchi tasdiqlaydi (pul kassadan chiqadi) yoki sabab bilan rad etadi.
   O'z so'rovini o'zi tasdiqlay olmaydi (Admin/Programmer bundan mustasno); yaratuvchi kutilayotgan so'rovini bekor qila oladi.
   Oddiy foydalanuvchiga backend faqat o'z so'rovlarini qaytaradi. */
import { ref, reactive, computed, onMounted } from 'vue'
import { xarajatApi, faylniOch } from '@/api/api'
import { authStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const props = defineProps({ kassalar: { type: Array, default: () => [] } })
const emit = defineEmits(['ozgardi'])
const toast = useToast()

const men = computed(() => authStore.state.user)
const tasdiqlaydi = computed(() => authStore.hasPerm('moliya', 'approve'))
const fmt = (v) => Math.round(Number(v) || 0).toLocaleString('ru-RU').replace(/,/g, ' ')
const vaqt = (s) => { if (!s) return '—'; const d = new Date(s); return isNaN(+d) ? String(s) : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }
const xatoMatn = (e) => (e?.message === 'session_expired' ? '' : e?.status === 403 && !e?.message ? "Ruxsat yo'q" : e?.message || 'Xatolik')
const HOLAT = { kutilmoqda: ['Kutilmoqda', 'pl-bg--kut'], tasdiqlangan: ['Tasdiqlangan', 'pl-bg--ok'], rad_etildi: ['Rad etildi', 'pl-bg--rad'], bekor: ['Bekor qilingan', ''] }

const f = reactive({ holat: 'kutilmoqda', user_id: '', kassa_id: '', dan: '', gacha: '', page: 1 })
const LIMIT = 50
const rows = ref([]), jami = ref({ soni: 0, summa: 0 }), yuklanmoqda = ref(false), xato = ref(''), band = ref(false)
// Foydalanuvchi filtri uchun ro'yxat — kelgan so'rovlardagi egalar (alohida foydalanuvchilar ro'yxati so'ralmaydi)
const egalar = ref(new Map())
const sahifalar = computed(() => Math.max(1, Math.ceil((jami.value.soni || 0) / LIMIT)))

const meniki = (r) => Number(r.user_id) === Number(men.value?.id)
// Tasdiqlash/rad: approve ruxsati + boshqaning so'rovi (Admin/Programmer o'zinikini ham hal qila oladi)
const halQiladi = (r) => r.holat === 'kutilmoqda' && tasdiqlaydi.value && (!meniki(r) || authStore.isAdmin.value)
const bekorQiladi = (r) => r.holat === 'kutilmoqda' && meniki(r)

async function yukla() {
  if (f.dan && f.gacha && f.dan > f.gacha) { xato.value = "Boshlanish sanasi tugash sanasidan keyin bo'lmasin"; return }
  yuklanmoqda.value = true; xato.value = ''
  try {
    const p = Object.fromEntries(Object.entries({ ...f, limit: LIMIT }).filter(([, v]) => v !== '' && v != null))
    const d = await xarajatApi.sorovlar(p)
    rows.value = d?.data || []; jami.value = d?.jami || { soni: 0, summa: 0 }
    for (const r of rows.value) if (r.user_id) egalar.value.set(r.user_id, r.user_nomi || `#${r.user_id}`)
  } catch (e) { xato.value = xatoMatn(e); rows.value = [] } finally { yuklanmoqda.value = false }
}
const filtr = () => { f.page = 1; yukla() }
async function chekOch(y) { try { await faylniOch(y, 'chek') } catch (e) { const x = xatoMatn(e); if (x) toast.error('Chek ochilmadi', x) } }

const am = reactive({ ochiq: false, amal: '', r: null, sabab: '', izoh: '', xato: '' })
function amalOch(amal, r) { Object.assign(am, { ochiq: true, amal, r, sabab: '', izoh: '', xato: '' }) }
async function bajar() {
  if (band.value) return
  const r = am.r, sabab = am.sabab.trim()
  am.xato = ''
  if (am.amal === 'rad' && (sabab.length < 3 || sabab.length > 500)) { am.xato = sabab.length < 3 ? 'Sababni yozing (kamida 3 ta belgi)' : 'Sabab 500 belgidan oshmasin'; return }
  band.value = true
  try {
    if (am.amal === 'tasdiqla') await xarajatApi.sorovTasdiqla(r.id, am.izoh.trim() ? { izoh: am.izoh.trim().slice(0, 500) } : {})
    else if (am.amal === 'rad') await xarajatApi.sorovRad(r.id, { sabab })
    else await xarajatApi.sorovBekor(r.id)
    am.ochiq = false
    toast.success({ tasdiqla: 'Xarajat tasdiqlandi', rad: 'Rad etildi', bekor: "So'rov bekor qilindi" }[am.amal], `${r.kategoriya_nomi} · ${fmt(r.summa)} so'm`)
    await yukla(); emit('ozgardi')
  } catch (e) {
    am.xato = xatoMatn(e)
    if (e?.status === 400) { yukla(); emit('ozgardi') }   // boshqa oynada hal qilingan yoki kassa balansi o'zgargan bo'lishi mumkin
  } finally { band.value = false }
}
const AMAL = { tasdiqla: 'Tasdiqlash', rad: 'Rad etish', bekor: 'Bekor qilish' }

onMounted(yukla)
defineExpose({ yukla })
</script>

<template>
  <div class="pl">
    <div class="pl-fil">
      <div class="pl-seg">
        <button v-for="h in [['kutilmoqda', 'Kutilmoqda'], ['tasdiqlangan', 'Tasdiqlangan'], ['rad_etildi', 'Rad etilgan'], ['bekor', 'Bekor qilingan'], ['', 'Hammasi']]" :key="h[0]" :class="{ on: f.holat === h[0] }" @click="f.holat = h[0]; filtr()">{{ h[1] }}</button>
      </div>
      <select v-if="tasdiqlaydi && egalar.size" v-model="f.user_id" @change="filtr"><option value="">Barcha foydalanuvchilar</option><option v-for="[id, nomi] in egalar" :key="id" :value="id">{{ nomi }}</option></select>
      <select v-model="f.kassa_id" @change="filtr"><option value="">Barcha kassalar</option><option v-for="k in props.kassalar" :key="k.id" :value="k.id">{{ k.nomi }}</option></select>
      <input v-model="f.dan" type="date" :max="f.gacha || undefined" @change="filtr"/><span class="pl-mut">—</span><input v-model="f.gacha" type="date" :min="f.dan || undefined" @change="filtr"/>
    </div>
    <p v-if="xato" class="pl-err">{{ xato }}</p>
    <div class="pl-card">
      <table class="pl-tbl">
        <thead><tr><th>Sana</th><th>Kim</th><th>Toifa</th><th class="r">Summa</th><th>Kassa</th><th>Izoh</th><th>Chek</th><th>Holat</th><th></th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ vaqt(r.sana) }}</td>
            <td>{{ r.user_nomi || '—' }}<small>{{ r.user_limit == null ? 'limitsiz' : 'limiti ' + fmt(r.user_limit) }}</small></td>
            <td>{{ r.kategoriya_nomi }}</td>
            <td class="r m">{{ fmt(r.summa) }}<small v-if="r.user_limit != null && r.summa > r.user_limit" class="pl-neg">limitdan {{ fmt(r.summa - r.user_limit) }} ko'p</small></td>
            <td>{{ r.kassa_nomi || '—' }}<small v-if="r.kassa_balans != null" :class="{ 'pl-neg': r.holat === 'kutilmoqda' && r.kassa_balans < r.summa }">balans {{ fmt(r.kassa_balans) }}</small></td>
            <td style="max-width:200px">{{ r.izoh || '—' }}</td>
            <td><button v-if="r.chek_rasm" class="pl-link" @click="chekOch(r.chek_rasm)">Chek</button><span v-else class="pl-mut">—</span></td>
            <td>
              <span class="pl-bg" :class="HOLAT[r.holat]?.[1]">{{ HOLAT[r.holat]?.[0] || r.holat }}</span>
              <small v-if="r.tasdiqlagan_nomi">{{ r.tasdiqlagan_nomi }} · {{ vaqt(r.tasdiq_vaqt) }}</small>
              <small v-if="r.rad_sababi" class="pl-neg">{{ r.rad_sababi }}</small>
            </td>
            <td>
              <div class="pl-amal">
                <template v-if="halQiladi(r)">
                  <button class="pl-btn sm pl-btn--ok" @click="amalOch('tasdiqla', r)">Tasdiqlash</button>
                  <button class="pl-btn sm pl-btn--x" @click="amalOch('rad', r)">Rad etish</button>
                </template>
                <button v-if="bekorQiladi(r)" class="pl-btn sm" @click="amalOch('bekor', r)">Bekor qilish</button>
                <span v-if="r.holat === 'kutilmoqda' && meniki(r) && tasdiqlaydi && !authStore.isAdmin.value" class="pl-mut" style="font-size:11.5px" title="O'z so'rovingizni o'zingiz tasdiqlay olmaysiz">boshqa xodim tasdiqlaydi</span>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="rows.length"><tr><td colspan="3">Jami: {{ jami.soni }} ta</td><td class="r m">{{ fmt(jami.summa) }}</td><td colspan="5"></td></tr></tfoot>
      </table>
      <div v-if="!rows.length && !yuklanmoqda && !xato" class="pl-bosh"><b>{{ f.holat === 'kutilmoqda' ? "Tasdiq kutayotgan xarajat yo'q" : "Bu filtr bo'yicha so'rov yo'q" }}</b>Limitdan katta xarajat kiritilganda shu yerda chiqadi.</div>
      <div v-if="yuklanmoqda && !rows.length" class="pl-bosh">Yuklanmoqda…</div>
    </div>
    <div v-if="sahifalar > 1" class="pl-sah">
      <button class="pl-btn sm" :disabled="f.page <= 1" @click="f.page--; yukla()">‹ Oldingi</button><span>{{ f.page }} / {{ sahifalar }}</span><button class="pl-btn sm" :disabled="f.page >= sahifalar" @click="f.page++; yukla()">Keyingi ›</button>
    </div>

    <div v-if="am.ochiq" class="pl-ov" @mousedown.self="am.ochiq = false">
      <div class="pl-m">
        <div class="pl-m-hd"><div><h3>Xarajat so'rovi — {{ AMAL[am.amal] }}</h3><p>{{ am.r.user_nomi }} · {{ vaqt(am.r.sana) }}</p></div><button class="pl-m-x" @click="am.ochiq = false">×</button></div>
        <div class="pl-m-bd">
          <dl class="pl-kv">
            <dt>Toifa</dt><dd>{{ am.r.kategoriya_nomi }}</dd>
            <dt>Summa</dt><dd>{{ fmt(am.r.summa) }} so'm</dd>
            <dt>Xodim limiti</dt><dd>{{ am.r.user_limit == null ? 'cheklovsiz' : fmt(am.r.user_limit) + " so'm" }}</dd>
            <dt>Kassa</dt><dd>{{ am.r.kassa_nomi || '—' }}<template v-if="am.r.kassa_balans != null"> · balans {{ fmt(am.r.kassa_balans) }}</template></dd>
            <template v-if="am.r.izoh"><dt>Izoh</dt><dd>{{ am.r.izoh }}</dd></template>
            <dt>Chek</dt><dd><button v-if="am.r.chek_rasm" class="pl-link" @click="chekOch(am.r.chek_rasm)">Chekni ochish</button><span v-else class="pl-mut">yo'q</span></dd>
          </dl>
          <p v-if="am.amal === 'tasdiqla'" class="pl-mut" style="margin:0;font-size:12.5px">Tasdiqlansa, {{ fmt(am.r.summa) }} so'm "{{ am.r.kassa_nomi }}" kassasidan chiqim bo'lib yoziladi.<b v-if="am.r.kassa_balans != null && am.r.kassa_balans < am.r.summa" class="pl-neg"> Kassada mablag' yetmaydi.</b></p>
          <p v-if="am.amal === 'bekor'" class="pl-mut" style="margin:0;font-size:12.5px">So'rov bekor qilinadi, kassadan pul chiqmaydi.</p>
          <label v-if="am.amal === 'tasdiqla'" class="pl-f"><span>Izoh</span><input v-model="am.izoh" maxlength="500" placeholder="Ixtiyoriy"/></label>
          <label v-if="am.amal === 'rad'" class="pl-f"><span>Sabab <i>*</i></span><textarea v-model="am.sabab" rows="2" maxlength="500" placeholder="Nima uchun rad etilyapti — xodim ko'radi"/></label>
          <p v-if="am.xato" class="pl-err">{{ am.xato }}</p>
        </div>
        <div class="pl-m-ft">
          <button class="pl-btn" @click="am.ochiq = false">Yopish</button>
          <button class="pl-btn" :class="am.amal === 'tasdiqla' ? 'pl-btn--ok' : 'pl-btn--x'" :disabled="band" @click="bajar">{{ band ? 'Bajarilmoqda…' : am.amal === 'tasdiqla' ? 'Tasdiqlash' : am.amal === 'rad' ? 'Rad etish' : "Ha, bekor qilish" }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
