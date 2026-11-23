<script setup>
/* DILLERLAR — kompaniya hamkorlari ro'yxati (backend §24).
   Diller tovarni kompaniyadan diller narxida oladi (to'liq to'lab, qisman yoki qarzga) va o'zi xohlagan narxda sotadi.
   Bu yerda: dillerning kompaniyaga qarzi, omboridagi tovar summasi, mijozlari soni. Yangi diller — Agentlar ro'yxatida
   agent qo'shib, "Diller" belgisini qo'yish orqali. */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { dillerApi, agentApi } from '@/api/api'
import { useQidiruv } from '@/composables/useQidiruv'

const router = useRouter()
const fmt = (v) => Math.round(Number(v) || 0).toLocaleString('ru-RU').replace(/,/g, ' ')
const sana = (s) => { if (!s) return '—'; const d = new Date(s); return isNaN(+d) ? '—' : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) }
const xatoMatn = (e) => (e?.message === 'session_expired' ? '' : e?.status === 403 ? "Ruxsat yo'q" : e?.status === 404 ? "Dillerlar bo'limi serverda hali yo'q — backend yangilanishi kerak" : e?.message || 'Xatolik')

const f = reactive({ territoriya_id: '' })
const qidiruv = ref(''), sahifa = ref(1), yuklanmoqda = ref(false), xato = ref('')
const rows = ref([]), jami = ref({ qarz: 0, soni: 0 }), viloyatlar = ref([])
const LIMIT = 50
const sahifalar = computed(() => Math.max(1, Math.ceil((jami.value.soni || 0) / LIMIT)))
const omborJami = computed(() => rows.value.reduce((s, r) => s + (Number(r.ombor_summa) || 0), 0))

const qd = useQidiruv({
  matn: qidiruv, sahifa, yuklanmoqda,
  kalit: () => [f.territoriya_id],
  yukla: (q) => dillerApi.royxat({ page: sahifa.value, limit: LIMIT, ...(f.territoriya_id ? { territoriya_id: f.territoriya_id } : {}), ...(q ? { qidiruv: q } : {}) }),
  qolla: (d) => { rows.value = d?.data || []; jami.value = d?.jami || { qarz: 0, soni: 0 }; xato.value = '' },
  xato: (e) => { xato.value = xatoMatn(e) },
})
onMounted(() => { agentApi.spravochnik().then(d => { viloyatlar.value = d?.territoriyalar || [] }).catch(() => {}); qd.qayta() })
</script>

<template>
  <div class="pl">
    <div class="pl-hd">
      <div><h1>Dillerlar</h1><p>Hamkor sotuvchilar: kompaniyadan tovarni diller narxida oladi, o'z narxida sotadi. Kompaniyaga faqat tovar qarzini to'laydi</p></div>
      <div class="pl-hd-r">
        <button class="pl-btn" :disabled="yuklanmoqda" @click="qd.qayta()">Yangilash</button>
        <RouterLink to="/agentlar/royxat" class="pl-btn" title="Yangi diller: agent qo'shib, &quot;Diller&quot; belgisini qo'ying">+ Diller qo'shish</RouterLink>
      </div>
    </div>

    <div class="pl-kpi">
      <div class="pl-k"><small>Dillerlar</small><b>{{ jami.soni || 0 }}</b><em>ta</em></div>
      <div class="pl-k" :class="{ 'pl-k--warn': jami.qarz > 0 }"><small>Jami qarzi</small><b>{{ fmt(jami.qarz) }}</b><em>so'm · kompaniyaga to'lashi kerak</em></div>
      <div class="pl-k"><small>Dillerlar omborida</small><b>{{ fmt(omborJami) }}</b><em>so'm · olgan narxida{{ sahifalar > 1 ? ' (shu sahifa)' : '' }}</em></div>
    </div>

    <div class="pl-fil">
      <input v-model="qidiruv" maxlength="100" placeholder="Diller qidirish…" style="min-width:220px" @keydown.enter="qd.darhol()"/>
      <select v-model="f.territoriya_id" @change="qd.filtr()"><option value="">Barcha viloyatlar</option><option v-for="v in viloyatlar" :key="v.id" :value="v.id">{{ v.nomi }}</option></select>
    </div>
    <p v-if="xato" class="pl-err">{{ xato }}</p>

    <div class="pl-card">
      <table class="pl-tbl">
        <thead><tr><th>Diller</th><th>Viloyat</th><th class="r">Qarzi</th><th class="r">Omboridagi tovar</th><th class="r">Mijozlari</th><th>Oxirgi berish</th><th>Holat</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" class="bos" @click="router.push(`/dillerlar/${r.id}`)">
            <td><b>{{ r.fullname }}</b></td>
            <td>{{ r.territoriya?.nomi || '—' }}</td>
            <td class="r m" :class="{ 'pl-neg': r.qarz > 0 }">{{ fmt(r.qarz) }}</td>
            <td class="r m">{{ fmt(r.ombor_summa) }}</td>
            <td class="r">{{ r.mijozlar_soni }}</td>
            <td>{{ sana(r.oxirgi_berish_sana) }}</td>
            <td><span class="pl-bg" :class="r.faol ? 'pl-bg--ok' : ''">{{ r.faol ? 'Faol' : 'Faolsiz' }}</span></td>
          </tr>
        </tbody>
        <tfoot v-if="rows.length"><tr><td colspan="2">Jami: {{ jami.soni }} ta diller</td><td class="r m">{{ fmt(jami.qarz) }}</td><td colspan="4"></td></tr></tfoot>
      </table>
      <div v-if="!rows.length && !yuklanmoqda && !xato" class="pl-bosh"><b>{{ qidiruv || f.territoriya_id ? 'Diller topilmadi' : "Hali diller yo'q" }}</b>Diller qo'shish: Agentlar ro'yxatida agent qo'shing va "Diller" belgisini yoqing.</div>
      <div v-if="yuklanmoqda && !rows.length" class="pl-bosh">Yuklanmoqda…</div>
    </div>
    <div v-if="sahifalar > 1" class="pl-sah">
      <button class="pl-btn sm" :disabled="sahifa <= 1" @click="sahifa--; qd.qayta()">‹ Oldingi</button><span>{{ sahifa }} / {{ sahifalar }}</span><button class="pl-btn sm" :disabled="sahifa >= sahifalar" @click="sahifa++; qd.qayta()">Keyingi ›</button>
    </div>
  </div>
</template>
