/* Asosiy navigatsiya — yagona manba.
   Modullar biznes jarayoni tartibida (Van Sell): agentga yuk beriladi →
   agent mijozga joyida sotadi → qoldiq va naqd qabul qilinadi → pul kassaga. "zanjir" belgisi
   bor modullar menyuda shu oqim bo'yicha bog'langan holda ko'rsatiladi.
   badge: /navbat javobidagi kalit ('ombor.yigish'); ton: 'ish' — bajarilishi
   kerak bo'lgan ish (relsdagi umumiy songa qo'shiladi), 'ogoh' — e'tibor,
   'info' — ma'lumot. */

import type { Rejim } from '@/stores/rejim'

export type Ton = 'ish' | 'ogoh' | 'info'
export interface Sahifa {
  yol: string
  nom: string
  izoh: string
  ikon: string
  aniq?: boolean            // faqat aynan shu yo'l (prefiks emas)
  match?: string[]          // qo'shimcha faol yo'llar
  perm?: string             // modulnikidan farqli ruxsat
  badge?: { k: string; ton: Ton; matn?: string }
  kalit?: string            // qidiruv uchun qo'shimcha so'zlar
  faqat?: Rejim             // faqat shu biznes rejimida ko'rinadi (berilmasa — har ikkalasida)
}
export interface Modul {
  key: string
  perm: string
  nom: string
  izoh: string
  ikon: string
  yol: string
  zanjir?: boolean
  tizim?: boolean
  match?: string[]
  faqat?: Rejim             // faqat shu biznes rejimida ko'rinadi (berilmasa — har ikkalasida)
  sahifalar: Sahifa[]
}

/* Buyruq oynasi (⌘K) elementi */
export interface Buyruq {
  id: string
  guruh: string
  nom: string
  izoh?: string
  ikon: string
  son?: number
  kalit?: string
  bajar: () => void
}

/* Ikonlar — 24×24, chiziqli (stroke) */
export const IK = {
  bosh: '<rect x="3" y="3" width="7" height="9" rx="1.6"/><rect x="14" y="3" width="7" height="5" rx="1.6"/><rect x="14" y="12" width="7" height="9" rx="1.6"/><rect x="3" y="16" width="7" height="5" rx="1.6"/>',
  agent: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M21.5 20a6.5 6.5 0 0 0-3.6-5.8"/>',
  dokon: '<path d="M3.5 9 5 4h14l1.5 5"/><path d="M3.5 9a2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.8 0 2.8 2.8 0 0 0 5.6 0"/><path d="M5 12v8h14v-8"/><path d="M10 20v-5h4v5"/>',
  chek: '<path d="M6 2.5h12v19l-3-2-3 2-3-2-3 2z"/><path d="M9 7.5h6M9 11.5h6M9 15.5h3.5"/>',
  ombor: '<path d="M3 21V8.5l9-5.5 9 5.5V21"/><path d="M7 21v-8h10v8"/><path d="M7 17h10"/>',
  mashina: '<path d="M2 6h11v10H2z"/><path d="M13 9h4.2l3.8 4.2V16h-8"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  hamyon: '<path d="M18 9V6a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V7"/><circle cx="16.5" cy="14.5" r="1.2"/>',
  grafik: '<path d="M3 3v18h18"/><path d="M8 17v-5M13 17V8M18 17v-9"/>',
  qalqon: '<path d="M12 2.5 4.5 5.5v5.8c0 4.6 3.1 8.7 7.5 10.2 4.4-1.5 7.5-5.6 7.5-10.2V5.5z"/><circle cx="12" cy="10" r="2.4"/><path d="M8.3 16a4 4 0 0 1 7.4 0"/>',
  sozlama: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  koz: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  royxat: '<path d="M8.5 6H21M8.5 12H21M8.5 18H21"/><circle cx="4" cy="6" r="1.1"/><circle cx="4" cy="12" r="1.1"/><circle cx="4" cy="18" r="1.1"/>',
  nishon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  marshrut: '<circle cx="6" cy="19" r="2.4"/><circle cx="18" cy="5" r="2.4"/><path d="M8.4 19H17a3.5 3.5 0 0 0 0-7H7a3.5 3.5 0 0 1 0-7h8.6"/>',
  telefon: '<rect x="6" y="2.5" width="12" height="19" rx="2.6"/><path d="M11 18h2"/>',
  kalendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="m9 15 2 2 4-4"/>',
  hujjat: '<path d="M14 2.5H6.5A2 2 0 0 0 4.5 4.5v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z"/><path d="M14 2.5V8h5.5M8.5 13h7M8.5 17h4.5"/>',
  velo: '<circle cx="5.5" cy="17" r="3.2"/><circle cx="18.5" cy="17" r="3.2"/><path d="M5.5 17 9 9.5h6.5l3 7.5M9 9.5 7.6 6H5M15 6h2.4"/>',
  varaq: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 2.5h6v3.5H9z"/><path d="M9 11h6M9 15h6"/>',
  qaytar: '<path d="M3 12a9 9 0 1 0 2.8-6.5L3 8"/><path d="M3 3v5h5"/>',
  puls: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
  osish: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  almash: '<path d="M7 7.5h13l-3.5-3.5M17 16.5H4l3.5 3.5"/>',
  xarita: '<path d="M9 3.5 3 6.5v14l6-3 6 3 6-3v-14l-6 3z"/><path d="M9 3.5v14M15 6.5v14"/>',
  qatlam: '<path d="m3 7.5 9-4.5 9 4.5-9 4.5z"/><path d="m3 12.5 9 4.5 9-4.5"/><path d="m3 17 9 4.5 9-4.5"/>',
  quti: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  qutilar: '<rect x="3" y="12" width="8" height="8" rx="1.2"/><rect x="13" y="12" width="8" height="8" rx="1.2"/><rect x="8" y="3" width="8" height="8" rx="1.2"/>',
  yorliq: '<path d="M3 5h8l10 10-6 6L5 11z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
  yigish: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m8.5 12 2.5 2.5 4.5-4.5"/>',
  kiruvchi: '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5.5 5h13L21 13v6H3v-6z"/>',
  zavod: '<path d="M3 21V10l6 4v-4l6 4V6l6 3v12z"/><path d="M7 17.5h2M12 17.5h2M17 17.5h2"/>',
  pirog: '<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  kirim: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M8 13l4 4 4-4"/>',
  savat: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12h12L22 7H6.2"/>',
  kitob: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  pul: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  kassa: '<rect x="3" y="10" width="18" height="11" rx="2"/><path d="M7 10V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4"/><path d="M8 15h8"/>',
  yulduz: '<path d="M12 2.8l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.36l-5.7 3 1.09-6.35-4.62-4.5 6.38-.93z"/>',
}

export const MODULLAR: Modul[] = [
  { key: 'dashboard', perm: 'dashboard', nom: 'Bosh sahifa', izoh: "Kompaniyaning bugungi holati bir qarashda", ikon: IK.bosh, yol: '/dashboard',
    sahifalar: [{ yol: '/dashboard', nom: 'Bosh sahifa', izoh: 'KPI, savdo, kassa, qarzdorlar', ikon: IK.bosh, kalit: 'dashboard kpi' }] },

  /* ── Jarayon zanjiri ── */
  /* Optom: mijoz omborga keladi, sotuv shu zahoti skladdan (agent, dostavchik, mashina yo'q) */
  { key: 'sotuv', perm: 'sotuvlar', nom: 'Sotuv', izoh: 'Skladdan sotish: naqd, qisman, qarzga', ikon: IK.savat, yol: '/sotuv', zanjir: true, faqat: 'optom',
    sahifalar: [
      { yol: '/sotuv', nom: 'Sotuv qilish', izoh: 'Mijozga skladdan sotish: naqd, qisman, qarzga', ikon: IK.savat, aniq: true, kalit: 'sotish savdo chek kassa naqd qarz optom' },
      { yol: '/sotuv/jurnal', nom: 'Sotuvlar jurnali', izoh: 'Barcha cheklar: naqd, qarz, bekor qilingan', ikon: IK.chek, kalit: 'jurnal chek savdo tarix' },
    ] },
  /* Van Sell: agentga yuk beriladi → agent sotadi → qoldiq va naqdni topshiradi. Hisob agent bo'yicha. */
  { key: 'agentlar', perm: 'supervayzer', nom: 'Agentlar', izoh: "Agentlar, ularning rejasi va natijasi", ikon: IK.agent, yol: '/agentlar/royxat', zanjir: true, faqat: 'distributsiya',
    match: ['/agentlar', '/supervayzer'],
    sahifalar: [
      { yol: '/agentlar/royxat', nom: "Agentlar ro'yxati", izoh: 'Agent qo\'shish, profil, reja', ikon: IK.royxat, match: ['/supervayzer'], kalit: 'supervayzer agent xodim' },
      { yol: '/hisobot/xodim', nom: 'Agent hisoboti', izoh: 'Bitta agent: savdo, reja, naqd, qarz, kunlar', ikon: IK.osish, perm: 'hisobot', kalit: 'agent xodim hodim hisobot ish natija' },
      { yol: '/agentlar/plan', nom: 'Plan-fakt', izoh: 'Reja bajarilishi', ikon: IK.nishon, kalit: 'plan reja' },
      { yol: '/agentlar/online', nom: 'Xaritada jonli', izoh: 'Agentlar hozir qayerda', ikon: IK.pin, badge: { k: 'agentlar.online', ton: 'info', matn: 'online' }, kalit: 'gps xarita' },
    ] },
  { key: 'avtolavka', perm: 'avtolavka', nom: 'Van Sell', izoh: 'Agentga yuk berish → savdo → qoldiq va naqdni qabul qilish', ikon: IK.mashina, yol: '/avtolavka', zanjir: true, faqat: 'distributsiya',
    sahifalar: [
      { yol: '/avtolavka', nom: 'Yuk berish va qabul', izoh: 'Agentga yuk berish, undagi qoldiq, kun oxirida qabul', ikon: IK.mashina, aniq: true, badge: { k: 'avtolavka.yuklanmagan', ton: 'ish', matn: 'yuk berilmagan' }, kalit: 'kochma savdo yuk berish qoldiq astatka ostatka vansell van sell won sell markaz' },
      { yol: '/avtolavka/sotuvlar', nom: 'Sotuvlar', izoh: 'Agentlar sotgan cheklar: naqd, qarz, joy', ikon: IK.chek, kalit: 'Van Sell chek savdo jurnal naqd qarz' },
      { yol: '/avtolavka/sotuv', nom: 'Sotuv qilish', izoh: 'Agent nomidan yoki skladdan webdan sotish', ikon: IK.savat, kalit: 'Van Sell sotish sotuv kiritish agent nomidan qolda web naqd qarz' },
    ] },
  { key: 'mijozlar', perm: 'mijozlar', nom: 'Mijozlar', izoh: "Do'konlar, qarz va to'lovlar", ikon: IK.dokon, yol: '/mijozlar', zanjir: true,
    sahifalar: [
      { yol: '/mijozlar', nom: "Mijozlar ro'yxati", izoh: 'Karta, kredit limiti, sinf', ikon: IK.royxat, aniq: true, kalit: 'klient dokon' },
      { yol: '/mijozlar/oldi-berdi', nom: 'Oldi-berdi', izoh: "Qarz va to'lovlar tarixi", ikon: IK.almash, badge: { k: 'mijozlar.qarzdor', ton: 'ogoh', matn: 'qarzdor' }, kalit: 'qarz balans akt sverka' },
      { yol: '/mijozlar/xarita', nom: 'Xaritada', izoh: 'Mijozlar joylashuvi', ikon: IK.xarita, faqat: 'distributsiya' },
    ] },
  { key: 'ombor', perm: 'ombor', nom: 'Ombor', izoh: "Kirim va qoldiq", ikon: IK.ombor, yol: '/ombor', zanjir: true,
    match: ['/ombor', '/yetkazuvchilar'],
    sahifalar: [
      { yol: '/ombor', nom: 'Ombor holati', izoh: "Umumiy ko'rinish", ikon: IK.qatlam, aniq: true, kalit: 'sklad' },
      { yol: '/ombor/prixod', nom: 'Kirim (prixod)', izoh: 'Yetkazuvchidan kelgan tovar', ikon: IK.quti, badge: { k: 'ombor.prixod', ton: 'ish', matn: 'qoralama' }, kalit: 'prixod kirim' },
      { yol: '/ombor/qoldiqlar', nom: 'Qoldiqlar', izoh: "Tovar bo'yicha qoldiq", ikon: IK.qutilar, badge: { k: 'ombor.kam', ton: 'ogoh', matn: 'kam' }, kalit: 'ostatka' },
      { yol: '/ombor/partiya', nom: 'Partiyalar', izoh: 'Partiya va yaroqlilik muddati', ikon: IK.yorliq },
      { yol: '/yetkazuvchilar', nom: 'Yetkazuvchilar', izoh: "Qarz va to'lovlar", ikon: IK.zavod, kalit: 'postavshik' },
    ] },
  { key: 'ishlab', perm: 'ishlab', nom: 'Ishlab chiqarish', izoh: 'Xom ashyo → sof mahsulot, tannarx', ikon: IK.zavod, yol: '/ishlab', zanjir: true,
    sahifalar: [
      { yol: '/ishlab', nom: 'Partiyalar', izoh: "Nima sarflandi, nima chiqdi, tannarx", ikon: IK.zavod, badge: { k: 'ishlab.jarayonda', ton: 'ish', matn: 'jarayonda' }, kalit: 'ishlab chiqarish sex tannarx xom ashyo partiya proizvodstvo' },
      { yol: '/ishlab/yangi', nom: 'Yangi partiya', izoh: 'Xom ashyo → mahsulot, omborga kirim', ikon: IK.quti, kalit: 'yangi partiya ishlab chiqarish' },
    ] },
  { key: 'moliya', perm: 'moliya', nom: 'Moliya', izoh: 'Kassa, kunlik xarajatlar, qarz oldi-berdi, inkassatsiya', ikon: IK.hamyon, yol: '/moliya', zanjir: true,
    match: ['/moliya'],
    sahifalar: [
      { yol: '/moliya', nom: 'Kassa', izoh: 'Kirim va chiqim harakati', ikon: IK.kassa, kalit: 'pul bank' },
      { yol: '/moliya/xarajatlar', nom: 'Kunlik xarajatlar', izoh: 'Kassadan rasxod: benzin, ovqat, ijara, ish haqi…', ikon: IK.chek, kalit: 'rasxod xarajat chiqim benzin ovqat ijara ish haqi' },
      { yol: '/moliya/qarzlar', nom: 'Qarz oldi-berdi', izoh: 'Uchinchi shaxslarga qarz berish va olish', ikon: IK.almash, kalit: 'qarz berish olish uchinchi shaxs dolg zaym' },
      { yol: '/hisobot/inkassatsiya', nom: 'Inkassatsiya', izoh: "Agentlardan naqd qabul qilish", ikon: IK.pul, perm: 'hisobot', badge: { k: 'moliya.inkassatsiya', ton: 'ish', matn: 'topshirmagan' }, kalit: 'naqd topshirish', faqat: 'distributsiya' },
    ] },

  /* ── Tahlil ── */
  { key: 'hisobot', perm: 'hisobot', nom: 'Hisobot', izoh: 'Tahlil: sotuv, foyda, qarz, ombor', ikon: IK.grafik, yol: '/hisobot',
    sahifalar: [
      { yol: '/hisobot', nom: "Umumiy ko'rinish", izoh: 'Tovar va pul aylanishi bir qarashda', ikon: IK.pirog, aniq: true, kalit: 'hisobot umumiy biznes' },
      { yol: '/hisobot/biznes', nom: 'Biznes holati', izoh: "Sof foyda, biznes qiymati va salomatlik ko'rsatkichlari", ikon: IK.puls, kalit: 'biznes holati salomatlik sof foyda balans kapital' },
      { yol: '/hisobot/sotuv', nom: 'Sotuv va foyda', izoh: 'Tushum, foyda, marja — agent, turkum, mijoz', ikon: IK.osish, kalit: 'savdo foyda marja tushum' },
      { yol: '/hisobot/xodim', nom: 'Agent hisoboti', izoh: 'Bitta agent: savdo, reja, naqd, qarz, kunlar', ikon: IK.agent, kalit: 'agent xodim hodim hisobot ish natija', faqat: 'distributsiya' },
      { yol: '/hisobot/tovarlar', nom: 'Tovarlar (ABC)', izoh: 'Pul topadigan va yotib qolgan tovarlar', ikon: IK.savat, kalit: 'abc tovar aylanma' },
      { yol: '/hisobot/reyting', nom: 'Mijozlar reytingi', izoh: "Ishonchli va xavfli mijozlar, rad sabablari, to'lov va'dalari", ikon: IK.yulduz, kalit: 'reyting ball ishonch rad etish vada kritik', faqat: 'distributsiya' },
      { yol: '/hisobot/qarzlar', nom: 'Mijozlar qarzi', izoh: "Debitorka: qarz yoshi, muddati o'tgan", ikon: IK.dokon, kalit: 'debitorka qarz nasiya' },
      { yol: '/hisobot/ombor', nom: 'Ombor', izoh: 'Zaxira qiymati va necha kunga yetadi', ikon: IK.ombor, kalit: 'zaxira qoldiq sklad' },
      { yol: '/hisobot/kirim', nom: 'Xaridlar (kirim)', izoh: 'Kimdan, nima, qancha olindi', ikon: IK.kirim, kalit: 'prixod xarid' },
      { yol: '/hisobot/yetkazuvchilar', nom: 'Yetkazuvchilar', izoh: 'Kreditorka: kimga qancha qarzmiz', ikon: IK.zavod, kalit: 'kreditorka postavshik' },
      { yol: '/hisobot/register', nom: 'Ombor jurnali', izoh: "Har bir tovar harakati, ko'chirish alohida", ikon: IK.kitob, kalit: 'register harakat' },
    ] },

  /* ── Tizim ── */
  { key: 'foydalanuvchilar', perm: 'foydalanuvchilar', nom: 'Foydalanuvchilar', izoh: 'Xodimlar va ruxsatlar', ikon: IK.qalqon, yol: '/foydalanuvchilar', tizim: true,
    sahifalar: [{ yol: '/foydalanuvchilar', nom: 'Foydalanuvchilar', izoh: 'Rollar va ruxsatlar', ikon: IK.qalqon, kalit: 'user rol ruxsat' }] },
  { key: 'sozlamalar', perm: 'sozlamalar', nom: 'Sozlamalar', izoh: 'Spravochniklar va parametrlar', ikon: IK.sozlama, yol: '/sozlamalar', tizim: true,
    sahifalar: [{ yol: '/sozlamalar', nom: 'Sozlamalar', izoh: 'Tovar, narx, hudud, kurs', ikon: IK.sozlama, kalit: 'spravochnik narx kurs hudud' }] },
]

/* Joriy yo'l qaysi sahifaga mos — eng uzun mos prefiks yutadi */
export function sahifaMos(s: Sahifa, yol: string): number {
  const nomzod = [s.yol, ...(s.match || [])]
  let eng = -1
  for (const p of nomzod) {
    if (yol === p) eng = Math.max(eng, p.length + 1000)
    else if (!s.aniq && yol.startsWith(p + '/')) eng = Math.max(eng, p.length)
  }
  return eng
}

/* Qidiruv uchun matnni tekislash: katta-kichik harf, o'/g' apostroflari */
export const tekis = (s: string) => s.toLowerCase().replace(/[ʻʼ'`’‘]/g, '').replace(/\s+/g, ' ').trim()
