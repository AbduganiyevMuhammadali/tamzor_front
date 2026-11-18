<script setup lang="ts">
/* ISHLAB CHIQARISH PARTIYASI — bitta sahifada butun jarayon:
     1) Xom ashyo — nimadan, qancha (Xom ashyo omboridagi mavjud qoldiq va o'rtacha tannarx ko'rinadi)
     2) Xarajatlar — ish haqi, elektr, qadoq… (kassadan to'langani kassaga chiqim bo'ladi)
     3) Natija — haqiqatda chiqqan sof mahsulot (+ qo'shimcha mahsulot), sotuv narxi
   O'ng panelda tannarx jonli hisoblanadi: (X + E − Q) ÷ chiqqan mahsulot.
   Holatlar: qoralama → [Boshlash] jarayonda → [Yakunlash] skladda; bekor qilish va takrorlash.
   Omborlar tovar turi bo'yicha: xom ashyo "Xom ashyo ombori"dan chiqadi, tayyor savdo mahsuloti asosiy skladga kiradi. */
import { ref, reactive, computed, watch, onMounted } from 'vue'
import NumberInput from '@/components/NumberInput.vue'
import { useRoute, useRouter } from 'vue-router'
// @ts-ignore
import { ishlabApi } from '@/api/api'
// @ts-ignore
import { useToast } from '@/composables/useToast'
import TovarTanlash, { type Tovar } from './TovarTanlash.vue'
import { tannarxHisobla, HOLAT, BOSQICHLAR, bosqichIndex, yax } from './hisob'
import '../hisobot/kit/hisobot.css'

interface Qator { tovar_id: number | null; miqdor: number | string; narx: number | string; chakana_narx: number | string; optom_narx: number | string; reja_miqdor?: number }
interface Xarajat { nomi: string; summa: number | string; kassadan: boolean; tolov_usul: 'naqt' | 'karta' | 'bank'; kassa_id?: number | null }

const route = useRoute()
const router = useRouter()
const toast = useToast()

interface Tartibsiz { tovar_id: number; nomi: string; olchov: string; turi: string; dona: number; dan_nomi: string; ga_nomi: string }
const sp = ref<{ tovarlar: Tovar[]; xarajat_turlari: string[]; ombor: string; xom_ombor: string; tartibsiz: Tartibsiz[] } | null>(null)
const doc = ref<any>(null)
const yuklanmoqda = ref(true)
const band = ref(false)
const oyna = ref<'yakun' | 'bekor' | null>(null)
const bekorSabab = ref('')
const izohOchiq = ref(false)

const bosh = (): Qator => ({ tovar_id: null, miqdor: '', narx: '', chakana_narx: '', optom_narx: '' })
const form = reactive({
  izoh: '', taqsimlash: 'qiymat' as 'qiymat' | 'miqdor',
  xom: [bosh()] as Qator[], mah: [bosh()] as Qator[], qsh: [] as Qator[], xarajat: [] as Xarajat[],
})

const yangi = computed(() => route.params.id === 'yangi')
const holat = computed<string>(() => (yangi.value ? 'qoralama' : doc.value?.holat || 'qoralama'))
const xomTahrir = computed(() => holat.value === 'qoralama')
const chiqishTahrir = computed(() => ['qoralama', 'jarayonda'].includes(holat.value))
const tovar = (id: number | null) => (id ? sp.value?.tovarlar.find(t => t.id === id) : undefined)
const n = (v: unknown) => parseFloat(String(v ?? '')) || 0
const fmt = (v: unknown, d = 0) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: d }).format(Number(v) || 0)
const mq = (v: unknown) => fmt(v, 3)
const birlik = (id: number | null) => tovar(id)?.olchov || 'kg'
/* Qator ombori: harakat bo'lgan hujjatda — o'sha paytda yozilgani, aks holda tovar turi bo'yicha */
const qatorOmbori = (tur: string, id: number | null) =>
  (!id ? '' : doc.value?.qatorlar?.find((x: any) => x.tur === tur && x.tovar_id === id)?.ombor_nomi || tovar(id)?.ombor || '')
const xomRoyxatBosh = computed(() => !!sp.value && !sp.value.tovarlar.some(t => t.turi === 'xom_ashyo'))
const tartibsiz = computed(() => sp.value?.tartibsiz || [])

/* Xom ashyo tannarxi: qoralamada — ombordagi o'rtacha (yoki qo'lda kiritilgan, agar noma'lum), keyin — muzlatilgan */
const xomNarx = (q: Qator) => (xomTahrir.value ? (tovar(q.tovar_id)?.tannarx || n(q.narx)) : n(q.narx))

const H = computed(() => tannarxHisobla([
  ...form.xom.filter(q => q.tovar_id).map(q => ({ tur: 'xom_ashyo' as const, miqdor: q.miqdor, narx: xomNarx(q), olchov: birlik(q.tovar_id) })),
  ...form.mah.filter(q => q.tovar_id).map(q => ({ tur: 'mahsulot' as const, miqdor: q.miqdor, chakana_narx: q.chakana_narx, olchov: birlik(q.tovar_id) })),
  ...form.qsh.filter(q => q.tovar_id).map(q => ({ tur: 'qoshimcha' as const, miqdor: q.miqdor, narx: q.narx, olchov: birlik(q.tovar_id) })),
], form.xarajat, form.taqsimlash))
/* H.mahsulotlar[].i — yuqoridagi massivdagi o'rni; form.mah dagi indeksga moslash */
const mahHisob = computed(() => {
  const xomSoni = form.xom.filter(q => q.tovar_id).length
  const tanlangan = form.mah.map((q, i) => ({ q, i })).filter(x => x.q.tovar_id)
  const res: Record<number, { narx: number; summa: number; ulush: number }> = {}
  H.value.mahsulotlar.forEach(m => { const t = tanlangan[m.i - xomSoni]; if (t) res[t.i] = m })
  return res
})
const birlikBir = computed(() => H.value.birlikBir)
const asosiyBirlik = computed(() => birlik(form.mah.find(q => q.tovar_id)?.tovar_id ?? form.xom.find(q => q.tovar_id)?.tovar_id ?? null))
const xomOrtacha = computed(() => (H.value.xomMiqdor > 0 ? H.value.X / H.value.xomMiqdor : 0))
const yoqotishQiymat = computed(() => (H.value.yoqotish && H.value.yoqotish > 0 ? H.value.yoqotish * xomOrtacha.value : 0))
const yagonaNarx = computed(() => (form.mah.filter(q => q.tovar_id).length === 1 ? Object.values(mahHisob.value)[0]?.narx || 0 : 0))

/* Ombor tekshiruvi (faqat qoralamada — keyin xom ashyo allaqachon chiqqan) */
const yetmaydi = computed(() => (xomTahrir.value ? form.xom.filter(q => q.tovar_id && n(q.miqdor) > (tovar(q.tovar_id)?.qoldiq ?? 0) + 0.0005) : []))
const narxsizXom = computed(() => (xomTahrir.value ? form.xom.filter(q => q.tovar_id && !tovar(q.tovar_id)?.tannarx && !(n(q.narx) > 0)) : []))
const boshlashXato = computed(() => {
  if (!form.xom.some(q => q.tovar_id && n(q.miqdor) > 0)) return 'Xom ashyo va miqdorini kiriting'
  if (!form.mah.some(q => q.tovar_id)) return 'Qaysi mahsulot chiqishini tanlang'
  if (yetmaydi.value.length) return `Yetarli emas: ${yetmaydi.value.map(q => `${tovar(q.tovar_id)?.nomi} (${tovar(q.tovar_id)?.ombor})`).join(', ')}`
  if (narxsizXom.value.length) return `Tannarxi noma'lum: ${narxsizXom.value.map(q => tovar(q.tovar_id)?.nomi).join(', ')} — narxini kiriting`
  return null
})
const yakunXato = computed(() => boshlashXato.value && xomTahrir.value ? boshlashXato.value
  : form.mah.some(q => q.tovar_id && !(n(q.miqdor) > 0)) ? 'Har bir mahsulot uchun chiqqan miqdorni kiriting' : H.value.xato)
const kassaga = computed(() => form.xarajat.filter(x => x.kassadan && !x.kassa_id && n(x.summa) > 0).reduce((s, x) => s + n(x.summa), 0))

const tarix = computed(() => doc.value?.tarix || null)
const tavsiyaMiqdor = computed(() => {
  const f = tarix.value?.ortacha_chiqish
  if (!f || !birlikBir.value || form.mah.filter(q => q.tovar_id).length !== 1) return null
  return yax((H.value.xomMiqdor * f) / 100, 1)
})

const band_ = (r: 'xom' | 'mah' | 'qsh', i: number) => form[r].filter((q, k) => k !== i && q.tovar_id).map(q => q.tovar_id as number)
function tovarTanlandi(r: 'xom' | 'mah' | 'qsh', i: number, t: Tovar) {
  const q = form[r][i]
  if (r !== 'xom') {
    if (!n(q.chakana_narx) && t.chakana_narx) q.chakana_narx = t.chakana_narx
    if (!n(q.optom_narx) && t.optom_narx) q.optom_narx = t.optom_narx
    if (r === 'qsh' && !n(q.narx)) q.narx = t.tannarx || ''
  }
}
const ustama = (q: Qator, i: number) => {
  const tn = mahHisob.value[i]?.narx || 0
  return tn > 0 && n(q.chakana_narx) > 0 ? ((n(q.chakana_narx) - tn) / tn) * 100 : null
}

function xarajatQosh(nomi = '') {
  if (nomi && form.xarajat.some(x => x.nomi === nomi)) return
  form.xarajat.push({ nomi, summa: '', kassadan: true, tolov_usul: 'naqt' })
}

/* Sahifa holatini hujjatdan to'ldirish */
function toldir(d: any) {
  doc.value = d
  form.izoh = d.izoh || ''
  form.taqsimlash = d.taqsimlash || 'qiymat'
  const q = (tur: string) => d.qatorlar.filter((x: any) => x.tur === tur).map((x: any) => ({
    tovar_id: x.tovar_id, miqdor: n(x.miqdor) || '', narx: n(x.narx) || '', chakana_narx: n(x.chakana_narx) || '', optom_narx: n(x.optom_narx) || '', reja_miqdor: n(x.reja_miqdor),
  }))
  form.xom = q('xom_ashyo'); form.mah = q('mahsulot'); form.qsh = q('qoshimcha')
  if (!form.xom.length && d.holat === 'qoralama') form.xom = [bosh()]
  if (!form.mah.length && d.holat !== 'yakunlandi') form.mah = [bosh()]
  form.xarajat = (d.xarajatlar || []).map((x: any) => ({ nomi: x.nomi, summa: n(x.summa), kassadan: !!x.kassadan, tolov_usul: x.tolov_usul, kassa_id: x.kassa_id }))
}
function payload() {
  const q = (tur: string, r: Qator[]) => r.filter(x => x.tovar_id).map(x => ({
    tur, tovar_id: x.tovar_id, miqdor: n(x.miqdor), narx: n(x.narx), chakana_narx: n(x.chakana_narx), optom_narx: n(x.optom_narx),
    ...(tur === 'mahsulot' && holat.value === 'jarayonda' && x.reja_miqdor !== undefined ? { reja_miqdor: x.reja_miqdor } : {}),
  }))
  return {
    izoh: form.izoh, taqsimlash: form.taqsimlash,
    qatorlar: [...q('xom_ashyo', form.xom), ...q('mahsulot', form.mah), ...q('qoshimcha', form.qsh)],
    xarajatlar: form.xarajat.filter(x => x.nomi && n(x.summa) > 0).map(x => ({ ...x, summa: n(x.summa) })),
  }
}

async function yukla(jim = false) {
  if (!jim) yuklanmoqda.value = true
  try {
    const [s, d] = await Promise.all([ishlabApi.spravochnik(), yangi.value ? null : ishlabApi.getById(route.params.id)])
    sp.value = s
    if (d) toldir(d)
    else { doc.value = null; Object.assign(form, { izoh: '', taqsimlash: 'qiymat', xom: [bosh()], mah: [bosh()], qsh: [], xarajat: [] }) }
  } catch (e: any) { toast.error('Yuklab bo\'lmadi', e.message) }
  finally { yuklanmoqda.value = false }
}
onMounted(yukla)
watch(() => route.params.id, (v, o) => { if (v && v !== o) yukla(!!o && o !== 'yangi' ? false : true) })

/* Amaldan keyin hujjat va ombor qoldig'i serverdan qayta o'qiladi (yangi hujjat — o'z manziliga o'tadi) */
async function amal(nom: string, fn: () => Promise<any>, ok: string) {
  band.value = true
  try {
    const d = await fn()
    oyna.value = null
    toast.success(ok)
    if (d?.id && String(d.id) !== String(route.params.id)) await router.replace(`/ishlab/${d.id}`)
    else await yukla(true)
  } catch (e: any) { toast.error(nom, e.message) }
  finally { band.value = false }
}
const saqla = () => amal('Saqlanmadi', () => (yangi.value ? ishlabApi.create(payload()) : ishlabApi.update(doc.value.id, payload())), 'Saqlandi')
const boshla = () => amal('Boshlab bo\'lmadi', () => (yangi.value ? ishlabApi.create({ ...payload(), boshlash: true }) : ishlabApi.boshla(doc.value.id, payload())),
  "Ishlab chiqarish boshlandi — xom ashyo Xom ashyo omboridan chiqdi")
const yakunla = () => amal('Yakunlab bo\'lmadi', () => (yangi.value ? ishlabApi.create({ ...payload(), yakunlash: true }) : ishlabApi.yakunla(doc.value.id, payload())),
  'Yakunlandi — tayyor mahsulot tannarxi bilan skladga kirdi')
/* Noto'g'ri omborda turgan qoldiqni turi omboriga o'tkazish (masalan asosiy skladdagi xom ashyo) */
async function tartibla() {
  band.value = true
  try {
    const r = await ishlabApi.tartibla()
    toast.success("Omborlar tartiblandi", r.kochdi.map((x: any) => `${x.nomi}: ${mq(x.dona)} ${x.olchov} → ${x.ga_nomi}`).join('; ') || "Ko'chiradigan qoldiq yo'q")
    await yukla(true)
  } catch (e: any) { toast.error("O'tkazib bo'lmadi", e.message) } finally { band.value = false }
}
const bekor = () => amal('Bekor qilib bo\'lmadi', () => ishlabApi.bekor(doc.value.id, bekorSabab.value), 'Bekor qilindi — tovar harakati qaytarildi')
async function nusxa() {
  band.value = true
  try { const d = await ishlabApi.nusxa(doc.value.id); toast.success('Nusxa olindi', `${d.raqam} — miqdorlarni tekshirib, boshlang`); await router.push(`/ishlab/${d.id}`) }
  catch (e: any) { toast.error('Nusxa olinmadi', e.message) } finally { band.value = false }
}

const vaqt = (s: string | null) => (s ? new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '')
const IKON = {
  orqa: '<path d="m15 18-6-6 6-6"/>',
  xom: '<path d="M4 20h16M6 20V9l6-5 6 5v11"/><path d="M10 20v-6h4v6"/>',
  xarajat: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  mahsulot: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  qosh: '<path d="M12 5v14M5 12h14"/>',
  ochir: '<path d="M18 6 6 18M6 6l12 12"/>',
  hisob: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2"/>',
  ogoh: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  izoh: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>',
}
</script>

<template>
  <div class="ic">
    <!-- Sarlavha -->
    <div class="ic-hd">
      <RouterLink to="/ishlab" class="ic-orqa" title="Partiyalar"><svg viewBox="0 0 24 24" v-html="IKON.orqa" /></RouterLink>
      <div class="ic-hd-t">
        <h1>{{ yangi ? 'Yangi partiya' : doc?.raqam || '…' }}
          <span v-if="!yangi && doc" class="hs-belgi" :class="HOLAT[holat]?.cls">{{ HOLAT[holat]?.nom }}</span></h1>
        <p>{{ yangi ? "Xom ashyodan sof mahsulot: tannarx avtomatik hisoblanadi" : HOLAT[holat]?.izoh }}
          <template v-if="doc?.user_nomi"> · {{ doc.user_nomi }}</template></p>
      </div>
      <div class="ic-hd-a">
        <template v-if="holat === 'qoralama'">
          <button class="hs-btn hs-btn--s" :disabled="band" @click="saqla">Qoralama saqlash</button>
          <button class="hs-btn hs-btn--s" :disabled="band || !!boshlashXato" :title="boshlashXato || 'Xom ashyo Xom ashyo omboridan chiqadi'" @click="boshla">Boshlash</button>
          <button class="hs-btn hs-btn--p" :disabled="band || !!yakunXato" :title="yakunXato || ''" @click="oyna = 'yakun'">Bir yo'la yakunlash</button>
        </template>
        <template v-else-if="holat === 'jarayonda'">
          <button class="hs-btn hs-btn--s" :disabled="band" @click="saqla">Saqlash</button>
          <button class="hs-btn hs-btn--s ic-xavf" :disabled="band" @click="oyna = 'bekor'">Bekor qilish</button>
          <button class="hs-btn hs-btn--p" :disabled="band || !!yakunXato" :title="yakunXato || ''" @click="oyna = 'yakun'">Yakunlash — skladga kirim</button>
        </template>
        <template v-else-if="doc">
          <button v-if="holat === 'yakunlandi'" class="hs-btn hs-btn--s ic-xavf" :disabled="band" @click="oyna = 'bekor'">Bekor qilish</button>
          <button class="hs-btn hs-btn--p" :disabled="band" @click="nusxa">Takrorlash</button>
        </template>
      </div>
    </div>

    <!-- Jarayon bosqichlari -->
    <div class="ic-yol" :class="{ bekor: holat === 'bekor' }">
      <div v-for="(b, i) in BOSQICHLAR" :key="b.k" class="ic-yol-q"
        :class="{ ok: holat !== 'bekor' && bosqichIndex(holat) > i || holat === 'yakunlandi', on: holat !== 'bekor' && holat !== 'yakunlandi' && bosqichIndex(holat) === i }">
        <span class="ic-yol-i"><svg viewBox="0 0 24 24" v-html="b.ikon" /></span>
        <span class="ic-yol-t"><b>{{ i + 1 }}. {{ b.nom }}</b><small>{{ b.izoh }}</small>
          <em v-if="i === 1 && doc?.boshlangan_vaqt">{{ vaqt(doc.boshlangan_vaqt) }}</em>
          <em v-if="i === 2 && doc?.yakunlangan_vaqt">{{ vaqt(doc.yakunlangan_vaqt) }}</em></span>
      </div>
    </div>
    <div v-if="tartibsiz.length && holat === 'qoralama'" class="ic-not ic-not--warn ic-tartib">
      <svg viewBox="0 0 24 24" v-html="IKON.ogoh" />
      <span>Noto'g'ri omborda turibdi: <b v-for="(x, i) in tartibsiz" :key="x.tovar_id + x.dan_nomi">{{ i ? ', ' : '' }}{{ x.nomi }} {{ mq(x.dona) }} {{ x.olchov }} ({{ x.dan_nomi }})</b>.
        Xom ashyo ishlab chiqarishga faqat Xom ashyo omboridan beriladi.</span>
      <button class="hs-btn hs-btn--s" :disabled="band" @click="tartibla">Turi omboriga o'tkazish</button>
    </div>
    <div v-if="holat === 'bekor'" class="ic-not ic-not--err"><svg viewBox="0 0 24 24" v-html="IKON.ogoh" />Bekor qilingan{{ doc?.bekor_sababi ? `: ${doc.bekor_sababi}` : '' }}. Tovar harakati qaytarilgan.</div>

    <div v-if="yuklanmoqda" class="ic-grid"><div class="hs-skelet" style="height:420px" /><div class="hs-skelet" style="height:320px" /></div>
    <div v-else class="ic-grid">
      <div class="ic-chap">
        <!-- 1. Xom ashyo -->
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.xom" /></span>
            <div class="hs-kt"><h2>1. Xom ashyo — nimadan</h2><p>{{ xomTahrir ? "Xom ashyo omboridan beriladi; tannarx — so'nggi kirimlarning o'rtacha narxi" : `Xom ashyo omboridan chiqdi: ${vaqt(doc?.boshlangan_vaqt)}` }}</p></div>
          </div>
          <div class="hs-karta-b">
            <div class="ic-tab ic-tab--xom">
              <div class="ic-th">Tovar</div><div class="ic-th r">Mavjud</div><div class="ic-th r">Miqdor</div><div class="ic-th r">Tannarx</div><div class="ic-th r">Summa</div><div />
              <template v-for="(q, i) in form.xom" :key="'x' + i">
                <div class="ic-nom">
                  <TovarTanlash v-if="xomTahrir" v-model="q.tovar_id" :tovarlar="sp?.tovarlar || []" :band="band_('xom', i)" rejim="xom" @tanla="t => tovarTanlandi('xom', i, t)" />
                  <div v-else class="ic-ro"><b>{{ tovar(q.tovar_id)?.nomi || doc?.qatorlar.find((x: any) => x.tovar_id === q.tovar_id)?.tovar_nomi }}</b></div>
                  <small v-if="q.tovar_id && qatorOmbori('xom_ashyo', q.tovar_id)" class="ic-om" :class="{ savdo: tovar(q.tovar_id)?.turi !== 'xom_ashyo' }">{{ qatorOmbori('xom_ashyo', q.tovar_id) }}dan</small>
                </div>
                <div class="ic-td r" :class="{ yoq: xomTahrir && q.tovar_id && n(q.miqdor) > (tovar(q.tovar_id)?.qoldiq ?? 0) }">
                  {{ q.tovar_id ? (xomTahrir ? `${mq(tovar(q.tovar_id)?.qoldiq)} ${birlik(q.tovar_id)}` : '—') : '' }}
                </div>
                <div class="ic-td r"><input v-if="xomTahrir" v-model="q.miqdor" class="ic-inp" inputmode="decimal" placeholder="0" /><b v-else>{{ mq(q.miqdor) }}</b><span class="ic-u">{{ birlik(q.tovar_id) }}</span></div>
                <div class="ic-td r">
                  <template v-if="xomTahrir && q.tovar_id && !tovar(q.tovar_id)?.tannarx"><NumberInput v-model="q.narx" :bosh="''" css-class="ic-inp ic-inp--ogoh" placeholder="narx?" title="Tannarxi noma'lum — narxini kiriting" /></template>
                  <template v-else>{{ q.tovar_id ? fmt(xomNarx(q), 2) : '' }}</template>
                </div>
                <div class="ic-td r"><b>{{ q.tovar_id ? fmt(n(q.miqdor) * xomNarx(q)) : '' }}</b></div>
                <button v-if="xomTahrir" class="ic-x" title="O'chirish" @click="form.xom.splice(i, 1)"><svg viewBox="0 0 24 24" v-html="IKON.ochir" /></button><div v-else />
              </template>
            </div>
            <button v-if="xomTahrir" class="ic-add" @click="form.xom.push(bosh())"><svg viewBox="0 0 24 24" v-html="IKON.qosh" />Xom ashyo qo'shish</button>
            <p v-if="xomTahrir && xomRoyxatBosh" class="ic-hint ic-hint--brand">Xom ashyo ro'yxati bo'sh. <RouterLink to="/sozlamalar">Tovarlar sozlamasida</RouterLink> tovar turini "Xom ashyo" qiling yoki yangisini qo'shing, keyin kirim (prixod) qiling: u avtomatik Xom ashyo omboriga tushadi.</p>
            <div class="ic-jami"><span>Jami xom ashyo</span><b>{{ birlikBir ? `${mq(H.xomMiqdor)} ${asosiyBirlik} · ` : '' }}{{ fmt(H.X) }} so'm</b></div>
          </div>
        </section>

        <!-- 2. Xarajatlar -->
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.xarajat" /></span>
            <div class="hs-kt"><h2>2. Xarajatlar — yana nima sarflandi</h2><p>Ish haqi, elektr, qadoq… — mahsulot tannarxiga qo'shiladi</p></div>
          </div>
          <div class="hs-karta-b">
            <div v-if="chiqishTahrir && sp?.xarajat_turlari" class="ic-chips">
              <button v-for="t in sp.xarajat_turlari" :key="t" class="hs-chip" :disabled="form.xarajat.some(x => x.nomi === t)" @click="xarajatQosh(t)">+ {{ t }}</button>
            </div>
            <div v-if="form.xarajat.length" class="ic-tab ic-tab--xar">
              <div class="ic-th">Nomi</div><div class="ic-th r">Summa, so'm</div><div class="ic-th">Kassadan to'landi</div><div />
              <template v-for="(x, i) in form.xarajat" :key="'e' + i">
                <input v-if="chiqishTahrir && !x.kassa_id" v-model="x.nomi" class="ic-inp ic-inp--l" placeholder="Masalan: Ish haqi" />
                <div v-else class="ic-ro"><b>{{ x.nomi }}</b></div>
                <div class="ic-td r"><NumberInput v-if="chiqishTahrir && !x.kassa_id" v-model="x.summa" :bosh="''" css-class="ic-inp" placeholder="0" /><b v-else>{{ fmt(x.summa) }}</b></div>
                <div class="ic-td ic-kassa">
                  <template v-if="x.kassa_id"><span class="hs-belgi hs-belgi--ok">kassaga yozildi</span></template>
                  <template v-else-if="chiqishTahrir">
                    <label class="ic-chk"><input v-model="x.kassadan" type="checkbox" /> ha</label>
                    <select v-if="x.kassadan" v-model="x.tolov_usul" class="hs-sel ic-sel"><option value="naqt">naqd</option><option value="karta">karta</option><option value="bank">bank</option></select>
                  </template>
                  <span v-else class="ic-mut">{{ x.kassadan ? 'ha' : "yo'q" }}</span>
                </div>
                <button v-if="chiqishTahrir && !x.kassa_id" class="ic-x" @click="form.xarajat.splice(i, 1)"><svg viewBox="0 0 24 24" v-html="IKON.ochir" /></button><div v-else />
              </template>
            </div>
            <p v-else class="ic-bos">Xarajat yo'q — tannarx faqat xom ashyodan iborat bo'ladi</p>
            <button v-if="chiqishTahrir" class="ic-add" @click="xarajatQosh()"><svg viewBox="0 0 24 24" v-html="IKON.qosh" />Xarajat qo'shish</button>
            <p v-if="chiqishTahrir && form.xarajat.length" class="ic-hint">"Kassadan to'landi" belgilansa — yakunlashda kassaga chiqim yoziladi. Bu xarajatni kassaga alohida (masalan "Ish haqi") qayta yozmang: u mahsulot tannarxida, foyda-zararda ikki marta chiqmaydi.</p>
          </div>
        </section>

        <!-- 3. Natija -->
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.mahsulot" /></span>
            <div class="hs-kt"><h2>3. Natija — nima chiqdi</h2>
              <p>{{ holat === 'qoralama' ? 'Kutilgan miqdor — yakunlashda haqiqatda chiqqanini kiritasiz; tayyor mahsulot asosiy skladga kiradi' : holat === 'jarayonda' ? 'Haqiqatda chiqqan sof mahsulotni kiriting — u asosiy skladga kiradi' : 'Skladga kirgan mahsulot' }}</p></div>
          </div>
          <div class="hs-karta-b">
            <div class="ic-sar">Sof mahsulot</div>
            <div class="ic-tab ic-tab--mah">
              <div class="ic-th">Tovar</div><div class="ic-th r">{{ holat === 'qoralama' ? 'Kutilgan' : 'Chiqdi' }}</div><div class="ic-th r">Tannarx</div><div class="ic-th r">Chakana</div><div class="ic-th r">Optom</div><div class="ic-th r">Ustama</div><div />
              <template v-for="(q, i) in form.mah" :key="'m' + i">
                <div class="ic-nom">
                  <TovarTanlash v-if="chiqishTahrir" v-model="q.tovar_id" :tovarlar="sp?.tovarlar || []" :band="band_('mah', i)" rejim="mahsulot" placeholder="Qaysi mahsulot…" @tanla="t => tovarTanlandi('mah', i, t)" />
                  <div v-else class="ic-ro"><b>{{ doc?.qatorlar.find((x: any) => x.tur === 'mahsulot' && x.tovar_id === q.tovar_id)?.tovar_nomi }}</b></div>
                  <small v-if="q.tovar_id && qatorOmbori('mahsulot', q.tovar_id)" class="ic-om">{{ qatorOmbori('mahsulot', q.tovar_id) }}ga</small>
                </div>
                <div class="ic-td r">
                  <input v-if="chiqishTahrir" v-model="q.miqdor" class="ic-inp" :class="{ 'ic-inp--asosiy': holat === 'jarayonda' }" inputmode="decimal" placeholder="0" />
                  <b v-else>{{ mq(q.miqdor) }}</b><span class="ic-u">{{ birlik(q.tovar_id) }}</span>
                </div>
                <div class="ic-td r"><b class="ic-tn">{{ mahHisob[i]?.narx ? fmt(mahHisob[i].narx, 2) : '—' }}</b><small v-if="form.mah.filter(x => x.tovar_id).length > 1 && mahHisob[i]">{{ (mahHisob[i].ulush * 100).toFixed(1) }}%</small></div>
                <div class="ic-td r"><NumberInput v-if="chiqishTahrir" v-model="q.chakana_narx" :bosh="''" css-class="ic-inp" placeholder="—" /><template v-else>{{ n(q.chakana_narx) ? fmt(q.chakana_narx) : '—' }}</template></div>
                <div class="ic-td r"><NumberInput v-if="chiqishTahrir" v-model="q.optom_narx" :bosh="''" css-class="ic-inp" placeholder="—" /><template v-else>{{ n(q.optom_narx) ? fmt(q.optom_narx) : '—' }}</template></div>
                <div class="ic-td r"><span v-if="ustama(q, i) !== null" :class="(ustama(q, i) as number) < 0 ? 'ic-zarar' : 'ic-foyda'">{{ (ustama(q, i) as number) > 0 ? '+' : '' }}{{ (ustama(q, i) as number).toFixed(0) }}%</span></div>
                <button v-if="chiqishTahrir && form.mah.length > 1" class="ic-x" @click="form.mah.splice(i, 1)"><svg viewBox="0 0 24 24" v-html="IKON.ochir" /></button><div v-else />
              </template>
            </div>
            <div class="ic-qatorlar">
              <button v-if="chiqishTahrir" class="ic-add" @click="form.mah.push(bosh())"><svg viewBox="0 0 24 24" v-html="IKON.qosh" />Yana nav / mahsulot</button>
              <button v-if="chiqishTahrir && tavsiyaMiqdor && !n(form.mah.find(q => q.tovar_id)?.miqdor)" class="hs-chip" @click="form.mah.find(q => q.tovar_id)!.miqdor = tavsiyaMiqdor">
                O'rtacha chiqish ({{ tarix.ortacha_chiqish }}%) bo'yicha: {{ mq(tavsiyaMiqdor) }} {{ asosiyBirlik }}</button>
            </div>
            <div v-if="form.mah.filter(q => q.tovar_id).length > 1" class="ic-taq">
              <span>Tannarxni navlarga bo'lish:</span>
              <label><input v-model="form.taqsimlash" type="radio" value="qiymat" :disabled="!chiqishTahrir" /> sotuv qiymati bo'yicha</label>
              <label><input v-model="form.taqsimlash" type="radio" value="miqdor" :disabled="!chiqishTahrir" /> miqdor bo'yicha</label>
              <small v-if="form.taqsimlash === 'qiymat' && H.usul === 'miqdor'">— hamma navga chakana narx kiritilmagani uchun miqdor bo'yicha bo'linmoqda</small>
            </div>
            <p v-if="chiqishTahrir && form.mah.some(q => q.tovar_id && !n(q.chakana_narx))" class="ic-hint">Chakana narx kiritilmasa, mahsulot agent va Won Sell ilovasidagi sotuv ro'yxatida chiqmaydi.</p>

            <div class="ic-sar">Qo'shimcha mahsulot <small>(kepak, qoldiq — sotiladigan bo'lsa; bahosi tannarxdan ayiriladi)</small></div>
            <div v-if="form.qsh.length" class="ic-tab ic-tab--qsh">
              <div class="ic-th">Tovar</div><div class="ic-th r">Miqdor</div><div class="ic-th r">Baho</div><div class="ic-th r">Chakana</div><div class="ic-th r">Summa</div><div />
              <template v-for="(q, i) in form.qsh" :key="'q' + i">
                <div class="ic-nom">
                  <TovarTanlash v-if="chiqishTahrir" v-model="q.tovar_id" :tovarlar="sp?.tovarlar || []" :band="band_('qsh', i)" rejim="mahsulot" @tanla="t => tovarTanlandi('qsh', i, t)" />
                  <div v-else class="ic-ro"><b>{{ doc?.qatorlar.find((x: any) => x.tur === 'qoshimcha' && x.tovar_id === q.tovar_id)?.tovar_nomi }}</b></div>
                  <small v-if="q.tovar_id && qatorOmbori('qoshimcha', q.tovar_id)" class="ic-om">{{ qatorOmbori('qoshimcha', q.tovar_id) }}ga</small>
                </div>
                <div class="ic-td r"><input v-if="chiqishTahrir" v-model="q.miqdor" class="ic-inp" inputmode="decimal" placeholder="0" /><b v-else>{{ mq(q.miqdor) }}</b><span class="ic-u">{{ birlik(q.tovar_id) }}</span></div>
                <div class="ic-td r"><NumberInput v-if="chiqishTahrir" v-model="q.narx" :bosh="''" css-class="ic-inp" placeholder="0" title="Birlik bahosi — omborga shu narxda kiradi" /><template v-else>{{ fmt(q.narx) }}</template></div>
                <div class="ic-td r"><NumberInput v-if="chiqishTahrir" v-model="q.chakana_narx" :bosh="''" css-class="ic-inp" placeholder="—" /><template v-else>{{ n(q.chakana_narx) ? fmt(q.chakana_narx) : '—' }}</template></div>
                <div class="ic-td r"><b>{{ fmt(n(q.miqdor) * n(q.narx)) }}</b></div>
                <button v-if="chiqishTahrir" class="ic-x" @click="form.qsh.splice(i, 1)"><svg viewBox="0 0 24 24" v-html="IKON.ochir" /></button><div v-else />
              </template>
            </div>
            <button v-if="chiqishTahrir" class="ic-add" @click="form.qsh.push(bosh())"><svg viewBox="0 0 24 24" v-html="IKON.qosh" />Qo'shimcha mahsulot</button>

            <div v-if="birlikBir && H.xomMiqdor > 0" class="ic-yoq">
              <div class="ic-yoq-bar"><i :style="{ width: Math.min(100, (H.mahsulotMiqdor / H.xomMiqdor) * 100) + '%' }" /><i class="q" :style="{ width: Math.min(100, (H.qoshimchaMiqdor / H.xomMiqdor) * 100) + '%' }" /></div>
              <div class="ic-yoq-t">
                <span><i class="d m" />Sof mahsulot <b>{{ mq(H.mahsulotMiqdor) }} {{ asosiyBirlik }}</b> · {{ H.chiqishFoiz ?? 0 }}%</span>
                <span v-if="H.qoshimchaMiqdor"><i class="d q" />Qo'shimcha <b>{{ mq(H.qoshimchaMiqdor) }}</b></span>
                <span><i class="d y" />Yo'qotish <b :class="{ 'ic-zarar': (H.yoqotish ?? 0) < 0 }">{{ mq(H.yoqotish) }} {{ asosiyBirlik }}</b>{{ H.xomMiqdor ? ` · ${(((H.yoqotish ?? 0) / H.xomMiqdor) * 100).toFixed(1)}%` : '' }}</span>
                <span v-if="tarix?.ortacha_chiqish" class="ic-mut">oldingi partiyalar o'rtachasi {{ tarix.ortacha_chiqish }}%</span>
              </div>
            </div>
          </div>
        </section>

        <section class="hs-karta">
          <div class="hs-karta-b"><label class="ic-lbl">Izoh</label>
            <textarea v-model="form.izoh" class="ic-ta" :disabled="!chiqishTahrir" rows="2" placeholder="Masalan: tegirmon №2, smena — Akmal" /></div>
        </section>
      </div>

      <!-- O'ng panel: tannarx hisobi -->
      <aside class="ic-ong">
        <section class="hs-karta ic-hisob">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.hisob" /></span>
            <div class="hs-kt"><h2>Tannarx hisobi</h2><p>{{ holat === 'yakunlandi' ? 'Yakuniy — skladga shu narxda kirdi' : 'Jonli — yozganingiz sari yangilanadi' }}</p></div>
          </div>
          <div class="hs-karta-b">
            <div class="ic-h"><span>Xom ashyo</span><b>{{ fmt(H.X) }}</b></div>
            <div class="ic-h"><span>+ Xarajatlar</span><b>{{ fmt(H.E) }}</b></div>
            <div v-if="H.Q" class="ic-h"><span>− Qo'shimcha mahsulot</span><b>{{ fmt(H.Q) }}</b></div>
            <div class="ic-h ic-h--jami"><span>= Partiya tannarxi</span><b>{{ fmt(H.C) }} so'm</b></div>
            <div v-if="H.mahsulotMiqdor > 0" class="ic-h"><span>÷ Sof mahsulot</span><b>{{ birlikBir ? `${mq(H.mahsulotMiqdor)} ${asosiyBirlik}` : mq(H.mahsulotMiqdor) }}</b></div>

            <div v-if="yagonaNarx" class="ic-katta">
              <small>1 {{ asosiyBirlik }} tannarxi</small>
              <b>{{ fmt(yagonaNarx, 2) }}<span> so'm</span></b>
            </div>
            <div v-else-if="Object.keys(mahHisob).length > 1" class="ic-navlar">
              <div v-for="(m, i) in mahHisob" :key="i" class="ic-h"><span>{{ tovar(form.mah[i]?.tovar_id ?? null)?.nomi }}</span><b>{{ fmt(m.narx, 2) }} <small>so'm/{{ birlik(form.mah[i]?.tovar_id ?? null) }}</small></b></div>
            </div>

            <div v-if="yoqotishQiymat > 0 && H.mahsulotMiqdor > 0" class="ic-not ic-not--warn">
              <svg viewBox="0 0 24 24" v-html="IKON.ogoh" />
              Yo'qotish {{ mq(H.yoqotish) }} {{ asosiyBirlik }} — {{ fmt(yoqotishQiymat) }} so'm qiymatdagi xom ashyo. U sof mahsulotga singdi: har {{ asosiyBirlik }} ga +{{ fmt(yoqotishQiymat / H.mahsulotMiqdor, 2) }} so'm.
            </div>
            <template v-if="yagonaNarx && n(form.mah.find(q => q.tovar_id)?.chakana_narx)">
              <div class="ic-h ic-h--foyda"><span>Chakana narxda foyda</span>
                <b :class="n(form.mah.find(q => q.tovar_id)?.chakana_narx) - yagonaNarx < 0 ? 'ic-zarar' : 'ic-foyda'">
                  {{ fmt(n(form.mah.find(q => q.tovar_id)?.chakana_narx) - yagonaNarx, 2) }} so'm/{{ asosiyBirlik }}</b></div>
              <div class="ic-h"><span>Partiya chakana narxda sotilsa</span><b>{{ fmt(n(form.mah.find(q => q.tovar_id)?.chakana_narx) * H.mahsulotMiqdor - H.C) }} so'm</b></div>
            </template>
            <div v-if="tarix?.ortacha_tannarx && yagonaNarx" class="ic-h"><span>Oldingi partiyalar</span><b>{{ fmt(tarix.ortacha_tannarx, 2) }}
              <small :class="yagonaNarx > tarix.ortacha_tannarx ? 'ic-zarar' : 'ic-foyda'">{{ yagonaNarx > tarix.ortacha_tannarx ? '▲' : '▼' }} {{ Math.abs(((yagonaNarx - tarix.ortacha_tannarx) / tarix.ortacha_tannarx) * 100).toFixed(1) }}%</small></b></div>

            <div v-if="chiqishTahrir && (yakunXato || H.xato)" class="ic-not ic-not--n"><svg viewBox="0 0 24 24" v-html="IKON.izoh" />{{ yakunXato || H.xato }}</div>
            <div v-if="kassaga && chiqishTahrir" class="ic-h ic-h--mut"><span>Yakunlashda kassaga chiqim</span><b>{{ fmt(kassaga) }} so'm</b></div>

            <button class="ic-qanday" @click="izohOchiq = !izohOchiq"><svg viewBox="0 0 24 24" v-html="IKON.izoh" />Qanday hisoblanadi?</button>
            <div v-if="izohOchiq" class="ic-izoh">
              <p><b>Partiya tannarxi</b> = xom ashyo qiymati + xarajatlar − qo'shimcha mahsulot bahosi.</p>
              <p><b>Xom ashyo qiymati</b> — sarflangan miqdor × omborning o'rtacha tannarxi (so'nggi 90 kundagi kirimlarning og'irlikli o'rtachasi). "Boshlash" paytida muzlatiladi.</p>
              <p><b>1 birlik tannarxi</b> = partiya tannarxi ÷ haqiqatda chiqqan sof mahsulot. Yo'qotish (chiqindi, bug'lanish) alohida yozilmaydi — narxi sof mahsulotga singadi.</p>
              <p><b>Bir nechta nav</b> bo'lsa, tannarx sotuv qiymati (miqdor × chakana narx) ulushida bo'linadi: qimmat nav ko'proq oladi. Narx bo'lmasa — miqdor bo'yicha.</p>
              <p><b>Misol:</b> 1 000 kg bug'doy × 5 000 = 5 000 000; + 500 000 xarajat = 5 500 000; 900 kg un chiqdi → 6 111,11 so'm/kg.</p>
              <p><b>Omborlar.</b> Xom ashyo savdo tovarlaridan alohida, "Xom ashyo ombori"da turadi va ishlab chiqarishga shu yerdan beriladi. Tayyor mahsulot asosiy skladga shu tannarxda kiradi — keyin u sotilganda foyda shu narxdan hisoblanadi.</p>
            </div>
          </div>
        </section>

        <section v-if="tarix?.partiyalar?.length" class="hs-karta">
          <div class="hs-karta-hd"><div class="hs-kt"><h2>Oldingi partiyalar</h2><p>Shu mahsulot — chiqish foizi va tannarx</p></div></div>
          <div class="hs-karta-b hs-karta-b--0">
            <table class="hs-jadval">
              <tbody>
                <tr v-for="p in tarix.partiyalar.slice(0, 6)" :key="p.id + p.tovar_nomi" class="bos" @click="router.push(`/ishlab/${p.id}`)">
                  <td><b>{{ p.raqam }}</b><div class="m">{{ vaqt(p.sana) }}</div></td>
                  <td class="r">{{ mq(p.miqdor) }} {{ p.olchov }}<div class="m">{{ p.chiqish_foiz != null ? p.chiqish_foiz + '%' : '' }}</div></td>
                  <td class="r"><b>{{ fmt(p.narx, 2) }}</b></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </aside>
    </div>

    <!-- Yakunlash tasdig'i -->
    <div v-if="oyna" class="ic-modal" @click.self="oyna = null">
      <div class="ic-modal-c">
        <template v-if="oyna === 'yakun'">
          <h3>Partiyani yakunlash</h3>
          <p class="ic-mut">Quyidagilar bajariladi — keyin hujjatni o'zgartirib bo'lmaydi (faqat bekor qilish mumkin):</p>
          <ul class="ic-royxat">
            <li v-if="holat === 'qoralama'">Xom ashyo omboridan chiqadi: <b>{{ birlikBir ? `${mq(H.xomMiqdor)} ${asosiyBirlik}` : '' }} · {{ fmt(H.X) }} so'm</b></li>
            <li v-for="(m, i) in mahHisob" :key="i">{{ qatorOmbori('mahsulot', form.mah[i]?.tovar_id ?? null) }}ga kirim: <b>{{ tovar(form.mah[i]?.tovar_id ?? null)?.nomi }} — {{ mq(form.mah[i]?.miqdor) }} {{ birlik(form.mah[i]?.tovar_id ?? null) }}</b>, tannarx <b>{{ fmt(m.narx, 2) }} so'm</b></li>
            <li v-for="(q, i) in form.qsh.filter(x => x.tovar_id && n(x.miqdor) > 0)" :key="'q' + i">{{ qatorOmbori('qoshimcha', q.tovar_id) }}ga kirim: <b>{{ tovar(q.tovar_id)?.nomi }} — {{ mq(q.miqdor) }} {{ birlik(q.tovar_id) }}</b>, baho {{ fmt(q.narx) }}</li>
            <li v-if="kassaga">Kassaga chiqim: <b>{{ fmt(kassaga) }} so'm</b> (ishlab chiqarish xarajati)</li>
            <li v-if="birlikBir && (H.yoqotish ?? 0) > 0">Yo'qotish: {{ mq(H.yoqotish) }} {{ asosiyBirlik }} ({{ (((H.yoqotish ?? 0) / (H.xomMiqdor || 1)) * 100).toFixed(1) }}%)</li>
          </ul>
          <div class="ic-modal-a">
            <button class="hs-btn hs-btn--s" @click="oyna = null">Orqaga</button>
            <button class="hs-btn hs-btn--p" :disabled="band" @click="yakunla">{{ band ? 'Bajarilmoqda…' : 'Yakunlash' }}</button>
          </div>
        </template>
        <template v-else>
          <h3>Partiyani bekor qilish</h3>
          <p class="ic-mut" v-if="holat === 'jarayonda'">Xom ashyo Xom ashyo omboriga qaytadi.</p>
          <p class="ic-mut" v-else>Mahsulot skladdan chiqariladi, xom ashyo Xom ashyo omboriga qaytadi, bu partiya yozgan kassa chiqimlari o'chiriladi. Mahsulot sotilgan bo'lsa — bekor qilib bo'lmaydi.</p>
          <input v-model="bekorSabab" class="hs-inp ic-sabab" placeholder="Sababi (masalan: miqdor xato kiritilgan)" />
          <div class="ic-modal-a">
            <button class="hs-btn hs-btn--s" @click="oyna = null">Orqaga</button>
            <button class="hs-btn hs-btn--p ic-xavf-p" :disabled="band" @click="bekor">Bekor qilish</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ic { padding:24px 28px 40px; display:flex; flex-direction:column; gap:16px; max-width:1360px; }
.ic-hd { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
.ic-orqa { width:36px; height:36px; border-radius:9px; border:1px solid var(--line); background:var(--surface); display:flex; align-items:center; justify-content:center; color:var(--ink2); }
.ic-orqa:hover { border-color:var(--brand-300); color:var(--acc); }
.ic-orqa svg, .ic svg { width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round; }
.ic-hd-t { flex:1; min-width:240px; }
.ic-hd-t h1 { margin:0; font-size:22px; font-weight:700; letter-spacing:-.02em; display:flex; align-items:center; gap:10px; }
.ic-hd-t p { margin:3px 0 0; color:var(--mut); font-size:13px; }
.ic-hd-a { display:flex; gap:8px; flex-wrap:wrap; }
.ic-hd-a .hs-btn:disabled { opacity:.5; cursor:not-allowed; }
.ic-xavf { color:#dc2626; }
.ic-xavf:hover { border-color:#fca5a5 !important; background:rgba(220,38,38,.06) !important; color:#dc2626 !important; }
.ic-xavf-p { background:#dc2626 !important; border-color:#dc2626 !important; }

/* Jarayon bosqichlari */
.ic-yol { display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; }
.ic-yol-q { display:flex; gap:11px; align-items:flex-start; padding:12px 14px; border-radius:12px; border:1px solid var(--line); background:var(--surface); color:var(--mut); }
.ic-yol-i { width:34px; height:34px; flex-shrink:0; border-radius:9px; background:var(--hov); display:flex; align-items:center; justify-content:center; }
.ic-yol-t { display:flex; flex-direction:column; gap:2px; min-width:0; }
.ic-yol-t b { font-size:13px; color:var(--ink2); font-weight:650; }
.ic-yol-t small { font-size:11.5px; line-height:1.4; }
.ic-yol-t em { font-style:normal; font-size:11px; font-weight:600; color:var(--acc); }
.ic-yol-q.on { border-color:var(--brand-300); background:var(--acc-soft); }
.ic-yol-q.on .ic-yol-i { background:var(--brand); color:#fff; }
.ic-yol-q.on b { color:var(--acc-ink); }
.ic-yol-q.ok .ic-yol-i { background:#059669; color:#fff; }
.ic-yol-q.ok b { color:var(--ink); }
.ic-yol.bekor { opacity:.55; }
@media (max-width:900px) { .ic-yol { grid-template-columns:1fr; } }

.ic-grid { display:grid; grid-template-columns:minmax(0, 1fr) 330px; gap:16px; align-items:start; }
@media (max-width:1180px) { .ic-grid { grid-template-columns:minmax(0, 1fr); } }
.ic-chap { display:flex; flex-direction:column; gap:14px; min-width:0; }
.ic-ong { display:flex; flex-direction:column; gap:14px; position:sticky; top:12px; }

/* Jadval-panjara */
.ic-tab { display:grid; gap:7px 10px; align-items:center; }
.ic-tab--xom { grid-template-columns:minmax(150px, 2fr) 100px 124px 96px 110px 28px; }
.ic-tab--xar { grid-template-columns:minmax(150px, 2fr) 130px minmax(150px, 1.2fr) 28px; }
.ic-tab--mah { grid-template-columns:minmax(140px, 2fr) 116px 92px 92px 92px 52px 28px; }
.ic-tab--qsh { grid-template-columns:minmax(140px, 2fr) 116px 92px 92px 100px 28px; }
.ic-hisob .hs-karta-b, .ic-chap .hs-karta-b { overflow-x:auto; }
.ic-th { font-size:11px; font-weight:600; color:var(--mut); text-transform:uppercase; letter-spacing:.03em; }
.r { text-align:right; justify-content:flex-end; }
.ic-td { display:flex; align-items:center; gap:5px; font-size:13px; font-variant-numeric:tabular-nums; min-width:0; }
.ic-td small { font-size:10.5px; color:var(--sub); }
.ic-td.yoq { color:#dc2626; font-weight:600; }
.ic-ro { font-size:13px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
/* Tovar katagi: tanlash + qaysi ombordan chiqadi / qaysi omborga kiradi */
.ic-nom { display:flex; flex-direction:column; gap:3px; min-width:0; }
.ic-om { font-size:11px; font-weight:500; color:var(--acc); padding-left:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ic-om.savdo { color:var(--sub); }
.ic-tartib { align-items:center; }
.ic-tartib span { flex:1; }
.ic-tartib .hs-btn { flex-shrink:0; }
.ic-hint--brand { color:var(--ink2); }
.ic-hint--brand a { color:var(--acc); font-weight:600; }
.ic-u { font-size:11.5px; color:var(--sub); min-width:22px; text-align:left; }
.ic-inp { width:100%; height:36px; border:1px solid var(--line); border-radius:8px; background:var(--surface); color:var(--ink); font:inherit; font-size:13px; text-align:right; padding:0 9px; font-variant-numeric:tabular-nums; min-width:0; }
.ic-inp:focus, .ic-ta:focus { outline:none; border-color:var(--acc); box-shadow:0 0 0 3px var(--acc-soft); }
.ic-inp--l { text-align:left; }
.ic-inp--ogoh { border-color:#f59e0b; background:rgba(245,158,11,.06); }
.ic-inp--asosiy { border-color:var(--brand-300); font-weight:650; }
.ic-tn { color:var(--acc-ink); }
.ic-x { width:28px; height:28px; border:0; border-radius:7px; background:transparent; color:var(--sub); cursor:pointer; display:flex; align-items:center; justify-content:center; }
.ic-x:hover { background:rgba(220,38,38,.08); color:#dc2626; }
.ic-add { margin-top:10px; display:inline-flex; align-items:center; gap:6px; height:32px; padding:0 11px; border:1px dashed var(--line); border-radius:8px; background:transparent; color:var(--acc); font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; }
.ic-add:hover { border-color:var(--brand-300); background:var(--acc-soft); }
.ic-jami { display:flex; justify-content:space-between; margin-top:12px; padding-top:10px; border-top:1px solid var(--line2); font-size:13px; color:var(--mut); }
.ic-jami b { color:var(--ink); font-variant-numeric:tabular-nums; }
.ic-chips { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; }
.ic-chips .hs-chip:disabled { opacity:.4; cursor:default; }
.ic-kassa { gap:8px; }
.ic-chk { display:inline-flex; align-items:center; gap:5px; font-size:13px; cursor:pointer; }
.ic-sel { height:32px; padding:0 6px; }
.ic-bos { margin:0; color:var(--mut); font-size:13px; }
.ic-hint { margin:10px 0 0; font-size:12px; line-height:1.5; color:var(--mut); }
.ic-mut { color:var(--mut); font-size:12.5px; }
.ic-sar { font-size:12px; font-weight:650; color:var(--ink2); margin:4px 0 8px; }
.ic-sar:not(:first-child) { margin-top:18px; padding-top:14px; border-top:1px solid var(--line2); }
.ic-sar small { font-weight:500; color:var(--sub); }
.ic-qatorlar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.ic-qatorlar .hs-chip { margin-top:10px; }
.ic-taq { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-top:12px; font-size:12.5px; color:var(--ink2); }
.ic-taq label { display:inline-flex; align-items:center; gap:5px; cursor:pointer; }
.ic-taq small { color:#b45309; }
.ic-foyda { color:#059669; font-weight:650; }
.ic-zarar { color:#dc2626; font-weight:650; }

/* Chiqish / yo'qotish chizig'i */
.ic-yoq { margin-top:16px; padding:12px; border-radius:10px; background:var(--bg); }
.ic-yoq-bar { display:flex; height:10px; border-radius:5px; overflow:hidden; background:repeating-linear-gradient(45deg, #fde68a, #fde68a 4px, #fef3c7 4px, #fef3c7 8px); }
.ic-yoq-bar i { display:block; height:100%; background:var(--brand-500); }
.ic-yoq-bar i.q { background:var(--brand-200); }
.ic-yoq-t { display:flex; gap:16px; flex-wrap:wrap; margin-top:8px; font-size:12.5px; color:var(--ink2); }
.ic-yoq-t .d { display:inline-block; width:8px; height:8px; border-radius:2px; margin-right:5px; }
.ic-yoq-t .d.m { background:var(--brand-500); } .ic-yoq-t .d.q { background:var(--brand-200); } .ic-yoq-t .d.y { background:#f59e0b; }
.ic-lbl { display:block; font-size:12px; font-weight:600; color:var(--mut); margin-bottom:6px; }
.ic-ta { width:100%; border:1px solid var(--line); border-radius:9px; background:var(--surface); color:var(--ink); font:inherit; font-size:13px; padding:8px 10px; resize:vertical; }

/* Tannarx paneli */
.ic-h { display:flex; justify-content:space-between; align-items:baseline; gap:10px; padding:6px 0; font-size:13px; color:var(--mut); }
.ic-h b { color:var(--ink); font-variant-numeric:tabular-nums; font-weight:600; text-align:right; }
.ic-h b small { font-size:11px; font-weight:600; margin-left:4px; }
.ic-h--jami { border-top:1px solid var(--line); margin-top:4px; padding-top:9px; color:var(--ink); font-weight:600; }
.ic-h--jami b { font-weight:700; }
.ic-h--foyda { border-top:1px dashed var(--line); margin-top:6px; padding-top:9px; }
.ic-h--mut { font-size:12px; }
.ic-katta { margin:10px 0 6px; padding:14px; border-radius:12px; background:var(--acc-soft); display:flex; flex-direction:column; gap:2px; }
.ic-katta small { font-size:12px; color:var(--acc-ink); font-weight:600; }
.ic-katta b { font-size:30px; font-weight:750; letter-spacing:-.03em; color:var(--acc-ink); font-variant-numeric:tabular-nums; }
.ic-katta b span { font-size:14px; font-weight:600; }
.ic-navlar { margin:6px 0; padding:6px 12px; border-radius:12px; background:var(--acc-soft); }
.ic-navlar .ic-h b { color:var(--acc-ink); }
.ic-not { display:flex; gap:8px; align-items:flex-start; padding:10px 12px; border-radius:10px; font-size:12.5px; line-height:1.5; margin:8px 0; }
.ic-not svg { flex-shrink:0; margin-top:2px; }
.ic-not--warn { background:rgba(245,158,11,.1); color:#92400e; }
.ic-not--err { background:rgba(220,38,38,.08); color:#b91c1c; }
.ic-not--n { background:var(--hov); color:var(--ink2); }
.shell.dark .ic-not--warn { color:#fcd34d; }
.shell.dark .ic-not--err { color:#fca5a5; }
.ic-qanday { margin-top:8px; display:inline-flex; align-items:center; gap:6px; border:0; background:transparent; color:var(--acc); font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; padding:4px 0; }
.ic-izoh { font-size:12.5px; line-height:1.55; color:var(--ink2); }
.ic-izoh p { margin:6px 0; }

/* Modal */
.ic-modal { position:fixed; inset:0; z-index:100; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center; padding:16px; }
.ic-modal-c { width:min(520px, 100%); background:var(--surface); border-radius:14px; padding:20px 22px; box-shadow:0 24px 60px rgba(15,23,42,.3); }
.ic-modal-c h3 { margin:0 0 6px; font-size:17px; }
.ic-royxat { margin:10px 0 0; padding-left:18px; font-size:13px; line-height:1.7; color:var(--ink2); }
.ic-sabab { width:100%; margin-top:12px; }
.ic-modal-a { display:flex; justify-content:flex-end; gap:8px; margin-top:18px; }
</style>
