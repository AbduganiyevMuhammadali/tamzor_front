<template>
  <div class="qz">

    <!-- Sarlavha -->
    <div class="qz-hd">
      <div class="qz-hd-l">
        <span class="qz-hd-ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7.5h13l-3.5-3.5M17 16.5H4l3.5 3.5"/></svg>
        </span>
        <div>
          <h1>Qarz oldi-berdi</h1>
          <p>Uchinchi shaxslarga qarz berish va ulardan qarz olish — pul kassadan o'tadi</p>
        </div>
      </div>
      <button class="qz-btn qz-btn--p" @click="shaxsOch()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Yangi shaxs
      </button>
    </div>

    <!-- KPI -->
    <div class="qz-kpi">
      <button class="qz-k qz-k--bizga" :class="{ on: holat === 'bizga' }" @click="holatTanla('bizga')">
        <span class="qz-k-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg></span>
        <span class="qz-k-b"><b>{{ fmt(jami.bizga) }}</b><small>Bizga qarzdor · {{ jami.bizgaSoni }} ta shaxs</small></span>
      </button>
      <button class="qz-k qz-k--bizdan" :class="{ on: holat === 'bizdan' }" @click="holatTanla('bizdan')">
        <span class="qz-k-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg></span>
        <span class="qz-k-b"><b>{{ fmt(jami.bizdan) }}</b><small>Biz qarzdormiz · {{ jami.bizdanSoni }} ta shaxs</small></span>
      </button>
      <div class="qz-k qz-k--sof">
        <span class="qz-k-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18"/><path d="M12 3v18"/></svg></span>
        <span class="qz-k-b"><b :class="sof > 0.5 ? 'plus' : sof < -0.5 ? 'minus' : ''">{{ sof > 0.5 ? '+' : sof < -0.5 ? '−' : '' }}{{ fmt(Math.abs(sof)) }}</b><small>Sof holat · {{ sof > 0.5 ? 'bizga ko\'proq qarz' : sof < -0.5 ? 'biz ko\'proq qarzdormiz' : 'teng' }}</small></span>
      </div>
      <button class="qz-k qz-k--muddat" :class="{ on: holat === 'muddat' }" @click="holatTanla('muddat')">
        <span class="qz-k-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>
        <span class="qz-k-b"><b>{{ jami.muddatiOtgan }}</b><small>Qaytarish muddati o'tgan</small></span>
      </button>
    </div>

    <div class="qz-body">
      <!-- Shaxslar ro'yxati -->
      <section class="qz-list">
        <div class="qz-srch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input v-model="qidiruv" placeholder="Ism yoki telefon…"/>
        </div>
        <div class="qz-tabs">
          <button v-for="t in TABLAR" :key="t.k" :class="{ on: holat === t.k }" @click="holatTanla(t.k)">{{ t.t }}</button>
        </div>
        <div v-if="yuklanmoqda && !rows.length" class="qz-empty">Yuklanmoqda…</div>
        <div v-else-if="!royxat.length" class="qz-empty">
          <template v-if="!jami.shaxslar">Hali hech kim yo'q.<br/><button class="qz-link" @click="shaxsOch()">Birinchi shaxsni qo'shing</button></template>
          <template v-else>Bu filtrda shaxs yo'q</template>
        </div>
        <button v-for="r in royxat" :key="r.id" class="qz-row" :class="{ on: tanlangan === r.id, nofaol: !r.faol }" @click="tanla(r.id)">
          <span class="qz-av">{{ (r.ism || '?')[0] }}</span>
          <span class="qz-row-b">
            <b>{{ r.ism }}</b>
            <small>{{ r.telefon || '—' }}<template v-if="r.muddat"> · muddat {{ sana(r.muddat) }}</template></small>
          </span>
          <span class="qz-row-s">
            <b :class="r.qoldiq > 0.5 ? 'plus' : r.qoldiq < -0.5 ? 'minus' : 'teng'">{{ Math.abs(r.qoldiq) > 0.5 ? fmt(Math.abs(r.qoldiq)) : '0' }}</b>
            <small v-if="r.muddati_otgan" class="qz-otgan">muddati o'tgan</small>
            <small v-else>{{ r.qoldiq > 0.5 ? 'bizga qarzdor' : r.qoldiq < -0.5 ? 'biz qarzdormiz' : 'hisob teng' }}</small>
          </span>
        </button>
      </section>

      <!-- Tanlangan shaxs -->
      <section class="qz-det">
        <div v-if="!d" class="qz-det-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7.5h13l-3.5-3.5M17 16.5H4l3.5 3.5"/></svg>
          <b>Shaxsni tanlang</b>
          <span>Chapdan shaxsni tanlang — hisob, tarix va amallar shu yerda ko'rinadi</span>
        </div>
        <template v-else>
          <div class="qz-det-hd">
            <span class="qz-av lg">{{ (d.shaxs.ism || '?')[0] }}</span>
            <div class="qz-det-t">
              <h2>{{ d.shaxs.ism }} <span v-if="!d.shaxs.faol" class="qz-chip">nofaol</span></h2>
              <p>{{ d.shaxs.telefon || 'telefon yo\'q' }}<template v-if="d.shaxs.izoh"> · {{ d.shaxs.izoh }}</template></p>
            </div>
            <button class="qz-ib" title="Tahrirlash" @click="shaxsOch(d.shaxs)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
          </div>

          <div class="qz-bal" :class="d.shaxs.qoldiq > 0.5 ? 'plus' : d.shaxs.qoldiq < -0.5 ? 'minus' : 'teng'">
            <div>
              <small>{{ d.shaxs.qoldiq > 0.5 ? `${d.shaxs.ism} bizga qarzdor` : d.shaxs.qoldiq < -0.5 ? `Biz ${d.shaxs.ism}ga qarzdormiz` : 'Hisob teng' }}</small>
              <b>{{ fmt(Math.abs(d.shaxs.qoldiq)) }} <span>so'm</span></b>
            </div>
            <div v-if="d.shaxs.muddat" class="qz-bal-m" :class="{ otgan: d.shaxs.muddati_otgan }">
              Qaytarish muddati<br/><b>{{ sana(d.shaxs.muddat) }}</b><template v-if="d.shaxs.muddati_otgan"> · o'tgan</template>
            </div>
          </div>

          <div class="qz-sum">
            <div><small>Berdik</small><b>{{ fmt(d.shaxs.berilgan) }}</b></div>
            <div><small>U qaytardi</small><b>{{ fmt(d.shaxs.qaytgan) }}</b></div>
            <div><small>Oldik</small><b>{{ fmt(d.shaxs.olingan) }}</b></div>
            <div><small>Biz qaytardik</small><b>{{ fmt(d.shaxs.qaytarilgan) }}</b></div>
          </div>

          <div class="qz-amal">
            <button v-for="a in AMALLAR" :key="a.k" class="qz-am" :class="a.cls" @click="amalOch(a.k)">
              <span class="qz-am-ic" v-html="a.ikon"/>
              <span><b>{{ a.t }}</b><small>{{ a.izoh }}</small></span>
            </button>
          </div>

          <div class="qz-tbl-w">
            <table v-if="d.harakatlar.length" class="qz-tbl">
              <thead><tr><th>Sana</th><th>Amal</th><th>Izoh</th><th class="r">Summa</th><th class="r">Qoldiq</th><th></th></tr></thead>
              <tbody>
                <tr v-for="h in d.harakatlar" :key="h.id">
                  <td class="nw">{{ sana(h.sana) }}<small v-if="h.muddat" class="qz-td-m">muddat {{ sana(h.muddat) }}</small></td>
                  <td><span class="qz-tag" :class="TAG[h.tur]">{{ h.nom }}</span><small v-if="h.kassa" class="qz-usul">{{ h.kassa === 'kirim' ? 'kassaga kirdi' : 'kassadan chiqdi' }} · {{ USUL[h.tolov_usul] || 'naqd' }}</small></td>
                  <td class="qz-iz">{{ h.izoh || '—' }}</td>
                  <td class="r nw" :class="h.tasir > 0 ? 'plus' : 'minus'">{{ h.tasir > 0 ? '+' : '−' }}{{ fmt(Math.abs(h.tasir)) }}</td>
                  <td class="r nw" :class="h.qoldiq > 0.5 ? 'plus' : h.qoldiq < -0.5 ? 'minus' : ''">{{ fmt(h.qoldiq) }}</td>
                  <td class="r"><button class="qz-del" title="O'chirish" @click="harakatOchir(h)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg></button></td>
                </tr>
              </tbody>
            </table>
            <div v-else class="qz-empty">Hali oldi-berdi yo'q — yuqoridagi tugmalardan birini bosing</div>
          </div>
          <p class="qz-hint">Qoldiq ustunida: <b class="plus">musbat</b> — shaxs bizga qarzdor, <b class="minus">manfiy</b> — biz unga qarzdormiz.</p>
        </template>
      </section>
    </div>

    <!-- Amal oynasi (sahifa ichida: shell rang o'zgaruvchilari va tungi rejim ishlaydi) -->
    <div v-if="amal.ochiq" class="qz-ov" @click.self="amal.ochiq = false">
        <div class="qz-m">
          <div class="qz-m-hd">
            <h3>{{ AMAL_NOM[amal.tur] }}</h3>
            <p>{{ d?.shaxs.ism }} · hozir {{ holatMatn(d?.shaxs.qoldiq || 0) }}</p>
            <button class="qz-x" @click="amal.ochiq = false">×</button>
          </div>
          <div class="qz-m-b">
            <div class="qz-seg">
              <button v-for="a in AMALLAR" :key="a.k" :class="[{ on: amal.tur === a.k }, a.cls]" @click="amal.tur = a.k">{{ a.t }}</button>
            </div>
            <div class="qz-grid">
              <label class="qz-f"><span>Summa (so'm) *</span><NumberInput v-model="amal.summa" v-maydon:summa="hf" placeholder="0" ref="summaInp"/></label>
              <label class="qz-f"><span>Sana</span><input type="date" v-model="amal.sana" v-maydon:sana="hf"/></label>
              <label class="qz-f"><span>To'lov usuli</span>
                <select v-model="amal.tolov_usul" :disabled="!!amal.kassa_id" :title="amal.kassa_id ? 'To\'lov usuli kassa turidan olinadi' : ''"><option value="naqt">Naqd</option><option value="karta">Karta</option><option value="bank">Bank</option></select>
              </label>
              <div class="qz-f"><span>Kassa (ixtiyoriy)</span><KassaTanlov v-model="amal.kassa_id" :summa="amal.summa" :chiqim="kassaChiqim" @kassa="kassaTanlandi"/></div>
              <label v-if="amal.tur === 'qarz_berdik' || amal.tur === 'qarz_oldik'" class="qz-f"><span>Qaytarish muddati</span><input type="date" v-model="amal.muddat" v-maydon:muddat="hf"/></label>
              <label class="qz-f full"><span>Izoh</span><input v-model="amal.izoh" v-maydon:izoh="hf" maxlength="255" placeholder="Masalan: 3 oyga, foizsiz"/></label>
            </div>
            <div v-if="amal.summa > 0" class="qz-prev" :class="yangiQoldiq > 0.5 ? 'plus' : yangiQoldiq < -0.5 ? 'minus' : 'teng'">
              <div>{{ kassaMatn }}</div>
              <div>Saqlansa: <b>{{ holatMatn(yangiQoldiq) }}</b></div>
              <div v-if="oshibKetdi" class="qz-warn">Summa hozirgi qarzdan ko'p — ortig'i teskari yo'nalishga o'tadi</div>
            </div>
            <p v-if="xato" class="qz-err">{{ xato }}</p>
          </div>
          <div class="qz-m-ft">
            <button class="qz-btn" @click="amal.ochiq = false">Bekor qilish</button>
            <button class="qz-btn qz-btn--p" :disabled="band || !(amal.summa > 0)" @click="amalSaqla">{{ band ? 'Saqlanmoqda…' : 'Saqlash' }}</button>
          </div>
        </div>
      </div>

      <!-- Shaxs oynasi -->
      <div v-if="sh.ochiq" class="qz-ov" @click.self="sh.ochiq = false">
        <div class="qz-m">
          <div class="qz-m-hd">
            <h3>{{ sh.id ? 'Shaxsni tahrirlash' : 'Yangi shaxs' }}</h3>
            <p>Mijoz ham, yetkazuvchi ham bo'lmagan odam yoki tashkilot</p>
            <button class="qz-x" @click="sh.ochiq = false">×</button>
          </div>
          <div class="qz-m-b">
            <div class="qz-grid">
              <label class="qz-f full"><span>Ism / tashkilot *</span><input v-model="sh.ism" v-maydon:ism="shf" maxlength="150" placeholder="Masalan: Akmal aka (qo'shni do'kon)"/></label>
              <label class="qz-f"><span>Telefon</span><input v-model="sh.telefon" v-maydon:telefon="shf" maxlength="30" placeholder="+998"/></label>
              <label v-if="sh.id" class="qz-f"><span>Holati</span>
                <select v-model="sh.faol"><option :value="true">Faol</option><option :value="false">Nofaol</option></select>
              </label>
              <label class="qz-f full"><span>Izoh</span><input v-model="sh.izoh" v-maydon:izoh="shf" placeholder="Kim, qanday kelishuv"/></label>
            </div>
            <template v-if="!sh.id">
              <div class="qz-sub">Boshlang'ich qoldiq — tizimdan oldingi hisob (kassaga yozilmaydi)</div>
              <div class="qz-seg">
                <button :class="{ on: sh.yon === 'yoq' }" @click="sh.yon = 'yoq'">Qoldiq yo'q</button>
                <button class="qz-am--bizga" :class="{ on: sh.yon === 'qarzdor' }" @click="sh.yon = 'qarzdor'">U bizga qarzdor</button>
                <button class="qz-am--bizdan" :class="{ on: sh.yon === 'haqdor' }" @click="sh.yon = 'haqdor'">Biz unga qarzdormiz</button>
              </div>
              <div v-if="sh.yon !== 'yoq'" class="qz-grid">
                <label class="qz-f"><span>Summa (so'm) *</span><NumberInput v-model="sh.summa" placeholder="0"/></label>
                <label class="qz-f"><span>Qaysi sanaga</span><input type="date" v-model="sh.sana"/></label>
                <label class="qz-f"><span>Qaytarish muddati</span><input type="date" v-model="sh.muddat"/></label>
              </div>
            </template>
            <p v-if="xato" class="qz-err">{{ xato }}</p>
          </div>
          <div class="qz-m-ft">
            <button v-if="sh.id && d && !d.harakatlar.length" class="qz-btn qz-btn--del" @click="shaxsOchir">O'chirish</button>
            <span style="flex:1"/>
            <button class="qz-btn" @click="sh.ochiq = false">Bekor qilish</button>
            <button class="qz-btn qz-btn--p" :disabled="band || !sh.ism.trim()" @click="shaxsSaqla">{{ band ? 'Saqlanmoqda…' : 'Saqlash' }}</button>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import NumberInput from '@/components/NumberInput.vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/api'
import KassaTanlov from '@/components/KassaTanlov.vue'
import { useForma } from '@/validation/useForma'
import * as sx from '@/validation/sxemalar'

const route = useRoute(), router = useRouter()
const TABLAR = [{ k: 'hammasi', t: 'Hammasi' }, { k: 'bizga', t: 'Bizga qarzdor' }, { k: 'bizdan', t: 'Biz qarzdormiz' }, { k: 'teng', t: 'Teng' }]
const I = {
  berdik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>',
  qaytdi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>',
  oldik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>',
  qaytardik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/></svg>',
}
const AMALLAR = [
  { k: 'qarz_berdik', t: 'Qarz berdik',      izoh: 'kassadan chiqadi', cls: 'qz-am--bizga',  ikon: I.berdik },
  { k: 'qaytardi',    t: 'U qaytardi',        izoh: 'kassaga kiradi',   cls: 'qz-am--bizga2', ikon: I.qaytdi },
  { k: 'qarz_oldik',  t: 'Qarz oldik',        izoh: 'kassaga kiradi',   cls: 'qz-am--bizdan', ikon: I.oldik },
  { k: 'qaytardik',   t: 'Biz qaytardik',     izoh: 'kassadan chiqadi', cls: 'qz-am--bizdan2', ikon: I.qaytardik },
]
const AMAL_NOM = { qarz_berdik: 'Qarz berdik', qaytardi: 'Qarzini qaytardi', qarz_oldik: 'Qarz oldik', qaytardik: 'Qarzimizni qaytardik' }
const ISHORA = { qarz_berdik: 1, qaytardi: -1, qarz_oldik: -1, qaytardik: 1 }
const TAG = { qarz_berdik: 'g', qaytardi: 'g2', qarz_oldik: 'r', qaytardik: 'r2', bosh_qarzdor: 'b', bosh_haqdor: 'b' }
const USUL = { naqt: 'naqd', karta: 'karta', bank: 'bank' }

const rows = ref([])
const jami = ref({ bizga: 0, bizgaSoni: 0, bizdan: 0, bizdanSoni: 0, tengSoni: 0, muddatiOtgan: 0, shaxslar: 0 })
const holat = ref('hammasi')
const qidiruv = ref('')
const yuklanmoqda = ref(false)
const tanlangan = ref(Number(route.query.shaxs) || null)
const d = ref(null)
const band = ref(false)
const xato = ref('')
const hf = useForma(sx.uchinchiHarakat, () => amal)   // harakat (berdik/oldik/qaytardi)
const shf = useForma(sx.uchinchiShaxs, () => sh)        // shaxs kartasi
const summaInp = ref(null)

const bugun = () => { const x = new Date(); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
const amal = reactive({ ochiq: false, tur: 'qarz_berdik', summa: null, sana: bugun(), tolov_usul: 'naqt', muddat: '', izoh: '', kassa_id: '' })
// Kassa tanlansa to'lov usuli kassa turidan olinadi; pul chiqadigan harakatlarda (qarz berdik / qaytardik) balans tekshiriladi
const kassaChiqim = computed(() => ['qarz_berdik', 'qaytardik'].includes(amal.tur))
function kassaTanlandi(k) { if (k) amal.tolov_usul = k.tolov_usul || (k.tur === 'plastik' ? 'karta' : 'naqt') }
const sh = reactive({ ochiq: false, id: null, ism: '', telefon: '', izoh: '', faol: true, yon: 'yoq', summa: null, sana: '', muddat: '' })

const fmt = v => new Intl.NumberFormat('ru-RU').format(Math.round(Number(v) || 0))
const sana = s => { if (!s) return ''; const x = new Date(String(s).length === 10 ? s + 'T12:00:00' : s); return isNaN(x) ? String(s).slice(0, 10) : `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.${x.getFullYear()}` }
const sof = computed(() => (jami.value.bizga || 0) - (jami.value.bizdan || 0))
const royxat = computed(() => {
  const q = qidiruv.value.trim().toLowerCase()
  let r = rows.value
  if (holat.value === 'bizga') r = r.filter(x => x.qoldiq > 0.5)
  else if (holat.value === 'bizdan') r = r.filter(x => x.qoldiq < -0.5)
  else if (holat.value === 'teng') r = r.filter(x => Math.abs(x.qoldiq) <= 0.5)
  else if (holat.value === 'muddat') r = r.filter(x => x.muddati_otgan)
  if (q) r = r.filter(x => `${x.ism} ${x.telefon || ''}`.toLowerCase().includes(q))
  return r
})
function holatMatn(q) {
  const ism = d.value?.shaxs.ism || 'shaxs'
  return q > 0.5 ? `${ism} bizga ${fmt(q)} so'm qarzdor` : q < -0.5 ? `biz ${ism}ga ${fmt(-q)} so'm qarzdormiz` : 'hisob teng'
}
const yangiQoldiq = computed(() => (d.value?.shaxs.qoldiq || 0) + (ISHORA[amal.tur] || 0) * (Number(amal.summa) || 0))
const oshibKetdi = computed(() => {
  const q = d.value?.shaxs.qoldiq || 0, s = Number(amal.summa) || 0
  return (amal.tur === 'qaytardi' && q > 0.5 && s > q + 0.5) || (amal.tur === 'qaytardik' && q < -0.5 && s > -q + 0.5)
})
const kassaMatn = computed(() => {
  const s = fmt(amal.summa), u = USUL[amal.tolov_usul]
  return (amal.tur === 'qarz_berdik' || amal.tur === 'qaytardik') ? `Kassadan ${s} so'm chiqim (${u})` : `Kassaga ${s} so'm kirim (${u})`
})

async function yukla() {
  yuklanmoqda.value = true
  try {
    const r = await api.get('/uchinchi-shaxslar')
    rows.value = r.rows || []; jami.value = r.jami || jami.value
  } finally { yuklanmoqda.value = false }
}
async function tafsilot() {
  if (!tanlangan.value) { d.value = null; return }
  try { d.value = await api.get(`/uchinchi-shaxslar/${tanlangan.value}`) } catch { d.value = null; tanlangan.value = null }
}
function tanla(id) {
  tanlangan.value = id
  router.replace({ query: { ...route.query, shaxs: String(id) } })
  tafsilot()
}
function holatTanla(k) { holat.value = holat.value === k && k !== 'hammasi' ? 'hammasi' : k }

function amalOch(tur) {
  Object.assign(amal, { ochiq: true, tur, summa: null, sana: bugun(), tolov_usul: 'naqt', muddat: '', izoh: '', kassa_id: '' })
  xato.value = ''; hf.tozala()
  nextTick(() => summaInp.value?.focus())
}
async function amalSaqla() {
  if (band.value) return
  xato.value = ''
  if (!hf.tekshir()) return
  band.value = true
  try {
    await api.post(`/uchinchi-shaxslar/${tanlangan.value}/harakat`, {
      tur: amal.tur, summa: amal.summa, sana: amal.sana, tolov_usul: amal.tolov_usul, muddat: amal.muddat || null, izoh: amal.izoh,
      ...(amal.kassa_id ? { kassa_id: Number(amal.kassa_id) } : {}),
    })
    amal.ochiq = false
    await Promise.all([yukla(), tafsilot()])
  } catch (e) { xato.value = hf.server(e) || 'Saqlanmadi' }
  finally { band.value = false }
}
async function harakatOchir(h) {
  if (!confirm(`"${h.nom}" — ${fmt(h.summa)} so'm yozuvini o'chirasizmi?${h.kassa ? '\nKassadagi yozuvi ham o\'chadi.' : ''}`)) return
  try { await api.delete(`/uchinchi-shaxslar/harakat/${h.id}`); await Promise.all([yukla(), tafsilot()]) }
  catch (e) { alert(e.message || "O'chirilmadi") }
}

function shaxsOch(s = null) {
  Object.assign(sh, { ochiq: true, id: s?.id || null, ism: s?.ism || '', telefon: s?.telefon || '', izoh: s?.izoh || '', faol: s ? !!s.faol : true, yon: 'yoq', summa: null, sana: bugun(), muddat: '' })
  xato.value = ''; shf.tozala()
}
async function shaxsSaqla() {
  if (!sh.id && sh.yon !== 'yoq' && !(Number(sh.summa) > 0)) { xato.value = "Boshlang'ich qoldiq summasini kiriting yoki «Qoldiq yo'q» ni tanlang"; return }
  if (band.value) return
  xato.value = ''
  if (!shf.tekshir()) return
  band.value = true
  try {
    if (sh.id) {
      await api.patch(`/uchinchi-shaxslar/${sh.id}`, { ism: sh.ism, telefon: sh.telefon, izoh: sh.izoh, faol: sh.faol })
    } else {
      const s = await api.post('/uchinchi-shaxslar', {
        ism: sh.ism, telefon: sh.telefon, izoh: sh.izoh,
        boshlangich: sh.yon === 'yoq' ? null : { yon: sh.yon, summa: sh.summa, sana: sh.sana, muddat: sh.muddat || null },
      })
      tanlangan.value = s.id
      router.replace({ query: { ...route.query, shaxs: String(s.id) } })
    }
    sh.ochiq = false
    await Promise.all([yukla(), tafsilot()])
  } catch (e) { xato.value = shf.server(e) || 'Saqlanmadi' }
  finally { band.value = false }
}
async function shaxsOchir() {
  if (!confirm(`${sh.ism} o'chirilsinmi?`)) return
  try {
    await api.delete(`/uchinchi-shaxslar/${sh.id}`)
    sh.ochiq = false; tanlangan.value = null; d.value = null
    router.replace({ query: { ...route.query, shaxs: undefined } })
    await yukla()
  } catch (e) { xato.value = e.message || "O'chirilmadi" }
}

watch(() => route.query.shaxs, v => { const id = Number(v) || null; if (id !== tanlangan.value) { tanlangan.value = id; tafsilot() } })
onMounted(async () => { await yukla(); if (tanlangan.value) tafsilot() })
</script>

<style scoped>
.qz { display:flex; flex-direction:column; gap:16px; color:var(--ink); }
.qz-hd { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.qz-hd-l { display:flex; align-items:center; gap:14px; }
.qz-hd-ic { width:44px; height:44px; border-radius:13px; background:var(--acc-soft); color:var(--acc); display:flex; align-items:center; justify-content:center; }
.qz-hd-ic svg { width:22px; height:22px; }
.qz-hd h1 { margin:0; font-size:21px; font-weight:800; letter-spacing:-.3px; }
.qz-hd p { margin:2px 0 0; font-size:12.5px; color:var(--mut); }
.qz-btn { display:inline-flex; align-items:center; gap:7px; height:38px; padding:0 16px; border-radius:10px; border:1.5px solid var(--line); background:var(--surface); color:var(--ink2); font-size:13px; font-weight:600; cursor:pointer; }
.qz-btn svg { width:15px; height:15px; }
.qz-btn:hover:not(:disabled) { background:var(--hov); }
.qz-btn:disabled { opacity:.5; cursor:not-allowed; }
.qz-btn--p { background:var(--acc); border-color:var(--acc); color:#fff; }
.qz-btn--p:hover:not(:disabled) { background:var(--brand-700, #6d28d9); }
.qz-btn--del { color:#dc2626; border-color:rgba(239,68,68,.35); }

.qz-kpi { display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; }
.qz-k { display:flex; align-items:center; gap:12px; padding:14px 16px; border-radius:15px; border:1.5px solid var(--line); background:var(--surface); text-align:left; cursor:pointer; color:inherit; font:inherit; }
.qz-k.on { border-color:var(--acc); box-shadow:0 0 0 3px var(--acc-soft); }
.qz-k--sof { cursor:default; }
.qz-k-ic { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.qz-k-ic svg { width:20px; height:20px; }
.qz-k--bizga .qz-k-ic { background:rgba(16,185,129,.13); color:#059669; }
.qz-k--bizdan .qz-k-ic { background:rgba(239,68,68,.12); color:#dc2626; }
.qz-k--sof .qz-k-ic { background:var(--acc-soft); color:var(--acc); }
.qz-k--muddat .qz-k-ic { background:rgba(245,158,11,.14); color:#d97706; }
.qz-k-b { display:flex; flex-direction:column; min-width:0; }
.qz-k-b b { font-size:19px; font-weight:800; font-variant-numeric:tabular-nums; }
.qz-k-b small { font-size:11.5px; color:var(--mut); }
.qz-k--bizga b { color:#059669; } .qz-k--bizdan b { color:#dc2626; } .qz-k--muddat b { color:#d97706; }
.plus { color:#059669; } .minus { color:#dc2626; } .teng { color:var(--sub); }

.qz-body { display:grid; grid-template-columns:340px 1fr; gap:14px; align-items:start; }
.qz-list, .qz-det { background:var(--surface); border:1px solid var(--line); border-radius:16px; }
.qz-list { padding:12px; display:flex; flex-direction:column; gap:4px; max-height:calc(100vh - 290px); overflow:auto; }
.qz-srch { display:flex; align-items:center; gap:8px; padding:0 10px; height:38px; border:1.5px solid var(--line); border-radius:10px; margin-bottom:6px; }
.qz-srch svg { width:16px; height:16px; color:var(--sub); flex-shrink:0; }
.qz-srch input { flex:1; border:none; outline:none; background:none; color:var(--ink); font-size:13px; }
.qz-tabs { display:grid; grid-template-columns:1fr 1fr; gap:2px; padding:3px; margin-bottom:6px; background:var(--seg-track); border:1px solid var(--seg-brd); border-radius:10px; }
.qz-tabs button { padding:6px 8px; border-radius:7px; border:none; background:transparent; color:var(--seg-ink); font-size:11.5px; font-weight:600; cursor:pointer; white-space:nowrap; }
.qz-tabs button.on { background:var(--seg-on-bg); color:var(--seg-on-ink); box-shadow:var(--seg-on-sh); }
.qz-row { display:flex; align-items:center; gap:10px; padding:9px 8px; border-radius:11px; border:none; background:none; cursor:pointer; text-align:left; color:inherit; font:inherit; width:100%; }
.qz-row:hover { background:var(--hov); }
.qz-row.on { background:var(--acc-soft); }
.qz-row.nofaol { opacity:.55; }
.qz-av { width:34px; height:34px; border-radius:10px; background:var(--acc-soft); color:var(--acc); font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.qz-av.lg { width:46px; height:46px; border-radius:13px; font-size:18px; }
.qz-row-b { flex:1; min-width:0; display:flex; flex-direction:column; }
.qz-row-b b { font-size:13.5px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.qz-row-b small, .qz-row-s small { font-size:11px; color:var(--sub); }
.qz-row-s { display:flex; flex-direction:column; align-items:flex-end; }
.qz-row-s b { font-size:13.5px; font-weight:800; font-variant-numeric:tabular-nums; }
.qz-otgan { color:#d97706 !important; font-weight:700; }
.qz-empty { padding:24px 10px; text-align:center; font-size:12.5px; color:var(--sub); line-height:1.6; }
.qz-link { border:none; background:none; color:var(--acc); font-weight:700; cursor:pointer; font-size:12.5px; }

.qz-det { padding:18px 20px; display:flex; flex-direction:column; gap:14px; min-height:420px; }
.qz-det-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; color:var(--sub); text-align:center; padding:40px; }
.qz-det-empty svg { width:40px; height:40px; color:var(--acc); opacity:.6; }
.qz-det-empty b { color:var(--ink); font-size:15px; }
.qz-det-hd { display:flex; align-items:center; gap:12px; }
.qz-det-t { flex:1; min-width:0; }
.qz-det-t h2 { margin:0; font-size:18px; font-weight:800; }
.qz-det-t p { margin:2px 0 0; font-size:12.5px; color:var(--mut); }
.qz-chip { font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:999px; background:var(--hov); color:var(--mut); vertical-align:middle; }
.qz-ib { width:36px; height:36px; border-radius:10px; border:1.5px solid var(--line); background:var(--surface); color:var(--mut); cursor:pointer; display:flex; align-items:center; justify-content:center; }
.qz-ib svg { width:16px; height:16px; } .qz-ib:hover { background:var(--hov); color:var(--ink); }
.qz-bal { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 18px; border-radius:14px; }
.qz-bal.plus { background:rgba(16,185,129,.09); } .qz-bal.minus { background:rgba(239,68,68,.08); } .qz-bal.teng { background:var(--hov); }
.qz-bal small { display:block; font-size:12.5px; font-weight:600; color:var(--mut); }
.qz-bal b { font-size:26px; font-weight:800; font-variant-numeric:tabular-nums; }
.qz-bal b span { font-size:13px; font-weight:600; color:var(--mut); }
.qz-bal-m { text-align:right; font-size:11.5px; color:var(--mut); }
.qz-bal-m b { font-size:14px; color:var(--ink); }
.qz-bal-m.otgan, .qz-bal-m.otgan b { color:#d97706; }
.qz-sum { display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; }
.qz-sum div { padding:10px 12px; border-radius:11px; background:var(--hov); display:flex; flex-direction:column; }
.qz-sum small { font-size:11px; color:var(--mut); } .qz-sum b { font-size:14px; font-weight:800; font-variant-numeric:tabular-nums; }
.qz-amal { display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; }
.qz-am { display:flex; align-items:center; gap:9px; padding:10px 12px; border-radius:12px; border:1.5px solid var(--line); background:var(--surface); cursor:pointer; text-align:left; color:inherit; font:inherit; }
.qz-am:hover { background:var(--hov); }
.qz-am-ic { width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.qz-am-ic :deep(svg) { width:17px; height:17px; }
.qz-am b { display:block; font-size:12.5px; font-weight:800; } .qz-am small { font-size:10.5px; color:var(--sub); }
.qz-am--bizga .qz-am-ic, .qz-am--bizga2 .qz-am-ic { background:rgba(16,185,129,.13); color:#059669; }
.qz-am--bizdan .qz-am-ic, .qz-am--bizdan2 .qz-am-ic { background:rgba(239,68,68,.12); color:#dc2626; }
.qz-tbl-w { border:1px solid var(--line); border-radius:12px; overflow:auto; }
.qz-tbl { width:100%; border-collapse:collapse; font-size:12.5px; }
.qz-tbl th { text-align:left; font-size:10.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--sub); padding:9px 10px; border-bottom:1px solid var(--line); background:var(--hov); }
.qz-tbl td { padding:9px 10px; border-bottom:1px solid var(--line2, var(--line)); vertical-align:top; }
.qz-tbl tr:last-child td { border-bottom:none; }
.qz-tbl .r { text-align:right; } .qz-tbl .nw { white-space:nowrap; font-variant-numeric:tabular-nums; }
.qz-tbl td.r.nw { font-weight:700; }
.qz-td-m { display:block; font-size:10.5px; color:var(--sub); }
.qz-tag { display:inline-block; font-size:11px; font-weight:700; padding:2px 8px; border-radius:7px; }
.qz-tag.g, .qz-tag.g2 { background:rgba(16,185,129,.12); color:#047857; }
.qz-tag.r, .qz-tag.r2 { background:rgba(239,68,68,.1); color:#b91c1c; }
.qz-tag.b { background:var(--acc-soft); color:var(--acc); }
.qz-usul { display:block; font-size:10.5px; color:var(--sub); margin-top:2px; }
.qz-iz { color:var(--mut); max-width:260px; }
.qz-del { width:28px; height:28px; border-radius:8px; border:none; background:none; color:var(--sub); cursor:pointer; display:inline-flex; align-items:center; justify-content:center; }
.qz-del svg { width:15px; height:15px; } .qz-del:hover { background:rgba(239,68,68,.1); color:#dc2626; }
.qz-hint { margin:0; font-size:11.5px; color:var(--sub); }

.qz-ov { position:fixed; inset:0; z-index:520; background:rgba(15,23,42,.5); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:16px; }
.qz-m { width:100%; max-width:560px; background:var(--surface, #fff); color:var(--ink, #0f172a); border-radius:18px; overflow:hidden; box-shadow:0 28px 80px rgba(0,0,0,.25); display:flex; flex-direction:column; max-height:92vh; }
.qz-m-hd { position:relative; padding:18px 22px 12px; border-bottom:1px solid var(--line, #e2e8f0); }
.qz-m-hd h3 { margin:0; font-size:17px; font-weight:800; }
.qz-m-hd p { margin:3px 0 0; font-size:12.5px; color:var(--mut, #64748b); padding-right:30px; }
.qz-x { position:absolute; top:14px; right:16px; width:32px; height:32px; border-radius:9px; border:none; background:var(--hov, #f1f5f9); color:var(--mut, #64748b); font-size:20px; cursor:pointer; line-height:1; }
.qz-m-b { padding:16px 22px; display:flex; flex-direction:column; gap:12px; overflow:auto; }
.qz-m-ft { display:flex; gap:10px; justify-content:flex-end; padding:14px 22px; border-top:1px solid var(--line, #e2e8f0); background:var(--hov, #f8fafc); }
.qz-seg { display:flex; gap:6px; flex-wrap:wrap; }
.qz-seg button { flex:1; min-width:110px; padding:9px 10px; border-radius:10px; border:1.5px solid var(--line, #e2e8f0); background:var(--surface, #fff); color:var(--ink2, #334155); font-size:12.5px; font-weight:700; cursor:pointer; }
.qz-seg button.on { border-color:var(--chip-on-brd); background:var(--chip-on-bg); color:var(--chip-on-ink); }
.qz-seg button.on.qz-am--bizga, .qz-seg button.on.qz-am--bizga2 { border-color:#10b981; background:rgba(16,185,129,.1); color:#047857; }
.qz-seg button.on.qz-am--bizdan, .qz-seg button.on.qz-am--bizdan2 { border-color:#ef4444; background:rgba(239,68,68,.08); color:#b91c1c; }
.qz-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.qz-f { display:flex; flex-direction:column; gap:5px; }
.qz-f.full { grid-column:1 / -1; }
.qz-f span { font-size:12px; font-weight:600; color:var(--ink2, #334155); }
.qz-f input, .qz-f select { padding:9px 11px; border:1.5px solid var(--line, #e2e8f0); border-radius:9px; font-size:13.5px; background:var(--surface, #fff); color:var(--ink, #0f172a); outline:none; }
.qz-f input:focus, .qz-f select:focus { border-color:var(--acc); }
.qz-sub { font-size:12px; font-weight:700; color:var(--mut, #64748b); margin-top:4px; }
.qz-prev { padding:10px 14px; border-radius:11px; font-size:12.5px; display:flex; flex-direction:column; gap:3px; }
.qz-prev.plus { background:rgba(16,185,129,.09); color:#065f46; } .qz-prev.minus { background:rgba(239,68,68,.08); color:#991b1b; } .qz-prev.teng { background:var(--hov, #f1f5f9); color:var(--ink2); }
.qz-warn { color:#b45309; font-weight:600; }
.qz-err { margin:0; padding:9px 12px; border-radius:9px; background:rgba(239,68,68,.1); color:#b91c1c; font-size:12.5px; font-weight:600; }

@media (max-width: 1100px) { .qz-kpi { grid-template-columns:repeat(2, 1fr); } .qz-amal, .qz-sum { grid-template-columns:repeat(2, 1fr); } }
@media (max-width: 860px) { .qz-body { grid-template-columns:1fr; } .qz-list { max-height:none; } .qz-grid { grid-template-columns:1fr; } }
.shell.dark .qz-prev.plus { color:#6ee7b7; } .shell.dark .qz-prev.minus { color:#fca5a5; }
.shell.dark .qz-tag.g, .shell.dark .qz-tag.g2 { color:#6ee7b7; } .shell.dark .qz-tag.r, .shell.dark .qz-tag.r2 { color:#fca5a5; }
</style>
