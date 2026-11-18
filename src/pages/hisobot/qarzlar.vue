<script setup lang="ts">
/* MIJOZLAR QARZI (debitorka) — kim qancha qarz, qarz qancha vaqtdan beri
   turibdi, qanchasi to'lov muddatidan o'tgan va qarz o'smoqdami. */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
// @ts-ignore
import { tahlilApi } from '@/api/api'
import HisobotSahifa from './kit/HisobotSahifa.vue'
import KpiKarta from './kit/KpiKarta.vue'
import ReytingRoyxat from './kit/ReytingRoyxat.vue'
import { useYuklash, qisqa, fmt, foizFmt, kunOldin, csvYukla, IKON, sanaQisqa } from './kit/hisobot'

const router = useRouter()
const agent = ref<number | ''>('')
const { data: d, yuklanmoqda } = useYuklash(() => tahlilApi.qarzlar({ agent_id: agent.value }), [agent])

const IZOH = [
  { nom: 'Qarz', matn: "Mijoz balansi = to'lovlar − yetkazilgan savdolar. Manfiy bo'lsa — mijoz bizga qarz." },
  { nom: 'Qarz yoshi', matn: "To'lovlar eng eski savdolarni yopadi deb hisoblanadi (FIFO). Demak, qolgan qarz eng yangi savdolarga tegishli; har bo'lagi savdo kunidan beri necha kun o'tganiga qarab guruhlanadi." },
  { nom: "To'lov sanasi", matn: "Agent qarzga sotuvda mobil ilovada kalendardan belgilagan sana. Belgilanmagan (eski yoki web) sotuvlarda — sotuv sanasi + mijoz kartasidagi to'lov muddati (standart 30 kun)." },
  { nom: "Muddati o'tgan", matn: "To'lov sanasi o'tgan qarz bo'lagi. Bunday mijozga yangi qarzga savdo tizim tomonidan bloklanadi." },
  { nom: 'Limitdan oshgan', matn: "Qarzi kartadagi kredit limitidan ko'p bo'lgan mijozlar (limit 0 — cheklovsiz)." },
  { nom: '30 kunlik harakat', matn: "So'nggi 30 kunda yetkazilgan savdolar va mijozlardan tushgan to'lovlar. Savdo to'lovdan ko'p bo'lsa — umumiy qarz o'sgan." },
  { nom: 'Davr', matn: 'Bu hisobot hozirgi holatni ko\'rsatadi — davr tanlanmaydi.' },
]

const BOSQ_RANG: Record<string, string> = { b7: '#c4b5fd', b30: '#8b5cf6', b60: '#d97706', b61: '#dc2626' }
const filtr = ref<'' | 'otgan' | 'limit' | 'b61'>('')
const qidir = ref('')
const rows = computed(() => {
  let r = d.value?.rows || []
  if (filtr.value === 'otgan') r = r.filter((x: any) => x.muddati_otgan > 0)
  if (filtr.value === 'limit') r = r.filter((x: any) => x.limit_oshgan)
  if (filtr.value === 'b61') r = r.filter((x: any) => x.b61 > 0)
  const q = qidir.value.trim().toLowerCase()
  if (q) r = r.filter((x: any) => `${x.nomi} ${x.telefon || ''} ${x.agent}`.toLowerCase().includes(q))
  return r
})
const agentlar = computed(() => (d.value?.agentlar || []).map((a: any) => ({
  id: a.id, nom: a.nomi, qiymat: a.qarz, izoh: `${a.soni} qarzdor`,
  ong: a.muddati_otgan ? `muddati o'tgan ${qisqa(a.muddati_otgan)}` : "muddati o'tgani yo'q", rang: a.muddati_otgan ? '#d97706' : undefined,
})))
const oqimMatn = computed(() => {
  const o = d.value?.oqim30
  if (!o) return ''
  const oz = o.ozgarish
  return oz > 0
    ? `So'nggi 30 kunda mijozlarga <b>${qisqa(o.sotildi)}</b> so'mlik tovar yetkazildi, ulardan <b>${qisqa(o.tolandi)}</b> to'landi — umumiy qarz <b class="hs-err">${qisqa(oz)} so'mga o'sdi</b>.`
    : `So'nggi 30 kunda <b>${qisqa(o.sotildi)}</b> so'mlik tovar yetkazildi, <b>${qisqa(o.tolandi)}</b> to'landi — umumiy qarz <b class="hs-ok">${qisqa(-oz)} so'mga kamaydi</b>.`
})
const eskilar = computed(() => [...(d.value?.rows || [])].sort((a: any, b: any) => b.eng_eski_kun - a.eng_eski_kun || b.qarz - a.qarz).slice(0, 5))
const yoshTon = (r: any) => (r.muddati_otgan > 0 ? 'hs-belgi--err' : r.eng_eski_kun > r.muddat_kun * 0.7 ? 'hs-belgi--warn' : 'hs-belgi--ok')

function eksport() {
  csvYukla('mijozlar_qarzi', [
    { k: 'nomi', nom: 'Mijoz' }, { k: 'telefon', nom: 'Telefon' }, { k: 'agent', nom: 'Agent' }, { k: 'qarz', nom: 'Qarz' },
    { k: 'b7', nom: '1 haftagacha' }, { k: 'b30', nom: '8-30 kun' }, { k: 'b60', nom: '31-60 kun' }, { k: 'b61', nom: '60+ kun' },
    { k: 'muddati_otgan', nom: "Muddati o'tgan" }, { k: 'muddat_kun', nom: "To'lov muddati (kun)" }, { k: 'limit', nom: 'Kredit limiti' },
    { k: 'oxirgi_tolov', nom: "Oxirgi to'lov" }, { k: 'tolovsiz_kun', nom: "To'lovsiz (kun)" },
  ], rows.value)
}
</script>

<template>
  <HisobotSahifa :ikon="IKON.dokon" nom="Mijozlar qarzi" savol="Kim qancha qarz, qarz qanchadan beri turibdi va qanchasi muddatidan o'tgan"
    :davrli="false" :izohlar="IZOH" :yuklanmoqda="yuklanmoqda">
    <template #amal>
      <select v-model="agent" class="hs-sel">
        <option value="">Barcha agentlar</option>
        <option v-for="a in d?.agentlar_royxat || []" :key="a.id" :value="a.id">{{ a.nomi }}</option>
      </select>
      <button class="hs-btn hs-btn--s" :disabled="!d" @click="eksport"><svg viewBox="0 0 24 24" v-html="IKON.yuklab"/>Excel</button>
    </template>

    <div v-if="!d" class="hs-grid hs-grid--kpi"><div v-for="i in 5" :key="i" class="hs-skelet" style="height:104px"/></div>

    <template v-else>
      <div class="hs-grid hs-grid--kpi">
        <KpiKarta nom="Jami qarz" :ikon="IKON.hamyon" :qiymat="d.jami.qarz" birlik="so'm" :izoh="`${d.jami.qarzdor} ta mijoz qarzdor`"/>
        <KpiKarta nom="Muddati o'tgan" :ikon="IKON.ogoh" :qiymat="d.jami.muddati_otgan" birlik="so'm" :ton="d.jami.muddati_otgan ? 'err' : 'ok'"
          :izoh="d.jami.muddati_otgan ? `Qarzning ${foizFmt(d.jami.muddati_otgan_ulush)} i · ${d.jami.muddati_otgan_soni} mijoz` : 'Hamma o\'z vaqtida to\'lamoqda'"/>
        <KpiKarta nom="Qarzning o'rtacha yoshi" :ikon="IKON.soat" :qiymat="`${d.jami.ortacha_kun} kun`" izoh="Summaga qarab og'irlikli"
          :ton="d.jami.ortacha_kun > 30 ? 'warn' : 'brand'"/>
        <KpiKarta nom="Limitdan oshgan" :ikon="IKON.agent" :qiymat="`${d.jami.limit_oshgan_soni} ta`" :ton="d.jami.limit_oshgan_soni ? 'warn' : 'ok'"
          izoh="Qarzi kredit limitidan ko'p"/>
        <KpiKarta nom="30 kunda qarz" :ikon="IKON.osish" :qiymat="d.oqim30.ozgarish" birlik="so'm" :ton="d.oqim30.ozgarish > 0 ? 'warn' : 'ok'"
          :izoh="d.oqim30.ozgarish > 0 ? 'O\'sdi: savdo to\'lovdan ko\'p' : 'Kamaydi: to\'lov savdodan ko\'p'"/>
      </div>

      <div class="hs-tushuncha"><svg viewBox="0 0 24 24" v-html="IKON.info"/><span v-html="oqimMatn"/></div>

      <div class="hs-grid hs-grid--21">
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.soat"/></span>
            <div class="hs-kt"><h2>Qarz qanchadan beri turibdi</h2><p>Yangi qarz — normal, eski qarz — xavf. Bosqichni bosing — ro'yxat filtrlanadi</p></div>
          </div>
          <div class="hs-karta-b">
            <div class="qz-bar">
              <i v-for="b in d.bosqichlar" :key="b.k" :style="{ flex: b.summa || 0.0001, background: BOSQ_RANG[b.k] }" :title="`${b.nom}: ${fmt(b.summa)}`"/>
            </div>
            <div class="qz-bosq">
              <button v-for="b in d.bosqichlar" :key="b.k" class="qz-b" :class="{ on: filtr === 'b61' && b.k === 'b61' }"
                @click="b.k === 'b61' ? (filtr = filtr === 'b61' ? '' : 'b61') : null">
                <span class="qz-b-hd"><i :style="{ background: BOSQ_RANG[b.k] }"/>{{ b.nom }}</span>
                <b>{{ qisqa(b.summa) }}</b>
                <small>{{ foizFmt(b.ulush) }} · {{ b.soni }} mijoz</small>
              </button>
            </div>
            <h3 class="qz-h3">Yaqin 7 kunda to'lanishi kerak <span v-if="d.yaqin?.length">· {{ fmt(d.yaqin_jami) }} so'm</span></h3>
            <ul v-if="d.yaqin?.length" class="qz-eski">
              <li v-for="y in d.yaqin.slice(0, 6)" :key="`${y.mijoz_id}-${y.ariza_id}`" @click="router.push(`/mijozlar/oldi-berdi?mijoz=${y.mijoz_id}`)">
                <span class="hs-belgi" :class="y.qoldi_kun <= 0 ? 'hs-belgi--err' : y.qoldi_kun <= 2 ? 'hs-belgi--warn' : 'hs-belgi--B'">{{ y.qoldi_kun <= 0 ? 'bugun' : y.qoldi_kun === 1 ? 'ertaga' : sanaQisqa(y.tolov_sana) }}</span>
                <span class="qz-eski-n"><b>{{ y.nomi }}</b><small>{{ y.agent }}{{ y.raqam ? ' · ' + y.raqam : '' }}{{ y.belgilangan ? ' · agent belgilagan' : '' }}</small></span>
                <span class="qz-eski-v">{{ fmt(y.summa) }}</span>
              </li>
            </ul>
            <p v-else class="qz-bos">Yaqin 7 kunda to'lov sanasi kelgan qarz yo'q</p>
            <h3 class="qz-h3">Eng uzoq to'lanmayotgan qarzlar</h3>
            <ul class="qz-eski">
              <li v-for="r in eskilar" :key="r.id" @click="router.push(`/mijozlar/oldi-berdi?mijoz=${r.id}`)">
                <span class="hs-belgi" :class="yoshTon(r)">{{ r.eng_eski_kun }} kun</span>
                <span class="qz-eski-n"><b>{{ r.nomi }}</b><small>{{ r.agent }} · muddat {{ r.muddat_kun }} kun</small></span>
                <span class="qz-eski-v">{{ fmt(r.qarz) }}</span>
              </li>
            </ul>
          </div>
        </section>
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.agent"/></span>
            <div class="hs-kt"><h2>Agentlar bo'yicha</h2><p>Kimning mijozlarida qancha qarz</p></div>
          </div>
          <div class="hs-karta-b"><ReytingRoyxat :items="agentlar" :maks="7" @tanla="(a: any) => agent = a.id || ''"/></div>
        </section>
      </div>

      <section class="hs-karta">
        <div class="hs-karta-hd">
          <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.dokon"/></span>
          <div class="hs-kt"><h2>Qarzdor mijozlar</h2><p>{{ rows.length }} ta · qatorni bosing — mijozning oldi-berdi tarixi ochiladi</p></div>
          <div class="hs-kr"><input v-model="qidir" class="hs-inp" placeholder="Mijoz, telefon yoki agent…"/></div>
        </div>
        <div class="tv-chip hs-chiplar qz-chip">
          <button class="hs-chip" :class="{ on: !filtr }" @click="filtr = ''">Barchasi<i>{{ d.rows.length }}</i></button>
          <button class="hs-chip" :class="{ on: filtr === 'otgan' }" @click="filtr = 'otgan'">Muddati o'tgan<i>{{ d.jami.muddati_otgan_soni }}</i></button>
          <button class="hs-chip" :class="{ on: filtr === 'limit' }" @click="filtr = 'limit'">Limitdan oshgan<i>{{ d.jami.limit_oshgan_soni }}</i></button>
          <button class="hs-chip" :class="{ on: filtr === 'b61' }" @click="filtr = 'b61'">60 kundan eski<i>{{ d.bosqichlar[3].soni }}</i></button>
        </div>
        <div class="hs-karta-b hs-karta-b--0 hs-jw qz-jw">
          <table class="hs-jadval">
            <thead><tr>
              <th>Mijoz</th><th class="r">Qarz</th><th>Qarz yoshi</th><th class="r">Eng eski</th><th class="r">Muddati o'tgan</th>
              <th class="r">Keyingi to'lov</th><th class="r">Limit</th><th class="r">Oxirgi to'lov</th>
            </tr></thead>
            <tbody>
              <tr v-for="r in rows" :key="r.id" class="bos" @click="router.push(`/mijozlar/oldi-berdi?mijoz=${r.id}`)">
                <td><div class="hs-nom"><b>{{ r.nomi }}</b><small>{{ r.agent }}{{ r.telefon ? ' · ' + r.telefon : '' }}</small></div></td>
                <td class="r"><b>{{ fmt(r.qarz) }}</b></td>
                <td>
                  <div class="qz-mini" :title="`1 haftagacha ${fmt(r.b7)} · 8–30 kun ${fmt(r.b30)} · 31–60 kun ${fmt(r.b60)} · 60+ ${fmt(r.b61)}`">
                    <i v-for="k in ['b7', 'b30', 'b60', 'b61']" :key="k" :style="{ flex: r[k] || 0, background: BOSQ_RANG[k] }"/>
                  </div>
                </td>
                <td class="r"><span class="hs-belgi" :class="yoshTon(r)">{{ r.eng_eski_kun }} kun</span><div class="m">muddat {{ r.muddat_kun }} kun</div></td>
                <td class="r" :class="r.muddati_otgan ? 'hs-err' : 'hs-mut'">{{ r.muddati_otgan ? fmt(r.muddati_otgan) : '—' }}<div v-if="r.kechikkan_kun" class="m">{{ r.kechikkan_kun }} kun kechikdi</div></td>
                <td class="r">
                  <template v-if="r.keyingi_tolov">{{ sanaQisqa(r.keyingi_tolov.sana) }}<div class="m">{{ qisqa(r.keyingi_tolov.summa) }}{{ r.keyingi_tolov.belgilangan ? ' · belgilangan' : '' }}</div></template>
                  <span v-else class="hs-mut">—</span>
                </td>
                <td class="r">
                  <template v-if="r.limit"><span :class="{ 'hs-err': r.limit_oshgan }">{{ qisqa(r.limit) }}</span><div class="m">{{ Math.round(r.qarz / r.limit * 100) }}% ishlatilgan</div></template>
                  <span v-else class="hs-mut">cheklovsiz</span>
                </td>
                <td class="r">
                  <template v-if="r.oxirgi_tolov_sana">{{ qisqa(r.oxirgi_tolov) }}<div class="m">{{ kunOldin(r.tolovsiz_kun) }}</div></template>
                  <span v-else class="hs-err">to'lov yo'q</span>
                </td>
              </tr>
              <tr v-if="!rows.length"><td colspan="8"><div class="hs-bosh">Mos qarzdor topilmadi</div></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </HisobotSahifa>
</template>

<style scoped>
.qz-bar { display:flex; height:14px; border-radius:7px; overflow:hidden; gap:2px; background:var(--act); }
.qz-bar i { display:block; }
.qz-bosq { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:10px; margin-top:14px; }
.qz-b { display:flex; flex-direction:column; gap:3px; padding:11px 12px; border:1px solid var(--line); border-radius:10px; background:var(--bg); text-align:left; font:inherit; color:inherit; cursor:default; }
.qz-b:last-child { cursor:pointer; }
.qz-b.on, .qz-b:last-child:hover { border-color:#dc2626; }
.qz-b-hd { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--mut); }
.qz-b-hd i { width:9px; height:9px; border-radius:2px; }
.qz-b b { font-size:18px; font-weight:650; letter-spacing:-.01em; font-variant-numeric:tabular-nums; }
.qz-b small { font-size:11.5px; color:var(--sub); }
.qz-chip { padding:12px 16px 0; }
.qz-h3 { font-size:12.5px; font-weight:600; color:var(--mut); margin:18px 0 6px; }
.qz-bos { font-size:12.5px; color:var(--sub); margin:0 0 4px; }
.qz-eski { list-style:none; margin:0; padding:0; }
.qz-eski li { display:flex; align-items:center; gap:12px; padding:8px 6px; border-bottom:1px solid var(--line2); cursor:pointer; border-radius:6px; }
.qz-eski li:last-child { border-bottom:none; }
.qz-eski li:hover { background:var(--hov); }
.qz-eski .hs-belgi { min-width:56px; }
.qz-eski-n { flex:1; min-width:0; display:flex; flex-direction:column; }
.qz-eski-n b { font-size:13px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.qz-eski-n small { font-size:11.5px; color:var(--sub); }
.qz-eski-v { font-size:13px; font-weight:600; font-variant-numeric:tabular-nums; }
.qz-jw { max-height:640px; overflow:auto; }
.qz-mini { display:flex; width:120px; height:8px; border-radius:4px; overflow:hidden; gap:1px; background:var(--act); }
.qz-mini i { display:block; }
@media (max-width:760px) { .qz-bosq { grid-template-columns:1fr 1fr; } }
</style>
