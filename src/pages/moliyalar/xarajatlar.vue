<template>
  <div class="xr">

    <!-- Sarlavha -->
    <div class="xr-hd">
      <div class="xr-hd-l">
        <span class="xr-hd-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/></svg></span>
        <div>
          <h1>Kunlik xarajatlar</h1>
          <p>Kassadan rasxod — har bir xarajat kassa qoldig'idan ayriladi va foyda-zarar hisobotiga tushadi</p>
        </div>
      </div>
      <div class="xr-hd-r">
        <button class="xr-btn" @click="toifaOch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>
          Toifalar
        </button>
        <button class="xr-btn xr-btn--p" @click="qoshOch()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Xarajat qo'shish
        </button>
      </div>
    </div>

    <!-- Davr -->
    <div class="xr-davr">
      <div class="xr-preset">
        <button v-for="p in PRESETLAR" :key="p.k" :class="{ on: preset === p.k }" @click="presetTanla(p.k)">{{ p.t }}</button>
      </div>
      <div class="xr-sana">
        <button v-if="bittaKun" class="xr-ar" title="Oldingi kun" @click="kunSur(-1)">‹</button>
        <input type="date" v-model="dan" @change="qolda" :max="gacha"/>
        <span>—</span>
        <input type="date" v-model="gacha" @change="qolda" :min="dan"/>
        <button v-if="bittaKun" class="xr-ar" title="Keyingi kun" :disabled="gacha >= bugun()" @click="kunSur(1)">›</button>
      </div>
      <span class="xr-davr-n">{{ davrNomi }}</span>
    </div>

    <!-- Tez qo'shish -->
    <div v-if="tezToifalar.length" class="xr-tez">
      <span>Tez qo'shish:</span>
      <button v-for="t in tezToifalar" :key="t.kod" class="xr-tez-b" @click="qoshOch(t.kod)">
        <span class="xr-ik sm" v-html="ikon(t.ikon)"/>{{ t.nomi }}
      </button>
    </div>

    <!-- KPI -->
    <div class="xr-kpi">
      <div class="xr-k xr-k--x">
        <span class="xr-k-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg></span>
        <span class="xr-k-b"><b>{{ fmt(d.jami.summa) }}</b><small>Xarajat · {{ d.jami.soni }} ta · {{ davrNomi.toLowerCase() }}</small></span>
      </div>
      <div class="xr-k" :class="d.kassa.naqt < 0 ? 'xr-k--x' : 'xr-k--ok'">
        <span class="xr-k-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg></span>
        <span class="xr-k-b"><b>{{ fmt(d.kassa.naqt) }}</b><small>Kassada naqd hozir<template v-if="d.kassa.karta || d.kassa.bank"> · karta {{ qisqa(d.kassa.karta) }}, bank {{ qisqa(d.kassa.bank) }}</template></small></span>
      </div>
      <div class="xr-k xr-k--b">
        <span class="xr-k-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/></svg></span>
        <span class="xr-k-b"><b>{{ fmt(d.ortacha30) }}</b><small>O'rtacha kunlik · so'nggi 30 kun<template v-if="bittaKun && d.ortacha30 > 0 && d.jami.summa > 0"> · <span :class="d.jami.summa > d.ortacha30 ? 'xr-up' : 'xr-down'">{{ d.jami.summa > d.ortacha30 ? '↑' : '↓' }} {{ Math.round(Math.abs(d.jami.summa / d.ortacha30 - 1) * 100) }}%</span></template></small></span>
      </div>
      <div class="xr-k xr-k--b">
        <span class="xr-k-ic" v-html="ikon(d.toifalar[0]?.ikon || 'boshqa')"/>
        <span class="xr-k-b"><b class="xr-k-nm">{{ d.toifalar[0]?.nomi || '—' }}</b><small>Eng katta toifa<template v-if="d.toifalar[0]"> · {{ qisqa(d.toifalar[0].summa) }} · {{ d.toifalar[0].ulush }}%</template></small></span>
      </div>
    </div>

    <div class="xr-body">
      <!-- Ro'yxat (kunlar bo'yicha) -->
      <section class="xr-card">
        <div class="xr-card-hd">
          <b>Xarajatlar</b>
          <span v-if="filtr" class="xr-filtr">{{ toifaNomi(filtr) }} <button @click="filtr = ''; yukla()">×</button></span>
          <div class="xr-srch">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input v-model="qidiruv" placeholder="Izoh bo'yicha qidirish…"/>
          </div>
        </div>
        <div v-if="yuklanmoqda && !d.rows.length" class="xr-empty">Yuklanmoqda…</div>
        <div v-else-if="!guruhlar.length" class="xr-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6"/></svg>
          <b>{{ qidiruv ? 'Topilmadi' : 'Bu davrda xarajat yo\'q' }}</b>
          <button v-if="!qidiruv" class="xr-btn xr-btn--p sm" @click="qoshOch()">Xarajat qo'shish</button>
        </div>
        <div v-for="g in guruhlar" :key="g.kun" class="xr-kun">
          <div class="xr-kun-hd"><b>{{ kunNomi(g.kun) }}</b><span>{{ g.rows.length }} ta</span><b class="xr-kun-s">−{{ fmt(g.summa) }}</b></div>
          <div v-for="r in g.rows" :key="r.id" class="xr-row">
            <span class="xr-vaqt">{{ vaqt(r.sana) }}</span>
            <span class="xr-ik" v-html="ikon(r.ikon)"/>
            <span class="xr-row-b">
              <b>{{ r.nomi }}</b>
              <small>{{ r.izoh || 'izohsiz' }}</small>
            </span>
            <span class="xr-meta">
              <span class="xr-usul">{{ USUL[r.tolov_usul] || r.tolov_usul }}</span>
              <small v-if="r.kim">{{ r.kim }}</small>
            </span>
            <a v-if="r.chek_rasm" :href="r.chek_rasm" target="_blank" class="xr-chek" title="Chek rasmi"><img :src="r.chek_rasm" alt="chek"/></a>
            <span v-else class="xr-chek xr-chek--yoq"/>
            <b class="xr-summa">−{{ fmt(r.summa) }}</b>
            <span class="xr-amal">
              <template v-if="r.tahrir">
                <button title="Tahrirlash" @click="tahrirOch(r)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
                <button title="O'chirish" class="del" @click="ochir(r)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
              </template>
            </span>
          </div>
        </div>
      </section>

      <!-- Tahlil -->
      <aside class="xr-side">
        <section class="xr-card">
          <div class="xr-card-hd"><b>Toifalar bo'yicha</b><small v-if="d.toifalar.length">bosing — filtr</small></div>
          <div v-if="!d.toifalar.length" class="xr-empty sm">Ma'lumot yo'q</div>
          <button v-for="t in d.toifalar" :key="t.kod" class="xr-bar" :class="{ on: filtr === t.kod }" @click="filtrTanla(t.kod)">
            <span class="xr-ik sm" v-html="ikon(t.ikon)"/>
            <span class="xr-bar-b">
              <span class="xr-bar-t"><b>{{ t.nomi }}</b><span>{{ fmt(t.summa) }}</span></span>
              <span class="xr-bar-l"><i :style="{ width: Math.max(2, t.ulush) + '%' }"/></span>
              <small>{{ t.soni }} ta · {{ t.ulush }}%</small>
            </span>
          </button>
        </section>
        <section v-if="kunGrafik.length > 1" class="xr-card">
          <div class="xr-card-hd"><b>Kunlar bo'yicha</b><small>o'rtacha {{ qisqa(d.jami.kunlik) }}</small></div>
          <div class="xr-chart">
            <div v-for="k in kunGrafik" :key="k.kun" class="xr-col" :title="`${kunNomi(k.kun)}: ${fmt(k.summa)} so'm`">
              <i :style="{ height: (k.summa / maxKun * 100) + '%' }" :class="{ zero: !k.summa }"/>
              <span>{{ k.kun.slice(8) }}</span>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <!-- Xarajat oynasi -->
    <div v-if="m.ochiq" class="xr-ov" @click.self="m.ochiq = false">
      <div class="xr-m">
        <div class="xr-m-hd">
          <h3>{{ m.id ? 'Xarajatni tahrirlash' : 'Xarajat qo\'shish' }}</h3>
          <p>Kassadan chiqim — toifani tanlang, summani kiriting</p>
          <button class="xr-x" @click="m.ochiq = false">×</button>
        </div>
        <div class="xr-m-b">
          <div class="xr-tg">
            <button v-for="t in faolToifalar" :key="t.kod" class="xr-tg-b" :class="{ on: m.kategoriya === t.kod }" @click="m.kategoriya = t.kod">
              <span class="xr-ik" v-html="ikon(t.ikon)"/><span>{{ t.nomi }}</span>
            </button>
            <button v-if="!yangiToifa.ochiq" class="xr-tg-b xr-tg-b--yangi" @click="yangiToifa.ochiq = true; yangiToifa.nomi = ''">
              <span class="xr-ik">+</span><span>Yangi toifa</span>
            </button>
            <div v-else class="xr-tg-yangi">
              <input v-model="yangiToifa.nomi" placeholder="Toifa nomi" maxlength="100" @keydown.enter.prevent="toifaQosh(true)"/>
              <button class="xr-btn xr-btn--p sm" :disabled="!yangiToifa.nomi.trim()" @click="toifaQosh(true)">Qo'shish</button>
              <button class="xr-btn sm" @click="yangiToifa.ochiq = false">×</button>
            </div>
          </div>
          <div class="xr-grid">
            <label class="xr-f full">
              <span>Summa (so'm) *</span>
              <NumberInput ref="summaInp" css-class="xr-summa-inp" v-model="m.summa" placeholder="0" @keydown.enter.prevent="saqla(false)"/>
              <span class="xr-tezsum">
                <button v-for="s in [10000, 50000, 100000, 500000]" :key="s" type="button" @click="m.summa = (Number(m.summa) || 0) + s">+{{ qisqa(s) }}</button>
                <button v-if="m.summa" type="button" class="tozala" @click="m.summa = null">tozalash</button>
              </span>
            </label>
            <div class="xr-f">
              <span>To'lov usuli</span>
              <div class="xr-seg">
                <button v-for="(t, k) in USUL_UZUN" :key="k" type="button" :class="{ on: m.tolov_usul === k }" @click="m.tolov_usul = k">{{ t }}</button>
              </div>
            </div>
            <label class="xr-f"><span>Sana</span><input type="date" v-model="m.sana" v-maydon:sana="xf" :max="bugun()"/></label>
            <label class="xr-f full"><span>Izoh — nima uchun, kimga</span><input v-model="m.izoh" v-maydon:izoh="xf" maxlength="255" placeholder="Masalan: benzin 20 l, Akmal (haydovchi)"/></label>
            <div class="xr-f full">
              <span>Chek rasmi (ixtiyoriy)</span>
              <div class="xr-rasm">
                <img v-if="m.rasmUrl" :src="m.rasmUrl" alt="chek"/>
                <label class="xr-btn sm">
                  <input type="file" accept="image/*" capture="environment" hidden @change="rasmTanla"/>
                  {{ m.rasmUrl ? 'Almashtirish' : 'Rasm biriktirish' }}
                </label>
                <button v-if="m.rasmUrl" type="button" class="xr-btn sm" @click="rasmOchir">Olib tashlash</button>
              </div>
            </div>
          </div>
          <div v-if="m.summa > 0" class="xr-prev" :class="{ warn: qoldiqKeyin < 0 && m.tolov_usul === 'naqt' }">
            Kassadan <b>{{ fmt(m.summa) }} so'm</b> chiqadi ({{ USUL[m.tolov_usul] }})
            <template v-if="m.tolov_usul === 'naqt'"> · naqd qoldiq {{ fmt(qoldiqHozir) }} → <b>{{ fmt(qoldiqKeyin) }}</b></template>
            <div v-if="qoldiqKeyin < 0 && m.tolov_usul === 'naqt'" class="xr-warn">Kassada naqd yetmaydi — qoldiq manfiy bo'ladi. Avval kassaga kirimni kiriting yoki to'lov usulini tekshiring.</div>
          </div>
          <p v-if="xato" class="xr-err">{{ xato }}</p>
        </div>
        <div class="xr-m-ft">
          <button class="xr-btn" @click="m.ochiq = false">Bekor qilish</button>
          <span style="flex:1"/>
          <button v-if="!m.id" class="xr-btn" :disabled="band || !tayyor" @click="saqla(true)">Saqlash va yana</button>
          <button class="xr-btn xr-btn--p" :disabled="band || !tayyor" @click="saqla(false)">{{ band ? 'Saqlanmoqda…' : 'Saqlash' }}</button>
        </div>
      </div>
    </div>

    <!-- Toifalar oynasi -->
    <div v-if="tm.ochiq" class="xr-ov" @click.self="tm.ochiq = false">
      <div class="xr-m">
        <div class="xr-m-hd">
          <h3>Xarajat toifalari</h3>
          <p>Nomini o'zgartiring, belgisini tanlang yoki kerak bo'lmaganini yashiring. Eski yozuvlar o'z toifasida qoladi.</p>
          <button class="xr-x" @click="tm.ochiq = false">×</button>
        </div>
        <div class="xr-m-b">
          <div v-for="t in turlar" :key="t.id" class="xr-tr" :class="{ nofaol: !t.faol }">
            <button class="xr-ik" :title="'Belgi: ' + t.ikon" @click="tm.ikonId = tm.ikonId === t.id ? null : t.id" v-html="ikon(t.ikon)"/>
            <input v-model="t.nomi" maxlength="100" @change="turSaqla(t, { nomi: t.nomi })"/>
            <small>{{ t.soni90 ? `${t.soni90} ta` : '' }}</small>
            <button class="xr-btn sm" @click="turSaqla(t, { faol: !t.faol })">{{ t.faol ? 'Yashirish' : "Ko'rsatish" }}</button>
            <div v-if="tm.ikonId === t.id" class="xr-ikonlar">
              <button v-for="(svg, k) in IKON" :key="k" :class="{ on: t.ikon === k }" @click="turSaqla(t, { ikon: k }); tm.ikonId = null" v-html="svg"/>
            </div>
          </div>
          <div class="xr-tr xr-tr--yangi">
            <span class="xr-ik">+</span>
            <input v-model="yangiToifa.nomi" placeholder="Yangi toifa nomi" maxlength="100" @keydown.enter.prevent="toifaQosh(false)"/>
            <button class="xr-btn xr-btn--p sm" :disabled="!yangiToifa.nomi.trim()" @click="toifaQosh(false)">Qo'shish</button>
          </div>
          <p v-if="xato" class="xr-err">{{ xato }}</p>
        </div>
        <div class="xr-m-ft"><span style="flex:1"/><button class="xr-btn xr-btn--p" @click="tm.ochiq = false">Tayyor</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import NumberInput from '@/components/NumberInput.vue'
import { api } from '@/api/api'
import { useForma } from '@/validation/useForma'
import * as sx from '@/validation/sxemalar'

const S = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`
const IKON = {
  yoqilgi: S('<path d="M3 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M3 22h12M6 6h6v5H6z"/><path d="M15 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3"/>'),
  ovqat: S('<path d="M4 3v8a3 3 0 0 0 3 3v7M10 3v8M7 3v8"/><path d="M17 21V3c-2 1.5-3 4-3 7s1 4 3 4"/>'),
  odam: S('<circle cx="12" cy="7" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>'),
  uy: S('<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10"/><path d="M10 21v-6h4v6"/>'),
  chiroq: S('<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z"/>'),
  telefon: S('<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>'),
  savat: S('<path d="M6 7h12l-1 13H7L6 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>'),
  asbob: S('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4Z"/>'),
  hujjat: S('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>'),
  megafon: S('<path d="M3 11v2a2 2 0 0 0 2 2h1l4 4V5L6 9H5a2 2 0 0 0-2 2Z"/><path d="M14 8a5 5 0 0 1 0 8M17 5a9 9 0 0 1 0 14"/>'),
  mashina: S('<path d="M3 13l2-5a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 8l2 5v5h-2"/><path d="M5 18H3v-5h18"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>'),
  sovga: S('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9"/><path d="M12 8S10 3 7.5 4 9 8 12 8Zm0 0s2-5 4.5-4S15 8 12 8Z"/>'),
  dori: S('<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V5h8v3M12 11v6M9 14h6"/>'),
  kitob: S('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z"/><path d="M20 17v4H6.5A2.5 2.5 0 0 1 4 19.5"/>'),
  qurilish: S('<path d="M2 20h20M5 20V10l7-6 7 6v10"/><path d="M9 20v-5h6v5"/>'),
  boshqa: S('<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'),
}
const ikon = k => IKON[k] || IKON.boshqa
const USUL = { naqt: 'naqd', karta: 'karta', bank: 'bank' }
const USUL_UZUN = { naqt: 'Naqd', karta: 'Karta', bank: 'Bank' }
const PRESETLAR = [{ k: 'bugun', t: 'Bugun' }, { k: 'kecha', t: 'Kecha' }, { k: 'hafta', t: '7 kun' }, { k: 'oy', t: 'Bu oy' }]
const OYLAR = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const HAFTA = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba']

const p2 = x => String(x).padStart(2, '0')
const kunKey = (x) => `${x.getFullYear()}-${p2(x.getMonth() + 1)}-${p2(x.getDate())}`
const bugun = () => kunKey(new Date())
const kunQosh = (k, n) => { const x = new Date(k + 'T12:00:00'); x.setDate(x.getDate() + n); return kunKey(x) }
const fmt = v => new Intl.NumberFormat('ru-RU').format(Math.round(Number(v) || 0))
function qisqa(v) {
  const n = Math.abs(Number(v) || 0), z = Number(v) < 0 ? '−' : ''
  if (n >= 1e9) return z + (n / 1e9).toFixed(1).replace('.0', '') + ' mlrd'
  if (n >= 1e6) return z + (n / 1e6).toFixed(1).replace('.0', '') + ' mln'
  if (n >= 1e3) return z + Math.round(n / 1e3) + ' ming'
  return z + Math.round(n)
}
const vaqt = s => { const x = new Date(s); return `${p2(x.getHours())}:${p2(x.getMinutes())}` }
function kunNomi(k) {
  const x = new Date(k + 'T12:00:00')
  const t = `${x.getDate()}-${OYLAR[x.getMonth()]}`
  if (k === bugun()) return `Bugun · ${t}`
  if (k === kunQosh(bugun(), -1)) return `Kecha · ${t}`
  return `${t}, ${HAFTA[x.getDay()]}`
}

/* Davr — oxirgi tanlov eslab qolinadi */
let saqlangan = 'bugun'
try { saqlangan = localStorage.getItem('sellz_xarajat_davr') || 'bugun' } catch { /* xotira yo'q */ }
const preset = ref(PRESETLAR.some(p => p.k === saqlangan) ? saqlangan : 'bugun')
const dan = ref(bugun()), gacha = ref(bugun())
function presetQoy(k) {
  const b = bugun()
  if (k === 'bugun') { dan.value = b; gacha.value = b }
  else if (k === 'kecha') { dan.value = kunQosh(b, -1); gacha.value = dan.value }
  else if (k === 'hafta') { dan.value = kunQosh(b, -6); gacha.value = b }
  else if (k === 'oy') { dan.value = b.slice(0, 8) + '01'; gacha.value = b }
}
presetQoy(preset.value)
function presetTanla(k) { preset.value = k; presetQoy(k); try { localStorage.setItem('sellz_xarajat_davr', k) } catch { /* */ } yukla() }
function qolda() { preset.value = ''; if (dan.value > gacha.value) gacha.value = dan.value; yukla() }
const bittaKun = computed(() => dan.value === gacha.value)
function kunSur(n) {
  const k = kunQosh(dan.value, n); if (k > bugun()) return
  dan.value = k; gacha.value = k
  preset.value = k === bugun() ? 'bugun' : k === kunQosh(bugun(), -1) ? 'kecha' : ''
  yukla()
}
const davrNomi = computed(() => {
  if (preset.value) return PRESETLAR.find(p => p.k === preset.value).t
  if (bittaKun.value) return kunNomi(dan.value)
  const a = new Date(dan.value + 'T12:00:00'), b = new Date(gacha.value + 'T12:00:00')
  return `${a.getDate()}-${OYLAR[a.getMonth()]} — ${b.getDate()}-${OYLAR[b.getMonth()]}`
})

/* Ma'lumot */
const BOSH = { jami: { summa: 0, soni: 0, kunlik: 0 }, ortacha30: 0, kassa: { naqt: 0, karta: 0, bank: 0, jami: 0 }, toifalar: [], kunlar: [], rows: [] }
const d = ref({ ...BOSH })
const turlar = ref([])
const yuklanmoqda = ref(false)
const filtr = ref('')
const qidiruv = ref('')

async function yukla() {
  yuklanmoqda.value = true
  try {
    const p = new URLSearchParams({ dan: dan.value, gacha: gacha.value })
    if (filtr.value) p.set('kategoriya', filtr.value)
    d.value = await api.get('/xarajatlar?' + p)
  } finally { yuklanmoqda.value = false }
}
async function turlarYukla() { turlar.value = await api.get('/xarajatlar/turlar') }
function filtrTanla(k) { filtr.value = filtr.value === k ? '' : k; yukla() }
const toifaNomi = k => turlar.value.find(t => t.kod === k)?.nomi || k
const faolToifalar = computed(() => turlar.value.filter(t => t.faol))
const tezToifalar = computed(() => [...faolToifalar.value].sort((a, b) => (b.soni90 - a.soni90) || (a.tartib - b.tartib)).slice(0, 6))

const guruhlar = computed(() => {
  const q = qidiruv.value.trim().toLowerCase()
  const g = new Map()
  for (const r of d.value.rows) {
    if (q && !`${r.izoh} ${r.nomi} ${r.kim}`.toLowerCase().includes(q)) continue
    const k = kunKey(new Date(r.sana))
    if (!g.has(k)) g.set(k, { kun: k, rows: [], summa: 0 })
    const x = g.get(k); x.rows.push(r); x.summa += r.summa
  }
  return [...g.values()]
})
const kunGrafik = computed(() => {
  if (bittaKun.value) return []
  const m = new Map(d.value.kunlar.map(k => [k.kun, k.summa]))
  const r = []; let k = dan.value
  while (k <= gacha.value && r.length < 62) { r.push({ kun: k, summa: m.get(k) || 0 }); k = kunQosh(k, 1) }
  return r
})
const maxKun = computed(() => Math.max(1, ...kunGrafik.value.map(k => k.summa)))

/* Xarajat oynasi */
const m = reactive({ ochiq: false, id: null, kategoriya: '', summa: null, tolov_usul: 'naqt', sana: bugun(), izoh: '', rasm: null, rasmUrl: '', rasmOchir: false, eskiSumma: 0, eskiUsul: '' })
const band = ref(false), xato = ref('')
const xf = useForma(sx.xarajat, () => m)
const summaInp = ref(null)
const yangiToifa = reactive({ ochiq: false, nomi: '' })
const tayyor = computed(() => !!m.kategoriya && Number(m.summa) > 0)
const qoldiqHozir = computed(() => d.value.kassa.naqt + (m.id && m.eskiUsul === 'naqt' ? m.eskiSumma : 0))
const qoldiqKeyin = computed(() => qoldiqHozir.value - (Number(m.summa) || 0))

function qoshOch(kod = '') {
  Object.assign(m, { ochiq: true, id: null, kategoriya: kod || m.kategoriya || '', summa: null, tolov_usul: 'naqt', sana: bittaKun.value ? dan.value : bugun(), izoh: '', rasm: null, rasmUrl: '', rasmOchir: false, eskiSumma: 0, eskiUsul: '' })
  if (m.sana > bugun()) m.sana = bugun()
  xato.value = ''; yangiToifa.ochiq = false; xf.tozala()
  nextTick(() => summaInp.value?.focus())
}
function tahrirOch(r) {
  Object.assign(m, { ochiq: true, id: r.id, kategoriya: r.kategoriya === 'boshqa_chiqim' ? 'xarajat' : r.kategoriya, summa: r.summa, tolov_usul: r.tolov_usul || 'naqt', sana: kunKey(new Date(r.sana)), izoh: r.izoh, rasm: null, rasmUrl: r.chek_rasm || '', rasmOchir: false, eskiSumma: r.summa, eskiUsul: r.tolov_usul })
  xato.value = ''; yangiToifa.ochiq = false; xf.tozala()
}
function rasmTanla(e) {
  const f = e.target.files?.[0]; e.target.value = ''
  if (!f) return
  if (f.size > 10 * 1024 * 1024) { xato.value = 'Rasm 10 MB dan katta'; return }
  m.rasm = f; m.rasmUrl = URL.createObjectURL(f); m.rasmOchir = false
}
function rasmOchir() { m.rasm = null; m.rasmUrl = ''; m.rasmOchir = true }
async function saqla(yana) {
  if (band.value) return
  if (!tayyor.value) { xato.value = !m.kategoriya ? 'Toifani tanlang' : 'Summani kiriting'; return }
  xato.value = ''
  if (!xf.tekshir()) { xato.value = xf.umumiy.value; return }
  band.value = true
  try {
    const fd = new FormData()
    fd.append('kategoriya', m.kategoriya); fd.append('summa', String(m.summa)); fd.append('tolov_usul', m.tolov_usul)
    fd.append('sana', m.sana); fd.append('izoh', m.izoh || '')
    if (m.rasm) fd.append('rasm', m.rasm, m.rasm.name)
    if (m.id && m.rasmOchir) fd.append('rasm_ochir', '1')
    if (m.id) await api.upload(`/xarajatlar/${m.id}`, fd, 'PATCH')
    else await api.upload('/xarajatlar', fd)
    await Promise.all([yukla(), turlarYukla()])
    if (yana) {
      const kat = m.kategoriya, sana = m.sana, usul = m.tolov_usul
      Object.assign(m, { summa: null, izoh: '', rasm: null, rasmUrl: '', kategoriya: kat, sana, tolov_usul: usul })
      nextTick(() => summaInp.value?.focus())
    } else m.ochiq = false
  } catch (e) { xato.value = xf.server(e) || 'Saqlanmadi' }
  finally { band.value = false }
}
async function ochir(r) {
  if (!confirm(`${r.nomi} — ${fmt(r.summa)} so'm xarajatini o'chirasizmi? Kassadan ham o'chadi.`)) return
  try { await api.delete(`/xarajatlar/${r.id}`); await yukla() } catch (e) { alert(e.message || "O'chirilmadi") }
}

/* Toifalar */
const tm = reactive({ ochiq: false, ikonId: null })
function toifaOch() { tm.ochiq = true; tm.ikonId = null; xato.value = ''; yangiToifa.nomi = '' }
async function toifaQosh(tanlash) {
  const nomi = yangiToifa.nomi.trim(); if (!nomi) return
  xato.value = ''
  try {
    const t = await api.post('/xarajatlar/turlar', { nomi, ikon: 'boshqa' })
    await turlarYukla()
    yangiToifa.nomi = ''; yangiToifa.ochiq = false
    if (tanlash) m.kategoriya = t.kod
  } catch (e) { xato.value = e.message || "Qo'shilmadi" }
}
async function turSaqla(t, u) {
  xato.value = ''
  try { const r = await api.patch(`/xarajatlar/turlar/${t.id}`, u); Object.assign(t, { ...r, faol: !!r.faol, soni90: t.soni90 }); yukla() }
  catch (e) { xato.value = e.message || 'Saqlanmadi'; turlarYukla() }
}

onMounted(() => { turlarYukla(); yukla() })
</script>

<style scoped>
.xr { display:flex; flex-direction:column; gap:14px; color:var(--ink); }
.xr-hd { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.xr-hd-l { display:flex; align-items:center; gap:14px; }
.xr-hd-r { display:flex; gap:8px; }
.xr-hd-ic { width:44px; height:44px; border-radius:13px; background:var(--acc-soft); color:var(--acc); display:flex; align-items:center; justify-content:center; }
.xr-hd-ic svg { width:22px; height:22px; }
.xr-hd h1 { margin:0; font-size:21px; font-weight:800; letter-spacing:-.3px; }
.xr-hd p { margin:2px 0 0; font-size:12.5px; color:var(--mut); }
.xr-btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; height:38px; padding:0 15px; border-radius:10px; border:1.5px solid var(--line); background:var(--surface); color:var(--ink2); font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap; }
.xr-btn svg { width:15px; height:15px; }
.xr-btn:hover:not(:disabled) { background:var(--hov); }
.xr-btn:disabled { opacity:.5; cursor:not-allowed; }
.xr-btn.sm { height:32px; padding:0 11px; font-size:12px; }
.xr-btn--p { background:var(--acc); border-color:var(--acc); color:#fff; }
.xr-btn--p:hover:not(:disabled) { background:var(--brand-700, #6d28d9); }

.xr-davr { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.xr-preset { display:flex; gap:2px; background:var(--seg-track); border:1px solid var(--seg-brd); border-radius:11px; padding:3px; }
.xr-preset button { border:none; background:none; padding:6px 13px; border-radius:8px; font-size:12.5px; font-weight:600; color:var(--seg-ink); cursor:pointer; transition:color .15s; }
.xr-preset button:hover:not(.on) { color:var(--seg-ink-h); }
.xr-preset button.on { background:var(--seg-on-bg); color:var(--seg-on-ink); box-shadow:var(--seg-on-sh); }
.xr-sana { display:flex; align-items:center; gap:6px; color:var(--sub); }
.xr-sana input { height:34px; padding:0 9px; border:1.5px solid var(--line); border-radius:9px; background:var(--surface); color:var(--ink); font-size:12.5px; }
.xr-ar { width:30px; height:30px; border-radius:8px; border:1.5px solid var(--line); background:var(--surface); color:var(--ink2); font-size:18px; line-height:1; cursor:pointer; }
.xr-ar:disabled { opacity:.35; cursor:not-allowed; }
.xr-davr-n { font-size:12.5px; font-weight:700; color:var(--mut); }

.xr-tez { display:flex; align-items:center; gap:6px; flex-wrap:wrap; font-size:12px; color:var(--sub); }
.xr-tez-b { display:inline-flex; align-items:center; gap:6px; height:32px; padding:0 11px 0 6px; border-radius:16px; border:1.5px solid var(--line); background:var(--surface); color:var(--ink2); font-size:12.5px; font-weight:600; cursor:pointer; }
.xr-tez-b:hover { border-color:var(--acc); color:var(--acc); }

.xr-ik { width:34px; height:34px; border-radius:10px; background:var(--acc-soft); color:var(--acc); display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; font-weight:800; border:none; }
.xr-ik :deep(svg) { width:18px; height:18px; }
.xr-ik.sm { width:24px; height:24px; border-radius:8px; }
.xr-ik.sm :deep(svg) { width:14px; height:14px; }

.xr-kpi { display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; }
.xr-k { display:flex; align-items:center; gap:12px; padding:14px 16px; border-radius:15px; border:1.5px solid var(--line); background:var(--surface); min-width:0; }
.xr-k-ic { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.xr-k-ic :deep(svg), .xr-k-ic svg { width:20px; height:20px; }
.xr-k--x .xr-k-ic { background:rgba(239,68,68,.12); color:#dc2626; } .xr-k--x b { color:#dc2626; }
.xr-k--ok .xr-k-ic { background:rgba(16,185,129,.13); color:#059669; }
.xr-k--b .xr-k-ic { background:var(--acc-soft); color:var(--acc); }
.xr-k-b { display:flex; flex-direction:column; min-width:0; }
.xr-k-b b { font-size:19px; font-weight:800; font-variant-numeric:tabular-nums; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.xr-k-b b.xr-k-nm { font-size:15px; }
.xr-k-b small { font-size:11.5px; color:var(--mut); }
.xr-up { color:#dc2626; font-weight:700; } .xr-down { color:#059669; font-weight:700; }

.xr-body { display:grid; grid-template-columns:1fr 320px; gap:14px; align-items:start; }
.xr-side { display:flex; flex-direction:column; gap:14px; }
.xr-card { background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:14px 16px; display:flex; flex-direction:column; gap:6px; }
.xr-card-hd { display:flex; align-items:center; gap:10px; margin-bottom:4px; }
.xr-card-hd b { font-size:14px; font-weight:800; }
.xr-card-hd small { font-size:11.5px; color:var(--sub); margin-left:auto; }
.xr-filtr { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:var(--acc); background:var(--acc-soft); border-radius:999px; padding:3px 6px 3px 10px; }
.xr-filtr button { border:none; background:none; color:inherit; cursor:pointer; font-size:15px; line-height:1; }
.xr-srch { margin-left:auto; display:flex; align-items:center; gap:7px; height:34px; padding:0 10px; border:1.5px solid var(--line); border-radius:9px; width:240px; }
.xr-srch svg { width:15px; height:15px; color:var(--sub); }
.xr-srch input { flex:1; border:none; outline:none; background:none; color:var(--ink); font-size:12.5px; min-width:0; }

.xr-kun { display:flex; flex-direction:column; }
.xr-kun + .xr-kun { margin-top:8px; }
.xr-kun-hd { display:flex; align-items:baseline; gap:8px; padding:8px 4px 6px; border-bottom:1px solid var(--line); }
.xr-kun-hd b { font-size:13px; font-weight:800; }
.xr-kun-hd span { font-size:11.5px; color:var(--sub); }
.xr-kun-s { margin-left:auto; color:#dc2626; font-variant-numeric:tabular-nums; }
.xr-row { display:grid; grid-template-columns:44px 34px minmax(0, 1fr) auto 40px auto 64px; align-items:center; gap:10px; padding:9px 4px; border-bottom:1px solid var(--line2, var(--line)); }
.xr-row:last-child { border-bottom:none; }
.xr-vaqt { font-size:12px; color:var(--sub); font-variant-numeric:tabular-nums; }
.xr-row-b { display:flex; flex-direction:column; min-width:0; }
.xr-row-b b { font-size:13.5px; font-weight:700; }
.xr-row-b small { font-size:12px; color:var(--mut); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.xr-meta { display:flex; flex-direction:column; align-items:flex-end; gap:2px; }
.xr-meta small { font-size:11px; color:var(--sub); white-space:nowrap; }
.xr-usul { font-size:10.5px; font-weight:700; padding:2px 7px; border-radius:6px; background:var(--hov); color:var(--mut); }
.xr-chek { width:36px; height:36px; border-radius:8px; overflow:hidden; border:1px solid var(--line); display:block; }
.xr-chek img { width:100%; height:100%; object-fit:cover; }
.xr-chek--yoq { border:none; }
.xr-summa { font-size:14px; font-weight:800; color:#dc2626; font-variant-numeric:tabular-nums; text-align:right; white-space:nowrap; }
.xr-amal { display:flex; gap:2px; justify-content:flex-end; }
.xr-amal button { width:28px; height:28px; border-radius:8px; border:none; background:none; color:var(--sub); cursor:pointer; display:inline-flex; align-items:center; justify-content:center; }
.xr-amal svg { width:15px; height:15px; }
.xr-amal button:hover { background:var(--hov); color:var(--ink); }
.xr-amal button.del:hover { background:rgba(239,68,68,.1); color:#dc2626; }
.xr-empty { display:flex; flex-direction:column; align-items:center; gap:8px; padding:36px 10px; color:var(--sub); font-size:12.5px; text-align:center; }
.xr-empty svg { width:36px; height:36px; color:var(--acc); opacity:.55; }
.xr-empty b { color:var(--ink); font-size:14px; }
.xr-empty.sm { padding:14px; }

.xr-bar { display:flex; gap:10px; align-items:center; padding:7px 6px; border-radius:10px; border:none; background:none; cursor:pointer; text-align:left; color:inherit; font:inherit; width:100%; }
.xr-bar:hover { background:var(--hov); } .xr-bar.on { background:var(--acc-soft); }
.xr-bar-b { flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; }
.xr-bar-t { display:flex; justify-content:space-between; gap:8px; font-size:12.5px; }
.xr-bar-t b { font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.xr-bar-t span { font-weight:800; font-variant-numeric:tabular-nums; white-space:nowrap; }
.xr-bar-l { height:6px; border-radius:3px; background:var(--hov); overflow:hidden; }
.xr-bar-l i { display:block; height:100%; background:var(--acc); border-radius:3px; }
.xr-bar small { font-size:10.5px; color:var(--sub); }
.xr-chart { display:flex; align-items:flex-end; gap:3px; height:120px; padding-top:6px; }
.xr-col { flex:1; min-width:0; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:4px; }
.xr-col i { width:100%; max-width:22px; background:var(--acc); border-radius:4px 4px 2px 2px; min-height:2px; }
.xr-col i.zero { background:var(--line); }
.xr-col span { font-size:9.5px; color:var(--sub); }

/* Oynalar (sahifa ichida — shell rang o'zgaruvchilari va tungi rejim ishlaydi) */
.xr-ov { position:fixed; inset:0; z-index:520; background:rgba(15,23,42,.5); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:16px; }
.xr-m { width:100%; max-width:620px; background:var(--surface); color:var(--ink); border-radius:18px; overflow:hidden; box-shadow:0 28px 80px rgba(0,0,0,.25); display:flex; flex-direction:column; max-height:94vh; }
.xr-m-hd { position:relative; padding:18px 22px 12px; border-bottom:1px solid var(--line); }
.xr-m-hd h3 { margin:0; font-size:17px; font-weight:800; }
.xr-m-hd p { margin:3px 0 0; font-size:12.5px; color:var(--mut); padding-right:30px; }
.xr-x { position:absolute; top:14px; right:16px; width:32px; height:32px; border-radius:9px; border:none; background:var(--hov); color:var(--mut); font-size:20px; cursor:pointer; line-height:1; }
.xr-m-b { padding:16px 22px; display:flex; flex-direction:column; gap:14px; overflow:auto; }
.xr-m-ft { display:flex; gap:8px; align-items:center; padding:14px 22px; border-top:1px solid var(--line); background:var(--hov); }
.xr-tg { display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; }
.xr-tg-b { display:flex; flex-direction:column; align-items:center; gap:5px; padding:9px 6px; border-radius:12px; border:1.5px solid var(--line); background:var(--surface); color:var(--ink2); font-size:11.5px; font-weight:700; cursor:pointer; text-align:center; line-height:1.2; }
.xr-tg-b:hover { border-color:var(--acc); }
.xr-tg-b.on { border-color:var(--acc); background:var(--acc-soft); color:var(--acc); }
.xr-tg-b.on .xr-ik { background:var(--acc); color:#fff; }
.xr-tg-b--yangi { border-style:dashed; color:var(--mut); }
.xr-tg-yangi { grid-column:span 2; display:flex; gap:6px; align-items:center; }
.xr-tg-yangi input { flex:1; min-width:0; height:32px; padding:0 9px; border:1.5px solid var(--acc); border-radius:8px; background:var(--surface); color:var(--ink); font-size:12.5px; outline:none; }
.xr-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.xr-f { display:flex; flex-direction:column; gap:5px; }
.xr-f.full { grid-column:1 / -1; }
.xr-f > span { font-size:12px; font-weight:600; color:var(--ink2); }
.xr-f input { padding:9px 11px; border:1.5px solid var(--line); border-radius:9px; font-size:13.5px; background:var(--surface); color:var(--ink); outline:none; }
.xr-f input:focus { border-color:var(--acc); }
.xr-summa-inp { font-size:22px !important; font-weight:800; padding:10px 12px !important; font-variant-numeric:tabular-nums; }
.xr-tezsum { display:flex; gap:6px; flex-wrap:wrap; }
.xr-tezsum button { height:28px; padding:0 10px; border-radius:14px; border:1.5px solid var(--line); background:var(--surface); color:var(--ink2); font-size:12px; font-weight:700; cursor:pointer; }
.xr-tezsum button:hover { border-color:var(--acc); color:var(--acc); }
.xr-tezsum button.tozala { color:var(--sub); border-style:dashed; }
.xr-seg { display:flex; gap:2px; padding:3px; background:var(--seg-track); border:1px solid var(--seg-brd); border-radius:10px; height:40px; }
.xr-seg button { flex:1; border:none; border-radius:7px; background:transparent; color:var(--seg-ink); font-size:12.5px; font-weight:600; cursor:pointer; transition:color .15s; }
.xr-seg button:hover:not(.on) { color:var(--seg-ink-h); }
.xr-seg button.on { background:var(--seg-on-bg); color:var(--seg-on-ink); box-shadow:var(--seg-on-sh); }
.xr-rasm { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.xr-rasm img { width:56px; height:56px; object-fit:cover; border-radius:9px; border:1px solid var(--line); }
.xr-prev { padding:10px 14px; border-radius:11px; font-size:12.5px; background:rgba(239,68,68,.07); color:var(--ink2); line-height:1.5; }
.xr-prev.warn { background:rgba(245,158,11,.12); }
.xr-warn { color:#b45309; font-weight:700; margin-top:3px; }
.xr-err { margin:0; padding:9px 12px; border-radius:9px; background:rgba(239,68,68,.1); color:#b91c1c; font-size:12.5px; font-weight:600; }
.xr-tr { display:grid; grid-template-columns:34px 1fr auto auto; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid var(--line2, var(--line)); }
.xr-tr input { height:34px; padding:0 9px; border:1.5px solid var(--line); border-radius:8px; background:var(--surface); color:var(--ink); font-size:13px; outline:none; min-width:0; }
.xr-tr input:focus { border-color:var(--acc); }
.xr-tr small { font-size:11px; color:var(--sub); white-space:nowrap; }
.xr-tr.nofaol input, .xr-tr.nofaol .xr-ik { opacity:.45; }
.xr-tr > button.xr-ik { cursor:pointer; }
.xr-tr--yangi { grid-template-columns:34px 1fr auto; border-bottom:none; }
.xr-ikonlar { grid-column:1 / -1; display:grid; grid-template-columns:repeat(8, 1fr); gap:5px; padding:6px 0 4px; }
.xr-ikonlar button { height:34px; border-radius:9px; border:1.5px solid var(--line); background:var(--surface); color:var(--ink2); cursor:pointer; display:flex; align-items:center; justify-content:center; }
.xr-ikonlar button :deep(svg) { width:17px; height:17px; }
.xr-ikonlar button.on { border-color:var(--acc); background:var(--acc-soft); color:var(--acc); }

@media (max-width: 1150px) { .xr-kpi { grid-template-columns:repeat(2, 1fr); } .xr-body { grid-template-columns:1fr; } }
@media (max-width: 720px) {
  .xr-row { grid-template-columns:34px minmax(0, 1fr) auto; }
  .xr-vaqt, .xr-meta, .xr-chek, .xr-amal { display:none; }
  .xr-tg { grid-template-columns:repeat(3, 1fr); } .xr-grid { grid-template-columns:1fr; } .xr-srch { width:100%; }
}
.shell.dark .xr-prev { background:rgba(239,68,68,.1); } .shell.dark .xr-prev.warn { background:rgba(245,158,11,.14); }
.shell.dark .xr-warn { color:#fbbf24; } .shell.dark .xr-err { color:#fca5a5; }
</style>
