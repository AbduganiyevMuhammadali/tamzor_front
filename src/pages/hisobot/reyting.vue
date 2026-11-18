<script setup lang="ts">
/* MIJOZLAR REYTINGI — kim ishonchli, kim xavfli, nega rad etishadi va kim to'lovni surib yuribdi.
   Backend: GET /tahlil/reyting (controllers/web/tahlil.controller.js), qoidalar: utils/reyting.utils.js. */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
// @ts-ignore
import { tahlilApi } from '@/api/api'
import HisobotSahifa from './kit/HisobotSahifa.vue'
import KpiKarta from './kit/KpiKarta.vue'
import UstunGrafik from './kit/UstunGrafik.vue'
import HalqaGrafik from './kit/HalqaGrafik.vue'
import ReytingRoyxat from './kit/ReytingRoyxat.vue'
import ReytingChiziq from '@/components/ReytingChiziq.vue'
import { useYuklash, fmt, qisqa, foizFmt, csvYukla, IKON, RANG, sanaQisqa } from './kit/hisobot'
import { darajaOl, darajaKod, TUR_NOMI } from '@/utils/reyting'

const router = useRouter()
const agent = ref<number | ''>('')
const { data: d, yuklanmoqda } = useYuklash(() => tahlilApi.reyting({ agent_id: agent.value }), [agent])

const IZOH = [
  { nom: 'Reyting', matn: "Har mijoz 100 balldan boshlaydi, ball 0 dan 200 gacha. Zakaz (+10) va qarzni to'lash (+15) oshiradi, buyurtmani rad etish (−10) va to'lovni surish (−15) tushiradi. Ballarni Sozlamalar → Mijoz reytingi'da o'zgartirish mumkin." },
  { nom: 'Darajalar', matn: "150+ A'lo, 110+ Yaxshi, 70+ O'rta, 30+ Past, 0–29 Kritik. Ketma-ket 5 marta rad etgan mijoz avtomatik Kritik'ga tushadi." },
  { nom: 'Diqqat talab', matn: 'Past va Kritik darajadagi mijozlar (69 ball va undan past). Ularga qarzga berishdan oldin o\'ylash kerak.' },
  { nom: "O'rtacha reyting dinamikasi", matn: "Har kun oxiridagi o'rtacha ball. Hozirgi o'rtachadan keyingi kunlardagi o'zgarishlar ayirib tiklanadi; davrda qo'shilgan yangi mijozlar biroz ta'sir qiladi." },
  { nom: 'Kunlik cheklov', matn: "Har hodisa turi mijozga kuniga bir marta ball beradi. Bir kunda bir nechta zakaz yoki to'lov tarixda 0 ball bilan turadi." },
  { nom: "To'lov va'dalari", matn: "Agent ilovada \"To'lov surildi\" bosib belgilagan sana. Qarzi hali bor mijozlar; bugun, o'tgan va yaqin 7 kundagilar." },
]

const h = (tur: string) => d.value?.hodisalar?.[tur] || { soni: 0, ball: 0, mijoz: 0 }
const o = (tur: string) => d.value?.oldingi?.[tur] || { soni: 0, ball: 0, mijoz: 0 }
const deltaFoiz = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null)
const ortachaFarq = computed(() => d.value ? +(d.value.holat.ortacha - d.value.holat.davr_boshi).toFixed(1) : 0)
const ishora = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '') + String(Math.abs(v)).replace('.', ',')

const halqa = computed(() => (d.value?.darajalar || []).map((x: any) => ({ nom: x.nom, qiymat: x.soni, rang: darajaKod(x.kod).rang })))
const sabablar = computed(() => (d.value?.sabablar || []).map((x: any) => ({
  nom: x.nom, qiymat: x.soni, izoh: `${x.mijoz} mijoz · ${foizFmt(x.ulush)}`,
  ong: x.neytral ? "ta'sirsiz" : `${x.ball} ball`, rang: x.neytral ? RANG.neytral : RANG.err,
})))
const agentlar = computed(() => (d.value?.agentlar || []).map((a: any) => ({
  id: a.id, nom: a.nomi, qiymat: a.ortacha,
  izoh: `${a.mijozlar} mijoz · ${a.zakaz} zakaz · ${a.rad} rad${a.surildi ? ` · ${a.surildi} surilgan` : ''}`,
  ong: a.diqqat ? `${a.diqqat} diqqat talab` : (a.vada_otgan ? `${a.vada_otgan} va'da o'tgan` : darajaOl(a.ortacha).nom), rang: darajaOl(a.ortacha).rang,
})))

const filtr = ref<'' | 'kritik' | 'past' | 'seriya'>('')
const qidir = ref('')
const diqqat = computed(() => {
  let r = d.value?.diqqat || []
  if (filtr.value === 'kritik') r = r.filter((x: any) => x.reyting < 30)
  if (filtr.value === 'past') r = r.filter((x: any) => x.reyting >= 30)
  if (filtr.value === 'seriya') r = r.filter((x: any) => x.rad_ketma_ket >= 3)
  const q = qidir.value.trim().toLowerCase()
  if (q) r = r.filter((x: any) => `${x.nomi} ${x.telefon || ''} ${x.agent || ''}`.toLowerCase().includes(q))
  return r
})
const vadaHolat = (v: any) => v.otgan_kun > 0 ? { t: `${v.otgan_kun} kun o'tdi`, c: 'hs-belgi--err' } : v.otgan_kun === 0 ? { t: 'bugun', c: 'hs-belgi--warn' } : { t: sanaQisqa(v.vada), c: 'hs-belgi--n' }
const mijozga = (id: number) => router.push(`/mijozlar/oldi-berdi?mijoz=${id}`)

function eksport() {
  csvYukla('mijozlar_reytingi_diqqat', [
    { k: 'nomi', nom: 'Mijoz' }, { k: 'telefon', nom: 'Telefon' }, { k: 'agent', nom: 'Agent' }, { k: 'reyting', nom: 'Reyting' },
    { k: 'daraja', nom: 'Daraja' }, { k: 'qarz', nom: 'Qarz' }, { k: 'rad_ketma_ket', nom: 'Ketma-ket rad' }, { k: 'vada', nom: "To'lash va'dasi" },
  ], diqqat.value.map((x: any) => ({ ...x, daraja: darajaOl(x.reyting).nom })))
}
</script>

<template>
  <HisobotSahifa :ikon="IKON.agent" nom="Mijozlar reytingi" savol="Kim ishonchli, kim xavfli, nega rad etishadi va kim to'lovni surib yuribdi"
    :izohlar="IZOH" :yuklanmoqda="yuklanmoqda">
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
        <KpiKarta nom="O'rtacha reyting" :ikon="IKON.puls" :qiymat="`${String(d.holat.ortacha).replace('.', ',')} / 200`"
          :izoh="`${darajaOl(d.holat.ortacha).nom} · davr boshidan ${ishora(ortachaFarq)}`" :ton="ortachaFarq < 0 ? 'warn' : 'brand'"/>
        <KpiKarta nom="Diqqat talab" :ikon="IKON.ogoh" :qiymat="`${d.holat.diqqat} ta`" :ton="d.holat.diqqat ? 'err' : 'ok'"
          :izoh="d.holat.diqqat ? `Past va Kritik · ${d.holat.rad_seriya} tasi ketma-ket rad etmoqda` : 'Past va Kritik mijoz yo\'q'"/>
        <KpiKarta nom="Zakaz bergan mijozlar" :ikon="IKON.savat" :qiymat="h('buyurtma').mijoz" birlik="ta"
          :delta="deltaFoiz(h('buyurtma').mijoz, o('buyurtma').mijoz)" :izoh="`${h('buyurtma').soni} ta zakaz · +${h('buyurtma').ball} ball`"/>
        <KpiKarta nom="Rad etishlar" :ikon="IKON.dokon" :qiymat="h('rad_etildi').soni" birlik="ta" yaxshi="past"
          :delta="deltaFoiz(h('rad_etildi').soni, o('rad_etildi').soni)" :izoh="`${h('rad_etildi').mijoz} mijoz · ${h('rad_etildi').ball} ball`"/>
        <KpiKarta nom="To'lov va'dalari" :ikon="IKON.soat" :qiymat="`${d.holat.vada_otgan} o'tgan`" :ton="d.holat.vada_otgan ? 'warn' : 'ok'"
          :izoh="`bugun ${d.holat.vada_bugun} · davrda ${h('tolov_surildi').soni} marta surildi`"/>
      </div>

      <div class="hs-grid hs-grid--21">
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.osish"/></span>
            <div class="hs-kt"><h2>O'rtacha reyting dinamikasi</h2><p>Mijozlar umuman yaxshilanyaptimi yoki yomonlashyaptimi</p></div>
          </div>
          <div class="hs-karta-b">
            <ReytingChiziq :data="d.trend" :guruh="d.davr.guruh" :balandlik="200"/>
            <h3 class="ry-h3">Har kuni qo'shilgan va ayirilgan ballar</h3>
            <UstunGrafik :data="d.trend" :guruh="d.davr.guruh" :balandlik="150" birlik="ball"
              :seriyalar="[{ k: 'ijobiy', nom: 'Oshirgan (zakaz, to\'lov)', rang: RANG.ok }, { k: 'salbiy', nom: 'Tushirgan (rad, surilish)', rang: RANG.err }]"/>
          </div>
        </section>
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.pirog"/></span>
            <div class="hs-kt"><h2>Darajalar</h2><p>{{ d.holat.jami }} ta faol mijoz hozir qaysi darajada</p></div>
          </div>
          <div class="hs-karta-b">
            <HalqaGrafik :items="halqa" :markaz="String(d.holat.ortacha).replace('.', ',')" markaz-izoh="o'rtacha ball" :maks="5"/>
            <div class="ry-qoida">
              <div v-for="t in ['buyurtma', 'tolov_qabul', 'rad_etildi', 'tolov_surildi', 'kritik']" :key="t" class="ry-qoida-r">
                <span>{{ TUR_NOMI[t] }}</span><b>{{ h(t).soni }}</b><i :class="h(t).ball > 0 ? 'ok' : h(t).ball < 0 ? 'err' : ''">{{ h(t).ball ? ishora(h(t).ball) : '0' }}</i>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="hs-grid hs-grid--2">
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.info"/></span>
            <div class="hs-kt"><h2>Nega rad etishadi</h2><p>Agent belgilagan sabablar — narx, pul yoki raqobat signali</p></div>
          </div>
          <div class="hs-karta-b">
            <ReytingRoyxat v-if="sabablar.length" :items="sabablar" :maks="8"/>
            <p v-else class="hs-bosh">Bu davrda rad etish qayd etilmagan</p>
          </div>
        </section>
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.agent"/></span>
            <div class="hs-kt"><h2>Agentlar bo'yicha</h2><p>Mijozlarining o'rtacha reytingi · bosing — shu agent bo'yicha</p></div>
          </div>
          <div class="hs-karta-b"><ReytingRoyxat :items="agentlar" :maks="8" @tanla="(a: any) => agent = a.id || ''"/></div>
        </section>
      </div>

      <div class="hs-grid hs-grid--3">
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic ry-ic--err"><svg viewBox="0 0 24 24"><path d="m3 7 6 6 4-4 8 8"/><path d="M15 17h6v-6"/></svg></span>
            <div class="hs-kt"><h2>Eng ko'p tushganlar</h2><p>Davrda ball yo'qotganlar</p></div>
          </div>
          <div class="hs-karta-b">
            <ul v-if="d.tushganlar.length" class="ry-list">
              <li v-for="m in d.tushganlar" :key="m.id" @click="mijozga(m.id)">
                <span class="ry-list-n"><b>{{ m.nomi }}</b><small>{{ m.agent || '—' }} · {{ m.soni }} hodisa</small></span>
                <span class="ry-pill ry-pill--err">{{ ishora(m.ball) }}</span>
                <span class="ry-ball" :style="{ color: darajaOl(m.reyting).rang }">{{ m.reyting }}</span>
              </li>
            </ul>
            <p v-else class="hs-bosh">Ball tushgan mijoz yo'q</p>
          </div>
        </section>
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic ry-ic--ok"><svg viewBox="0 0 24 24" v-html="IKON.osish"/></span>
            <div class="hs-kt"><h2>Eng ko'p ko'tarilganlar</h2><p>Zakaz va to'lov bilan ball yig'ganlar</p></div>
          </div>
          <div class="hs-karta-b">
            <ul v-if="d.kotarilganlar.length" class="ry-list">
              <li v-for="m in d.kotarilganlar" :key="m.id" @click="mijozga(m.id)">
                <span class="ry-list-n"><b>{{ m.nomi }}</b><small>{{ m.agent || '—' }} · {{ m.soni }} hodisa</small></span>
                <span class="ry-pill ry-pill--ok">{{ ishora(m.ball) }}</span>
                <span class="ry-ball" :style="{ color: darajaOl(m.reyting).rang }">{{ m.reyting }}</span>
              </li>
            </ul>
            <p v-else class="hs-bosh">Bu davrda ball yig'gan mijoz yo'q</p>
          </div>
        </section>
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic ry-ic--warn"><svg viewBox="0 0 24 24" v-html="IKON.soat"/></span>
            <div class="hs-kt"><h2>To'lov va'dalari</h2><p>O'tgan, bugungi va yaqin 7 kunlik</p></div>
          </div>
          <div class="hs-karta-b">
            <ul v-if="d.vadalar.length" class="ry-list">
              <li v-for="v in d.vadalar.slice(0, 8)" :key="v.id" @click="mijozga(v.id)">
                <span class="hs-belgi" :class="vadaHolat(v).c">{{ vadaHolat(v).t }}</span>
                <span class="ry-list-n"><b>{{ v.nomi }}</b><small>{{ v.agent || '—' }}</small></span>
                <span class="ry-sum">{{ qisqa(v.qarz) }}</span>
              </li>
            </ul>
            <p v-else class="hs-bosh">Kutilayotgan to'lov va'dasi yo'q</p>
          </div>
        </section>
      </div>

      <section class="hs-karta">
        <div class="hs-karta-hd">
          <span class="hs-karta-ic ry-ic--err"><svg viewBox="0 0 24 24" v-html="IKON.ogoh"/></span>
          <div class="hs-kt"><h2>Diqqat talab qiladigan mijozlar</h2><p>{{ diqqat.length }} ta · Past va Kritik · qatorni bosing — oldi-berdi tarixi</p></div>
          <div class="hs-kr"><input v-model="qidir" class="hs-inp" placeholder="Mijoz, telefon yoki agent…"/></div>
        </div>
        <div class="hs-chiplar ry-chip">
          <button class="hs-chip" :class="{ on: !filtr }" @click="filtr = ''">Barchasi<i>{{ d.diqqat.length }}</i></button>
          <button class="hs-chip" :class="{ on: filtr === 'kritik' }" @click="filtr = 'kritik'">Kritik<i>{{ d.darajalar.find((x: any) => x.kod === 'kritik')?.soni || 0 }}</i></button>
          <button class="hs-chip" :class="{ on: filtr === 'past' }" @click="filtr = 'past'">Past<i>{{ d.darajalar.find((x: any) => x.kod === 'past')?.soni || 0 }}</i></button>
          <button class="hs-chip" :class="{ on: filtr === 'seriya' }" @click="filtr = 'seriya'">3+ marta ketma-ket rad<i>{{ d.holat.rad_seriya }}</i></button>
        </div>
        <div v-if="diqqat.length" class="hs-karta-b hs-karta-b--0 hs-jw">
          <table class="hs-jadval">
            <thead><tr><th>Mijoz</th><th>Reyting</th><th class="r">Qarz</th><th class="r">Ketma-ket rad</th><th class="r">To'lash va'dasi</th><th class="r">Oxirgi o'zgarish</th></tr></thead>
            <tbody>
              <tr v-for="m in diqqat" :key="m.id" class="bos" @click="mijozga(m.id)">
                <td><div class="hs-nom"><b>{{ m.nomi }}</b><small>{{ m.agent || '—' }}{{ m.telefon ? ' · ' + m.telefon : '' }}</small></div></td>
                <td><span class="ry-dar" :style="{ color: darajaOl(m.reyting).rang, background: darajaOl(m.reyting).fon }">{{ m.reyting }} · {{ darajaOl(m.reyting).nom }}</span></td>
                <td class="r"><b v-if="m.qarz">{{ fmt(m.qarz) }}</b><span v-else class="hs-mut">—</span></td>
                <td class="r"><span v-if="m.rad_ketma_ket" class="hs-belgi" :class="m.rad_ketma_ket >= 3 ? 'hs-belgi--err' : 'hs-belgi--warn'">{{ m.rad_ketma_ket }} marta</span><span v-else class="hs-mut">—</span></td>
                <td class="r">{{ m.vada ? sanaQisqa(m.vada) : '—' }}</td>
                <td class="r hs-mut">{{ m.oxirgi ? sanaQisqa(m.oxirgi) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="hs-bosh" style="padding:18px">Hozircha Past yoki Kritik darajadagi mijoz yo'q — hammasi yaxshi</p>
      </section>
    </template>
  </HisobotSahifa>
</template>

<style scoped>
.ry-h3 { margin:14px 0 4px; font-size:12px; font-weight:700; color:var(--mut, #64748b); text-transform:uppercase; letter-spacing:.04em; }
.ry-qoida { display:flex; flex-direction:column; margin-top:12px; border-top:1px solid var(--line, #eef2f7); }
.ry-qoida-r { display:grid; grid-template-columns:1fr auto 52px; gap:10px; align-items:center; padding:7px 0; border-bottom:1px solid var(--line, #f1f5f9); font-size:12.5px; color:var(--ink2, #334155); }
.ry-qoida-r b { font-variant-numeric:tabular-nums; }
.ry-qoida-r i { font-style:normal; text-align:right; font-weight:800; color:#94a3b8; font-variant-numeric:tabular-nums; }
.ry-qoida-r i.ok { color:#059669; } .ry-qoida-r i.err { color:#dc2626; }
.ry-ic--err { background:rgba(220,38,38,.09) !important; color:#dc2626 !important; }
.ry-ic--ok { background:rgba(5,150,105,.1) !important; color:#059669 !important; }
.ry-ic--warn { background:rgba(217,119,6,.11) !important; color:#d97706 !important; }
.ry-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; }
.ry-list li { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--line, #f1f5f9); cursor:pointer; }
.ry-list li:last-child { border-bottom:none; }
.ry-list li:hover .ry-list-n b { color:#7c3aed; }
.ry-list-n { flex:1; min-width:0; display:flex; flex-direction:column; }
.ry-list-n b { font-size:13px; color:var(--ink, #0f172a); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ry-list-n small { font-size:11.5px; color:var(--mut, #94a3b8); }
.ry-pill { padding:2px 8px; border-radius:999px; font-size:12px; font-weight:800; font-variant-numeric:tabular-nums; }
.ry-pill--err { color:#dc2626; background:rgba(220,38,38,.09); } .ry-pill--ok { color:#059669; background:rgba(5,150,105,.1); }
.ry-ball { font-size:13px; font-weight:800; min-width:28px; text-align:right; font-variant-numeric:tabular-nums; }
.ry-sum { font-size:13px; font-weight:700; color:var(--ink, #0f172a); font-variant-numeric:tabular-nums; }
.ry-dar { display:inline-block; padding:2px 9px; border-radius:999px; font-size:12px; font-weight:700; white-space:nowrap; }
.ry-chip { padding:0 16px 10px; }
</style>
